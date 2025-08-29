import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/* ---------- Themes (match Square Sniper) ---------- */
const THEMES = {
  classicWood: { light: "#F0D9B5", dark: "#B58863", texture: "classicWood" },
  walnut:      { light: "#D6BB90", dark: "#6F4628", texture: "wood" },
  glassyWood:  { light: "#E2C9A6", dark: "#7A4B28", texture: "woodGlass" },
  ice:         { light: "#EEF6FF", dark: "#255CA5", texture: "ice" },
  grass:       { light: "#E6F4E6", dark: "#0C6139", texture: "grass" },
};

const filesAll = ["a","b","c","d","e","f","g","h"];
const ranksAll = [1,2,3,4,5,6,7,8];

const fileToIndex = (f) => filesAll.indexOf(f);
const rankToIndex = (r) => r - 1;
const isLightSquare = (file, rank) =>
  (fileToIndex(file) + rankToIndex(rank)) % 2 === 1; // a1 dark

/* ---------- Subtle textures (no borders on squares) ---------- */
function textureLayers(kind, light) {
  switch (kind) {
    case "classicWood":
      return {
        backgroundImage: `
          repeating-linear-gradient(90deg,
            rgba(0,0,0,${light ? ".04" : ".07"}) 0 2px,
            rgba(0,0,0,0) 2px 10px
          ),
          repeating-linear-gradient(0deg,
            rgba(255,255,255,${light ? ".12" : ".06"}) 0 6px,
            rgba(255,255,255,0) 6px 22px
          )
        `,
        backgroundSize: "36px 100%, 100% 36px",
        backgroundBlendMode: "multiply, soft-light",
      };
    case "wood":
      return {
        backgroundImage: `
          repeating-linear-gradient(90deg,
            rgba(0,0,0,${light ? ".025" : ".05"}) 0 2px,
            rgba(0,0,0,0) 2px 9px
          )
        `,
        backgroundBlendMode: "multiply",
      };
    case "woodGlass":
      return {
        backgroundImage: `
          repeating-linear-gradient(90deg,
            rgba(0,0,0,${light ? ".04" : ".075"}) 0 2px,
            rgba(0,0,0,0) 2px 9px
          ),
          linear-gradient(135deg, rgba(255,255,255,${light ? ".25" : ".08"}) 0%, rgba(255,255,255,0) 60%)
        `,
        backgroundBlendMode: "multiply, soft-light",
      };
    case "ice":
      return {
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0) 60%)`,
        backgroundBlendMode: "soft-light",
      };
    case "grass":
      return {
        backgroundImage: `
          radial-gradient(rgba(0,0,0,${light ? ".02" : ".05"}) 1px, transparent 1px),
          radial-gradient(rgba(255,255,255,${light ? ".25" : ".05"}) 1px, transparent 1px)
        `,
        backgroundPosition: "0 0, 2px 2px",
        backgroundSize: "6px 6px, 6px 6px",
        backgroundBlendMode: "multiply",
      };
    default:
      return {};
  }
}
function squareStyle(light, cell, themeVars) {
  const base = light ? themeVars.light : themeVars.dark;
  const tex  = textureLayers(themeVars.texture, light);
  return {
    backgroundColor: base,
    ...tex,
    transition: "transform 120ms ease-out",
    willChange: "transform",
  };
}

/* Labels: inside (phones), dark, premium */
function coordStyle(cell) {
  return {
    color: "rgba(26,18,10,.95)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 900,
    letterSpacing: "0.02em",
    textShadow: "0 1px 0 rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.12)",
    fontSize: Math.max(12, Math.floor(cell * 0.20)),
    lineHeight: 1,
  };
}

/* Mesh coordinate inside the target cell (not full-screen) */
function meshCoordStyle(cell) {
  return {
    color: "#3B2A1A",
    fontWeight: 900,
    letterSpacing: "0.01em",
    textTransform: "lowercase",
    textShadow: "0 2px 8px rgba(0,0,0,.15), 0 1px 0 rgba(255,255,255,.6)",
    fontSize: Math.max(18, Math.floor(cell * 0.6)), // scaled to the cell
    lineHeight: 1,
    opacity: 0.9
  };
}

/* Textured action buttons */
function texturedButtonStyle(kind, themeVars) {
  const light = kind === "light";
  const base  = light ? themeVars.light : themeVars.dark;
  const tex   = textureLayers(themeVars.texture, light);
  return {
    backgroundColor: base,
    ...tex,
    color: light ? "#111827" : "#ffffff",
    border: light ? "2px solid rgba(0,0,0,.15)" : "2px solid rgba(0,0,0,.25)",
    textShadow: light ? "0 1px 0 rgba(255,255,255,.5)" : "0 1px 0 rgba(0,0,0,.25)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.15), 0 6px 18px rgba(0,0,0,.14)",
    backgroundBlendMode: "multiply, soft-light",
  };
}

/* ---------- Board ---------- */
function Board({
  containerRef,
  themeVars,
  viewFiles,
  viewRanks,
  phase,          // 'idle' | 'mesh' | 'reveal'
  target,         // {r,c} in view indices
  lastResult,     // 'correct'|'incorrect'|null
  restricted,     // boolean
  activeStart,    // {file,rank} absolute 0..7
  activeSize,     // n (3..8)
  revealMode,     // 'square'|'2x2'|'3x3'|'board'
  onSquareClick,  // (rowIdx,colIdx)
  showLabels,
}) {
  const [side, setSide] = useState(520);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const isPhone = window.innerWidth < 768;
      setPhone(isPhone);
      if (isPhone) {
        const availableW = Math.max(260, window.innerWidth);
        setSide(Math.floor(availableW));
      } else {
        const labelColW = 24;
        const gap = 8, pad = 8;
        const availableW = Math.max(260, el.clientWidth - labelColW - gap - pad);
        const topAllowance = 160;
        const bottomAllowance = 110;
        const availableH = Math.max(300, window.innerHeight - topAllowance - bottomAllowance);
        setSide(Math.floor(Math.min(availableW, availableH)));
      }
      document.documentElement.style.overflowX = "hidden";
      document.body.style.overflowX = "hidden";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [containerRef]);

  const rows = viewRanks.length;
  const cols = viewFiles.length;
  const cell = side / Math.max(rows, cols);

  const GRID_LINE = "#a1a1aa";  // visible mesh lines
  const MESH_BG   = "#d4d4d8";  // mesh gray

  const inRevealPatch = useCallback((rowIdx, colIdx) => {
    if (!target) return false;
    if (revealMode === "board") return true;
    if (revealMode === "square") return rowIdx === target.r && colIdx === target.c;
    if (revealMode === "2x2") {
      const r1 = Math.min(target.r + 1, rows - 1);
      const c1 = Math.min(target.c + 1, cols - 1);
      return rowIdx >= target.r && rowIdx <= r1 && colIdx >= target.c && colIdx <= c1;
    }
    // 3x3
    const r0 = Math.max(0, target.r - 1);
    const c0 = Math.max(0, target.c - 1);
    const r1 = Math.min(rows - 1, target.r + 1);
    const c1 = Math.min(cols - 1, target.c + 1);
    return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
  }, [target, revealMode, rows, cols]);

  // Absolute n×n restricted region
  const inActiveRegionAbs = useCallback(
    (fileIdx, rankIdx) => {
      if (!restricted) return true;
      const f0 = activeStart.file;
      const r0 = activeStart.rank;
      const f1 = f0 + activeSize - 1;
      const r1 = r0 + activeSize - 1;
      return fileIdx >= f0 && fileIdx <= f1 && rankIdx >= r0 && rankIdx <= r1;
    },
    [restricted, activeStart.file, activeStart.rank, activeSize]
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: phone ? "1fr" : "auto 1fr", gridTemplateRows: phone ? "1fr" : "1fr auto" }}
      >
        {/* Desktop left ranks */}
        {!phone && (
          <div
            className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {viewRanks.map((r, i) => (
              <div
                key={`rank-${r}-${i}`}
                className="flex items-center justify-center font-bold"
                style={{ height: side / rows, width: 24 }}
                aria-hidden
              >
                {showLabels ? r : ""}
              </div>
            ))}
          </div>
        )}

        {/* Frame */}
        <div
          className="rounded-2xl overflow-hidden relative bg-white dark:bg-zinc-900"
          style={{ width: side, height: side, gridColumn: phone ? "1" : "2", gridRow: 1 }}
        >
          {/* Grid */}
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap: phase === "mesh" ? 1 : 0,                 // visible mesh lines
              backgroundColor: phase === "mesh" ? GRID_LINE : "transparent",
            }}
            role="grid"
            aria-label="Eagle Eye board"
          >
            {Array.from({ length: rows }).map((_, rowIdx) =>
              Array.from({ length: cols }).map((__, colIdx) => {
                const file = viewFiles[colIdx];
                const rank = viewRanks[rowIdx];
                const light = isLightSquare(file, rank);

                // Background by phase
                let styleBg;
                if (phase === "mesh") {
                  styleBg = { backgroundColor: MESH_BG, border: "0.1px solid black"};
                } else if (phase === "reveal") {
                  const show = inRevealPatch(rowIdx, colIdx);
                  styleBg = show ? squareStyle(light, cell, themeVars) : { backgroundColor: MESH_BG };
                } else {
                  styleBg = squareStyle(light, cell, themeVars);
                }

                // Dim outside restricted n×n region (no blue outline)
                const insideRestricted = inActiveRegionAbs(fileToIndex(file), rankToIndex(rank));

                const isLeftEdge = colIdx === 0;
                const isBottomEdge = rowIdx === rows - 1;

                const isTargetNow = target && target.r === rowIdx && target.c === colIdx;
                const outlinePx = Math.max(4, Math.floor(cell * 0.08));
                const outlineColor =
                  lastResult === "correct"
                    ? "#228B22"
                    : "rgba(244,63,94,.95)";

                return (
                  <button
                    key={`${file}${rank}`}
                    className="relative"
                    style={{
                      ...styleBg,
                      cursor: "pointer",
                      transform: "translateZ(0)",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.985)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "translateZ(0)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateZ(0)")}
                    onClick={() => onSquareClick?.(rowIdx, colIdx)}
                    role="gridcell"
                    aria-label={`${file}${rank}`}
                  >
                    {/* Dim outside restricted area */}
                    {restricted && !insideRestricted && (
                      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                    )}

                    {/* MESH PHASE: put the coordinate INSIDE the target cell */}
                    {phase === "mesh" && target && isTargetNow && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                        <div style={meshCoordStyle(cell)}>{`${file}${rank}`}</div>
                      </div>
                    )}

                    {/* REVEAL highlight — inner outline on ALL 4 sides, even at edges */}
                    {phase === "reveal" && isTargetNow && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ boxShadow: `inset 0 0 0 ${outlinePx}px ${outlineColor}` }}
                      />
                    )}

                    {/* Inside labels (phones) */}
                    {phone && showLabels && phase !== "mesh" && (
                      <>
                        {isLeftEdge && (
                          <span
                            className="absolute select-none"
                            style={{
                              ...coordStyle(cell),
                              top: Math.max(3, Math.floor(cell * 0.06)),
                              left: Math.max(5, Math.floor(cell * 0.07)),
                              zIndex: 1,
                            }}
                            aria-hidden
                          >
                            {rank}
                          </span>
                        )}
                        {isBottomEdge && (
                          <span
                            className="absolute select-none"
                            style={{
                              ...coordStyle(cell),
                              right: Math.max(5, Math.floor(cell * 0.07)),
                              bottom: Math.max(3, Math.floor(cell * 0.06)),
                              zIndex: 1,
                              textTransform: "lowercase",
                            }}
                            aria-hidden
                          >
                            {file}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Desktop bottom files */}
        {!phone && (
          <div
            className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}
          >
            <div style={{ width: 24 }} aria-hidden />
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {viewFiles.map((f) => (
                <div key={`file-${f}`} className="flex items-center justify-center font-bold" style={{ height: 24 }} aria-hidden>
                  {showLabels ? f : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Prompt-only stage (Mode 2) — kept intact */
function PromptStage({ phase, lastResult, target, viewFiles, viewRanks }) {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden grid place-items-center"
           style={{ width: "min(90vmin, 600px)", aspectRatio: "1 / 1" }}>
        <div className="w-full max-w-sm px-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="text-center text-zinc-900 dark:text-zinc-100">
              {phase === "mesh" && (
                <>
                  <div className="text-4xl font-black tracking-tight">
                    {target ? `${viewFiles[target.c]}${viewRanks[target.r]}` : "e4"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Press <span className="px-2 py-0.5 rounded-full border text-xs">L ← / D →</span> or use the buttons.
                  </div>
                </>
              )}
              {phase === "reveal" && (
                <div className="text-sm font-semibold"
                     style={{ color: lastResult === "correct" ? "#10b981" : "#f43f5e" }}>
                  {lastResult === "correct" ? "Correct" : "Wrong"}
                </div>
              )}
              {phase === "idle" && (
                <>
                  <div className="text-3xl font-black tracking-tight">Ready?</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Press <span className="px-2 py-0.5 rounded-full border text-xs">Start</span> to begin.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Main ----------------------------- */
export default function EagleEye() {
  // Theme + labels
  const [theme, setTheme] = useState("classicWood");
  const themeVars = THEMES[theme] || THEMES.classicWood;
  const [showLabels, setShowLabels] = useState(true);

  // Modes / reveal
  const [mode, setMode] = useState(1); // 1 = board, 2 = prompt-only
  const [revealMode, setRevealMode] = useState("board"); // square | 2x2 | 3x3 | board
  const [revealMs, setRevealMs] = useState(300);
  const [repeatIncorrect, setRepeatIncorrect] = useState(true);
  const [openSheet, setOpenSheet] = useState(false);

  // Timer + game state
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [target, setTarget] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [score, setScore] = useState(0);

  // Board size / restriction region
  const [boardSize, setBoardSize] = useState(8); // n
  const [restricted, setRestricted] = useState(false);
  const [anchor, setAnchor] = useState({ file: 0, rank: 0 }); // top-left (absolute)

  const n = Math.min(Math.max(boardSize, 3), 8);
  const activeStart = anchor;
  const activeSize  = n;

  // Visible files/ranks (ranks reversed for top=8)
  const viewFiles = useMemo(() => filesAll, []);
  const viewRanks = useMemo(() => [...ranksAll].reverse(), []);

  // Timer
  const timerRef = useRef(null);
  useEffect(() => {
    if (!isRunning) return;
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsRunning(false);
          setPhase("idle");
          setTarget(null);
          setLastResult(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isRunning, duration]);

  // Pick target (respect restricted area)
  const pickRandomTarget = useCallback(() => {
    let f, r;
    if (restricted) {
      f = activeStart.file + Math.floor(Math.random() * activeSize);
      r = activeStart.rank + Math.floor(Math.random() * activeSize);
    } else {
      f = Math.floor(Math.random() * 8);
      r = Math.floor(Math.random() * 8);
    }
    const fileLetter = filesAll[f];
    const rankNum    = r + 1;
    const col = viewFiles.indexOf(fileLetter);
    const row = viewRanks.indexOf(rankNum);
    setTarget({ r: row, c: col });
  }, [restricted, activeStart.file, activeStart.rank, activeSize, viewFiles, viewRanks]);

  // Start/Stop
  const startGame = useCallback(() => {
    setScore(0);
    setLastResult(null);
    setIsRunning(true);
    setPhase("mesh");
    setTimeLeft(duration);
    pickRandomTarget();
    setOpenSheet(false);
  }, [duration, pickRandomTarget]);
  const stopGame = useCallback(() => {
    setIsRunning(false);
    setPhase("idle");
    setTarget(null);
    setLastResult(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Re-pick target on region changes
  useEffect(() => {
    if (isRunning) pickRandomTarget();
  }, [isRunning, restricted, activeStart.file, activeStart.rank, activeSize, pickRandomTarget]);

  // Clamp anchor when size changes
  useEffect(() => {
    setAnchor(a => {
      const f = Math.min(Math.max(0, a.file), 8 - n);
      const r = Math.min(Math.max(0, a.rank), 8 - n);
      return (f === a.file && r === a.rank) ? a : { file: f, rank: r };
    });
  }, [n]);

  // Keyboard shortcuts
  const isTypingInEditable = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  };
  useEffect(() => {
    function onKeyDown(e) {
      if (isTypingInEditable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === " " || e.key === "Spacebar") { e.preventDefault(); isRunning ? stopGame() : startGame(); return; }
      const canAnswer = isRunning && phase === "mesh" && target;
      if (canAnswer && (k === "l" || e.key === "ArrowRight")) { e.preventDefault(); submitAnswer("light"); return; }
      if (canAnswer && (k === "d" || e.key === "ArrowLeft")) { e.preventDefault(); submitAnswer("dark"); return; }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, phase, target, startGame, stopGame]);

  // Audio (simple tones)
  const audioCtxRef = useRef(null);
  const volume = 0.75;
  function ensureAudio() {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }
  function tone(freq = 440, when = 0, dur = 0.12, type = "sine", gainBase = 0.08) {
    ensureAudio();
    const ctx = audioCtxRef.current; if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq; osc.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime + when; const t1 = t0 + dur;
    const gval = Math.max(0.0001, gainBase * Math.min(1, Math.max(0, volume)));
    g.gain.setValueAtTime(gval, t0); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0); osc.stop(t1 + 0.01);
  }
  function playFeedback(correct) {
    const base = 0;
    if (correct) { tone(660, base + 0.00, 0.10, "sine", 0.08); tone(880, base + 0.10, 0.12, "sine", 0.08); }
    else { tone(220, base + 0.00, 0.10, "square", 0.07); tone(160, base + 0.09, 0.14, "square", 0.07); }
  }

  const submitAnswer = (choice) => {
    if (phase !== "mesh" || !target) return;
    const file = viewFiles[target.c];
    const rank = viewRanks[target.r];
    const light = isLightSquare(file, rank);
    const correct = (choice === "light" && light) || (choice === "dark" && !light);

    setLastResult(correct ? "correct" : "incorrect");
    setScore((s) => s + (correct ? 1 : 0));
    playFeedback(correct);

    setPhase("reveal");
    const delay = Math.max(100, revealMs);
    setTimeout(() => {
      if (!isRunning) return;
      if (!correct && repeatIncorrect) {
        setPhase("mesh");
        setLastResult(null);
      } else {
        setPhase("mesh");
        setLastResult(null);
        pickRandomTarget();
      }
    }, delay);
  };

  // Click to move restricted anchor (top-left of n×n)
  const handleSquareClick = useCallback((rowIdx, colIdx) => {
    if (!restricted) return;
    const fileLetter = viewFiles[colIdx];
    const rankNum    = viewRanks[rowIdx];
    const fIdx = fileToIndex(fileLetter);
    const rIdx = rankToIndex(rankNum);
    const f = Math.min(Math.max(0, fIdx), 8 - n);
    const r = Math.min(Math.max(0, rIdx), 8 - n);
    setAnchor({ file: f, rank: r });
    if (isRunning) pickRandomTarget();
  }, [restricted, viewFiles, viewRanks, n, isRunning, pickRandomTarget]);

  /* ---------- Controls ---------- */
  const ControlsPanel = (
    <div className="grid gap-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Gameplay</div>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Mode</span>
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              value={mode}
              onChange={(e)=>setMode(Number(e.target.value))}
            >
              <option value={1}>Mode 1 — Board visible</option>
              <option value={2}>Mode 2 — Prompt only</option>
            </select>
          </label>

          <div className="grid gap-1">
            <label className="text-sm text-zinc-800 dark:text-zinc-100">Reveal length (ms): {revealMs}</label>
            <input
              className="w-full accent-zinc-900 dark:accent-zinc-100"
              type="range" min={300} max={2000} step={50}
              value={revealMs}
              onChange={(e)=>setRevealMs(Number(e.target.value))}
            />
          </div>

          <label className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Reveal Mode</span>
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              value={revealMode}
              onChange={(e)=>setRevealMode(e.target.value)}
            >
              <option value="square">Only selected square</option>
              <option value="2x2">2×2 patch</option>
              <option value="3x3">3×3 patch</option>
              <option value="board">Full board</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Board</div>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Theme</span>
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              value={theme}
              onChange={(e)=>setTheme(e.target.value)}
            >
              {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
            </select>
          </label>

          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Restricted size (n×n)</span>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                onClick={() => setBoardSize((n) => Math.max(3, n - 1))}
              >−</button>
              <div className="w-20 text-center font-black">{boardSize}×{boardSize}</div>
              <button
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                onClick={() => setBoardSize((n) => Math.min(8, n + 1))}
              >+</button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={restricted} onChange={()=>setRestricted(v=>!v)} />
            Restricted sub-board
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={showLabels} onChange={()=>setShowLabels(v=>!v)} />
            Show rank/file labels
          </label>
        </div>
      </div>
    </div>
  );

  // Sidebar (desktop)
  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  // Footer: Dark/Light buttons (textured)
  const Footer = () => {
    if (isRunning){
        return (
            <div className="w-full grid grid-cols-2 gap-3 items-center">
                <button
                    className="h-16 rounded-2xl font-black shadow-sm active:scale-[.99] transition-transform"
                    onClick={() => submitAnswer("dark")}
                    disabled={!isRunning || phase !== "mesh" || !target}
                    style={{
                    ...texturedButtonStyle("dark", themeVars),
                    opacity: (!isRunning || phase !== "mesh" || !target) ? 0.6 : 1
                    }}
                >
                    Dark
                </button>
                <button
                    className="h-16 rounded-2xl font-black shadow-sm active:scale-[.99] transition-transform"
                    onClick={() => submitAnswer("light")}
                    disabled={!isRunning || phase !== "mesh" || !target}
                    style={{
                    ...texturedButtonStyle("light", themeVars),
                    opacity: (!isRunning || phase !== "mesh" || !target) ? 0.6 : 1
                    }}
                >
                    Light
                </button>
            </div>
        );
    }
    return;
    
  };
//   const footer = (
//     <div className="w-full grid grid-cols-2 gap-3 items-center">
//       <button
//         className="h-16 rounded-2xl font-black shadow-sm active:scale-[.99] transition-transform"
//         onClick={() => submitAnswer("dark")}
//         disabled={!isRunning || phase !== "mesh" || !target}
//         style={{
//           ...texturedButtonStyle("dark", themeVars),
//           opacity: (!isRunning || phase !== "mesh" || !target) ? 0.6 : 1
//         }}
//       >
//         Dark
//       </button>
//       <button
//         className="h-16 rounded-2xl font-black shadow-sm active:scale-[.99] transition-transform"
//         onClick={() => submitAnswer("light")}
//         disabled={!isRunning || phase !== "mesh" || !target}
//         style={{
//           ...texturedButtonStyle("light", themeVars),
//           opacity: (!isRunning || phase !== "mesh" || !target) ? 0.6 : 1
//         }}
//       >
//         Light
//       </button>
//     </div>
//   );

  // Header: Score + Timer + Start/Stop + Controls
  const headerContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Score:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{score}</span>
      </div>

      {!isRunning ? (
        <button
          onClick={startGame}
          className="rounded-xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[.99]"
          style={{ backgroundColor: "#7E8F64" }}
        >
          Start
        </button>
      ) : (
        <button
          onClick={stopGame}
          className="rounded-xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[.99]"
          style={{ backgroundColor: "#8B5A2B" }}
        >
          Stop
        </button>
      )}

      <button
        className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700"
        onClick={() => setOpenSheet(true)}
        style={{ background: "#EAD6B7", color: "#3B2A1A" }}
      >
        Controls
      </button>

      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Timer:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{timeLeft}</span>
      </div>
    </div>
  );

  const stageContainerRef = useRef(null);

  return (
    <GameLayout headerContent={headerContent} sidebar={sidebar} footer={<Footer />}>
      <div ref={stageContainerRef} className="w-full overflow-visible">
        {/* Full-bleed on phones */}
        {mode === 1 ? (
          <>
            <div
              className="md:hidden"
              style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
            >
              <Board
                containerRef={stageContainerRef}
                themeVars={themeVars}
                viewFiles={viewFiles}
                viewRanks={viewRanks}
                phase={phase}
                target={target}
                lastResult={lastResult}
                restricted={restricted}
                activeStart={anchor}
                activeSize={n}
                revealMode={revealMode}
                onSquareClick={handleSquareClick}
                showLabels={showLabels}
              />
            </div>
            <div className="hidden md:block">
              <Board
                containerRef={stageContainerRef}
                themeVars={themeVars}
                viewFiles={viewFiles}
                viewRanks={viewRanks}
                phase={phase}
                target={target}
                lastResult={lastResult}
                restricted={restricted}
                activeStart={anchor}
                activeSize={n}
                revealMode={revealMode}
                onSquareClick={handleSquareClick}
                showLabels={showLabels}
              />
            </div>
          </>
        ) : (
          <PromptStage
            phase={phase}
            lastResult={lastResult}
            target={target}
            viewFiles={viewFiles}
            viewRanks={viewRanks}
          />
        )}
      </div>

      {/* Mobile Controls sheet */}
      {openSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenSheet(false)} />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 max-h-[70vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Controls</h3>
              <button className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700" onClick={() => setOpenSheet(false)}>Close</button>
            </div>

            {/* Gameplay */}
            <div className="grid gap-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Gameplay</div>
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm text-zinc-800 dark:text-zinc-100">Mode</span>
                    <select
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
                      value={mode}
                      onChange={(e)=>setMode(Number(e.target.value))}
                    >
                      <option value={1}>Mode 1 — Board visible</option>
                      <option value={2}>Mode 2 — Prompt only</option>
                    </select>
                  </label>

                  <div className="grid gap-1">
                    <label className="text-sm text-zinc-800 dark:text-zinc-100">Reveal length (ms): {revealMs}</label>
                    <input
                      className="w-full accent-zinc-900 dark:accent-zinc-100"
                      type="range" min={300} max={2000} step={50}
                      value={revealMs}
                      onChange={(e)=>setRevealMs(Number(e.target.value))}
                    />
                  </div>

                  <label className="grid gap-1">
                    <span className="text-sm text-zinc-800 dark:text-zinc-100">Reveal Mode</span>
                    <select
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
                      value={revealMode}
                      onChange={(e)=>setRevealMode(e.target.value)}
                    >
                      <option value="square">Only selected square</option>
                      <option value="2x2">2×2 patch</option>
                      <option value="3x3">3×3 patch</option>
                      <option value="board">Full board</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Board */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
                <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Board</div>
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm text-zinc-800 dark:text-zinc-100">Theme</span>
                    <select
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
                      value={theme}
                      onChange={(e)=>setTheme(e.target.value)}
                    >
                      {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
                    </select>
                  </label>

                  <div className="grid gap-1">
                    <span className="text-sm text-zinc-800 dark:text-zinc-100">Restricted size (n×n)</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                        onClick={() => setBoardSize((n) => Math.max(3, n - 1))}
                      >−</button>
                      <div className="w-20 text-center font-black">{boardSize}×{boardSize}</div>
                      <button
                        className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                        onClick={() => setBoardSize((n) => Math.min(8, n + 1))}
                      >+</button>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                    <input type="checkbox" checked={restricted} onChange={()=>setRestricted(v=>!v)} />
                    Restricted sub-board
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                    <input type="checkbox" checked={showLabels} onChange={()=>setShowLabels(v=>!v)} />
                    Show rank/file labels
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
