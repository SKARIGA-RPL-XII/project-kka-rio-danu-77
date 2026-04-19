import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getToken, getUser, removeAuth } from "../utils/auth";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <rect width="1200" height="700" rx="48" fill="#FFF7ED"/>
      <circle cx="600" cy="310" r="140" fill="#FDBA74"/>
      <path d="M430 470c45-80 150-120 170-120s125 40 170 120" fill="#FB923C"/>
    </svg>
  `);

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return FALLBACK_THUMBNAIL;

  const t = String(thumbnail).trim();
  if (!t) return FALLBACK_THUMBNAIL;

  if (/^https?:\/\//i.test(t)) return t;
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

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "published") return "Published";
  if (s === "draft") return "Draft";
  return status || "-";
}

function getQuestionText(lesson) {
  const cfg = parseConfig(lesson?.config);
  return cfg.question || cfg.prompt || cfg.soal || lesson?.content || "Baca materi ini.";
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const t = String(url).trim();

  const m1 = t.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i
  );
  if (m1?.[1]) return `https://www.youtube.com/embed/${m1[1]}`;

  return null;
}

function isLikelyUrl(text) {
  return /^https?:\/\//i.test(String(text || "").trim());
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
      {children}
    </span>
  );
}

function LessonViewer({ lesson }) {
  if (!lesson) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Pilih lesson untuk mulai belajar.</div>
      </div>
    );
  }

  const embedUrl = lesson.content_type === "video" ? getYouTubeEmbedUrl(lesson.content) : null;

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">Lesson aktif</div>
          <h3 className="mt-1 text-2xl font-black text-gray-900">{lesson.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{lesson.content_type || "article"}</Badge>
            {lesson.order_index !== null && lesson.order_index !== undefined && (
              <Badge>Urutan {lesson.order_index}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-orange-50 p-5">
        <div className="text-sm font-bold text-gray-900">Isi Materi</div>

        {lesson.content_type === "video" ? (
          embedUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border bg-black">
              <iframe
                className="aspect-video w-full"
                src={embedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isLikelyUrl(lesson.content) ? (
            <div className="mt-4">
              <a
                href={lesson.content}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-orange-600 underline"
              >
                Buka link video
              </a>
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
              {getQuestionText(lesson)}
            </p>
          )
        ) : lesson.content_type === "ppt" ? (
          <div className="mt-4 space-y-3">
            <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
              {lesson.content || "Tidak ada isi materi."}
            </p>

            {lesson.attachment_url ? (
              <a
                href={`${API_ROOT}${lesson.attachment_url}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-2xl bg-orange-500 px-4 py-2.5 font-semibold text-white transition hover:bg-orange-600"
              >
                Buka File Lampiran
              </a>
            ) : null}
          </div>
        ) : lesson.content_type === "quiz" ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
            {lesson.content || "Kerjakan quiz sesuai instruksi yang diberikan."}
          </p>
        ) : (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
            {lesson.content || "Tidak ada isi materi."}
          </p>
        )}
      </div>

      {lesson.attachment_url && lesson.content_type !== "ppt" && (
        <div className="mt-4">
          <a
            href={`${API_ROOT}${lesson.attachment_url}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-orange-600 underline"
          >
            Lihat lampiran
          </a>
        </div>
      )}
    </div>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const detailRef = useRef(null);
  const lessonViewerRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [courseDetail, setCourseDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [openSessionId, setOpenSessionId] = useState(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getToken?.() || localStorage.getItem("miespanol_token");
  }, []);

  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);

    try {
      const cached = getUser?.();
      if (cached) setUser(cached);
      else {
        const raw = localStorage.getItem("miespanol_user");
        if (raw) setUser(JSON.parse(raw));
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      try {
        const endpoints = [`${API_ROOT}/api/public/courses`, `${API_ROOT}/api/courses`];
        let data = null;

        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (res.ok) {
              data = await res.json().catch(() => null);
              break;
            }
          } catch {}
        }

        const list = normalizeCoursesPayload(data).filter((c) => {
          const st = String(c?.status || "").toLowerCase();
          return !st || st === "published";
        });

        setCourses(list);
      } catch (err) {
        console.error("fetch courses error:", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [token]);

  useEffect(() => {
    async function fetchDetail() {
      if (!selectedCourseId) return;

      setDetailLoading(true);
      try {
        const res = await fetch(`${API_ROOT}/api/public/courses/${selectedCourseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error("Gagal ambil detail course");
        }

        const data = await res.json().catch(() => null);
        setCourseDetail(data || null);

        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        if (sessions.length > 0) {
          const firstSession = sessions[0];
          const firstLesson = Array.isArray(firstSession?.lessons) ? firstSession.lessons[0] : null;

          setSelectedSessionId(firstSession.id);
          setSelectedLessonId(firstLesson ? firstLesson.id : null);
          setOpenSessionId(firstSession.id);
        } else {
          setSelectedSessionId(null);
          setSelectedLessonId(null);
          setOpenSessionId(null);
        }
      } catch (err) {
        console.error("fetch detail error:", err);
        setCourseDetail(null);
        setSelectedSessionId(null);
        setSelectedLessonId(null);
        setOpenSessionId(null);
      } finally {
        setDetailLoading(false);
      }
    }

    fetchDetail();
  }, [selectedCourseId, token]);

  useEffect(() => {
    if (!courseDetail?.sessions?.length) return;

    const currentSession =
      courseDetail.sessions.find((s) => Number(s.id) === Number(selectedSessionId)) || null;
    const lessons = Array.isArray(currentSession?.lessons) ? currentSession.lessons : [];

    if (lessons.length > 0) {
      setSelectedLessonId((prev) => {
        const stillExist = lessons.some((l) => Number(l.id) === Number(prev));
        return stillExist ? prev : lessons[0].id;
      });
    } else {
      setSelectedLessonId(null);
    }
  }, [selectedSessionId, courseDetail]);

  const filteredCourses = courses.filter((c) => {
    const q = String(search || "").toLowerCase().trim();
    if (!q) return true;
    return (
      String(c.title || "").toLowerCase().includes(q) ||
      String(c.description || "").toLowerCase().includes(q) ||
      String(c.category || "").toLowerCase().includes(q)
    );
  });

  const selectedCourse =
    courseDetail?.course || courses.find((c) => Number(c.id) === Number(selectedCourseId)) || null;

  const currentSession =
    courseDetail?.sessions?.find((s) => Number(s.id) === Number(selectedSessionId)) || null;

  const currentLesson =
    currentSession?.lessons?.find((l) => Number(l.id) === Number(selectedLessonId)) || null;

  function toggleSession(sessionId) {
    const nextSessionId = Number(openSessionId) === Number(sessionId) ? null : sessionId;
    setOpenSessionId(nextSessionId);
    setSelectedSessionId(sessionId);
  }

  function openCourse(courseId) {
    if (Number(selectedCourseId) === Number(courseId)) {
      setSelectedCourseId(null);
      setSelectedSessionId(null);
      setSelectedLessonId(null);
      setOpenSessionId(null);
      setCourseDetail(null);
      return;
    }

    setSelectedCourseId(courseId);
    setSelectedSessionId(null);
    setSelectedLessonId(null);
    setOpenSessionId(null);

    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function startLesson(sessionId, lessonId) {
    setSelectedSessionId(sessionId);
    setSelectedLessonId(lessonId);
    setOpenSessionId(sessionId);

    window.requestAnimationFrame(() => {
      lessonViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleLogout() {
    removeAuth?.();
    try {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    } catch {}
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-[#f8f5ef]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-500">MiEspanol</p>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Daftar Kursus
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Pilih kursus, lalu buka session dan lesson untuk mulai belajar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Kursus Tersedia</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Kursus yang sudah dipublikasikan dan bisa dipelajari.
                </p>
              </div>

              <div className="w-full md:w-80">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kursus..."
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                  Memuat kursus...
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="rounded-2xl border bg-orange-50 p-6 text-sm text-gray-600">
                  Belum ada kursus yang dipublikasikan.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCourses.map((course) => {
                    const thumb = course.thumbnail_url || course.thumbnail || "";
                    const imgSrc = buildImageSrc(API_ROOT, thumb);
                    const isActive = Number(selectedCourseId) === Number(course.id);

                    return (
                      <div
                        key={course.id}
                        className={[
                          "overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition",
                          isActive ? "border-orange-400 ring-2 ring-orange-200" : "hover:shadow-md",
                        ].join(" ")}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
                          <div className="h-52 md:h-full">
                            <img
                              src={imgSrc}
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-2xl font-black text-gray-900">
                                  {course.title}
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge>{course.category || "Pembelajaran"}</Badge>
                                  <Badge>{formatStatus(course.status)}</Badge>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openCourse(course.id)}
                                className={[
                                  "rounded-2xl px-4 py-2.5 font-semibold text-white transition",
                                  isActive ? "bg-amber-500" : "bg-orange-500 hover:bg-orange-600",
                                ].join(" ")}
                              >
                                {isActive ? "Tutup" : "Buka Kursus"}
                              </button>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-gray-600">
                              {(course.description || "").slice(0, 260) || "Tidak ada deskripsi."}
                            </p>

                            {isActive && selectedCourse && (
                              <div className="mt-5 rounded-2xl bg-orange-50 p-4">
                                <div className="text-sm font-bold text-gray-900">Info Kursus</div>
                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                  <p>
                                    <span className="font-semibold">Kategori:</span>{" "}
                                    {selectedCourse.category || "-"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Status:</span>{" "}
                                    {formatStatus(selectedCourse.status)}
                                  </p>
                                </div>
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

          <div className="space-y-6">
            <div className="rounded-[2rem] border bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-sm">
              <h2 className="text-xl font-bold">Cara Belajar</h2>
              <p className="mt-2 text-sm text-white/90">
                Buka kursus, pilih session, lalu buka lesson yang ingin kamu pelajari.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-orange-600 transition hover:shadow-md"
                >
                  Ke Home
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/minigames")}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-orange-600 transition hover:shadow-md"
                >
                  Main Minigame
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Ringkasan</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-orange-50 p-4">
                  <div className="text-xs text-gray-500">Total Kursus</div>
                  <div className="mt-1 text-3xl font-black text-orange-600">
                    {filteredCourses.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <div className="text-xs text-gray-500">User</div>
                  <div className="mt-1 text-lg font-black text-amber-600">
                    {mounted ? (user?.name || "Guest") : ""}
                  </div>
                </div>
              </div>
            </div>

            <div ref={detailRef} className="rounded-[2rem] border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Detail Belajar</h3>

              {detailLoading ? (
                <div className="mt-4 text-sm text-gray-500">Memuat detail kursus...</div>
              ) : selectedCourse ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-orange-50 p-4">
                    <div className="text-sm font-bold text-gray-900">{selectedCourse.title}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {selectedCourse.description || "Tidak ada deskripsi."}
                    </p>
                  </div>

                  {courseDetail?.sessions?.length ? (
                    <div className="space-y-3">
                      {courseDetail.sessions.map((session, idx) => {
                        const isOpen = Number(openSessionId) === Number(session.id);
                        const sessionLessons = Array.isArray(session.lessons) ? session.lessons : [];

                        return (
                          <div key={session.id} className="overflow-hidden rounded-2xl border bg-white">
                            <button
                              type="button"
                              onClick={() => toggleSession(session.id)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Session {idx + 1}: {session.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {sessionLessons.length} lesson
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-orange-600">
                                {isOpen ? "Tutup" : "Buka"}
                              </div>
                            </button>

                            <div
                              className={[
                                "grid transition-all duration-300 ease-in-out",
                                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                              ].join(" ")}
                            >
                              <div className="overflow-hidden">
                                <div className="border-t bg-orange-50/60 p-3">
                                  {sessionLessons.length === 0 ? (
                                    <div className="text-sm text-gray-500">Belum ada lesson.</div>
                                  ) : (
                                    <div className="space-y-3">
                                      {sessionLessons.map((lesson) => {
                                        const active = Number(selectedLessonId) === Number(lesson.id);

                                        return (
                                          <div
                                            key={lesson.id}
                                            className={[
                                              "rounded-2xl border p-4 transition",
                                              active
                                                ? "border-orange-400 bg-orange-100"
                                                : "border-gray-200 bg-white hover:border-orange-200",
                                            ].join(" ")}
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div>
                                                <div className="font-semibold text-gray-900">
                                                  {lesson.title}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                  Tipe: {lesson.content_type || "article"}
                                                </div>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => startLesson(session.id, lesson.id)}
                                                className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                                              >
                                                {active ? "Sedang Dibuka" : "Mulai"}
                                              </button>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => startLesson(session.id, lesson.id)}
                                              className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-orange-50"
                                            >
                                              Buka Materi
                                            </button>
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
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Kursus ini belum punya session.</div>
                  )}
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">
                  Pilih kursus untuk melihat detail.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6" ref={lessonViewerRef} id="lesson-viewer">
          <LessonViewer lesson={currentLesson} />
        </div>
      </div>
    </div>
  );
}