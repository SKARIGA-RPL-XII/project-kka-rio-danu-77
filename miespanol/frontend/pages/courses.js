import { useEffect, useState } from "react";
import Link from "next/link";
import { apiAuthFetch, getUser } from "../utils/auth";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function buildImageSrc(thumbnail) {
  if (!thumbnail) return "/default-course.png";
  const t = String(thumbnail).trim();
  if (!t) return "/default-course.png";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return API + t;
  return `${API}/uploads/courses/${t}`;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    setErr(null);
    const pathsToTry = ["/api/public/courses", "/api/admin/courses", "/api/admin/courses"];
    let got = null;
    for (const p of pathsToTry) {
      const r = await apiAuthFetch(p, { method: "GET" });
      if (r.ok && r.body) {
        if (Array.isArray(r.body)) { got = r.body; break; }
        if (Array.isArray(r.body.courses)) { got = r.body.courses; break; }
        if (Array.isArray(r.body.rows)) { got = r.body.rows; break; }
        if (r.body.courses === undefined && r.body.length === undefined) {
        }
      }
    }

    if (got) {
      setCourses(got);
    } else {
      try {
        const r2 = await fetch(`${API}/api/admin/courses`);
        const j = await r2.json().catch(()=>null);
        if (r2.ok && Array.isArray(j?.courses)) setCourses(j.courses);
        else if (r2.ok && Array.isArray(j)) setCourses(j);
        else setCourses([]);
      } catch (e) {
        setErr("Gagal mengambil data course");
        setCourses([]);
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen p-8 bg-orange-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-orange-600">Pembelajaran</h1>
          <Link href="/">
            <a className="text-sm px-4 py-2 bg-white rounded shadow">Kembali ke Home</a>
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">Pilih modul pembelajaran yang ingin kamu pelajari. Kamu akan menyimpan progress saat mulai materi.</p>
        </div>

        {loading ? (
          <div className="text-gray-500">Memuat daftar materi…</div>
        ) : err ? (
          <div className="text-red-500">{err}</div>
        ) : courses.length === 0 ? (
          <div className="text-gray-500">Belum ada course.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow p-4 flex flex-col">
                <div className="h-44 bg-gray-100 rounded overflow-hidden mb-3">
                  <img src={buildImageSrc(c.thumbnail_url)} alt={c.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1">
                  <div className="text-lg font-semibold">{c.title}</div>
                  <div className="text-sm text-gray-500">{c.category || "Pembelajaran"}</div>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-3">{c.description || ""}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/courses/${c.id}`}>
                    <a className="px-4 py-2 bg-orange-500 text-white rounded font-semibold">Buka Materi</a>
                  </Link>
                  <button
                    onClick={() => {
                      window.location.href = `/courses/${c.id}`;
                    }}
                    className="px-4 py-2 bg-white border rounded"
                  >
                    Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
