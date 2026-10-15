import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { PUZZLES, dayNumber, puzzleForNumber, lastFinishedNumber, slugify } from "./puzzles.js";

/* ============================================================
   ENGINEER·DLE — daily progressive-clue engineering puzzle.
   100 puzzles. One per day. Wrong guess or skip unlocks a clue.
   ============================================================ */


/* ---- Browser storage shim ----
   In a normal website we use localStorage. The API below mirrors the shape
   the game expects: get() throws when a key is missing, set() resolves. ---- */
const store = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    if (value === null) throw new Error("not found: " + key);
    return { key, value };
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
};

const MAX_GUESSES = 5;


/* ---------- Date helpers ---------- */
function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateForDayNumber(n) {
  const epoch = new Date(2026, 7, 28);
  const d = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate() + (n - 1));
  return d;
}
function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------- Answer matching ---------- */
function normalise(s) {
  return s
    .toLowerCase()
    .replace(/['\u2019`&]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function isMatch(guess, puzzle) {
  const g = normalise(guess);
  if (!g) return false;
  const targets = [puzzle.answer, ...(puzzle.accept || [])].map(normalise);
  return targets.some((t) => g === t || levenshtein(g, t) <= Math.max(1, Math.floor(t.length * 0.12)));
}

const ALL_TERMS = PUZZLES.map((p) => p.answer).sort((a, b) => a.localeCompare(b));
const SKIP = "__skip__";

export default function Engineerdle() {
  const todayNumber = useRef(dayNumber()).current;
  const today = dateKey();
  const [activeNumber, setActiveNumber] = useState(todayNumber);
  const puzzle = useMemo(() => puzzleForNumber(activeNumber), [activeNumber]);
  const isToday = activeNumber === todayNumber;

  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("playing");
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({ played: 0, wins: 0, streak: 0, maxStreak: 0, lastPlayed: "" });
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archive, setArchive] = useState({});
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showSug, setShowSug] = useState(true);
  const [highlight, setHighlight] = useState(-1);
  const toastRef = useRef(null);
  const inputRef = useRef(null);

  const flash = (m, ms = 2000) => {
    setToast(m);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), ms);
  };

  // Loads saved progress whenever the active puzzle changes (today, or an archive pick).
  // Falls back to the old date-keyed save for today's puzzle, from before progress was
  // keyed by puzzle number, and migrates it forward.
  useEffect(() => {
    let dead = false;
    (async () => {
      let raw = null;
      try {
        raw = (await store.get(`edle3:progress:${puzzle.number}`)).value;
      } catch (e) {
        if (isToday) {
          try {
            raw = (await store.get(`edle3:progress:${today}`)).value;
            store.set(`edle3:progress:${puzzle.number}`, raw).catch(() => {});
          } catch (e2) { /* no saved progress */ }
        }
      }
      if (dead) return;
      if (raw) {
        const v = JSON.parse(raw);
        setGuesses(v.guesses || []);
        setStatus(v.status || "playing");
      } else {
        setGuesses([]);
        setStatus("playing");
      }
      setLoaded(true);
    })();
    return () => { dead = true; };
  }, [puzzle.number, isToday, today]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await store.get("edle3:stats");
        if (!dead && s && s.value) setStats(JSON.parse(s.value));
      } catch (e) { /* no stats yet */ }
    })();
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    if (!showArchive) return;
    let dead = false;
    (async () => {
      const days = Array.from({ length: todayNumber }, (_, i) => todayNumber - i);
      const entries = await Promise.all(days.map(async (n) => {
        try {
          const r = await store.get(`edle3:progress:${n}`);
          return [n, JSON.parse(r.value).status];
        } catch (e) { return [n, null]; }
      }));
      if (!dead) setArchive(Object.fromEntries(entries));
    })();
    return () => { dead = true; };
  }, [showArchive, todayNumber]);

  const persist = useCallback(async (g, st) => {
    try {
      await store.set(`edle3:progress:${puzzle.number}`, JSON.stringify({ guesses: g, status: st }));
    } catch (e) { /* ignore */ }
  }, [puzzle.number]);

  const recordStats = useCallback((won) => {
    setStats((prev) => {
      if (prev.lastPlayed === today) return prev;
      const streak = won ? prev.streak + 1 : 0;
      const next = {
        played: prev.played + 1,
        wins: prev.wins + (won ? 1 : 0),
        streak,
        maxStreak: Math.max(prev.maxStreak, streak),
        lastPlayed: today,
      };
      store.set("edle3:stats", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [today]);

  const suggestions = useMemo(() => {
    const q = normalise(input);
    if (!q || q.length < 2) return [];
    const already = new Set(guesses.filter((g) => g.text !== SKIP).map((g) => normalise(g.text)));
    return ALL_TERMS.filter((t) => normalise(t).includes(q) && !already.has(normalise(t))).slice(0, 5);
  }, [input, guesses]);

  // Commit a guess. isSkip bypasses the duplicate check so skips can repeat.
  const commit = (text, isSkip = false) => {
    if (status !== "playing") return;
    if (!isSkip) {
      if (!text.trim()) { flash("Type a term, or skip for the next clue"); return; }
      if (guesses.some((g) => g.text !== SKIP && normalise(g.text) === normalise(text))) {
        flash("Already guessed that one");
        return;
      }
    }
    const value = isSkip ? SKIP : text.trim();
    const correct = isSkip ? false : isMatch(value, puzzle);
    const next = [...guesses, { text: value, correct }];
    const done = correct || next.length >= MAX_GUESSES;
    const st = correct ? "won" : done ? "lost" : "playing";
    setGuesses(next);
    setInput("");
    setHighlight(-1);
    setShowSug(true);
    setStatus(st);
    persist(next, st);
    if (done) setArchive((prev) => ({ ...prev, [puzzle.number]: st }));
    if (correct) {
      flash("Correct — nice call.", 2400);
      if (isToday) recordStats(true);
      track("game_won", { puzzle: puzzle.number, discipline: puzzle.discipline, attempts: next.length, archive: !isToday });
    } else if (done) {
      if (isToday) recordStats(false);
      track("game_lost", { puzzle: puzzle.number, discipline: puzzle.discipline, archive: !isToday });
    } else {
      flash(isSkip ? `Skipped. Clue ${next.length + 1} unlocked.` : `Not it. Clue ${next.length + 1} unlocked.`);
      if (isSkip) track("skip_used", { puzzle: puzzle.number, clue: next.length + 1 });
    }
  };

  const cluesShown = Math.min(guesses.length + 1, MAX_GUESSES);
  const gameOver = status !== "playing";
  const remaining = MAX_GUESSES - guesses.length;

  const shareText = () => {
    const squares = guesses.map((g) => (g.correct ? "🟩" : g.text === SKIP ? "⬜" : "🟥")).join("");
    const pad = "⬛".repeat(Math.max(0, MAX_GUESSES - guesses.length));
    const score = status === "won" ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    return `ENGINEER·DLE #${puzzle.number} — ${puzzle.discipline}\n${score}\n${squares}${pad}\nhttps://engineerdle.com`;
  };

  const share = async () => {
    track("share_clicked", { puzzle: puzzle.number, status });
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      flash("Result copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { flash("Copy blocked — select the text manually"); }
  };

  const openPuzzle = (n) => {
    setActiveNumber(n);
    setShowArchive(false);
    setInput("");
    setHighlight(-1);
    setShowSug(true);
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#0B2A4A}
        input,button{font-family:inherit}
        .ed-btn:focus-visible,.ed-in:focus-visible,.ed-sug:focus-visible{outline:2px solid #4CC9F0;outline-offset:2px}
        .ed-in:focus{border-color:#4CC9F0 !important}
        .ed-sug:hover{background:#173C60 !important}
        .ed-learn:hover{background:#173C60 !important;border-color:#4CC9F0 !important;color:#EAF2FA !important}
        .ed-archive-row:hover{background:#173C60 !important}
        @keyframes edIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes edToast{from{opacity:0;transform:translate(-50%,6px)}to{opacity:1;transform:translate(-50%,0)}}
        .ed-anim{animation:edIn .28s ease both}
        @media (prefers-reduced-motion:reduce){.ed-anim{animation:none}}
        ::selection{background:#4CC9F0;color:#0B2A4A}
      `}</style>
      <div style={S.gridBg} aria-hidden="true" />

      <div style={S.frame}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>{isToday ? "DAILY ENGINEERING PUZZLE" : "ARCHIVE PUZZLE"} · No. {puzzle.number}</div>
            <div style={S.title} role="button" tabIndex={0} onClick={() => openPuzzle(todayNumber)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openPuzzle(todayNumber); }}>ENGINEER·DLE</div>
          </div>
          <div style={S.iconRow}>
            <IconBtn label="Puzzle archive" onClick={() => setShowArchive(true)}><ArchiveIcon /></IconBtn>
            <IconBtn label="How to play" onClick={() => setShowHelp(true)}>?</IconBtn>
            <IconBtn label="Statistics" onClick={() => setShowStats(true)}><StatsIcon /></IconBtn>
          </div>
        </header>

        {!isToday && (
          <div style={S.archiveBanner}>
            <span>Viewing {shortDate(dateForDayNumber(puzzle.number))} — this play doesn't affect your streak.</span>
          </div>
        )}

        <div style={S.meta}>
          <Meta k="DISCIPLINE" v={puzzle.discipline} />
          <Meta k="ATTEMPTS USED" v={`${guesses.length} of ${MAX_GUESSES}`} />
        </div>

        <div style={S.clueStack}>
          {puzzle.clues.slice(0, cluesShown).map((c, i) => (
            <div
              key={i}
              className={i === cluesShown - 1 ? "ed-anim" : ""}
              style={{ ...S.clueCard, ...(i === cluesShown - 1 && !gameOver ? S.clueCardActive : {}) }}
            >
              <div style={S.clueNum}>{String(i + 1).padStart(2, "0")}</div>
              <div style={S.clueText}>{c}</div>
            </div>
          ))}
          {!gameOver &&
            Array.from({ length: MAX_GUESSES - cluesShown }).map((_, i) => (
              <div key={`lock${i}`} style={S.clueLocked}>
                <div style={{ ...S.clueNum, color: "#4A6A88" }}>{String(cluesShown + i + 1).padStart(2, "0")}</div>
                <div style={S.lockedText}>Locked</div>
              </div>
            ))}
        </div>

        {guesses.length > 0 && (
          <div style={S.history}>
            {guesses.map((g, i) => (
              <div
                key={i}
                style={{ ...S.histRow, borderColor: g.correct ? C.correct : g.text === SKIP ? C.border : C.wrong }}
              >
                <span style={{ ...S.histMark, color: g.correct ? C.correct : g.text === SKIP ? C.muted : C.wrong }}>
                  {g.correct ? "✓" : g.text === SKIP ? "–" : "✕"}
                </span>
                <span style={{ ...S.histText, color: g.text === SKIP ? C.muted : C.ink, fontStyle: g.text === SKIP ? "italic" : "normal" }}>
                  {g.text === SKIP ? "Skipped" : g.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {!gameOver && (
          <div style={S.inputZone}>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                className="ed-in"
                style={S.input}
                value={input}
                placeholder="Name the concept, law or equation…"
                onChange={(e) => { setInput(e.target.value); setHighlight(-1); setShowSug(true); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 140)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setShowSug(true); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, -1)); }
                  else if (e.key === "Escape") { setHighlight(-1); setShowSug(false); }
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    if (showSug && highlight >= 0 && suggestions[highlight]) {
                      // Fill the box and close the list; press Enter again to submit.
                      setInput(suggestions[highlight]);
                      setHighlight(-1);
                      setShowSug(false);
                    } else {
                      commit(input);
                    }
                  }
                }}
                autoComplete="off"
                aria-label="Your guess"
              />
              {focused && showSug && suggestions.length > 0 && (
                <div style={S.sugBox}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s}
                      className="ed-sug"
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setInput(s);          // fill only — do not submit
                        setHighlight(-1);
                        setShowSug(false);    // close the list so it stops covering the buttons
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      style={{ ...S.sug, background: i === highlight ? "#173C60" : "transparent" }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={S.btnRow}>
              <button className="ed-btn" style={S.primaryBtn} onClick={() => commit(input)}>SUBMIT GUESS</button>
              <button className="ed-btn" style={S.ghostBtn} onClick={() => commit("", true)}>
                SKIP{remaining > 1 ? "" : " (LAST)"}
              </button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="ed-anim" style={{ ...S.result, borderColor: status === "won" ? C.correct : C.wrong }}>
            <div style={{ ...S.resultTag, color: status === "won" ? C.correct : C.wrong }}>
              {status === "won" ? `SOLVED ON ATTEMPT ${guesses.length}` : "NOT SOLVED"}
            </div>
            <div style={S.answerName}>{puzzle.answer}</div>
            <div style={S.answerBody}>{puzzle.reveal}</div>

            <div style={S.learnBlock}>
              <div style={S.learnLabel}>READ FURTHER</div>
              <div style={S.learnRow}>
                {puzzle.number <= lastFinishedNumber() && (
                  <a className="ed-btn ed-learn" style={S.learnLink} href={`/concept/${slugify(puzzle.answer)}`}>
                    Explainer
                  </a>
                )}
                <a
                  className="ed-btn ed-learn"
                  style={S.learnLink}
                  href={`https://www.google.com/search?q=${encodeURIComponent(puzzle.answer + " engineering")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Search Google
                </a>
                <a
                  className="ed-btn ed-learn"
                  style={S.learnLink}
                  href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(puzzle.answer)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wikipedia
                </a>
              </div>
            </div>

            <div style={S.btnRow}>
              <button className="ed-btn" style={S.primaryBtn} onClick={share}>{copied ? "COPIED ✓" : "SHARE RESULT"}</button>
              {!isToday && (
                <button className="ed-btn" style={S.ghostBtn} onClick={() => setShowArchive(true)}>MORE PUZZLES</button>
              )}
            </div>
            {isToday && <div style={S.next}>New puzzle at midnight, your local time.</div>}
          </div>
        )}
      </div>

      <AdSlot slot="2246291868" />

      {toast && <div key={toast} style={S.toast}>{toast}</div>}

      {showArchive && (
        <Modal title="PUZZLE ARCHIVE" onClose={() => setShowArchive(false)}>
          <div style={S.archiveList}>
            {Array.from({ length: todayNumber }, (_, i) => todayNumber - i).map((n) => {
              const st = archive[n];
              const isActive = n === activeNumber;
              return (
                <button
                  key={n}
                  className="ed-btn ed-archive-row"
                  onClick={() => openPuzzle(n)}
                  style={{
                    ...S.archiveRow,
                    borderColor: isActive ? C.accent : st === "won" ? C.correct : st === "lost" ? C.wrong : C.border,
                    background: st === "won" ? "rgba(95,180,137,.08)" : st === "lost" ? "rgba(226,121,90,.06)" : "transparent",
                  }}
                >
                  <span style={S.archiveNum}>#{n}</span>
                  <span style={S.archiveDate}>{shortDate(dateForDayNumber(n))}</span>
                  <span style={{ ...S.archiveStatus, color: st === "won" ? C.correct : st === "lost" ? C.wrong : C.muted }}>
                    {st === "won" ? "✓ SOLVED" : st === "lost" ? "✕ MISSED" : n === todayNumber ? "TODAY" : "UNPLAYED"}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {showHelp && (
        <Modal title="HOW TO PLAY" onClose={() => setShowHelp(false)}>
          <p style={S.mp}>Each day there's one engineering concept to identify — a law, a theory, an equation, a phenomenon, a method. Any discipline.</p>
          <p style={S.mp}>You start with one clue. Every wrong guess, and every skip, unlocks the next clue. The clues get progressively more obvious. You have {MAX_GUESSES} attempts in total, and a skip costs one of them.</p>
          <p style={S.mp}>Typing shows suggestions. Picking one fills the box — press Enter or Submit when you're ready. You can also submit anything you like; typos and alternative phrasings are accepted.</p>
          <p style={{ ...S.mp, color: C.muted }}>Solving on clue 1 is genuinely hard. Clue 3 is a respectable result.</p>
          <p style={{ ...S.mp, margin: 0 }}>
            <a href="/how-to-play" style={{ color: C.accent }}>Full guide</a> · <a href="/concepts" style={{ color: C.accent }}>Concept library</a>
          </p>
        </Modal>
      )}
      {showStats && (
        <Modal title="STATISTICS" onClose={() => setShowStats(false)}>
          <div style={S.statGrid}>
            <Stat v={stats.played} l="Played" />
            <Stat v={`${stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%`} l="Solved" />
            <Stat v={stats.streak} l="Streak" />
            <Stat v={stats.maxStreak} l="Best streak" />
          </div>
        </Modal>
      )}

      {!loaded && <div style={S.veil}>LOADING TODAY'S PUZZLE…</div>}
    </div>
  );
}

function AdSlot({ slot }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ignore */ }
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", margin: "20px 0" }}
      data-ad-client="ca-pub-8271928500002157"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
function Meta({ k, v }) {
  return (
    <div style={S.metaCell}>
      <div style={S.metaK}>{k}</div>
      <div style={S.metaV}>{v}</div>
    </div>
  );
}
function IconBtn({ children, onClick, label }) {
  return <button className="ed-btn" aria-label={label} onClick={onClick} style={S.iconBtn}>{children}</button>;
}
const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
function ArchiveIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function StatsIcon() {
  return (
    <svg {...iconProps}>
      <line x1="4" y1="20" x2="4" y2="11" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="20" y1="20" x2="20" y2="15" />
    </svg>
  );
}
function Stat({ v, l }) {
  return (
    <div style={S.statCell}>
      <div style={S.statV}>{v}</div>
      <div style={S.statL}>{l}</div>
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={S.modalTitle}>{title}</span>
          <button className="ed-btn" style={S.modalX} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const C = {
  bg: "#0B2A4A", panel: "#0F3255", ink: "#EAF2FA", muted: "#7FA8C9",
  border: "#3E5C78", accent: "#4CC9F0", correct: "#5FB489", wrong: "#E2795A",
};

const S = {
  page: { position: "relative", minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", justifyContent: "center", padding: "18px 12px 40px" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(140,190,230,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(140,190,230,.06) 1px,transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" },
  frame: { position: "relative", width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 14 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  eyebrow: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: ".14em", color: C.accent },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, marginTop: 2, cursor: "pointer" },
  iconRow: { display: "flex", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.ink, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  meta: { display: "flex", gap: 16, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "8px 0" },
  metaCell: { flex: 1, minWidth: 0 },
  metaK: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: ".1em", color: C.muted },
  metaV: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  clueStack: { display: "flex", flexDirection: "column", gap: 8 },
  clueCard: { display: "flex", gap: 12, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 4, background: "rgba(255,255,255,.02)" },
  clueCardActive: { borderColor: C.accent, background: "rgba(76,201,240,.07)" },
  clueLocked: { display: "flex", gap: 12, padding: "10px 14px", border: "1px dashed #2C4762", borderRadius: 4 },
  clueNum: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: C.accent, paddingTop: 1, flexShrink: 0 },
  clueText: { fontSize: 14.5, lineHeight: 1.5 },
  lockedText: { fontSize: 12.5, color: "#4A6A88", fontFamily: "'IBM Plex Mono',monospace" },
  history: { display: "flex", flexDirection: "column", gap: 5 },
  histRow: { display: "flex", gap: 10, alignItems: "center", padding: "7px 12px", border: "1px solid", borderRadius: 4, background: "rgba(0,0,0,.15)" },
  histMark: { fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 13 },
  histText: { fontSize: 13.5 },
  inputZone: { display: "flex", flexDirection: "column", gap: 8 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 4, border: `1px solid ${C.border}`, background: "#0A2440", color: C.ink, fontSize: 15, outline: "none" },
  sugBox: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, zIndex: 20, overflow: "hidden" },
  sug: { padding: "10px 13px", fontSize: 13.5, cursor: "pointer", borderBottom: "1px solid rgba(62,92,120,.4)" },
  btnRow: { display: "flex", gap: 8 },
  primaryBtn: { flex: 2, padding: "12px 14px", borderRadius: 4, border: "none", background: C.accent, color: "#0B2A4A", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 12.5, letterSpacing: ".06em", cursor: "pointer" },
  ghostBtn: { flex: 1, padding: "12px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 11, letterSpacing: ".05em", cursor: "pointer" },
  result: { border: "1px solid", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 9, background: "rgba(255,255,255,.03)" },
  resultTag: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: ".14em", fontWeight: 700 },
  answerName: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 21, lineHeight: 1.2 },
  answerBody: { fontSize: 13.5, lineHeight: 1.55, color: C.muted },
  learnBlock: { borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 2 },
  learnLabel: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: C.muted, marginBottom: 8 },
  learnRow: { display: "flex", gap: 7, flexWrap: "wrap" },
  learnLink: { flex: "1 1 auto", textAlign: "center", padding: "9px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s, border-color .15s, color .15s" },
  next: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: C.muted, textAlign: "center" },
  toast: { position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: C.panel, border: `1px solid ${C.accent}`, padding: "9px 15px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, zIndex: 60, animation: "edToast .2s ease" },
  veil: { position: "absolute", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".12em", color: C.muted },
  overlay: { position: "fixed", inset: 0, background: "rgba(4,14,25,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 },
  modal: { width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".12em", color: C.accent },
  modalX: { background: "transparent", border: "none", color: C.ink, fontSize: 14, cursor: "pointer" },
  mp: { fontSize: 13.5, lineHeight: 1.55, margin: "0 0 10px" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statCell: { border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 8px", textAlign: "center" },
  statV: { fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 22, color: C.accent },
  statL: { fontSize: 11, color: C.muted, marginTop: 4 },
  archiveBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", borderRadius: 4, border: `1px solid ${C.accent}`, background: "rgba(76,201,240,.07)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: C.muted },
  archiveList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto" },
  archiveRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 4, border: "1px solid", cursor: "pointer", textAlign: "left", color: C.ink, fontFamily: "inherit" },
  archiveNum: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0, width: 34 },
  archiveDate: { fontSize: 12.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  archiveStatus: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", flexShrink: 0 },
};
