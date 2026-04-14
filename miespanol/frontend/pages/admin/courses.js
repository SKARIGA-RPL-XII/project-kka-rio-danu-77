// frontend/pages/admin/courses.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function SmallBtn({ children, className = "", type = "button", ...props }) {
  return (
    <button {...props} type={type} className={"px-3 py-1 rounded text-sm " + className}>
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

export default function AdminCourses() {
  const router = useRouter();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    category: "learning",
    status: "draft",
    thumbnailFile: null,
    thumbnailPreview: null,
  });

  const [openCourseId, setOpenCourseId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [lessonsBySession, setLessonsBySession] = useState({});

  const token = useMemo(() => getAuthToken(), []);

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      console.log("fetchCourses response:", res.status, data);

      const normalized = normalizeCoursesPayload(data);
      setCourses(normalized);
    } catch (err) {
      console.error("Fetch courses error:", err);
      setCourses([]);
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

    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("status", form.status);

      if (form.thumbnailFile) {
        fd.append("thumbnail", form.thumbnailFile);
      }

      let url = `${API_ROOT}/api/admin/courses`;
      let method = "POST";

      if (form.id) {
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

      resetForm();
      fetchCourses();
    } catch (err) {
      alert(err.message || "Gagal menyimpan course");
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
        category: "learning",
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
      category: course.category || "learning",
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

      fetchCourses();
    } catch (err) {
      alert(err.message || "Gagal hapus");
      console.error(err);
    }
  }

  async function loadSessions(courseId) {
    setOpenCourseId(courseId === openCourseId ? null : courseId);

    if (courseId === openCourseId) {
      setSessions([]);
      return;
    }

    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${courseId}/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json().catch(() => null);
      setSessions(body?.sessions || body?.rows || body || []);
    } catch (err) {
      console.error("loadSessions", err);
      setSessions([]);
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
    } catch (err) {
      alert(err.message || "Gagal buat session");
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
    } catch (err) {
      alert(err.message || "Gagal hapus session");
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
    } catch (err) {
      alert(err.message || "Gagal buat lesson");
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
    } catch (err) {
      alert(err.message || "Gagal hapus lesson");
    }
  }

  const courseList = Array.isArray(courses) ? courses : [];

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />

      <div className="flex-1 p-8 max-h-screen overflow-auto">
        <Topbar />

        <div className="max-w-5xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-bold">
              {form.id ? "Edit Course" : "Buat Course Baru"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <input
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Judul course"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />

                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Deskripsi"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div className="flex gap-3">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Thumbnail</div>

                <input
                  key={form.id || "new"}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />

                {form.thumbnailFile && (
                  <div className="text-xs text-gray-500">
                    File terpilih: {form.thumbnailFile.name}
                  </div>
                )}

                {form.thumbnailPreview && (
                  <img
                    src={form.thumbnailPreview}
                    alt="preview"
                    className="w-full h-36 object-cover rounded"
                  />
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    className="bg-orange-500 text-white px-4 py-2 rounded font-bold"
                  >
                    {form.id ? "Simpan Perubahan" : "Buat Course"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-200 px-4 py-2 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Daftar Course</h3>
              <div className="text-sm text-gray-500">{courseList.length} course</div>
            </div>

            {loading ? (
              <div>Memuat…</div>
            ) : (
              <div className="space-y-4">
                {courseList.map((c) => {
                  const thumb = c.thumbnail_url || c.thumbnail || "";
                  const imgSrc = thumb ? buildImageSrc(API_ROOT, thumb) : null;

                  return (
                    <div key={c.id} className="p-4 border rounded bg-white">
                      <div className="md:flex gap-4">
                        <div className="w-full md:w-48">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={c.title}
                              className="w-full h-28 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-full h-28 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              Tidak ada thumbnail
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-lg">{c.title}</div>
                              <div className="text-sm text-gray-500">{c.category}</div>
                              <div className="text-sm text-gray-700 mt-2">
                                {(c.description || "").slice(0, 220)}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <SmallBtn
                                className="bg-blue-500 text-white"
                                onClick={() => startEdit(c)}
                              >
                                Edit
                              </SmallBtn>

                              <SmallBtn
                                className="bg-red-500 text-white"
                                onClick={() => removeCourse(c.id)}
                              >
                                Hapus
                              </SmallBtn>

                              <SmallBtn
                                className="bg-purple-500 text-white"
                                onClick={() => router.push(`/admin/materials?courseId=${c.id}`)}
                              >
                                Kelola Materi
                              </SmallBtn>
                            </div>
                          </div>

                          {openCourseId === c.id && (
                            <div className="mt-4 space-y-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => createSession(c.id)}
                                  className="px-3 py-1 bg-orange-500 text-white rounded"
                                >
                                  Buat Session
                                </button>
                              </div>

                              {sessions.length === 0 ? (
                                <div className="text-sm text-gray-500 mt-2">
                                  Belum ada session
                                </div>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  {sessions.map((s) => (
                                    <div key={s.id} className="p-3 bg-gray-50 rounded border">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="font-semibold">{s.title}</div>
                                          <div className="text-xs text-gray-500">
                                            session id: {s.id}
                                          </div>
                                        </div>

                                        <div className="flex gap-2">
                                          <SmallBtn
                                            className="bg-blue-400 text-white"
                                            onClick={() => {
                                              const newTitle = prompt("Edit session:", s.title);
                                              if (newTitle) {
                                                fetch(`${API_ROOT}/api/admin/sessions/${s.id}`, {
                                                  method: "PUT",
                                                  headers: {
                                                    "Content-Type": "application/json",
                                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                  },
                                                  body: JSON.stringify({ title: newTitle }),
                                                }).then(() => loadSessions(c.id));
                                              }
                                            }}
                                          >
                                            Edit
                                          </SmallBtn>

                                          <SmallBtn
                                            className="bg-red-400 text-white"
                                            onClick={() => deleteSession(s.id)}
                                          >
                                            Hapus
                                          </SmallBtn>

                                          <SmallBtn
                                            className="bg-indigo-500 text-white"
                                            onClick={() => {
                                              loadLessons(s.id);
                                            }}
                                          >
                                            Lessons
                                          </SmallBtn>

                                          <SmallBtn
                                            className="bg-green-500 text-white"
                                            onClick={() => createLesson(s.id)}
                                          >
                                            Buat Lesson
                                          </SmallBtn>
                                        </div>
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        {(lessonsBySession[s.id] || []).map((L) => (
                                          <div
                                            key={L.id}
                                            className="flex justify-between items-center bg-white p-2 rounded border"
                                          >
                                            <div>
                                              <div className="font-medium">{L.title}</div>
                                              <div className="text-xs text-gray-500">
                                                {(L.content || "").slice(0, 80)}
                                              </div>
                                            </div>

                                            <div className="flex gap-2">
                                              <SmallBtn
                                                className="bg-blue-400 text-white"
                                                onClick={() => {
                                                  const newTitle = prompt("Judul baru:", L.title);
                                                  if (!newTitle) return;
                                                  const newContent = prompt("Isi baru:", L.content || "");

                                                  fetch(`${API_ROOT}/api/admin/lessons/${L.id}`, {
                                                    method: "PUT",
                                                    headers: {
                                                      "Content-Type": "application/json",
                                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                    },
                                                    body: JSON.stringify({
                                                      title: newTitle,
                                                      content: newContent,
                                                    }),
                                                  }).then(() => loadLessons(s.id));
                                                }}
                                              >
                                                Edit
                                              </SmallBtn>

                                              <SmallBtn
                                                className="bg-red-400 text-white"
                                                onClick={() => deleteLesson(L)}
                                              >
                                                Hapus
                                              </SmallBtn>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}