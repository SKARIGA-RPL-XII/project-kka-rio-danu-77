import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getToken, getUser, removeAuth } from "../../utils/auth";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
      <rect width="1200" height="600" rx="48" fill="#FFF7ED"/>
      <circle cx="600" cy="260" r="120" fill="#FDBA74"/>
      <path d="M470 380c35-60 110-90 130-90s95 30 130 90" fill="#FB923C"/>
    </svg>
  `);

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return FALLBACK_THUMBNAIL;
  const t = String(thumbnail).trim();
  if (!t) return FALLBACK_THUMBNAIL;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return apiRoot + t;
  return `${apiRoot}/uploads/minigames/${t}`;
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

function normalizeGamesPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.minigames)) return data.minigames;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function getQuestionText(game) {
  const cfg = parseConfig(game?.config);
  return (
    cfg.question ||
    cfg.prompt ||
    cfg.soal ||
    game?.question ||
    game?.description ||
    "Pilih jawaban yang benar."
  );
}

function getOptions(game) {
  const cfg = parseConfig(game?.config);

  if (Array.isArray(cfg.options) && cfg.options.length >= 4) {
    return cfg.options.slice(0, 4).map(String);
  }

  const candidates = [
    cfg.option_a ?? cfg.a ?? cfg.A,
    cfg.option_b ?? cfg.b ?? cfg.B,
    cfg.option_c ?? cfg.c ?? cfg.C,
    cfg.option_d ?? cfg.d ?? cfg.D,
  ];

  if (candidates.every((v) => typeof v !== "undefined" && v !== null && String(v).trim() !== "")) {
    return candidates.map((v) => String(v));
  }

  return [
    game?.option_a || "Opsi A",
    game?.option_b || "Opsi B",
    game?.option_c || "Opsi C",
    game?.option_d || "Opsi D",
  ];
}

function getCorrectAnswer(game) {
  const cfg = parseConfig(game?.config);
  const raw =
    cfg.correct_answer ??
    cfg.correctAnswer ??
    cfg.answer_correct ??
    game?.correct_answer ??
    game?.correctAnswer ??
    "A";

  const val = String(raw).trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(val)) return val;
  return "A";
}

function mapChoiceToIndex(choice) {
  return { A: 0, B: 1, C: 2, D: 3 }[choice] ?? 0;
}

function MiniBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
      {children}
    </span>
  );
}

export default function MinigamesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [completedIds, setCompletedIds] = useState([]);
  const [attemptsMap, setAttemptsMap] = useState({});

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getToken?.() || localStorage.getItem("miespanol_token");
  }, []);

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = getUser?.() || localStorage.getItem("miespanol_user");
      return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [gameRes, progressRes] = await Promise.allSettled([
          fetch(`${API_ROOT}/api/public/minigames`),
          token
            ? fetch(`${API_ROOT}/api/minigames/progress`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);

        let gamesData = null;
        if (gameRes.status === "fulfilled" && gameRes.value?.ok) {
          gamesData = await gameRes.value.json().catch(() => null);
        }

        const list = normalizeGamesPayload(gamesData).filter((g) => {
          const st = String(g?.status || "").toLowerCase();
          return !st || st === "published";
        });

        setGames(list);

        if (progressRes.status === "fulfilled" && progressRes.value?.ok) {
          const progressData = await progressRes.value.json().catch(() => null);

          const attempts = Array.isArray(progressData?.attempts) ? progressData.attempts : [];
          const map = {};
          attempts.forEach((a) => {
            map[a.minigame_id] = a;
          });

          setAttemptsMap(map);
          setCompletedIds(Array.isArray(progressData?.completed_ids) ? progressData.completed_ids : []);
          setScore(Number(progressData?.points || 0));
        } else {
          setAttemptsMap({});
          setCompletedIds([]);
          setScore(0);
        }

        setSelected(null);
        setSubmitted(false);
        setResult(null);
      } catch (err) {
        console.error("fetch minigames error:", err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  useEffect(() => {
    if (!games.length) return;

    const firstUnansweredIndex = games.findIndex((g) => {
      const attempt = attemptsMap[g.id];
      return !attempt;
    });

    if (firstUnansweredIndex >= 0) {
      setActiveIndex(firstUnansweredIndex);
    } else {
      setActiveIndex(0);
    }
  }, [games, attemptsMap]);

  useEffect(() => {
    const current = games[activeIndex];
    if (!current) return;

    const saved = attemptsMap[current.id];
    if (saved) {
      const idx = mapChoiceToIndex(saved.selected_answer);
      setSelected(idx);
      setSubmitted(true);
      setResult({
        isCorrect: !!saved.is_correct,
        selectedIndex: idx,
        correctIndex: mapChoiceToIndex(getCorrectAnswer(current)),
        message: saved.is_correct
          ? "Soal ini sudah dijawab benar."
          : "Soal ini sudah dijawab sebelumnya.",
      });
    } else {
      setSelected(null);
      setSubmitted(false);
      setResult(null);
    }
  }, [activeIndex, games, attemptsMap]);

  const activeGame = games[activeIndex] || null;
  const options = activeGame ? getOptions(activeGame) : [];
  const correctAnswer = activeGame ? getCorrectAnswer(activeGame) : "A";
  const correctIndex = mapChoiceToIndex(correctAnswer);
  const currentAttempt = activeGame ? attemptsMap[activeGame.id] : null;

  function resetCurrent() {
    if (currentAttempt) {
      setSelected(mapChoiceToIndex(currentAttempt.selected_answer));
      setSubmitted(true);
      setResult({
        isCorrect: !!currentAttempt.is_correct,
        selectedIndex: mapChoiceToIndex(currentAttempt.selected_answer),
        correctIndex,
        message: currentAttempt.is_correct
          ? "Soal ini sudah dijawab benar."
          : "Soal ini sudah dijawab sebelumnya.",
      });
      return;
    }

    setSelected(null);
    setSubmitted(false);
    setResult(null);
  }

  function nextGame() {
    const nextIndex = activeIndex + 1;
    if (nextIndex < games.length) {
      setActiveIndex(nextIndex);
      return;
    }

    setResult({
      done: true,
      message: "Semua minigame selesai. Keren!",
    });
  }

  function handlePick(index) {
    if (submitted || currentAttempt) return;
    setSelected(index);
  }

  async function handleCheck() {
    if (selected === null || !activeGame || submitted || currentAttempt) return;

    const selectedAnswer = ["A", "B", "C", "D"][selected];
    if (!selectedAnswer) return;

    try {
      const res = await fetch(`${API_ROOT}/api/minigames/${activeGame.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ selected_answer: selectedAnswer }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Gagal menyimpan jawaban");
      }

      const data = await res.json().catch(() => null);

      const attempt = data?.attempt || null;
      if (attempt) {
        setAttemptsMap((prev) => ({
          ...prev,
          [activeGame.id]: attempt,
        }));
      }

      if (typeof data?.points === "number") {
        setScore(data.points);
      }

      const isCorrect = !!(data?.is_correct ?? attempt?.is_correct);
      const answeredIndex = selected;
      const nextResult = {
        isCorrect,
        selectedIndex: answeredIndex,
        correctIndex,
        message: isCorrect ? "Benar! Mantap." : "Belum tepat, lanjut ke soal berikutnya.",
      };

      setSubmitted(true);
      setResult(nextResult);
    } catch (err) {
      alert(err.message || "Gagal menyimpan jawaban");
      console.error(err);
    }
  }

  function handleLogout() {
    removeAuth?.();
    try {
      localStorage.removeItem("miespanol_token");
      localStorage.removeItem("miespanol_user");
    } catch {}
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] to-[#fffdf9] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-md text-gray-600">
          Memuat minigame...
        </div>
      </div>
    );
  }

  if (!games.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] to-[#fffdf9]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-lg">
            <h1 className="text-4xl font-black">Minigames</h1>
            <p className="mt-2 text-white/90">
              Pilih jawaban yang benar dari 4 opsi yang tersedia.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border bg-white p-8 shadow-sm text-center">
            <div className="text-lg font-bold text-gray-900">Belum ada minigame tersedia</div>
            <p className="mt-2 text-sm text-gray-500">
              Admin belum menambahkan minigame yang published.
            </p>

            <button
              type="button"
              onClick={() => router.push("/home")}
              className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Kembali ke Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const finishedAll = games.length > 0 && games.every((g) => attemptsMap[g.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-[#f8f5ef]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-[2rem] bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-lg w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-black">Minigames</h1>
                <p className="mt-2 text-white/90">
                  Pilih jawaban yang benar dari 4 opsi yang tersedia.
                </p>
              </div>

              <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white/15 px-4 py-2 backdrop-blur">
                  <div className="text-xs text-white/80">Pemain</div>
                  <div className="font-semibold">{user?.name || "User"}</div>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-2 backdrop-blur">
                  <div className="text-xs text-white/80">Skor</div>
                  <div className="text-2xl font-black">{score}</div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="rounded-2xl bg-white px-4 py-2 font-semibold text-orange-600 shadow-sm transition hover:shadow-md"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {finishedAll ? (
          <div className="rounded-[2rem] border bg-white p-8 shadow-sm text-center">
            <h2 className="text-2xl font-black text-gray-900">Semua soal sudah selesai</h2>
            <p className="mt-2 text-sm text-gray-500">
              Skor kamu tersimpan. Saat balik ke halaman ini, soal yang sudah dijawab tidak akan mengulang.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Ke Home
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="rounded-2xl border bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Ke Profil
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <MiniBadge>
                  Soal {activeIndex + 1} dari {games.length}
                </MiniBadge>

                <div className="text-sm text-gray-500">
                  Progress:{" "}
                  {Math.round(((activeIndex + (submitted || currentAttempt ? 1 : 0)) / games.length) * 100)}%
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border bg-gray-50">
                <img
                  src={buildImageSrc(API_ROOT, activeGame.thumbnail_url || activeGame.thumbnail || "")}
                  alt={activeGame.title}
                  className="h-64 w-full object-cover"
                />
              </div>

              <div className="mt-5">
                <h2 className="text-3xl font-black text-gray-900">{activeGame.title}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {activeGame.description || "Jawab soal berikut dengan benar."}
                </p>
              </div>

              <div className="mt-5 rounded-3xl bg-orange-50 p-5">
                <div className="text-sm font-bold text-gray-900">Soal</div>
                <p className="mt-2 text-base text-gray-700">{getQuestionText(activeGame)}</p>
              </div>

              {currentAttempt && (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Jawaban untuk soal ini sudah tersimpan.
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3">
                {options.map((opt, idx) => {
                  const label = ["A", "B", "C", "D"][idx] || "?";
                  const isChosen = selected === idx;
                  const isCorrect = submitted && idx === correctIndex;
                  const isWrongChoice = submitted && isChosen && idx !== correctIndex;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePick(idx)}
                      className={[
                        "w-full rounded-2xl border px-4 py-4 text-left text-base font-semibold transition",
                        "hover:-translate-y-[1px] hover:shadow-sm",
                        submitted && isCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : isWrongChoice
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : isChosen
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-gray-200 bg-white text-gray-900 hover:border-orange-200",
                      ].join(" ")}
                      disabled={submitted || currentAttempt}
                    >
                      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-sm">
                        {label}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {!submitted && !currentAttempt ? (
                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={selected === null}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cek Jawaban
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextGame}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                  >
                    {activeIndex < games.length - 1 ? "Soal Berikutnya" : "Selesai"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetCurrent}
                  className="rounded-2xl border bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Ulang Soal
                </button>
              </div>

              {result && !result.done && (
                <div
                  className={[
                    "mt-5 rounded-2xl p-4 text-sm font-semibold",
                    result.isCorrect
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700",
                  ].join(" ")}
                >
                  {result.message}
                </div>
              )}

              {result?.done && (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  {result.message}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Ringkasan</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-orange-50 p-4">
                    <div className="text-xs text-gray-500">Skor</div>
                    <div className="mt-1 text-3xl font-black text-orange-600">{score}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <div className="text-xs text-gray-500">Sisa Soal</div>
                    <div className="mt-1 text-3xl font-black text-amber-600">
                      {Math.max(0, games.length - completedIds.length)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Aturan Singkat</h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <p>1. Pilih salah satu jawaban A, B, C, atau D.</p>
                  <p>
                    2. Tekan <span className="font-semibold text-gray-900">Cek Jawaban</span>.
                  </p>
                  <p>3. Jika benar, skor bertambah dan jawaban tersimpan.</p>
                </div>
              </div>

              <div className="rounded-[2rem] border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Detail Game</h3>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-900">ID:</span> {activeGame.id}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Poin:</span>{" "}
                    {activeGame.points_reward || 10}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900">Difficulty:</span>{" "}
                    {activeGame.difficulty || 1}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}