// frontend/components/admin/AdminTopbar.js
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

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

  const pageInfo = useMemo(() => {
    const pathname = router.pathname || "";

    if (pathname.startsWith("/admin/materials")) {
      return {
        title: "Kelola Materi",
        subtitle: "Atur sesi dan pembelajaran di dalam course.",
        searchPlaceholder: "Cari course / materi",
        createLabel: "+ Buat Session",
        showSearch: true,
      };
    }

    if (pathname.startsWith("/admin/minigames")) {
      return {
        title: "Minigames",
        subtitle: "Kelola daftar minigame yang tersedia.",
        searchPlaceholder: "Cari minigame",
        createLabel: "+ Buat Minigame",
        showSearch: true,
      };
    }

    if (pathname.startsWith("/admin/users")) {
      return {
        title: "Users",
        subtitle: "Lihat data semua pengguna.",
        searchPlaceholder: "Cari user",
        createLabel: null,
        showSearch: true,
      };
    }

    return {
      title: "Kursus",
      subtitle: "Kelola kursus, thumbnail, dan materi pembelajaran.",
      searchPlaceholder: "Cari materi",
      createLabel: "+ Buat Course",
      showSearch: true,
    };
  }, [router.pathname]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    }
    router.push("/login");
  }

  function handleSearch(e) {
    e.preventDefault();

    const query = q.trim();
    if (!query) return;

    if (router.pathname.startsWith("/admin/minigames")) {
      router.push(`/admin/minigames?q=${encodeURIComponent(query)}`);
      return;
    }

    if (router.pathname.startsWith("/admin/users")) {
      router.push(`/admin/users?q=${encodeURIComponent(query)}`);
      return;
    }

    if (router.pathname.startsWith("/admin/materials")) {
      const courseId = router.query?.courseId;
      if (courseId) {
        router.push(`/admin/materials?courseId=${encodeURIComponent(courseId)}&q=${encodeURIComponent(query)}`);
      } else {
        router.push(`/admin/courses?q=${encodeURIComponent(query)}`);
      }
      return;
    }

    router.push(`/admin/courses?q=${encodeURIComponent(query)}`);
  }

  function handleCreate() {
    if (typeof onCreateCourse === "function") {
      onCreateCourse();
      return;
    }

    if (router.pathname.startsWith("/admin/materials")) {
      router.push(`/admin/materials?courseId=${router.query?.courseId || ""}`);
      return;
    }

    if (router.pathname.startsWith("/admin/minigames")) {
      const el = document.getElementById("minigame-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    router.push("/admin/courses");
  }

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-sm text-gray-500">
          {pageInfo.subtitle}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          {pageInfo.title}
        </h1>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {pageInfo.showSearch && (
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={pageInfo.searchPlaceholder}
              className="px-4 py-2 rounded-xl border bg-white w-full lg:w-80 shadow-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
            >
              Cari
            </button>
          </form>
        )}

        <div className="flex items-center gap-3">
          {pageInfo.createLabel && (
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold shadow-sm hover:bg-orange-600 transition"
            >
              {pageInfo.createLabel}
            </button>
          )}

          <div className="px-4 py-2 bg-white rounded-xl shadow-sm border flex items-center gap-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {mounted ? (userName || "Admin") : ""}
              </div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
            >
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}