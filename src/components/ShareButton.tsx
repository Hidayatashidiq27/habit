"use client";

/**
 * Tombol share progres/undangan ke WhatsApp (growth loop utama di Indonesia).
 * Memakai Web Share API bila tersedia (bisa share ke WA Status/IG Story),
 * fallback ke wa.me link.
 */
export default function ShareButton({
  text,
  url,
  label = "Bagikan ke WhatsApp",
}: {
  text: string;
  url: string;
  label?: string;
}) {
  async function share() {
    const full = `${text}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Streakin", text, url });
        return;
      } catch {
        /* user batal — lanjut ke fallback */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, "_blank");
  }

  return (
    <button onClick={share} className="btn-flame w-full">
      📲 {label}
    </button>
  );
}
