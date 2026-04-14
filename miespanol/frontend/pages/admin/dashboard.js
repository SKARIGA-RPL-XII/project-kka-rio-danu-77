import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";
import CourseCardAdmin from "../../components/admin/CourseCardAdmin";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("miespanol_token");
}

function normalizeCourses(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.latestCourses)) return data.latestCourses;
  if (data && Array.isArray(data.courses)) return data.courses;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [adminName, setAdminName] = useState(null);

  const token = getToken();

  useEffect(() => {
    setMounted(true);

    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("miespanol_user");
        if (raw) {
          const u = JSON.parse(raw);
          setAdminName(u.name || u.email || null);
        }
      }
    } catch (e) {
      console.warn("read user failed", e);
    }

    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/admin/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
        }
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => null);
      const latestCourses = normalizeCourses(data);

      setCourses(latestCourses);
      setTotalUsers(data?.totalUsers || 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setCourses([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCourse(courseId) {
    if (!confirm("Hapus course ini? Aksi ini tidak bisa dibatalkan.")) return;
    if (!courseId) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
        }
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || body?.message || "Gagal menghapus course");
        return;
      }

      await fetchDashboard();
    } catch (err) {
      console.error("delete course error:", err);
      alert("Terjadi kesalahan saat menghapus course.");
    }
  }

  function handleOpenMaterials(course) {
    router.push(`/admin/materials?courseId=${course.id}`);
  }

  const courseList = Array.isArray(courses) ? courses : [];
  const totalCourses = courseList.length;
  const publishedCourses = courseList.filter(
    (c) => String(c.status || "").toLowerCase() === "published"
  ).length;
  const draftCourses = courseList.filter(
    (c) => String(c.status || "").toLowerCase() !== "published"
  ).length;

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />

      <div className="flex-1 max-h-screen overflow-auto p-8">
        <Topbar onCreateCourse={() => router.push("/admin/courses")} />

        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm opacity-90">Admin Dashboard</div>
                <h1 className="mt-1 text-3xl font-black">Ringkasan MiEspanol</h1>
                <p className="mt-2 max-w-2xl text-sm opacity-90">
                  Pantau course yang sudah dibuat, lihat jumlah user, dan buka materi dengan cepat.
                </p>
              </div>

              <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                <div className="text-xs opacity-90">Selamat datang</div>
                <div className="text-lg font-bold">
                  {mounted ? (adminName || "Admin") : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Total User</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{totalUsers}</div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Total Kursus</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{totalCourses}</div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Published</div>
              <div className="mt-2 text-3xl font-black text-emerald-600">{publishedCourses}</div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">Draft</div>
              <div className="mt-2 text-3xl font-black text-amber-600">{draftCourses}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <div className="xl:col-span-3">
              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Course Terbaru</h2>
                    <p className="text-sm text-gray-500">Daftar course yang paling cepat bisa kamu kelola.</p>
                  </div>
                  <div className="text-sm text-gray-500">{totalCourses} course</div>
                </div>

                {loading ? (
                  <div className="text-gray-500">Memuat…</div>
                ) : courseList.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-500">
                    Belum ada materi.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                    {courseList.map((course) => (
                      <CourseCardAdmin
                        key={course.id}
                        apiRoot={API_ROOT}
                        course={course}
                        onOpen={handleOpenMaterials}
                        onDelete={handleDeleteCourse}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="xl:col-span-1">
              <div className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <img
                    src="/Nerd Asa.png"
                    alt="avatar"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-sm text-gray-500">Admin</div>
                    <div className="font-bold text-gray-900">
                      {mounted ? (adminName || "Admin") : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-orange-50 p-4">
                    <div className="text-xs text-gray-500">Course aktif</div>
                    <div className="mt-1 text-2xl font-black text-gray-900">{totalCourses}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}