// frontend/pages/admin/courses.js
import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";
const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function SmallBtn({ children, className = "", ...props }) {
  return (
    <button {...props} className={"px-3 py-1 rounded text-sm " + className}>
      {children}
    </button>
  );
}

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return null;
  const t = String(thumbnail).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t; // already full URL
  // absolute path (starts with /) -> prefix with apiRoot
  if (t.startsWith("/")) return apiRoot + t;
  // otherwise assume filename inside uploads/courses
  return `${apiRoot}/uploads/courses/${t}`;
}

export default function AdminCourses() {
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

  const token = typeof window !== "undefined" ? localStorage.getItem("miespanol_token") : null;

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // unauthorized -> logout
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
          window.location.href = "/login";
        }
        return;
      }

      const data = await res.json().catch(() => null);
      console.log("fetchCourses response:", res.status, data);

      // handle multiple shapes from backend
      if (Array.isArray(data)) {
        setCourses(data);
      } else if (data && Array.isArray(data.courses)) {
        setCourses(data.courses);
      } else if (data && Array.isArray(data.rows)) {
        setCourses(data.rows);
      } else if (data && Array.isArray(data.data)) {
        setCourses(data.data);
      } else {
        // maybe backend returned object directly (no wrapper) - fallback
        setCourses(data || []);
      }
    } catch (err) {
      console.error("Fetch courses error:", err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      setForm(prev => ({ ...prev, thumbnailFile: null, thumbnailPreview: null }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, thumbnailFile: file, thumbnailPreview: preview }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("status", form.status);
      if (form.thumbnailFile) fd.append("thumbnail", form.thumbnailFile);

      let url = `${API_ROOT}/api/admin/courses`;
      let method = "POST";
      if (form.id) {
        url = `${API_ROOT}/api/admin/courses/${form.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type for FormData
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || "Gagal menyimpan course");
      }

      // success
      resetForm();
      fetchCourses();
    } catch (err) {
      alert(err.message || "Gagal menyimpan course");
      console.error(err);
    }
  }

  function resetForm() {
    if (form.thumbnailPreview) {
      URL.revokeObjectURL(form.thumbnailPreview);
    }
    setForm({
      id: null,
      title: "",
      description: "",
      category: "learning",
      status: "draft",
      thumbnailFile: null,
      thumbnailPreview: null,
    });
  }

  function startEdit(course) {
    setForm({
      id: course.id,
      title: course.title || "",
      description: course.description || "",
      category: course.category || "learning",
      status: course.status || "draft",
      thumbnailFile: null,
      thumbnailPreview: course.thumbnail_url ? buildImageSrc(API_ROOT, course.thumbnail_url) : null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeCourse(id) {
    if (!confirm("Hapus course ini?")) return;
    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(()=>null);
        throw new Error(body?.error || "Gagal menghapus");
      }
      fetchCourses();
    } catch (err) {
      alert(err.message || "Gagal hapus");
      console.error(err);
    }
  }

  // ---- sessions & lessons
  async function loadSessions(courseId) {
    setOpenCourseId(courseId === openCourseId ? null : courseId);
    if (courseId === openCourseId) {
      setSessions([]);
      return;
    }
    try {
      const res = await fetch(`${API_ROOT}/api/admin/courses/${courseId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(()=>null);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(()=>null);
      setLessonsBySession(prev => ({ ...prev, [sessionId]: body?.lessons || body?.rows || body || [] }));
    } catch (err) {
      console.error("loadLessons", err);
      setLessonsBySession(prev => ({ ...prev, [sessionId]: [] }));
    }
  }

  async function createLesson(sessionId) {
    const title = prompt("Judul lesson:");
    if (!title) return;
    const content = prompt("Isi singkat / link (boleh kosong):", "");
    try {
      const res = await fetch(`${API_ROOT}/api/admin/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, title, content, content_type: "article" }),
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal hapus lesson");
      await loadLessons(lesson.session_id);
    } catch (err) {
      alert(err.message || "Gagal hapus lesson");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />
      <div className="flex-1 p-8 max-h-screen overflow-auto">
        {Topbar && <Topbar />}

        <div className="max-w-5xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-bold">{form.id ? "Edit Course" : "Buat Course Baru"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <input className="w-full px-3 py-2 border rounded" placeholder="Judul course" value={form.title}
                  onChange={(e)=>setForm({...form, title:e.target.value})} required />
                <textarea rows={4} className="w-full px-3 py-2 border rounded" placeholder="Deskripsi" value={form.description}
                  onChange={(e)=>setForm({...form, description:e.target.value})} />
                <div className="flex gap-3">
                  <select value={form.category} onChange={(e)=>setForm({...form, category:e.target.value})} className="px-3 py-2 border rounded">
                    <option value="learning">Pembelajaran</option>
                    <option value="minigame">Minigame</option>
                  </select>
                  <select value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})} className="px-3 py-2 border rounded">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Thumbnail</div>
                <input type="file" accept="image/*" onChange={onFileChange} />
                {form.thumbnailPreview && (
                  <img src={form.thumbnailPreview} alt="preview" className="w-full h-36 object-cover rounded" />
                )}
                <div className="flex gap-2 mt-3">
                  <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded font-bold">
                    {form.id ? "Simpan Perubahan" : "Buat Course"}
                  </button>
                  <button type="button" onClick={resetForm} className="bg-gray-200 px-4 py-2 rounded">Reset</button>
                </div>
              </div>
            </div>
          </form>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Daftar Course</h3>
              <div className="text-sm text-gray-500">{courses.length} course</div>
            </div>

            {loading ? <div>Memuat…</div> : (
              <div className="space-y-4">
                {courses.map(c => (
                  <div key={c.id} className="p-4 border rounded bg-white">
                    <div className="md:flex gap-4">
                      <div className="w-full md:w-48">
                        <img src={buildImageSrc(API_ROOT, c.thumbnail_url) || "/default-course.png"} alt={c.title} className="w-full h-28 object-cover rounded" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-lg">{c.title}</div>
                            <div className="text-sm text-gray-500">{c.category}</div>
                            <div className="text-sm text-gray-700 mt-2">{(c.description||"").slice(0,220)}</div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <SmallBtn className="bg-blue-500 text-white" onClick={()=>startEdit(c)}>Edit</SmallBtn>
                            <SmallBtn className="bg-red-500 text-white" onClick={()=>removeCourse(c.id)}>Hapus</SmallBtn>
                            <SmallBtn className="bg-green-500 text-white" onClick={()=>loadSessions(c.id)}>
                              {openCourseId === c.id ? "Tutup Materi" : "Lihat Materi"}
                            </SmallBtn>
                          </div>
                        </div>

                        {openCourseId === c.id && (
                          <div className="mt-4 space-y-3">
                            <div className="flex gap-2">
                              <button onClick={()=>createSession(c.id)} className="px-3 py-1 bg-orange-500 text-white rounded">Buat Session</button>
                            </div>

                            {sessions.length === 0 ? (
                              <div className="text-sm text-gray-500 mt-2">Belum ada session</div>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {sessions.map(s => (
                                  <div key={s.id} className="p-3 bg-gray-50 rounded border">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="font-semibold">{s.title}</div>
                                        <div className="text-xs text-gray-500">session id: {s.id}</div>
                                      </div>
                                      <div className="flex gap-2">
                                        <SmallBtn className="bg-blue-400 text-white" onClick={()=>{ const newTitle = prompt("Edit session:", s.title); if (newTitle) fetch(`${API_ROOT}/api/admin/sessions/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: newTitle }) }).then(()=>loadSessions(c.id)); }}>
                                          Edit
                                        </SmallBtn>
                                        <SmallBtn className="bg-red-400 text-white" onClick={()=>deleteSession(s.id)}>Hapus</SmallBtn>
                                        <SmallBtn className="bg-indigo-500 text-white" onClick={()=>{ loadLessons(s.id); }}>
                                          Lessons
                                        </SmallBtn>
                                        <SmallBtn className="bg-green-500 text-white" onClick={()=>createLesson(s.id)}>Buat Lesson</SmallBtn>
                                      </div>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                      {(lessonsBySession[s.id] || []).map(L => (
                                        <div key={L.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                          <div>
                                            <div className="font-medium">{L.title}</div>
                                            <div className="text-xs text-gray-500">{(L.content||"").slice(0,80)}</div>
                                          </div>
                                          <div className="flex gap-2">
                                            <SmallBtn className="bg-blue-400 text-white" onClick={()=>{ const newTitle = prompt("Judul baru:", L.title); if (!newTitle) return; const newContent = prompt("Isi baru:", L.content||""); fetch(`${API_ROOT}/api/admin/lessons/${L.id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: newTitle, content: newContent }) }).then(()=>loadLessons(s.id)); }}>
                                              Edit
                                            </SmallBtn>
                                            <SmallBtn className="bg-red-400 text-white" onClick={()=>deleteLesson(L)}>Hapus</SmallBtn>
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
