export const metadata = { title: "Offline" };

/** Halaman fallback saat perangkat offline (dilayani oleh service worker). */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="mt-4 text-xl font-extrabold text-slate-900">Kamu sedang offline</h1>
      <p className="mt-2 text-slate-500">
        Sambungkan internet untuk check-in dan lihat leaderboard terbaru. Progres kamu aman kok!
      </p>
    </div>
  );
}
