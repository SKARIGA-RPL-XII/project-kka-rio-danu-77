import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getUser, getToken, removeAuth } from "../utils/auth";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="48" fill="#FDBA74"/>
      <circle cx="128" cy="104" r="44" fill="#FFF7ED"/>
      <path d="M48 216c14-38 47-58 80-58s66 20 80 58" fill="#FFF7ED"/>
    </svg>
  `);

function avatarSrc(photo) {
  if (!photo) return FALLBACK_AVATAR;
  const t = String(photo).trim();
  if (!t) return FALLBACK_AVATAR;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return API_ROOT + t;
  return `${API_ROOT}/uploads/avatars/${t}`;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const cached = getUser?.();
        if (cached) setUser(cached);

        const token = getToken?.();
        if (!token) {
          router.replace("/login");
          return;
        }

        try {
          const r1 = await fetch(`${API_ROOT}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (r1.ok) {
            const j = await r1.json();
            if (j?.user) {
              setUser(j.user);
              try {
                localStorage.setItem("miespanol_user", JSON.stringify(j.user));
              } catch {}
            }
          } else if (r1.status === 401) {
            removeAuth?.();
            router.replace("/login");
            return;
          }
        } catch (e) {
          console.warn("profile fetch failed", e);
        }

        try {
          const r2 = await fetch(`${API_ROOT}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (r2.ok) {
            const jb = await r2.json();
            const progressRows = Array.isArray(jb.progress) ? jb.progress : [];

            if (progressRows.length > 0) {
              const sum = progressRows.reduce(
                (s, it) => s + (Number(it.progress_percent) || 0),
                0
              );
              setProgressPercent(Math.round(sum / progressRows.length));
            } else {
              setProgressPercent(0);
            }

            setPoints(jb.points?.points || 0);
            setLevel(jb.points?.level || 1);
          } else {
            setProgressPercent(0);
            setPoints(0);
            setLevel(1);
          }
        } catch (e) {
          console.warn("progress fetch failed", e);
          setProgressPercent(0);
          setPoints(0);
          setLevel(1);
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  function handleLogout() {
    removeAuth?.();
    try {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    } catch {}
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ed]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-md text-gray-600">
          Memuat data...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const goToDashboard = () => router.push("/dashboard");
  const goToProfile = () => router.push("/profile");
  const goToCourses = () => router.push("/courses");
  const goToMinigames = () => router.push("/minigames");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-[#f8f5ef]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-500">MiEspanol</p>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              ¡Hola, {user.name}!
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Siap belajar Bahasa Spanyol hari ini?
            </p>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <img
                src={avatarSrc(user.photo)}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-orange-100"
                alt="avatar"
              />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Level {level}</p>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    goToDashboard();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-orange-50"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    goToProfile();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-orange-50"
                >
                  Profil Saya
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Progress Belajar</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Terus belajar agar level dan poinmu naik.
                </p>
              </div>

              <div className="rounded-2xl bg-orange-50 px-4 py-3">
                <div className="text-xs text-gray-500">Poin saat ini</div>
                <div className="text-2xl font-black text-orange-600">{points}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Progress kamu:{" "}
                <span className="font-semibold text-gray-700">{progressPercent}%</span> — Level{" "}
                <span className="font-semibold text-gray-700">{level}</span>
              </p>
            </div>
          </div>

          <div className="rounded-3xl border bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-sm">
            <h2 className="text-xl font-bold">Ringkasan Akun</h2>
            <p className="mt-2 text-sm text-white/90">
              Pantau pencapaianmu dan lanjutkan belajar dari titik terakhir.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="text-xs text-white/80">Level</div>
                <div className="mt-1 text-2xl font-black">{level}</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="text-xs text-white/80">Poin</div>
                <div className="mt-1 text-2xl font-black">{points}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                📚
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Pembelajaran</h2>
                <p className="text-sm text-gray-500">
                  Pelajari materi secara bertahap dan ikuti sesi yang tersedia.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm text-gray-700">
              Cocok untuk membaca materi, membuka session, dan lanjut ke lesson satu per satu.
            </div>

            <button
              onClick={goToCourses}
              className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Mulai Belajar
            </button>
          </div>

          <div className="rounded-3xl border bg-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                🎮
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Minigame</h2>
                <p className="text-sm text-gray-500">
                  Uji pemahamanmu lewat kuis pilihan ganda yang seru.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-gray-700">
              Pilih jawaban dari 4 opsi dan kumpulkan poin dari permainan.
            </div>

            <button
              onClick={goToMinigames}
              className="mt-5 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white transition hover:bg-amber-600"
            >
              Main Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}