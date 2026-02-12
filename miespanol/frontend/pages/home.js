import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("miespanol_token");
    const storedUser = localStorage.getItem("miespanol_user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      // Kalau admin jangan masuk sini
      if (parsed?.role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f5efe6] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-orange-600">
            ¡Hola, {user?.name || "Estudiante"}!
          </h1>
          <p className="text-gray-600 mt-2">
            Siap belajar Bahasa Spanyol hari ini?
          </p>
        </div>

        {/* PROGRESS CARD */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Progress Belajar</h2>

          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-orange-500 h-4 rounded-full w-1/3"></div>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Kamu sudah menyelesaikan 3 dari 10 pelajaran
          </p>
        </div>

        {/* OPSI BELAJAR */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Pembelajaran */}
          <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-2xl font-semibold text-orange-600 mb-2">
              📚 Pembelajaran
            </h3>
            <p className="text-gray-600 mb-4">
              Pelajari materi secara terstruktur dan tingkatkan levelmu.
            </p>
            <button
              onClick={() => router.push("/learn")}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 transition"
            >
              Mulai Belajar
            </button>
          </div>

          {/* Minigame */}
          <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-2xl font-semibold text-orange-600 mb-2">
              🎮 Minigame
            </h3>
            <p className="text-gray-600 mb-4">
              Latih kemampuanmu dengan game interaktif yang seru.
            </p>
            <button
              onClick={() => router.push("/minigame")}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 transition"
            >
              Main Sekarang
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
