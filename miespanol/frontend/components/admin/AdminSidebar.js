// frontend/components/admin/AdminSidebar.js
import React from "react";
import { useRouter } from "next/router";

function Icon({ name, className = "" }) {
  const base = "w-5 h-5 " + className;

  switch (name) {
    case "dashboard":
      return (
        <svg className={base + " text-orange-700"} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="8" height="8" rx="1" strokeWidth="1.5" />
          <rect x="13" y="3" width="8" height="4" rx="1" strokeWidth="1.5" />
          <rect x="13" y="9" width="8" height="12" rx="1" strokeWidth="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1" strokeWidth="1.5" />
        </svg>
      );

    case "courses":
      return (
        <svg className={base + " text-orange-700"} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6.5C3 5.67 3.67 5 4.5 5h11c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-11C3.67 19 3 18.33 3 17.5v-11z" strokeWidth="1.5"/>
          <path d="M7 8h8M7 11h8M7 14h5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case "minigames":
      return (
        <svg className={base + " text-orange-700"} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 12a4 4 0 018 0v3a2 2 0 01-2 2H8a2 2 0 01-2-2v-3z" strokeWidth="1.5"/>
          <path d="M3 9h2M19 9h2M12 3v2M9 5l1.5 1.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="1.2"/>
        </svg>
      );

    case "users":
      return (
        <svg className={base + " text-orange-700"} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="8" r="3" strokeWidth="1.5"/>
          <path d="M2 20c1.5-4 5-6 9-6s7.5 2 9 6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="18" cy="7" r="2" strokeWidth="1.2"/>
        </svg>
      );

    case "logout":
      return (
        <svg className={base + " text-orange-700"} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 17l5-5-5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12H9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    default:
      return null;
  }
}

function NavButton({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 w-full rounded-xl py-3 px-4 font-semibold shadow-sm cursor-pointer transition
        ${active ? "bg-white text-black scale-[1.02]" : "bg-white/85 hover:bg-white"}
      `}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

export default function AdminSidebar() {
  const router = useRouter();
  const path = router.pathname || "/";

  return (
    <aside className="w-64 h-screen sticky top-0 bg-gradient-to-b from-[#F97D3B] to-[#D3993D] flex flex-col justify-between py-8 px-6 rounded-tr-3xl rounded-br-3xl shadow-lg text-black">
      <div>
        <div className="mb-8 flex justify-center">
          <img src="/logo-miespanol1.png" alt="MiEspanol logo" className="w-32" />
        </div>

        <nav className="space-y-3" aria-label="Admin sidebar">
          <NavButton
            label="Dashboard"
            icon="dashboard"
            active={path.startsWith("/admin/dashboard") || path === "/admin"}
            onClick={() => router.push("/admin/dashboard")}
          />

          <NavButton
            label="Kursus"
            icon="courses"
            active={path.startsWith("/admin/courses")}
            onClick={() => router.push("/admin/courses")}
          />

          <NavButton
            label="Minigames"
            icon="minigames"
            active={path.startsWith("/admin/minigames")}
            onClick={() => router.push("/admin/minigames")}
          />

          <NavButton
            label="Users"
            icon="users"
            active={path.startsWith("/admin/users")}
            onClick={() => router.push("/admin/users")}
          />
        </nav>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={() => { localStorage.clear(); router.push("/login"); }}
          className="flex items-center gap-3 bg-white/90 rounded-xl py-3 px-4 font-bold cursor-pointer hover:bg-white w-full"
          aria-label="Logout"
        >
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
