// frontend/components/admin/AdminTopbar.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function AdminTopbar({ onCreateCourse }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [userName, setUserName] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("miespanol_user");
        if (raw) {
          const u = JSON.parse(raw);
          setUserName(u.name || u.email || null);
        }
      }
    } catch (e) {
      console.warn("read user failed", e);
      setUserName(null);
    }
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    }
    router.push("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!q) return;
    router.push(`/admin/courses?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="mb-6 flex items-center justify-between">
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari Materi"
          className="px-3 py-2 rounded-lg border w-72"
        />
        <button type="submit" className="px-3 py-2 bg-white rounded-lg shadow">Cari</button>
      </form>

      <div className="flex items-center gap-3">
        <button onClick={() => onCreateCourse ? onCreateCourse() : router.push('/admin/courses')} className="px-3 py-2 bg-orange-500 text-white rounded-lg font-semibold shadow">
          + Buat Course
        </button>

        <div className="px-3 py-2 bg-white rounded-lg shadow flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium">
              {mounted ? (userName || "Admin") : ""} {/* render nothing until mounted to avoid mismatch */}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
