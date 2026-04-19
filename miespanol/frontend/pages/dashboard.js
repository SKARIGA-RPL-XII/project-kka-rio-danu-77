import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getUser, getToken } from "../utils/auth";

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

function normalizeLearningProgress(data, pointsValue = 0) {
  if (!data || typeof data !== "object") {
    return Math.max(0, Math.min(100, Number(pointsValue) % 100));
  }

  if (typeof data.progress_percent === "number") {
    const learning = Math.max(0, Math.min(100, Math.round(data.progress_percent)));
    if (learning > 0) return learning;
  }

  const rows = Array.isArray(data.progress) ? data.progress : [];
  if (rows.length > 0) {
    const sum = rows.reduce((total, row) => total + (Number(row.progress_percent) || 0), 0);
    const avg = Math.round(sum / rows.length);
    if (avg > 0) return avg;
  }

  return Math.max(0, Math.min(100, Number(pointsValue) % 100));
}

function normalizePointsProgress(data) {
  if (!data || typeof data !== "object") return { points: 0, level: 1 };

  if (typeof data.points === "number" && typeof data.level === "number") {
    return {
      points: Number(data.points || 0),
      level: Number(data.level || 1),
    };
  }

  if (data.points && typeof data.points === "object") {
    return {
      points: Number(data.points.points || 0),
      level: Number(data.points.level || 1),
    };
  }

  return { points: 0, level: 1 };
}

function StatCard({ label, value, hint, accent = "orange" }) {
  const accents = {
    orange: "bg-orange-50 text-orange-600",
    amber: "bg-amber-50 text-amber-600",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-2 text-3xl font-black ${accents[accent] || accents.orange}`}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-sm text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);

  const token = useMemo(() => getToken?.(), []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const cached = getUser?.();
        if (cached) setUser(cached);

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
            const u = j?.user || j;
            if (u) {
              setUser(u);
              try {
                localStorage.setItem("miespanol_user", JSON.stringify(u));
              } catch {}
            }
          } else if (r1.status === 401) {
            router.replace("/login");
            return;
          }
        } catch (e) {
          console.warn("profile fetch failed", e);
        }

        let progressData = null;
        try {
          const r2 = await fetch(`${API_ROOT}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (r2.ok) {
            progressData = await r2.json().catch(() => null);
          }
        } catch (e) {
          console.warn("progress fetch failed", e);
        }

        let pointsData = null;
        try {
          const r3 = await fetch(`${API_ROOT}/api/minigames/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (r3.ok) {
            pointsData = await r3.json().catch(() => null);
          }
        } catch (e) {
          console.warn("points fetch failed", e);
        }

        const normalizedPoints = normalizePointsProgress(pointsData);
        setPoints(normalizedPoints.points);
        setLevel(normalizedPoints.level);

        const progressValue = normalizeLearningProgress(progressData, normalizedPoints.points);
        setProgressPercent(progressValue);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ed]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-md text-gray-600">
          Memuat dashboard...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const progressColor =
    progressPercent >= 80
      ? "from-emerald-400 to-emerald-500"
      : progressPercent >= 40
      ? "from-orange-400 to-amber-500"
      : "from-orange-300 to-orange-500";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-[#f8f5ef]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-500">MiEspanol</p>
            <h1 className="mt-1 text-3xl font-black text-gray-900 sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Ringkasan akun, progres belajar, dan pintasan fitur utama.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="rounded-2xl border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md"
            >
              Home
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <img
                src={avatarSrc(user.photo)}
                alt="avatar"
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-orange-100"
              />
              <div className="mt-4">
                <div className="text-xs text-gray-500">Akun aktif</div>
                <div className="text-2xl font-black text-gray-900">{user.name}</div>
                <div className="mt-1 text-sm text-gray-500">{user.email || "-"}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Buka Profil
              </button>
              <button
                type="button"
                onClick={() => router.push("/courses")}
                className="w-full rounded-2xl border bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-orange-50"
              >
                Lanjut Course
              </button>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Progress Belajar</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Cek perkembanganmu dan lanjutkan dari titik terakhir.
                </p>
              </div>

              <div className="rounded-2xl bg-orange-50 px-4 py-3">
                <div className="text-xs text-gray-500">Poin saat ini</div>
                <div className="text-3xl font-black text-orange-600">{points}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full bg-gradient-to-r ${progressColor} transition-all`}
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

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="Level" value={level} hint="Naik lewat XP" />
              <StatCard
                label="Poin"
                value={points}
                hint="Didapat dari belajar dan game"
                accent="amber"
              />
              <StatCard label="Status" value="Aktif" hint="Akun siap digunakan" accent="gray" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                📊
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Ringkasan Aktivitas</h2>
                <p className="text-sm text-gray-500">
                  Lihat status singkat dari akun dan perkembanganmu.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-orange-50 p-4 text-sm text-gray-700">
              <p>• Belajar bisa dilanjutkan dari course yang tersedia.</p>
              <p>• Jawaban benar di minigame menambah poin dan level.</p>
              <p>• Profil bisa diperbarui kapan saja dari halaman profil.</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                ⭐
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Status Perkembangan</h2>
                <p className="text-sm text-gray-500">
                  Ringkasan yang cocok untuk melihat posisi akun saat ini.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard label="Progress" value={`${progressPercent}%`} accent="orange" />
              <StatCard label="Level" value={level} accent="amber" />
              <StatCard label="Poin" value={points} accent="gray" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}