/** Tipe data domain Streakin (selaras dengan schema.sql). */

export type Category =
  | "kesehatan"
  | "ibadah"
  | "produktivitas"
  | "belajar"
  | "keuangan"
  | "lainnya";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  premium_until: string | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: Category;
  duration_days: number | null;
  target_time: string | null;
  requires_proof: boolean;
  is_private: boolean;
  invite_code: string;
  created_at: string;
}

export interface Participant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  shields_available: number;
  shields_month: string | null;
  last_checkin_date: string | null;
}

export interface LeaderboardRow {
  challenge_id: string;
  user_id: string;
  nickname: string | null;
  name: string | null;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  shields_available: number;
  rank: number;
}

/** Hasil RPC do_checkin */
export interface CheckinResult {
  status: "ok" | "already" | "shield" | "reset";
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  shields_available: number;
  shield_used: boolean;
}
