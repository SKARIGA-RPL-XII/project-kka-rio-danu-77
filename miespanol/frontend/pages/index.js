// frontend/pages/index.js
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/spain-bg-large.png')] bg-cover bg-center">
      <div className="bg-white/90 rounded-3xl shadow-2xl max-w-4xl w-full mx-4 md:mx-8 grid grid-cols-1 md:grid-cols-2">
        {/* LEFT: hero */}
        <div className="p-8 md:p-12 flex flex-col justify-center gap-6">
          <img src="/logo-miespanol.png" alt="MiEspanol" className="w-36 mx-auto" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-center">MiEspanol</h1>
          <p className="text-center text-gray-600 max-w-prose mx-auto">
            Belajar Bahasa Spanyol khusus untuk orang Indonesia materi singkat, latihan interaktif, dan minigame buat bikin belajar jadi seru.
          </p>

          <div className="flex justify-center gap-4 mt-2">
            <Link href="/login" className="px-12 py-3 rounded-full bg-orange-500 text-white font-semibold shadow hover:bg-orange-600 transition">
              Mulai Belajar
            </Link>
          </div>

          <p className="text-xs text-center text-gray-400 mt-3">
            Ánimo con tus estudios, porque si te esfuerzas, luego tendrás una chica bonita.
          </p>
        </div>

        {/* RIGHT: fitur singkat / visual */}
        <div className="hidden md:flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-3">Fitur Utama</h3>
            <ul className="text-sm text-gray-600 space-y-2 text-left">
              <li>• Pelajaran terstruktur & modul cepat</li>
              <li>• Minigame interaktif untuk latihan</li>
              <li>• Rekomendasi level & progress tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
