import { useState } from "react";
import { useRouter } from "next/router";

function decodeJwtPayload(token) {
  try {
    const p = token.split(".")[1];
    if (!p) return null;

    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export default function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const apiRoot = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  ).replace(/\/+$/, "");

  const loginUrl = `${apiRoot}/api/auth/login`;

  const simpleValidate = () => {
    if (!email.trim() || !password) {
      setErr("Isi email dan password terlebih dahulu.");
      return false;
    }

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setErr("Format email tidak valid.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);

    if (!simpleValidate()) return;

    setLoading(true);

    try {
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          "Login gagal — cek email dan password.";
        setErr(msg);
        setLoading(false);
        return;
      }

      const token = data?.token;
      let user = data?.user || null;

      // 🔎 Jika backend tidak kirim user lengkap, ambil dari JWT
      if ((!user || !user.role) && token) {
        const payload = decodeJwtPayload(token);
        if (payload) {
          user = user || {};

          if (payload.role) user.role = payload.role;
          if (payload.name) user.name = payload.name;
          if (payload.email) user.email = payload.email;
        }
      }

      const role = user?.role
        ? String(user.role).toLowerCase().trim()
        : null;

      if (!role) {
        setErr("Role tidak ditemukan pada akun.");
        setLoading(false);
        return;
      }

      // 💾 Simpan auth
      try {
        localStorage.setItem("miespanol_token", token);
        localStorage.setItem("miespanol_user", JSON.stringify(user));
      } catch (e) {
        console.warn("localStorage gagal:", e);
      }

      // 🚀 Redirect berdasarkan role
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "user") {
        router.push("/home");
      } else {
        setErr("Role tidak dikenali.");
      }
    } catch (error) {
      console.error(error);
      setErr("Network error — cek backend atau koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-4">
          <img
            src="/logo-miespanol.png"
            alt="MiEspanol"
            className="w-40 object-contain"
          />
        </div>

        <h3 className="text-2xl font-semibold text-center mb-6">Login</h3>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-gray-100 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
                disabled={loading}
              />

              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {show ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {err && <div className="text-rose-600 text-sm">{err}</div>}

          <button
            type="submit"
            className={`w-full ${
              loading ? "bg-gray-300" : "bg-gray-200"
            } text-black py-2 rounded-lg font-medium shadow-sm hover:shadow-md`}
            disabled={loading}
          >
            {loading ? "Tunggu..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Tidak punya akun?{" "}
          <a href="/register" className="text-orange-600 underline">
            buat akun
          </a>
        </p>
      </div>
    </div>
  );
}
