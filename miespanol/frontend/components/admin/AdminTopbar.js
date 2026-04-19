// frontend/components/admin/AdminTopbar.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function AdminTopbar({ onCreateCourse }) {
  const router = useRouter();
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

  const pageInfo = (() => {
    const pathname = router.pathname || "";

    if (pathname.startsWith("/admin/materials")) {
      return {
        title: "Kelola Materi",
        subtitle: "Atur sesi dan pembelajaran di dalam course.",
        createLabel: "+ Buat Session",
      };
    }

    if (pathname.startsWith("/admin/minigames")) {
      return {
        title: "Minigames",
        subtitle: "Kelola daftar minigame yang tersedia.",
        createLabel: "+ Buat Minigame",
      };
    }

    if (pathname.startsWith("/admin/users")) {
      return {
        title: "Users",
        subtitle: "Lihat data semua pengguna.",
        createLabel: null,
      };
    }

    return {
      title: "Kursus",
      subtitle: "Kelola kursus, thumbnail, dan materi pembelajaran.",
      createLabel: "+ Buat Course",
    };
  })();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    }
    router.push("/login");
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
        <div className="text-sm text-gray-500">{pageInfo.subtitle}</div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{pageInfo.title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {pageInfo.createLabel && (
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            {pageInfo.createLabel}
          </button>
        )}

        <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-2 shadow-sm">
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {mounted ? (userName || "Admin") : ""}
            </div>
            <div className="text-xs text-gray-500">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}