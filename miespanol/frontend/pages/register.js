// frontend/pages/register.js
import RegisterCard from "../components/auth/RegisterCard";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* LEFT: pattern */}
      <div className="hidden md:block md:w-1/2 pattern-left pattern-anim" />

      {/* RIGHT: gradient panel */}
      <div className="w-full md:w-1/2 gradient-right flex items-center justify-center p-6">
        <div style={{ width: "100%", maxWidth: 420 }}>
          <RegisterCard />
        </div>
      </div>
    </div>
  );
}
