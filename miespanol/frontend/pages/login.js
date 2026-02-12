// frontend/pages/login.js
import LoginCard from "../components/auth/LoginCard";

export default function LoginPage() {
  const handleLogin = async ({ email, password }) => {
    console.log("login:", email, password);
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT: single large background image (non repeating) */}
      <div className="hidden md:block md:w-1/2 pattern-left pattern-anim" />

      {/* RIGHT: gradient panel */}
      <div className="w-full md:w-1/2 gradient-right flex items-center justify-center p-6">
        <div style={{ width: "100%", maxWidth: 420 }}>
          <LoginCard onSubmit={handleLogin} />
        </div>
      </div>
    </div>
  );
}
