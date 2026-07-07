import BottomNav from "./BottomNav";
import InstallPrompt from "./InstallPrompt";

/** Kerangka halaman: konten mobile-first max-w-md + nav bawah + prompt install. */
export default function AppShell({
  children,
  title,
  right,
}: {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      {title && (
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>
          {right}
        </header>
      )}
      <main className="px-4 py-4">{children}</main>
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
