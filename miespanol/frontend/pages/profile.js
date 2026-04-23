import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getUser, getToken, removeAuth } from "../utils/auth";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="48" fill="#FDBA74"/>
      <circle cx="128" cy="104" r="44" fill="#FFF7ED"/>
      <path d="M48 216c14-38 47-58 80-58s66 20 80 58" fill="#FFF7ED"/>
    </svg>
  `);

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString("id-ID");
  }
}

function buildImageSrc(apiRoot, src) {
  if (!src) return FALLBACK_AVATAR;
  const t = String(src).trim();
  if (!t) return FALLBACK_AVATAR;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return apiRoot + t;
  return `${apiRoot}/uploads/avatars/${t}`;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    photoFile: null,
    photoPreview: "",
  });

  const token = useMemo(() => getToken?.(), []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const cached = getUser?.();
        if (cached) {
          setUser(cached);
          setForm((prev) => ({
            ...prev,
            name: cached.name || "",
            photoPreview: cached.photo || "",
          }));
        }

        if (!token) {
          router.replace("/login");
          return;
        }

        const r1 = await fetch(`${API_ROOT}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (r1.status === 401) {
          removeAuth?.();
          router.replace("/login");
          return;
        }

        if (r1.ok) {
          const j = await r1.json();
          const u = j?.user || j || null;

          if (u) {
            setUser(u);
            setForm({
              name: u.name || "",
              photoFile: null,
              photoPreview: u.photo || "",
            });

            try {
              localStorage.setItem("miespanol_user", JSON.stringify(u));
            } catch {}
          }
        }
      } catch (err) {
        console.error("profile init error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router, token]);

  function onPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, photoFile: null }));
      return;
    }

    const preview = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      photoFile: file,
      photoPreview: preview,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return router.replace("/login");

    try {
      setSaving(true);

      const fd = new FormData();
      fd.append("name", form.name);

      if (form.photoFile) {
        fd.append("photo", form.photoFile);
      }

      const res = await fetch(`${API_ROOT}/api/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || body?.error || "Gagal menyimpan profil");
      }

      const data = await res.json();
      const updatedUser = data?.user || data?.profile || null;

      if (updatedUser) {
        setUser(updatedUser);
        setForm({
          name: updatedUser.name || "",
          photoFile: null,
          photoPreview: updatedUser.photo || "",
        });

        try {
          localStorage.setItem("miespanol_user", JSON.stringify(updatedUser));
        } catch {}
      }

      alert("Profil berhasil disimpan");
      router.push("/dashboard");
    } catch (err) {
      alert(err.message || "Gagal menyimpan profil");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7ed]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-md text-gray-600">
          Memuat profil...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const avatarSrc = buildImageSrc(API_ROOT, form.photoPreview || user.photo);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-[#f8f5ef]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              ← Kembali ke Dashboard
            </button>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Profil Saya</h1>
            <p className="mt-1 text-sm text-gray-600">
              Atur nama dan foto profilmu di sini.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={avatarSrc}
                alt="avatar"
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-orange-100"
              />
              <div>
                <div className="text-xs text-gray-500">Akun aktif</div>
                <div className="text-2xl font-black text-gray-900">{user.name}</div>
                <div className="mt-1 text-sm text-gray-500">{user.email || "-"}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">Terdaftar</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {formatDateTime(user.created_at || user.createdAt)}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Profil</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Ganti nama dan foto profil.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nama</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Nama kamu"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Foto Profil</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoChange}
                    className="mt-1 w-full rounded-2xl border bg-white px-4 py-3"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Jika tidak memilih file baru, foto lama tetap dipakai.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>

              <div>
                <div className="rounded-3xl border bg-[#fffaf5] p-4">
                  <div className="text-sm font-medium text-gray-700">Preview</div>
                  <div className="mt-4 flex justify-center">
                    <img
                      src={avatarSrc}
                      alt="preview"
                      className="h-48 w-48 rounded-3xl object-cover ring-4 ring-orange-100"
                    />
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Nama:{" "}
                    <span className="font-semibold text-gray-900">
                      {form.name || user.name}
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}