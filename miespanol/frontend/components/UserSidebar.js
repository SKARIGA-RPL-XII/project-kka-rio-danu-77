// frontend/components/UserSidebar.js
import React from "react";
import { useRouter } from "next/router";

function Icon({ name }) {
  // simple inline SVG icons
  if (name === "home") return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
  if (name === "profile") return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
  if (name === "progress") return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
  if (name === "logout") return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
  return null;
}

export default function UserSidebar({ onNavigate }) {
  const router = useRouter();
  return (
    <aside className="w-64 h-screen sticky top-0 bg-gradient-to-b from-[#F97D3B] to-[#D3993D] flex flex-col justify-between py-8 px-6 rounded-tr-3xl rounded-br-3xl shadow-lg">
      <div>
        <div className="mb-6 flex justify-center">
          <img src="/logo-miespanol.png" alt="MiEspanol" className="w-32 object-contain" />
        </div>

        <nav className="space-y-4">
          <button
            onClick={() => (onNavigate ? onNavigate("/dashboard") : router.push("/dashboard"))}
            className="flex items-center gap-3 w-full bg-white/90 text-black rounded-xl py-3 px-4 font-bold shadow hover:scale-[1.02] transition"
          >
            <Icon name="home" /><span>Dashboard</span>
          </button>

          <button
            onClick={() => (onNavigate ? onNavigate("/profile") : router.push("/profile"))}
            className="flex items-center gap-3 w-full bg-white/85 text-black rounded-xl py-3 px-4 font-semibold shadow-sm hover:bg-white transition"
          >
            <Icon name="profile" /><span>Profil</span>
          </button>

          <button
            onClick={() => (onNavigate ? onNavigate("/progress") : router.push("/progress"))}
            className="flex items-center gap-3 w-full bg-white/85 text-black rounded-xl py-3 px-4 font-semibold shadow-sm hover:bg-white transition"
          >
            <Icon name="progress" /><span>Progres</span>
          </button>
        </nav>
      </div>

      <div>
        <button
          onClick={() => { if (onNavigate) onNavigate("/logout"); else { localStorage.clear(); router.push("/login"); } }}
          className="flex items-center gap-3 w-full bg-white/90 text-black rounded-xl py-3 px-4 font-bold shadow hover:bg-white transition"
        >
          <Icon name="logout" /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
