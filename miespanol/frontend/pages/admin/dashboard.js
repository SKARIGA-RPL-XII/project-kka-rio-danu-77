// frontend/pages/admin/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";
import CourseCardAdmin from "../../components/admin/CourseCardAdmin";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export default function AdminDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [mounted, setMounted] = useState(false);
  const [adminName, setAdminName] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("miespanol_token") : null;

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
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.status === 401) {
        // token expired / invalid -> clear and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
        }
        router.push("/login");
        return;
      }
      const data = await res.json().catch(()=>null);
      setCourses(data?.latestCourses || data?.courses || data || []);
      setTotalUsers(data?.totalUsers || 0);
      setTotalCourses(data?.totalCourses || (Array.isArray(data?.latestCourses) ? data.latestCourses.length : (Array.isArray(data) ? data.length : 0)));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(course) {
    router.push(`/admin/courses?edit=${course.id}`);
  }

  function handleOpenMaterials(course) {
    router.push(`/admin/courses/${course.id}/sessions`);
  }

  async function handleDeleteCourse(courseId) {
    if (!confirm("Hapus course ini? Aksi ini tidak bisa dibatalkan.")) return;
    if (!courseId) return;

    setDeletingId(courseId);
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("miespanol_token") : null;
      const res = await fetch(`${API_ROOT}/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: t ? `Bearer ${t}` : "" }
      });

      if (res.status === 401) {
        // unauthorized
        alert("Sesi berakhir. Silakan login ulang.");
        localStorage.removeItem("miespanol_token");
        localStorage.removeItem("miespanol_user");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(()=>null);
        console.error("Delete failed:", res.status, body);
        alert(body?.error || body?.message || "Gagal menghapus course");
        return;
      }

      // success: refresh list
      await fetchDashboard();
    } catch (err) {
      console.error("delete course error:", err);
      alert("Terjadi kesalahan saat menghapus (network/server). Cek console.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />

      <div className="flex-1 max-h-screen overflow-auto p-8">
        <Topbar onCreateCourse={() => router.push("/admin/courses")} />

        <div className="flex items-start gap-8">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-extrabold">Dashboard</h1>
              <div className="text-sm text-gray-500">Selamat datang, {mounted ? (adminName || "Admin") : ""}</div>
            </div>

            {loading ? (
              <div className="text-gray-500">Memuat…</div>
            ) : !courses || courses.length === 0 ? (
              <div className="text-gray-500">Belum ada materi</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCardAdmin
                    key={course.id}
                    apiRoot={API_ROOT}
                    course={course}
                    onEdit={handleEdit}
                    onOpen={handleOpenMaterials}
                    onDelete={handleDeleteCourse}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="w-72 hidden lg:block">
            <div className="bg-white rounded-xl shadow-lg p-4 mb-5 flex items-center gap-3">
              <img src="/Nerd Asa.png" alt="avatar" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="text-sm text-gray-500">Admin</div>
                <div className="font-bold">{mounted ? (adminName || "Admin") : ""}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="text-sm text-gray-600">Total User</div>
                <div className="text-3xl font-extrabold mt-2 text-center">{totalUsers}</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow">
                <div className="text-sm text-gray-600">Total Kursus</div>
                <div className="text-3xl font-extrabold mt-2 text-center">{totalCourses}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
