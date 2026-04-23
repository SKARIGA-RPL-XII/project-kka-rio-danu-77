import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("miespanol_token");
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await readJson(res);

  if (!res.ok) {
    throw new Error(body?.message || body?.error || "Request gagal");
  }

  return body;
}

const lessonMeta = {
  article: {
    label: "Isi materi",
    placeholder: "Tulis isi artikel/materi di sini...",
  },
  ppt: {
    label: "Penjelasan file",
    placeholder: "Tulis penjelasan singkat untuk file PPT / PDF...",
  },
};

export default function CourseMaterialsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const successTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  const courseIdParam = Array.isArray(router.query.courseId)
    ? router.query.courseId[0]
    : router.query.courseId;

  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [sessionForm, setSessionForm] = useState({
    id: null,
    title: "",
  });

  const [lessonForm, setLessonForm] = useState({
    id: null,
    title: "",
    content_type: "article",
    content: "",
    attachmentFile: null,
    attachmentName: "",
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedSession =
    sessions.find((s) => Number(s.id) === Number(selectedSessionId)) || null;

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

  async function fetchCourseData() {
    if (!courseIdParam) return;

    setLoading(true);
    try {
      const body = await apiFetch(`${API_ROOT}/api/admin/materials/courses/${courseIdParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setCourse(body.course || null);
      setSessions(body.sessions || []);

      const nextSelected =
        body.sessions && body.sessions.length > 0
          ? body.sessions.some((s) => Number(s.id) === Number(selectedSessionId))
            ? selectedSessionId
            : body.sessions[0].id
          : null;

      setSelectedSessionId(nextSelected);

      if (nextSelected) {
        const firstSelected = body.sessions.find((s) => Number(s.id) === Number(nextSelected));
        setLessons(firstSelected?.lessons || []);
      } else {
        setLessons([]);
      }
    } catch (err) {
      console.error(err);
      setCourse(null);
      setSessions([]);
      setSelectedSessionId(null);
      setLessons([]);
      showError(err.message || "Gagal memuat data course");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLessons(sessionId) {
    if (!sessionId) return;

    try {
      const body = await apiFetch(`${API_ROOT}/api/admin/materials/sessions/${sessionId}/lessons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setLessons(body.lessons || []);
    } catch (err) {
      console.error(err);
      setLessons([]);
      showError(err.message || "Gagal memuat pembelajaran");
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (!courseIdParam) return;
    fetchCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, courseIdParam]);

  useEffect(() => {
    if (!selectedSessionId) return;
    fetchLessons(selectedSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  function resetSessionForm() {
    setSessionForm({ id: null, title: "" });
  }

  function resetLessonForm() {
    setLessonForm({
      id: null,
      title: "",
      content_type: "article",
      content: "",
      attachmentFile: null,
      attachmentName: "",
    });
  }

  async function submitSession(e) {
    e.preventDefault();

    if (!sessionForm.title.trim()) return showError("Judul sesi wajib diisi");

    try {
      const isEdit = Boolean(sessionForm.id);
      const url = isEdit
        ? `${API_ROOT}/api/admin/materials/sessions/${sessionForm.id}`
        : `${API_ROOT}/api/admin/materials/courses/${courseIdParam}/sessions`;

      const body = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: sessionForm.title,
        }),
      });

      const savedSession = body?.session || null;

      resetSessionForm();
      await fetchCourseData();

      if (savedSession?.id) {
        setSelectedSessionId(savedSession.id);
        await fetchLessons(savedSession.id);
        resetLessonForm();
      }

      showSuccess(isEdit ? "Sesi berhasil diperbarui." : "Sesi berhasil ditambahkan.");
    } catch (err) {
      showError(err.message || "Gagal simpan sesi");
    }
  }

  async function submitLesson(e) {
    e.preventDefault();

    if (!selectedSessionId) return showError("Pilih sesi dulu");
    if (!lessonForm.title.trim()) return showError("Judul pembelajaran wajib diisi");

    try {
      const isEdit = Boolean(lessonForm.id);
      const fd = new FormData();
      fd.append("title", lessonForm.title);
      fd.append("content_type", lessonForm.content_type);
      fd.append("content", lessonForm.content);

      if (lessonForm.attachmentFile) {
        fd.append("attachment", lessonForm.attachmentFile);
      }

      const url = isEdit
        ? `${API_ROOT}/api/admin/materials/lessons/${lessonForm.id}`
        : `${API_ROOT}/api/admin/materials/sessions/${selectedSessionId}/lessons`;

      await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      resetLessonForm();
      await fetchLessons(selectedSessionId);
      await fetchCourseData();

      showSuccess(isEdit ? "Pembelajaran berhasil diperbarui." : "Pembelajaran berhasil ditambahkan.");
    } catch (err) {
      showError(err.message || "Gagal simpan pembelajaran");
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm("Hapus sesi ini? Semua pembelajaran di dalamnya ikut terhapus.")) return;

    try {
      await apiFetch(`${API_ROOT}/api/admin/materials/sessions/${sessionId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (Number(selectedSessionId) === Number(sessionId)) {
        setSelectedSessionId(null);
        setLessons([]);
      }

      await fetchCourseData();
      showSuccess("Sesi berhasil dihapus.");
    } catch (err) {
      showError(err.message || "Gagal hapus sesi");
    }
  }

  async function deleteLesson(lessonId) {
    if (!confirm("Hapus pembelajaran ini?")) return;

    try {
      await apiFetch(`${API_ROOT}/api/admin/materials/lessons/${lessonId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      await fetchLessons(selectedSessionId);
      await fetchCourseData();
      showSuccess("Pembelajaran berhasil dihapus.");
    } catch (err) {
      showError(err.message || "Gagal hapus pembelajaran");
    }
  }

  function startEditSession(session) {
    setSessionForm({
      id: session.id,
      title: session.title || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditLesson(lesson) {
    setLessonForm({
      id: lesson.id,
      title: lesson.title || "",
      content_type: lesson.content_type || "article",
      content: lesson.content || "",
      attachmentFile: null,
      attachmentName: lesson.attachment_url || "",
    });
    setSelectedSessionId(lesson.session_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAttachmentChange(e) {
    const file = e.target.files && e.target.files[0];
    setLessonForm((prev) => ({
      ...prev,
      attachmentFile: file || null,
      attachmentName: file ? file.name : prev.attachmentName,
    }));
  }

  const meta = lessonMeta[lessonForm.content_type] || lessonMeta.article;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6">
        <Topbar />

        <div className="max-w-7xl mx-auto space-y-6">
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

          <div className="flex items-center justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/admin/courses")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                ← Kembali ke daftar course
              </button>
              <h1 className="text-2xl font-bold mt-2">Kelola Materi</h1>
              <p className="text-sm text-slate-500">
                Tambah sesi lalu isi pembelajaran di dalamnya.
              </p>
            </div>

            <div className="rounded-2xl bg-white shadow p-4 min-w-[240px]">
              <div className="text-xs text-slate-500">Course aktif</div>
              <div className="font-semibold">{course?.title || "Memuat..."}</div>
              <div className="text-xs text-slate-500 mt-1">{course?.category || "-"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <form onSubmit={submitSession} className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-bold text-lg">
                  {sessionForm.id ? "Edit Sesi" : "Tambah Sesi"}
                </h2>

                <div className="mt-4 space-y-3">
                  <input
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2"
                    placeholder="Judul sesi"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold"
                    >
                      {sessionForm.id ? "Simpan Sesi" : "Tambah Sesi"}
                    </button>

                    <button
                      type="button"
                      onClick={resetSessionForm}
                      className="px-4 py-2 rounded-xl bg-slate-200 font-semibold"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Daftar Sesi</h2>
                  <span className="text-xs text-slate-500">{sessions.length} sesi</span>
                </div>

                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="text-sm text-slate-500">Memuat...</div>
                  ) : sessions.length === 0 ? (
                    <div className="text-sm text-slate-500">Belum ada sesi.</div>
                  ) : (
                    sessions.map((s, index) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={classNames(
                          "w-full text-left border rounded-2xl p-4 transition",
                          Number(selectedSessionId) === Number(s.id)
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">
                              Sesi {index + 1}: {s.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Pembelajaran: {s.lessons?.length || 0}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditSession(s);
                              }}
                              className="text-xs px-3 py-1 rounded-lg bg-sky-500 text-white"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(s.id);
                              }}
                              className="text-xs px-3 py-1 rounded-lg bg-rose-500 text-white"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={submitLesson} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-bold text-lg">
                    {lessonForm.id ? "Edit Pembelajaran" : "Tambah Pembelajaran"}
                  </h2>

                  <div className="text-sm text-slate-500">
                    Sesi aktif:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedSession?.title || "Belum dipilih"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <input
                    value={lessonForm.title}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, title: e.target.value })
                    }
                    className="border rounded-xl px-4 py-2"
                    placeholder="Judul pembelajaran"
                  />

                  <select
                    value={lessonForm.content_type}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, content_type: e.target.value })
                    }
                    className="border rounded-xl px-4 py-2"
                  >
                    <option value="article">Artikel</option>
                    <option value="ppt">PPT / PDF</option>
                  </select>

                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,image/*"
                    onChange={onAttachmentChange}
                    className="border rounded-xl px-4 py-2 bg-white md:col-span-2"
                  />
                </div>

                {lessonForm.attachmentName && (
                  <div className="mt-3 text-xs text-slate-500">
                    File terpilih: {lessonForm.attachmentName}
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {meta.label}
                  </div>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, content: e.target.value })
                    }
                    rows={6}
                    className="w-full border rounded-2xl px-4 py-3"
                    placeholder={meta.placeholder}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold"
                    disabled={!selectedSessionId}
                  >
                    {lessonForm.id ? "Simpan Pembelajaran" : "Tambah Pembelajaran"}
                  </button>

                  <button
                    type="button"
                    onClick={resetLessonForm}
                    className="px-4 py-2 rounded-xl bg-slate-200 font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Daftar Pembelajaran</h2>
                  <span className="text-xs text-slate-500">{lessons.length} lesson</span>
                </div>

                {!selectedSessionId ? (
                  <div className="mt-4 text-sm text-slate-500">
                    Pilih sesi dulu untuk melihat pembelajaran.
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="mt-4 text-sm text-slate-500">
                    Belum ada pembelajaran di sesi ini.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {lessons.map((lesson) => (
                      <div key={lesson.id} className="border rounded-2xl p-4 bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-lg">{lesson.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Tipe: {lesson.content_type}
                            </div>

                            <div className="text-sm text-slate-700 mt-3 line-clamp-3">
                              {lesson.content || "Tidak ada isi."}
                            </div>

                            {lesson.attachment_url && (
                              <a
                                href={`${API_ROOT}${lesson.attachment_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-3 text-sm text-orange-600 font-medium"
                              >
                                Lihat lampiran
                              </a>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => startEditLesson(lesson)}
                              className="px-3 py-1 rounded-lg bg-sky-500 text-white text-xs"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteLesson(lesson.id)}
                              className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs"
                            >
                              Hapus
                            </button>
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
      </div>
    </div>
  );
}