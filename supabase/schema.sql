-- ============================================================================
-- Streakin — Skema Database (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor (sekali jalan).
-- Aman di-run ulang (idempotent) berkat IF NOT EXISTS / CREATE OR REPLACE.
--
-- Zona waktu acuan check-in: Asia/Jakarta (WIB). "Hari" ditentukan di WIB
-- supaya check-in jam 23:59 dan 00:01 dihitung di tanggal yang benar bagi user.
-- ============================================================================

-- Ekstensi untuk gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (mirror dari auth.users, data publik untuk leaderboard)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  name         text,
  nickname     text,
  avatar_url   text,
  premium_until timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. CHALLENGES
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null default 'lainnya',
  duration_days int,                       -- null = tanpa batas
  target_time   time,                      -- opsional, mis. '06:00' untuk subuh
  requires_proof boolean not null default false,
  is_private    boolean not null default false,
  invite_code   text unique not null default substr(md5(random()::text), 1, 8),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. CHALLENGE_PARTICIPANTS  (satu baris per user per challenge)
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_participants (
  id                uuid primary key default gen_random_uuid(),
  challenge_id      uuid not null references public.challenges(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  joined_at         timestamptz not null default now(),
  current_streak    int not null default 0,
  longest_streak    int not null default 0,
  total_checkins    int not null default 0,
  shields_available int not null default 1,   -- kuota shield aktif
  shields_month     text,                      -- 'YYYY-MM' terakhir shield di-refill
  last_checkin_date date,
  unique (challenge_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 4. CHECKINS  (riwayat harian; unik per hari per peserta)
-- ---------------------------------------------------------------------------
create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.challenge_participants(id) on delete cascade,
  checkin_date    date not null,
  proof_photo_url text,
  created_at      timestamptz not null default now(),
  unique (participant_id, checkin_date)
);

-- ---------------------------------------------------------------------------
-- 5. BADGES  (achievement lifetime — tidak hilang saat streak reset)
-- ---------------------------------------------------------------------------
create table if not exists public.badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_type text not null,               -- mis. 'streak_7', 'streak_30', 'total_100'
  challenge_id uuid references public.challenges(id) on delete set null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_type, challenge_id)
);

-- ---------------------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  type     text not null,                 -- 'reminder' | 'leaderboard' | 'shield_used' | 'badge'
  payload  jsonb not null default '{}'::jsonb,
  sent_at  timestamptz not null default now(),
  read_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- 7. PUSH_SUBSCRIPTIONS  (Web Push endpoints per device)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES  (khusus performa query leaderboard & check-in)
-- ---------------------------------------------------------------------------
-- Leaderboard: sort per challenge by streak desc, lalu total check-in desc.
create index if not exists idx_participants_leaderboard
  on public.challenge_participants (challenge_id, current_streak desc, total_checkins desc);
create index if not exists idx_participants_user
  on public.challenge_participants (user_id);
create index if not exists idx_challenges_public_trending
  on public.challenges (is_private, created_at desc);
create index if not exists idx_challenges_category
  on public.challenges (category);
create index if not exists idx_checkins_participant_date
  on public.checkins (participant_id, checkin_date desc);
create index if not exists idx_checkins_date
  on public.checkins (checkin_date);

-- ===========================================================================
-- HELPER: tanggal "hari ini" menurut WIB
-- ===========================================================================
create or replace function public.today_wib()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- ===========================================================================
-- HELPER (SECURITY DEFINER): cek keanggotaan tanpa memicu rekursi RLS
-- ===========================================================================
create or replace function public.is_member(p_challenge uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge and user_id = auth.uid()
  );
$$;

-- ===========================================================================
-- TRIGGER: auto-buat profil saat user Google baru mendaftar
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, email, name, nickname, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- HELPER: refill shield bulanan (1 gratis / 3 premium). Tidak mengurangi
-- shield yang sudah dibeli — hanya menaikkan ke jatah minimum bulan ini.
-- ===========================================================================
create or replace function public._refill_shields(p_participant public.challenge_participants)
returns int language plpgsql set search_path = public as $$
declare
  v_month text := to_char(public.today_wib(), 'YYYY-MM');
  v_base  int;
  v_is_premium boolean;
begin
  if p_participant.shields_month is not distinct from v_month then
    return p_participant.shields_available; -- sudah di-refill bulan ini
  end if;
  select (premium_until is not null and premium_until > now())
    into v_is_premium from public.profiles where id = p_participant.user_id;
  v_base := case when coalesce(v_is_premium,false) then 3 else 1 end;

  update public.challenge_participants
     set shields_available = greatest(shields_available, v_base),
         shields_month = v_month
   where id = p_participant.id
   returning shields_available into v_base;
  return v_base;
end;
$$;

-- ===========================================================================
-- RPC: JOIN CHALLENGE  (via id atau invite_code)
-- ===========================================================================
create or replace function public.join_challenge(p_challenge_id uuid default null, p_invite_code text default null)
returns public.challenge_participants
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.challenges;
  v_row public.challenge_participants;
begin
  if v_uid is null then raise exception 'Harus login dulu'; end if;

  select * into v_challenge from public.challenges
   where (p_challenge_id is not null and id = p_challenge_id)
      or (p_invite_code is not null and invite_code = p_invite_code)
   limit 1;
  if v_challenge.id is null then raise exception 'Challenge tidak ditemukan'; end if;

  insert into public.challenge_participants (challenge_id, user_id, shields_available, shields_month)
  values (v_challenge.id, v_uid, 1, to_char(public.today_wib(),'YYYY-MM'))
  on conflict (challenge_id, user_id) do update set challenge_id = excluded.challenge_id
  returning * into v_row;

  perform public._refill_shields(v_row);
  select * into v_row from public.challenge_participants where id = v_row.id;
  return v_row;
end;
$$;

-- ===========================================================================
-- HELPER: award badge (idempotent) + notifikasi
-- ===========================================================================
create or replace function public._award_badge(p_user uuid, p_type text, p_challenge uuid)
returns void language plpgsql set search_path = public as $$
begin
  insert into public.badges (user_id, badge_type, challenge_id)
  values (p_user, p_type, p_challenge)
  on conflict (user_id, badge_type, challenge_id) do nothing;
  if found then
    insert into public.notifications (user_id, type, payload)
    values (p_user, 'badge', jsonb_build_object('badge_type', p_type, 'challenge_id', p_challenge));
  end if;
end;
$$;

-- ===========================================================================
-- RPC INTI: CHECK-IN HARIAN + logika STREAK & SHIELD
-- ----------------------------------------------------------------------------
-- Aturan:
--  * Check-in di hari yang sama (gap 0)  -> ditolak (sudah check-in).
--  * Berturut (gap 1)                    -> streak + 1.
--  * Ada hari bolong (gap >= 2):
--       missed = gap - 1
--       jika shields_available >= missed -> pakai shield, streak lanjut + 1.
--       jika tidak cukup                 -> streak reset ke 1 (lifetime tetap).
--  * total_checkins selalu + 1, longest_streak = max(longest, current).
--  * Badge diberikan pada milestone streak & total.
-- Return: jsonb ringkas untuk UI.
-- ===========================================================================
create or replace function public.do_checkin(p_challenge_id uuid, p_proof_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_p   public.challenge_participants;
  v_today date := public.today_wib();
  v_gap int;
  v_missed int;
  v_shield_used boolean := false;
  v_reset boolean := false;
begin
  if v_uid is null then raise exception 'Harus login dulu'; end if;

  select * into v_p from public.challenge_participants
   where challenge_id = p_challenge_id and user_id = v_uid
   for update;
  if v_p.id is null then raise exception 'Kamu belum join challenge ini'; end if;

  -- Refill shield bulanan sebelum berhitung
  perform public._refill_shields(v_p);
  select * into v_p from public.challenge_participants where id = v_p.id for update;

  if v_p.last_checkin_date = v_today then
    return jsonb_build_object('status','already','current_streak',v_p.current_streak,
      'total_checkins',v_p.total_checkins,'shields_available',v_p.shields_available,'shield_used',false);
  end if;

  if v_p.last_checkin_date is null then
    v_p.current_streak := 1;
  else
    v_gap := v_today - v_p.last_checkin_date;
    if v_gap = 1 then
      v_p.current_streak := v_p.current_streak + 1;
    else
      v_missed := v_gap - 1;
      if v_p.shields_available >= v_missed then
        v_p.shields_available := v_p.shields_available - v_missed;
        v_shield_used := true;
        v_p.current_streak := v_p.current_streak + 1;
      else
        v_p.current_streak := 1;
        v_reset := true;
      end if;
    end if;
  end if;

  v_p.total_checkins := v_p.total_checkins + 1;
  v_p.longest_streak := greatest(v_p.longest_streak, v_p.current_streak);

  update public.challenge_participants
     set current_streak = v_p.current_streak,
         longest_streak = v_p.longest_streak,
         total_checkins = v_p.total_checkins,
         shields_available = v_p.shields_available,
         last_checkin_date = v_today
   where id = v_p.id;

  insert into public.checkins (participant_id, checkin_date, proof_photo_url)
  values (v_p.id, v_today, p_proof_url)
  on conflict (participant_id, checkin_date) do nothing;

  -- Notifikasi jika shield terpakai (transparansi ke user)
  if v_shield_used then
    insert into public.notifications (user_id, type, payload)
    values (v_uid, 'shield_used', jsonb_build_object('challenge_id', p_challenge_id, 'shields_left', v_p.shields_available));
  end if;

  -- Badge milestone
  if v_p.current_streak >= 7  then perform public._award_badge(v_uid,'streak_7',  p_challenge_id); end if;
  if v_p.current_streak >= 30 then perform public._award_badge(v_uid,'streak_30', p_challenge_id); end if;
  if v_p.current_streak >= 100 then perform public._award_badge(v_uid,'streak_100',p_challenge_id); end if;
  if v_p.total_checkins >= 50 then perform public._award_badge(v_uid,'total_50',  p_challenge_id); end if;

  return jsonb_build_object(
    'status', case when v_reset then 'reset' when v_shield_used then 'shield' else 'ok' end,
    'current_streak', v_p.current_streak,
    'longest_streak', v_p.longest_streak,
    'total_checkins', v_p.total_checkins,
    'shields_available', v_p.shields_available,
    'shield_used', v_shield_used
  );
end;
$$;

-- ===========================================================================
-- RPC: preview challenge lewat invite code (boleh untuk challenge privat,
-- supaya halaman /join bisa menampilkan info sebelum user join).
-- ===========================================================================
create or replace function public.challenge_preview(p_invite_code text)
returns table (
  id uuid, title text, description text, category text,
  duration_days int, is_private boolean, participant_count int
) language sql security definer stable set search_path = public as $$
  select c.id, c.title, c.description, c.category, c.duration_days, c.is_private,
    (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id)::int
  from public.challenges c
  where c.invite_code = p_invite_code
  limit 1;
$$;

-- ===========================================================================
-- VIEW: leaderboard all-time per challenge (join ke profil)
-- ===========================================================================
create or replace view public.challenge_leaderboard
with (security_invoker = on) as
select
  cp.challenge_id,
  cp.user_id,
  p.nickname,
  p.name,
  p.avatar_url,
  cp.current_streak,
  cp.longest_streak,
  cp.total_checkins,
  cp.last_checkin_date,
  cp.shields_available,
  row_number() over (
    partition by cp.challenge_id
    order by cp.current_streak desc, cp.total_checkins desc, cp.joined_at asc
  ) as rank
from public.challenge_participants cp
join public.profiles p on p.id = cp.user_id;

-- ===========================================================================
-- RPC: leaderboard MINGGUAN (jumlah check-in 7 hari terakhir)
-- ===========================================================================
create or replace function public.weekly_leaderboard(p_challenge_id uuid)
returns table (
  user_id uuid, nickname text, name text, avatar_url text,
  weekly_checkins bigint, current_streak int, rank bigint
) language sql stable set search_path = public as $$
  select
    cp.user_id, p.nickname, p.name, p.avatar_url,
    count(c.id) as weekly_checkins,
    cp.current_streak,
    row_number() over (order by count(c.id) desc, cp.current_streak desc) as rank
  from public.challenge_participants cp
  join public.profiles p on p.id = cp.user_id
  left join public.checkins c
    on c.participant_id = cp.id
   and c.checkin_date >= public.today_wib() - 6
  where cp.challenge_id = p_challenge_id
  group by cp.user_id, p.nickname, p.name, p.avatar_url, cp.current_streak;
$$;

-- ===========================================================================
-- VIEW: challenge publik + jumlah peserta (untuk halaman Jelajah / trending)
-- security_invoker agar tetap tunduk pada RLS challenges.
-- ===========================================================================
create or replace view public.trending_challenges
with (security_invoker = on) as
select
  c.*,
  (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id)::int
    as participant_count
from public.challenges c
where c.is_private = false;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles              enable row level security;
alter table public.challenges            enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.checkins              enable row level security;
alter table public.badges                enable row level security;
alter table public.notifications         enable row level security;
alter table public.push_subscriptions    enable row level security;

-- PROFILES: publik untuk dibaca (leaderboard), hanya diri sendiri yang boleh ubah
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid());

-- CHALLENGES: publik terlihat semua; privat hanya creator & member
drop policy if exists "challenges read" on public.challenges;
create policy "challenges read" on public.challenges for select
  using (not is_private or creator_id = auth.uid() or public.is_member(id));
drop policy if exists "challenges insert" on public.challenges;
create policy "challenges insert" on public.challenges for insert
  with check (creator_id = auth.uid());
drop policy if exists "challenges update own" on public.challenges;
create policy "challenges update own" on public.challenges for update
  using (creator_id = auth.uid());
drop policy if exists "challenges delete own" on public.challenges;
create policy "challenges delete own" on public.challenges for delete
  using (creator_id = auth.uid());

-- PARTICIPANTS: terlihat jika challenge publik atau kita anggota (leaderboard)
drop policy if exists "participants read" on public.challenge_participants;
create policy "participants read" on public.challenge_participants for select
  using (
    public.is_member(challenge_id)
    or exists (select 1 from public.challenges c where c.id = challenge_id and not c.is_private)
  );
drop policy if exists "participants insert own" on public.challenge_participants;
create policy "participants insert own" on public.challenge_participants for insert
  with check (user_id = auth.uid());
drop policy if exists "participants update own" on public.challenge_participants;
create policy "participants update own" on public.challenge_participants for update
  using (user_id = auth.uid());

-- CHECKINS: user hanya melihat & menulis check-in miliknya sendiri
drop policy if exists "checkins read own" on public.checkins;
create policy "checkins read own" on public.checkins for select
  using (exists (select 1 from public.challenge_participants cp
                 where cp.id = participant_id and cp.user_id = auth.uid()));
drop policy if exists "checkins insert own" on public.checkins;
create policy "checkins insert own" on public.checkins for insert
  with check (exists (select 1 from public.challenge_participants cp
                      where cp.id = participant_id and cp.user_id = auth.uid()));

-- BADGES: publik dibaca (tampil di profil), ditulis oleh fungsi server
drop policy if exists "badges read" on public.badges;
create policy "badges read" on public.badges for select using (true);

-- NOTIFICATIONS: hanya milik sendiri
drop policy if exists "notif read own" on public.notifications;
create policy "notif read own" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notif update own" on public.notifications;
create policy "notif update own" on public.notifications for update using (user_id = auth.uid());

-- PUSH SUBSCRIPTIONS: kelola milik sendiri
drop policy if exists "push manage own" on public.push_subscriptions;
create policy "push manage own" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- REALTIME: aktifkan publikasi untuk leaderboard live
-- ===========================================================================
alter publication supabase_realtime add table public.challenge_participants;
alter publication supabase_realtime add table public.checkins;

-- ===========================================================================
-- STORAGE: bucket untuk foto bukti check-in (jalankan sekali)
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

drop policy if exists "proof upload own" on storage.objects;
create policy "proof upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
-- Bucket 'proofs' publik: URL objek dapat diakses tanpa policy SELECT, jadi tidak
-- perlu policy read broad (yang justru membolehkan listing seluruh file).

-- ===========================================================================
-- HARDENING GRANTS: batasi eksekusi fungsi sensitif
-- ===========================================================================
-- Fungsi trigger, bukan RPC — tutup dari semua role.
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- RPC inti hanya untuk user login (bukan anon).
revoke all on function public.do_checkin(uuid, text) from public, anon;
grant execute on function public.do_checkin(uuid, text) to authenticated;
revoke all on function public.join_challenge(uuid, text) from public, anon;
grant execute on function public.join_challenge(uuid, text) to authenticated;
revoke all on function public.challenge_preview(text) from public, anon;
grant execute on function public.challenge_preview(text) to authenticated;
