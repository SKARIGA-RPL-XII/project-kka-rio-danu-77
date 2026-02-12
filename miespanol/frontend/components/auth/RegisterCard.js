// frontend/components/RegisterCard.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); // false = password hidden (masked)
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const apiRoot = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const apiBase = apiRoot.replace(/\/+$/, "") + "/api";

  const validate = () => {
    if (!name.trim() || !email.trim() || !password) {
      setFeedback({ type: "error", text: "Lengkapi semua field." });
      return false;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setFeedback({ type: "error", text: "Format email tidak valid." });
      return false;
    }
    if (password.length < 6) {
      setFeedback({ type: "error", text: "Password minimal 6 karakter." });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data?.error || "Registrasi gagal." });
      } else {
        setFeedback({ type: "success", text: "Registrasi berhasil. Mengarahkan ke login..." });
        setName("");
        setEmail("");
        setPassword("");
        setTimeout(() => router.push("/login"), 1200);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: "Network error — cek backend." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/logo-miespanol.png" alt="MiEspanol" className="w-40 object-contain" />
        </div>

        <h3 className="text-2xl font-semibold text-center mb-4">Register</h3>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Nama</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="w-full rounded-lg bg-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              className="w-full rounded-lg bg-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full rounded-lg bg-gray-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-300"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                title={show ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {/*
                  Inverted icon logic:
                  - show === false (masked) -> display eye-open (indicates "you can view")
                  - show === true  (visible) -> display eye-closed (indicates "click to hide")
                */}
                {!show ? (
                  /* eye open (masked state -> suggest "show") */
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                ) : (
                  /* eye closed / eye-off (visible state -> suggest "hide") */
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.477 10.477A3 3 0 0113.523 13.523" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full ${loading ? "bg-gray-300" : "bg-gray-200"} text-black py-2 rounded-lg font-medium shadow-sm hover:shadow-md`}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Register"}
          </button>
        </form>

        {feedback && (
          <div className={`mt-4 text-center text-sm ${feedback.type === "error" ? "text-rose-600" : "text-emerald-600"}`}>
            {feedback.text}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Punya akun?{" "}
          <a href="/login" className="text-orange-600 underline">
            kembali
          </a>
        </p>
      </div>
    </div>
  );
}
