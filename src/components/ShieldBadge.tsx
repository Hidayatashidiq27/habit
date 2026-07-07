/** Ikon perisai kecil + jumlah shield tersisa. Transparan sejak awal (bukan gotcha). */
export default function ShieldBadge({ count }: { count: number }) {
  return (
    <span
      className="chip bg-sky-50 text-sky-700"
      title={`Kamu punya ${count} shield. Shield otomatis melindungi 1 hari kelewat tanpa mematahkan streak.`}
    >
      🛡️ {count}
    </span>
  );
}
