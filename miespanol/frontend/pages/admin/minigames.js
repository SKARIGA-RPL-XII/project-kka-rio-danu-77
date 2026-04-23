// frontend/pages/admin/minigames.js
import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const PAGE_SIZE = 6;

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("miespanol_token");
}

function normalizePayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.minigames)) return data.minigames;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return null;
  const t = String(thumbnail).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return apiRoot + t;
  return `${apiRoot}/uploads/minigames/${t}`;
}

function MiniStat({ label, value, hint }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const isPublished = String(status || "").toLowerCase() === "published";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
      ].join(" ")}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

function PaginationButton({ children, active = false, disabled = false, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      className={[
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active ? "bg-orange-500 text-white" : "border bg-white text-gray-700 hover:bg-orange-50",
        disabled ? "cursor-not-allowed opacity-50 hover:bg-white" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AdminMinigamesPage() {
  const token = useMemo(() => getAuthToken(), []);
  const [loading, setLoading] = useState(false);
  const [minigames, setMinigames] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    status: "draft",
    thumbnailFile: null,
    thumbnailPreview: null,
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const successTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  useEffect(() => {
    fetchMinigames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
      setCurrentPage(1);
    }, 200);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  function showSuccess(message) {
    setSuccessMessage(message);
    setErrorMessage("");
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMessage(""), 2500);
  }

  function showError(message) {
    setErrorMessage(message);
    setSuccessMessage("");
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMessage(""), 3500);
  }

  async function fetchMinigames() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/admin/minigames`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
          window.location.href = "/login";
        }
        return;
      }

      const data = await res.json().catch(() => null);
      setMinigames(normalizePayload(data));
    } catch (err) {
      console.error("fetchMinigames error:", err);
      setMinigames([]);
      showError("Gagal memuat minigame");
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, thumbnailFile: null, thumbnailPreview: null }));
      return;
    }

    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, thumbnailFile: file, thumbnailPreview: preview }));
  }

  function resetForm() {
    setForm((prev) => {
      if (prev.thumbnailPreview && prev.thumbnailPreview.startsWith("blob:")) {
        URL.revokeObjectURL(prev.thumbnailPreview);
      }

      return {
        id: null,
        title: "",
        description: "",
        status: "draft",
        thumbnailFile: null,
        thumbnailPreview: null,
        question: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: "A",
      };
    });
  }

  function startEdit(item) {
    setForm({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      status: item.status || "draft",
      thumbnailFile: null,
      thumbnailPreview: buildImageSrc(API_ROOT, item.thumbnail_url || item.thumbnail || "") || null,
      question: item.question || "",
      option_a: item.option_a || "",
      option_b: item.option_b || "",
      option_c: item.option_c || "",
      option_d: item.option_d || "",
      correct_option: String(item.correct_option || "A").toUpperCase(),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const isEditing = !!form.id;

    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("status", form.status);
      fd.append("question", form.question);
      fd.append("option_a", form.option_a);
      fd.append("option_b", form.option_b);
      fd.append("option_c", form.option_c);
      fd.append("option_d", form.option_d);
      fd.append("correct_option", form.correct_option);

      if (form.thumbnailFile) {
        fd.append("thumbnail", form.thumbnailFile);
      }

      let url = `${API_ROOT}/api/admin/minigames`;
      let method = "POST";

      if (isEditing) {
        url = `${API_ROOT}/api/admin/minigames/${form.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || "Gagal simpan minigame");
      }

      resetForm();
      await fetchMinigames();
      showSuccess(isEditing ? "Minigame berhasil diperbarui." : "Minigame berhasil ditambahkan.");
    } catch (err) {
      alert(err.message || "Gagal simpan minigame");
      showError(err.message || "Gagal simpan minigame");
      console.error(err);
    }
  }

  async function removeMinigame(id) {
    if (!confirm("Hapus minigame ini?")) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/minigames/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Gagal menghapus");
      }

      await fetchMinigames();
      showSuccess("Minigame berhasil dihapus.");
    } catch (err) {
      alert(err.message || "Gagal hapus minigame");
      showError(err.message || "Gagal hapus minigame");
      console.error(err);
    }
  }

  const filtered = minigames.filter((m) => {
    const q = searchQuery;
    if (!q) return true;

    const title = String(m.title || "").toLowerCase();
    const desc = String(m.description || "").toLowerCase();
    const question = String(m.question || "").toLowerCase();
    const status = String(m.status || "").toLowerCase();

    return title.includes(q) || desc.includes(q) || question.includes(q) || status.includes(q);
  });

  const total = minigames.length;
  const published = minigames.filter((m) => String(m.status).toLowerCase() === "published").length;
  const draft = total - published;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />

      <div className="flex-1 max-h-screen overflow-auto p-8">
        <Topbar />

        <div className="mx-auto max-w-6xl space-y-6">
          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniStat label="Total Minigame" value={total} hint="Semua data yang tersimpan" />
            <MiniStat label="Published" value={published} hint="Siap tampil ke user" />
            <MiniStat label="Draft" value={draft} hint="Masih disimpan sementara" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <div id="minigame-form" className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {form.id ? "Edit Minigame" : "Buat Minigame Baru"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Isi soal dan 4 opsi jawaban untuk dimainkan user.
                    </p>
                  </div>

                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                    {form.id ? "Mode Edit" : "Mode Baru"}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Judul</label>
                    <input
                      className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Judul minigame"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                    <textarea
                      rows={4}
                      className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Deskripsi minigame"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Soal</label>
                    <textarea
                      rows={4}
                      className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Tulis pertanyaan di sini"
                      value={form.question}
                      onChange={(e) => setForm({ ...form, question: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Opsi A</label>
                      <input
                        className="mt-1 w-full rounded-2xl border px-4 py-3"
                        value={form.option_a}
                        onChange={(e) => setForm({ ...form, option_a: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Opsi B</label>
                      <input
                        className="mt-1 w-full rounded-2xl border px-4 py-3"
                        value={form.option_b}
                        onChange={(e) => setForm({ ...form, option_b: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Opsi C</label>
                      <input
                        className="mt-1 w-full rounded-2xl border px-4 py-3"
                        value={form.option_c}
                        onChange={(e) => setForm({ ...form, option_c: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Opsi D</label>
                      <input
                        className="mt-1 w-full rounded-2xl border px-4 py-3"
                        value={form.option_d}
                        onChange={(e) => setForm({ ...form, option_d: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Jawaban Benar</label>
                      <select
                        value={form.correct_option}
                        onChange={(e) => setForm({ ...form, correct_option: e.target.value })}
                        className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400"
                        required
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Thumbnail</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="mt-1 w-full rounded-2xl border bg-white px-4 py-3"
                    />
                  </div>

                  {form.thumbnailFile && (
                    <div className="text-xs text-gray-500">
                      File terpilih: {form.thumbnailFile.name}
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border bg-white">
                    {form.thumbnailPreview ? (
                      <img
                        src={form.thumbnailPreview}
                        alt="preview"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-gray-500">
                        Preview thumbnail
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-orange-600"
                    >
                      {form.id ? "Simpan Perubahan" : "Buat Minigame"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl bg-gray-200 px-5 py-2.5 font-semibold transition hover:bg-gray-300"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="xl:col-span-3">
              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Daftar Minigames</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Cari minigame lalu buka per halaman 6 item.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari minigame..."
                      className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400 md:w-80"
                    />
                    <div className="text-sm text-gray-500">{filtered.length} item ditemukan</div>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                    Memuat…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                    Tidak ada minigame yang cocok dengan pencarian.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {paginated.map((m) => {
                        const imgSrc = buildImageSrc(API_ROOT, m.thumbnail_url || m.thumbnail || "");

                        return (
                          <div
                            key={m.id}
                            className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md"
                          >
                            <div className="relative">
                              <div className="h-44 bg-gray-100">
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={m.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                    Tidak ada thumbnail
                                  </div>
                                )}
                              </div>

                              <div className="absolute left-3 top-3">
                                <StatusBadge status={m.status} />
                              </div>
                            </div>

                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xl font-bold text-gray-900">{m.title}</div>
                                  <div className="mt-1 text-xs text-gray-500">ID #{m.id}</div>
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-700">
                                <div className="font-semibold text-gray-800">Soal:</div>
                                <div className="mt-1 line-clamp-3">{m.question || "-"}</div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-gray-50 p-2">A: {m.option_a || "-"}</div>
                                <div className="rounded-xl bg-gray-50 p-2">B: {m.option_b || "-"}</div>
                                <div className="rounded-xl bg-gray-50 p-2">C: {m.option_c || "-"}</div>
                                <div className="rounded-xl bg-gray-50 p-2">D: {m.option_d || "-"}</div>
                              </div>

                              <div className="mt-3 text-xs text-gray-500">
                                Jawaban benar: {m.correct_option || "-"}
                              </div>

                              <div className="mt-5 flex gap-2">
                                <button
                                  type="button"
                                  className="flex-1 rounded-2xl bg-blue-500 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-600"
                                  onClick={() => startEdit(m)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 rounded-2xl bg-red-500 px-4 py-2.5 font-semibold text-white transition hover:bg-red-600"
                                  onClick={() => removeMinigame(m.id)}
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t pt-5 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-gray-500">
                        Halaman <span className="font-semibold text-gray-900">{safePage}</span> dari{" "}
                        <span className="font-semibold text-gray-900">{totalPages}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PaginationButton
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safePage === 1}
                        >
                          Sebelumnya
                        </PaginationButton>

                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                          <PaginationButton
                            key={page}
                            active={page === safePage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </PaginationButton>
                        ))}

                        <PaginationButton
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage === totalPages}
                        >
                          Berikutnya
                        </PaginationButton>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}