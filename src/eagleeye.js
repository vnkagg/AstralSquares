import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/** Board themes */
const THEMES = {
  wooden: { light: "#EBD3B0", dark: "#AE6B36" },
  green:  { light: "#e6f4ea", dark: "#0d7a5f" },
  ice:    { light: "#eaf6ff", dark: "#2e5eaa" },
  wb:     { light: "#ffffff", dark: "#000000" },
};

const filesAll = ["a","b","c","d","e","f","g","h"];
const ranksAll = [1,2,3,4,5,6,7,8];
const fileToIndex = (f) => filesAll.indexOf(f);
const rankToIndex = (r) => r - 1;
const isLightSquare = (file, rank) => (fileToIndex(file) + rankToIndex(rank)) % 2 === 1; // a1 dark

/** Square board (Mode 1 only). It scales to container, no overflow. */
function Board({
  containerRef,
  themeVars,
  renderFullBoard,
  n,
  viewFiles,
  viewRanks,
  phase,
  target,
  lastResult,
  restricted,
  activeStart,
  onSquareClick,
  revealMode,
}) {
  const [boardPx, setBoardPx] = useState(320);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const labelColW = 28, gap = 8, pad = 8;
      const availableW = Math.max(220, el.clientWidth - labelColW - gap - pad);
      const phone = window.innerWidth < 768;
      const topAllowance = phone ? 220 : 160;
      const bottomAllowance = phone ? 150 : 120;
      const availableH = Math.max(240, window.innerHeight - topAllowance - bottomAllowance);
      setBoardPx(Math.floor(Math.min(availableW, availableH)));
      document.documentElement.style.overflowX = "hidden";
      document.body.style.overflowX = "hidden";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [containerRef]);

  const rows = renderFullBoard ? 8 : n;
  const cols = renderFullBoard ? 8 : n;

  const inRevealPatch = useCallback((rowIdx, colIdx) => {
    if (!target) return false;
    if (revealMode === "board") return true;
    if (revealMode === "square") return rowIdx === target.r && colIdx === target.c;
    if (revealMode === "2x2") {
      const r0 = Math.min(target.r, rows - 1);
      const c0 = Math.min(target.c, cols - 1);
      const r1 = Math.min(r0 + 1, rows - 1);
      const c1 = Math.min(c0 + 1, cols - 1);
      return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
    }
    // 3x3
    const r0 = Math.max(0, target.r - 1);
    const c0 = Math.max(0, target.c - 1);
    const r1 = Math.min(rows - 1, target.r + 1);
    const c1 = Math.min(cols - 1, target.c + 1);
    return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
  }, [target, revealMode, rows, cols]);

  const inActiveRegionAbs = useCallback(
    (fileIdx, rankIdx) =>
      fileIdx >= activeStart.file &&
      fileIdx < activeStart.file + n &&
      rankIdx >= activeStart.rank &&
      rankIdx < activeStart.rank + n,
    [activeStart.file, activeStart.rank, n]
  );

  return (
    <div className="w-full">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: "auto 1fr", gridTemplateRows: "1fr auto" }}
      >
        {/* left ranks */}
        <div
          className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          {viewRanks.map((r) => (
            <div
              key={`rank-${r}`}
              className="flex items-center justify-center font-black"
              style={{ height: boardPx / rows, width: 24 }}
              aria-hidden
            >
              {r}
            </div>
          ))}
        </div>

        {/* square board */}
        <div
          className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden"
          style={{ width: boardPx, height: boardPx, gridColumn: 2, gridRow: 1 }}
        >
          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
            role="grid"
            aria-label="Training board"
          >
            {Array.from({ length: rows }).map((_, rowIdx) =>
              Array.from({ length: cols }).map((__, colIdx) => {
                const file = viewFiles[colIdx];
                const rank = viewRanks[rowIdx];
                const light = isLightSquare(file, rank);
                 // absolute (0..7) indices for restrict math
                const fileIdxAbs = fileToIndex(file);
                const rankIdxAbs = rankToIndex(rank);
                const inside = inActiveRegionAbs(fileIdxAbs, rankIdxAbs);
                const isEdge =
                restricted && inside && (
                    fileIdxAbs === activeStart.file ||
                    fileIdxAbs === activeStart.file + n - 1 ||
                    rankIdxAbs === activeStart.rank ||
                    rankIdxAbs === activeStart.rank + n - 1
                );

                // backgrounds by phase
                let bg;
                if (phase === "idle") {
                  bg = light ? themeVars.light : themeVars.dark;
                } else if (phase === "mesh") {
                  const isTargetNow = target && target.r === rowIdx && target.c === colIdx;
                  bg = isTargetNow ? "#9ca3af" : "#d3d3d3";
                } else {
                  const show = inRevealPatch(rowIdx, colIdx);
                  bg = show ? (light ? themeVars.light : themeVars.dark) : "#d3d3d3";
                }

                // 1px grid (all four sides; prevent double-thick by only right/bottom at edges)
                const cellBorder =
                  `border-l border-t ${colIdx === cols - 1 ? "border-r " : ""}${rowIdx === rows - 1 ? "border-b " : ""}` +
                  "border-zinc-300 dark:border-zinc-700";

                // THICK 4-side outline on target during reveal
                const isTargetNow = target && target.r === rowIdx && target.c === colIdx;
                const thickOutline =
                  phase === "reveal" && isTargetNow
                    ? (lastResult === "correct"
                        ? "0 0 0 6px rgba(16,185,129,.95)"  // emerald-500
                        : "0 0 0 6px rgba(244,63,94,.95)")  // rose-500
                    : "none";

                return (
                  <div
                    key={`${file}${rank}`}
                    className={`relative transition-transform ${cellBorder}`}
                    style={{ background: bg, boxShadow: thickOutline }}
                    role="gridcell"
                    aria-label={`${file}${rank}`}
                    onClick={() => onSquareClick(rowIdx, colIdx)}
                  >
                    {/* coordinate in Mode 1 during mesh */}
                    {isTargetNow && phase === "mesh" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="font-black"
                          style={{
                            color: "#111827", // ensure visible on grey
                            fontSize: "min(8vw, 32px)",
                            textShadow: "0 2px 2px rgba(255,255,255,.5)",
                          }}
                        >
                          {file}{rank}
                        </span>
                      </div>
                    )}
                    
                    {/* Dim everything outside restricted region */}
                    {restricted && !inside && (
                      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                    )}

                    {/* Draw a clear ring around the active n×n region */}
                    {isEdge && (
                      <div className="absolute inset-0 pointer-events-none ring-2 ring-sky-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* bottom files */}
        <div
          className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
          style={{ gridColumn: "1 / span 2", gridRow: 2, width: boardPx + 24 }}
        >
          <div style={{ width: 24 }} aria-hidden />
          <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {viewFiles.map((f) => (
              <div
                key={`file-${f}`}
                className="flex items-center justify-center font-black"
                style={{ height: 24 }}
                aria-hidden
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Prompt-only stage (Mode 2). Keeps a constant square area across phases. */
function PromptStage({ phase, lastResult, target, viewFiles, viewRanks }) {
  return (
    <div className="w-full flex justify-center items-center">
      {/* outer frame matches board max-width and enforces square area */}
      <div
        className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden grid place-items-center"
        style={{ width: "min(90vmin, 600px)", aspectRatio: "1 / 1" }}
      >
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
                <div
                  className="text-sm font-semibold"
                  style={{ color: lastResult === "correct" ? "#10b981" : "#f43f5e" }}
                >
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

export default function EagleEye() {
  // ===== State =====
  const [theme, setTheme] = useState("wooden");
  const themeVars = THEMES[theme] || THEMES.green;

  const [mode, setMode] = useState(1); // 1 = board, 2 = prompt-only
  const [revealMode, setRevealMode] = useState("board"); // square | 2x2 | 3x3 | board
  const [revealMs, setRevealMs] = useState(300);
  const [repeatIncorrect, setRepeatIncorrect] = useState(true);
  const [openSheet, setOpenSheet] = useState(false);

  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [target, setTarget] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [score, setScore] = useState(0);

  const [boardSize, setBoardSize] = useState(8);
  const [restricted, setRestricted] = useState(false);
  const [anchor, setAnchor] = useState({ file: 0, rank: 0 });

  const activeStart = restricted ? anchor : { file: 0, rank: 0 };
  const n = Math.min(Math.max(boardSize, 3), 8);
  const renderFullBoard = restricted || n === 8;

  const viewFiles = useMemo(() => {
    if (renderFullBoard) return filesAll;
    return filesAll.slice(activeStart.file, activeStart.file + n);
  }, [renderFullBoard, activeStart.file, n]);

  const viewRanks = useMemo(() => {
    if (renderFullBoard) return [...ranksAll].reverse();
    const slice = ranksAll.slice(activeStart.rank, activeStart.rank + n);
    return [...slice].reverse();
  }, [renderFullBoard, activeStart.rank, n]);

  // Timer (counts down while running)
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
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, duration]);

  // Target picking
  const pickRandomTarget = useCallback(() => {
    if (renderFullBoard) {
      const f = activeStart.file + Math.floor(Math.random() * n);
      const r = activeStart.rank + Math.floor(Math.random() * n);
      const fileLetter = filesAll[f];
      const rankNum = r + 1;
      const col = viewFiles.indexOf(fileLetter);
      const row = viewRanks.indexOf(rankNum);
      setTarget({ r: row, c: col });
    } else {
      setTarget({ r: Math.floor(Math.random() * n), c: Math.floor(Math.random() * n) });
    }
  }, [renderFullBoard, activeStart.file, activeStart.rank, n, viewFiles, viewRanks]);

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning) pickRandomTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restricted, boardSize, anchor.file, anchor.rank]);

  // Keyboard shortcuts: L/← = light, D/→ = dark. Space toggles start/stop.
  const isTypingInEditable = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  };
  useEffect(() => {
    function onKeyDown(e) {
      if (isTypingInEditable(e.target)) return;
      const k = e.key.toLowerCase();

      if (k === " " || e.key === "Spacebar") {
        e.preventDefault();
        isRunning ? stopGame() : startGame();
        return;
      }

      const canAnswer = isRunning && phase === "mesh" && target;
      if (canAnswer && (k === "l" || e.key === "ArrowLeft")) { e.preventDefault(); submitAnswer("light"); return; }
      if (canAnswer && (k === "d" || e.key === "ArrowRight")) { e.preventDefault(); submitAnswer("dark"); return; }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, phase, target, startGame, stopGame]); // deps include handlers/state used

  // Answers + audio
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
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq; osc.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime + when; const t1 = t0 + dur;
    const gval = Math.max(0.0001, gainBase * Math.min(1, Math.max(0, volume)));
    g.gain.setValueAtTime(gval, t0); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0); osc.stop(t1 + 0.01);
  }
  function playFeedback(correct) {
    ensureAudio();
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
    const delay = Math.max(100, revealMode === "board" ? revealMs : revealMs);
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
  const validAnchor = useCallback(
    (fIdx, rIdx) => (
      fIdx >= 0 && rIdx >= 0 && fIdx <= 8 - n && rIdx <= 8 - n
    ),
    [n]
  );
  useEffect(() => {
    if (!restricted) return;
    setAnchor(a => {
      const f = Math.min(Math.max(0, a.file), 8 - n);
      const r = Math.min(Math.max(0, a.rank), 8 - n);
      return (f === a.file && r === a.rank) ? a : { file: f, rank: r };
    });
  }, [n, restricted]);
  
  // Square click: in this trainer we only use it for moving the restricted anchor (if you enable that later)
   const handleSquareClick = useCallback((rowIdx, colIdx) => {
       if (!restricted) return;
       const fileLetter = viewFiles[colIdx];
       const rankNum = viewRanks[rowIdx];
       const fIdx = fileToIndex(fileLetter);
       const rIdx = rankToIndex(rankNum);
       if (!validAnchor(fIdx, rIdx)) return;
       setAnchor({ file: fIdx, rank: rIdx });
       if (isRunning) pickRandomTarget();
     }, [restricted, viewFiles, viewRanks, isRunning, pickRandomTarget, validAnchor]);

  // Controls (compact; no score/timer)
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
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Board Size (n×n)</span>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                onClick={() => setBoardSize((n) => Math.max(3, n - 1))}
              >−</button>
              <div className="w-16 text-center font-black">{boardSize}×{boardSize}</div>
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
        </div>
      </div>

      {/* Start/Stop */}
      {!isRunning ? (
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center shadow-sm bg-white dark:bg-green-900 text-zinc-900 dark:text-zinc-100 cursor-pointer"
          onClick={startGame}
        >
          Start
        </div>
      ) : (
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center shadow-sm bg-white dark:bg-rose-900 text-zinc-900 dark:text-zinc-100 cursor-pointer"
          onClick={stopGame}
        >
          Stop
        </div>
      )}
    </div>
  );

  // Sidebar (desktop)
  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  // Footer: ONLY answer buttons
  const footer = (
    <div className="w-full grid grid-cols-2 gap-3 items-center">
      <button
        className="h-14 rounded-xl font-black border-2 border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100"
        onClick={() => submitAnswer("dark")}
        disabled={!isRunning || phase !== "mesh" || !target}
        style={{ background: themeVars.dark }}
      >
        Dark
      </button>
      <button
        className="h-14 rounded-xl font-black border-2 border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100"
        onClick={() => submitAnswer("light")}
        disabled={!isRunning || phase !== "mesh" || !target}
        style={{ background: themeVars.light }}
      >
        Light
      </button>
    </div>
  );

  // Header: Score + Time + (mobile-only) Controls button
  const headerContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Score:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{score}</span>
      </div>

      {/* Mobile-only Controls button */}
      <button
        className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
        onClick={() => setOpenSheet(true)}
      >
        Controls
      </button>

      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Time Left(s):</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{timeLeft}</span>
      </div>
    </div>
  );

  // Stage container ref for measuring fit
  const stageContainerRef = useRef(null);

  return (
    <GameLayout
      headerContent={headerContent}  // ← make sure GameLayout uses this prop name
      sidebar={sidebar}
      footer={footer}
    >
      <div ref={stageContainerRef} className="w-full overflow-hidden">
        {/* Mode switch: prompt REPLACES board region */}
        {mode === 1 ? (
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            renderFullBoard={renderFullBoard}
            n={n}
            viewFiles={viewFiles}
            viewRanks={viewRanks}
            phase={phase}
            target={target}
            lastResult={lastResult}
            restricted={restricted}
            activeStart={activeStart}
            onSquareClick={handleSquareClick}
            revealMode={revealMode}
          />
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

      {/* Mobile bottom sheet */}
      {openSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenSheet(false)} />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 max-h-[70vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Controls</h3>
              <button className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700" onClick={() => setOpenSheet(false)}>Close</button>
            </div>
            {ControlsPanel}
          </div>
        </div>
      )}
    </GameLayout>
  );
}
