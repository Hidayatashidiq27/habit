/**
 * Kalender aktivitas ala GitHub (contribution grid).
 * Menerima daftar tanggal check-in (string 'YYYY-MM-DD') dan menandai selnya.
 * Menampilkan ~18 minggu terakhir, mobile-first (scroll horizontal bila perlu).
 */
export default function ActivityGrid({ dates }: { dates: string[] }) {
  const set = new Set(dates);
  const WEEKS = 18;
  const today = new Date();
  // Mulai dari Minggu, WEEKS minggu ke belakang.
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const cols: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const col: Date[] = [];
    for (let d = 0; d < 7; d++) {
      col.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(col);
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD lokal

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((d, j) => {
              const key = fmt(d);
              const active = set.has(key);
              const future = d > today;
              return (
                <div
                  key={j}
                  title={key}
                  className={`h-3.5 w-3.5 rounded-sm ${
                    future
                      ? "bg-transparent"
                      : active
                        ? "bg-brand-500"
                        : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>Sepi</span>
        <span className="h-3 w-3 rounded-sm bg-slate-200" />
        <span className="h-3 w-3 rounded-sm bg-brand-300" />
        <span className="h-3 w-3 rounded-sm bg-brand-500" />
        <span>Rajin</span>
      </div>
    </div>
  );
}
