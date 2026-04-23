// frontend/pages/admin/courses.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");
const PAGE_SIZE = 5;

function SmallBtn({ children, className = "", type = "button", ...props }) {
  return (
    <button
      {...props}
      type={type}
      className={
        "rounded-xl px-3 py-2 text-sm font-semibold transition hover:shadow-sm " + className
      }
    >
      {children}
    </button>
  );
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("miespanol_token");
}

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return null;

  const t = String(thumbnail).trim();
  if (!t) return null;

  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("blob:")) return t;
  if (t.startsWith("/")) return apiRoot + t;

  return `${apiRoot}/uploads/courses/${t}`;
}

function normalizeCoursesPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.courses)) return data.courses;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
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
  const s = String(status || "").toLowerCase();
  const isPublished = s === "published";

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

export default function AdminCourses() {
  const router = useRouter();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    status: "draft",
    thumbnailFile: null,
    thumbnailPreview: null,
  });

  const [openCourseId, setOpenCourseId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [lessonsBySession, setLessonsBySession] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const successTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  const token = useMemo(() => getAuthToken(), []);

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

  useEffect(() => {
    fetchCourses();
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

  function resetPage() {
    setCurrentPage(1);
  }

  async function fetchCourses() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses`, {
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
      const normalized = normalizeCoursesPayload(data);
      setCourses(normalized);
    } catch (err) {
      console.error("Fetch courses error:", err);
      setCourses([]);
      showError("Gagal memuat course");
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];

    if (!file) {
      setForm((prev) => ({
        ...prev,
        thumbnailFile: null,
        thumbnailPreview: null,
      }));
      return;
    }

    const preview = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      thumbnailFile: file,
      thumbnailPreview: preview,
    }));
  }

  async function handleSubmit(e) {
  e.preventDefault();

  const isEditing = !!form.id;

  try {
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("category", "learning");
    fd.append("status", form.status);

    if (form.thumbnailFile) {
      fd.append("thumbnail", form.thumbnailFile);
    }

    let url = `${API_ROOT}/api/admin/courses`;
    let method = "POST";

    if (isEditing) {
      url = `${API_ROOT}/api/admin/courses/${form.id}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || body?.message || "Gagal menyimpan course");
    }

    await fetchCourses();

    showSuccess(
      isEditing ? "Course berhasil diperbarui." : "Course berhasil ditambahkan."
    );

    resetForm();
  } catch (err) {
    showError(err.message || "Gagal menyimpan course");
    console.error(err);
  }
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
      };
    });
  }

  function startEdit(course) {
    const currentThumbnail = course.thumbnail_url || course.thumbnail || "";

    setForm({
      id: course.id,
      title: course.title || "",
      description: course.description || "",
      status: course.status || "draft",
      thumbnailFile: null,
      thumbnailPreview: buildImageSrc(API_ROOT, currentThumbnail),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeCourse(id) {
    if (!confirm("Hapus course ini?")) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Gagal menghapus");
      }

      await fetchCourses();
      showSuccess("Course berhasil dihapus.");
    } catch (err) {
      showError(err.message || "Gagal hapus course");
      console.error(err);
    }
  }

  async function loadSessions(courseId) {
    const nextOpenId = courseId === openCourseId ? null : courseId;
    setOpenCourseId(nextOpenId);

    if (nextOpenId === null) {
      setSessions([]);
      return;
    }

    setSessions([]);
    setLessonsBySession({});

    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${courseId}/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json().catch(() => null);
      setSessions(body?.sessions || body?.rows || body || []);
    } catch (err) {
      console.error("loadSessions", err);
      setSessions([]);
      showError("Gagal memuat session");
    }
  }

  async function createSession(courseId) {
    const title = prompt("Judul session baru:");
    if (!title) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: courseId, title }),
      });

      if (!res.ok) throw new Error("Gagal buat session");
      await loadSessions(courseId);
      showSuccess("Session berhasil ditambahkan.");
    } catch (err) {
      showError(err.message || "Gagal buat session");
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm("Hapus session? Semua lesson di dalamnya akan ikut terhapus.")) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("Gagal hapus session");
      await loadSessions(openCourseId);
      showSuccess("Session berhasil dihapus.");
    } catch (err) {
      showError(err.message || "Gagal hapus session");
    }
  }

  async function loadLessons(sessionId) {
    try {
      const res = await fetch(`${API_ROOT}/api/admin/sessions/${sessionId}/lessons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json().catch(() => null);

      setLessonsBySession((prev) => ({
        ...prev,
        [sessionId]: body?.lessons || body?.rows || body || [],
      }));
    } catch (err) {
      console.error("loadLessons", err);
      setLessonsBySession((prev) => ({ ...prev, [sessionId]: [] }));
      showError("Gagal memuat lesson");
    }
  }

  async function createLesson(sessionId) {
    const title = prompt("Judul lesson:");
    if (!title) return;

    const content = prompt("Isi singkat / link (boleh kosong):", "");

    try {
      const res = await fetch(`${API_ROOT}/api/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          title,
          content,
          content_type: "article",
        }),
      });

      if (!res.ok) throw new Error("Gagal buat lesson");
      await loadLessons(sessionId);
      showSuccess("Lesson berhasil ditambahkan.");
    } catch (err) {
      showError(err.message || "Gagal buat lesson");
    }
  }

  async function deleteLesson(lesson) {
    if (!confirm("Hapus lesson?")) return;

    try {
      const res = await fetch(`${API_ROOT}/api/admin/lessons/${lesson.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("Gagal hapus lesson");
      await loadLessons(lesson.session_id);
      showSuccess("Lesson berhasil dihapus.");
    } catch (err) {
      showError(err.message || "Gagal hapus lesson");
    }
  }

  const courseList = Array.isArray(courses) ? courses : [];
  const publishedCount = courseList.filter((c) => String(c.status).toLowerCase() === "published").length;
  const draftCount = courseList.length - publishedCount;

  const filteredCourses = courseList.filter((c) => {
    const q = searchQuery;
    if (!q) return true;

    const title = String(c.title || "").toLowerCase();
    const desc = String(c.description || "").toLowerCase();
    const status = String(c.status || "").toLowerCase();

    return title.includes(q) || desc.includes(q) || status.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + PAGE_SIZE);

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
            <div className="fixed right-6 top-6 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniStat label="Total Course" value={courseList.length} hint="Semua course tersimpan" />
            <MiniStat label="Published" value={publishedCount} hint="Siap dipakai user" />
            <MiniStat label="Draft" value={draftCount} hint="Masih perlu dipoles" />
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {form.id ? "Edit Course" : "Buat Course Baru"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Atur judul, deskripsi, status, dan thumbnail course.
                </p>
              </div>

              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {form.id ? "Mode Edit" : "Mode Baru"}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Judul</label>
                  <input
                    className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Judul course"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea
                    rows={5}
                    className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Deskripsi course"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Kategori</label>
                    <input
                      className="mt-1 w-full rounded-2xl border bg-gray-100 px-4 py-3 text-gray-500 outline-none"
                      value="learning"
                      disabled
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                  >
                    {form.id ? "Simpan Perubahan" : "Buat Course"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <div className="rounded-3xl border bg-[#fffaf5] p-4">
                  <div className="text-sm font-semibold text-gray-700">Thumbnail</div>

                  <input
                    key={form.id || "new"}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="mt-3 w-full rounded-2xl border bg-white px-4 py-3"
                  />

                  {form.thumbnailFile && (
                    <div className="mt-2 text-xs text-gray-500">
                      File terpilih: {form.thumbnailFile.name}
                    </div>
                  )}

                  <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
                    {form.thumbnailPreview ? (
                      <img
                        src={form.thumbnailPreview}
                        alt="preview"
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                        Preview thumbnail
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Daftar Course</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cari course lalu buka per halaman 5 item.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    resetPage();
                  }}
                  placeholder="Cari course..."
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400 md:w-80"
                />
                <div className="text-sm text-gray-500">{filteredCourses.length} course ditemukan</div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                Memuat…
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                Tidak ada course yang cocok dengan pencarian.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedCourses.map((c) => {
                    const thumb = c.thumbnail_url || c.thumbnail || "";
                    const imgSrc = thumb ? buildImageSrc(API_ROOT, thumb) : null;

                    return (
                      <div
                        key={c.id}
                        className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
                          <div className="h-56 bg-gray-100">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={c.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                                Tidak ada thumbnail
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="max-w-2xl">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-2xl font-black text-gray-900">{c.title}</h4>
                                  <StatusBadge status={c.status} />
                                </div>

                                <div className="mt-1 text-sm text-gray-500">
                                  {c.category || "learning"}
                                </div>

                                <div className="mt-3 text-sm leading-6 text-gray-700">
                                  {(c.description || "").slice(0, 260) || "Tidak ada deskripsi."}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                                <SmallBtn
                                  className="bg-blue-500 text-white hover:bg-blue-600"
                                  onClick={() => startEdit(c)}
                                >
                                  Edit
                                </SmallBtn>

                                <SmallBtn
                                  className="bg-red-500 text-white hover:bg-red-600"
                                  onClick={() => removeCourse(c.id)}
                                >
                                  Hapus
                                </SmallBtn>

                                <SmallBtn
                                  className="bg-purple-500 text-white hover:bg-purple-600"
                                  onClick={() => router.push(`/admin/materials?courseId=${c.id}`)}
                                >
                                  Kelola Materi
                                </SmallBtn>
                              </div>
                            </div>

                            {openCourseId === c.id && (
                              <div className="mt-6 rounded-3xl border bg-orange-50/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">Session Course</div>
                                    <div className="text-xs text-gray-500">
                                      Klik lesson untuk melihat isi materi di backend admin.
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => createSession(c.id)}
                                    className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                                  >
                                    Buat Session
                                  </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                  {sessions.length === 0 ? (
                                    <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
                                      Belum ada session
                                    </div>
                                  ) : (
                                    sessions.map((s) => (
                                      <div
                                        key={s.id}
                                        className="rounded-3xl border bg-white p-4 shadow-sm"
                                      >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                          <div>
                                            <div className="font-semibold text-gray-900">
                                              {s.title}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Session ID: {s.id}
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap gap-2">
                                            <SmallBtn
                                              className="bg-blue-400 text-white hover:bg-blue-500"
                                              onClick={async () => {
                                                const newTitle = prompt("Edit session:", s.title);
                                                if (!newTitle) return;

                                                try {
                                                  const res = await fetch(
                                                    `${API_ROOT}/api/admin/sessions/${s.id}`,
                                                    {
                                                      method: "PUT",
                                                      headers: {
                                                        "Content-Type": "application/json",
                                                        ...(token
                                                          ? { Authorization: `Bearer ${token}` }
                                                          : {}),
                                                      },
                                                      body: JSON.stringify({ title: newTitle }),
                                                    }
                                                  );

                                                  if (!res.ok) throw new Error("Gagal update session");
                                                  await loadSessions(c.id);
                                                  showSuccess("Session berhasil diperbarui.");
                                                } catch (err) {
                                                  showError(err.message || "Gagal update session");
                                                }
                                              }}
                                            >
                                              Edit
                                            </SmallBtn>

                                            <SmallBtn
                                              className="bg-red-400 text-white hover:bg-red-500"
                                              onClick={() => deleteSession(s.id)}
                                            >
                                              Hapus
                                            </SmallBtn>

                                            <SmallBtn
                                              className="bg-indigo-500 text-white hover:bg-indigo-600"
                                              onClick={() => loadLessons(s.id)}
                                            >
                                              Lessons
                                            </SmallBtn>

                                            <SmallBtn
                                              className="bg-green-500 text-white hover:bg-green-600"
                                              onClick={() => createLesson(s.id)}
                                            >
                                              Buat Lesson
                                            </SmallBtn>
                                          </div>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                          {(lessonsBySession[s.id] || []).map((L) => (
                                            <div
                                              key={L.id}
                                              className="flex flex-col gap-3 rounded-2xl border bg-gray-50 p-3 md:flex-row md:items-center md:justify-between"
                                            >
                                              <div>
                                                <div className="font-medium text-gray-900">
                                                  {L.title}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                  {(L.content || "").slice(0, 80)}
                                                </div>
                                              </div>

                                              <div className="flex gap-2">
                                                <SmallBtn
                                                  className="bg-blue-400 text-white hover:bg-blue-500"
                                                  onClick={async () => {
                                                    const newTitle = prompt("Judul baru:", L.title);
                                                    if (!newTitle) return;
                                                    const newContent = prompt("Isi baru:", L.content || "");

                                                    try {
                                                      const res = await fetch(
                                                        `${API_ROOT}/api/admin/lessons/${L.id}`,
                                                        {
                                                          method: "PUT",
                                                          headers: {
                                                            "Content-Type": "application/json",
                                                            ...(token
                                                              ? { Authorization: `Bearer ${token}` }
                                                              : {}),
                                                          },
                                                          body: JSON.stringify({
                                                            title: newTitle,
                                                            content: newContent,
                                                          }),
                                                        }
                                                      );

                                                      if (!res.ok) throw new Error("Gagal update lesson");
                                                      await loadLessons(s.id);
                                                      showSuccess("Lesson berhasil diperbarui.");
                                                    } catch (err) {
                                                      showError(err.message || "Gagal update lesson");
                                                    }
                                                  }}
                                                >
                                                  Edit
                                                </SmallBtn>

                                                <SmallBtn
                                                  className="bg-red-400 text-white hover:bg-red-500"
                                                  onClick={() => deleteLesson(L)}
                                                >
                                                  Hapus
                                                </SmallBtn>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
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
  );
}