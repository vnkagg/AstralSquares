import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/* ---------- Theme ---------- */
const THEMES = {
  wooden: { light: "#EBD3B0", dark: "#AE6B36" },
  green:  { light: "#e6f4ea", dark: "#0d7a5f" },
  ice:    { light: "#eaf6ff", dark: "#2e5eaa" },
  wb:     { light: "#ffffff", dark: "#000000" },
};

const FILES = ["a","b","c","d","e","f","g","h"];

/* ---------- Piece sprites (Wikimedia) ---------- */
const PIECE = {
  w: {
    k: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
    q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
    r: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
    b: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
    n: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
    p: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  },
  b: {
    k: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg",
    q: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
    r: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
    b: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
    n: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
    p: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
  },
};

/* Starting pieces map: "e4" -> { color:'w', type:'n' } */
function buildStartPiecesMap() {
  const m = new Map();
  for (let i = 0; i < 8; i++) m.set(String.fromCharCode(97+i) + "2", { color: "w", type: "p" });
  for (let i = 0; i < 8; i++) m.set(String.fromCharCode(97+i) + "7", { color: "b", type: "p" });
  const back = ["r","n","b","q","k","b","n","r"];
  for (let i = 0; i < 8; i++) {
    m.set(String.fromCharCode(97+i) + "1", { color: "w", type: back[i] });
    m.set(String.fromCharCode(97+i) + "8", { color: "b", type: back[i] });
  }
  return m;
}
const START_PIECES = buildStartPiecesMap();

/* ---------- Board ---------- */
function Board({
  containerRef,
  themeVars,
  flipped,
  showLabels,
  showPieces,
  running,
  overlayText,       // string | null — when set, render big translucent text centered
  onClickSquare,     // (alg) => void
}) {
  const [side, setSide] = useState(520);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const labelColW = 28;
      const gap = 8, pad = 8;
      const availableW = Math.max(260, el.clientWidth - labelColW - gap - pad);
      const phone = window.innerWidth < 768;
      const topAllowance = phone ? 220 : 160;
      const bottomAllowance = phone ? 140 : 110;
      const availableH = Math.max(300, window.innerHeight - topAllowance - bottomAllowance);
      setSide(Math.floor(Math.min(availableW, availableH)));
      document.documentElement.style.overflowX = "hidden";
      document.body.style.overflowX = "hidden";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [containerRef]);

  const n = 8;
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark (white perspective)
  const rcToAlg = (r,c) => String.fromCharCode(97 + c) + (8 - r);

  const displayRows = useMemo(() => {
    const arr = Array.from({ length: n }, (_, r) => r);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);
  const displayCols = useMemo(() => {
    const arr = Array.from({ length: n }, (_, c) => c);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);

  const ranksForLabels = useMemo(() => (flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]), [flipped]);
  const filesForLabels = useMemo(() => (flipped ? [...FILES].reverse() : FILES), [flipped]);

  const cell = side / n;

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: "auto 1fr", gridTemplateRows: "1fr auto" }}
      >
        {/* left ranks */}
        <div
          className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          {ranksForLabels.map((r, i) => (
            <div key={`rank-${r}-${i}`} className="flex items-center justify-center font-black"
                 style={{ height: side / n, width: 24 }} aria-hidden>
              {showLabels ? r : ""}
            </div>
          ))}
        </div>

        {/* board */}
        <div
          className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden relative"
          style={{ width: side, height: side, gridColumn: 2, gridRow: 1 }}
        >
          {/* Centered translucent overlay text (non-interactive) */}
          {!!overlayText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[3]">
              <div
                style={{
                  // scale with board size
                  fontSize: Math.max(28, Math.floor(side * 0.16)),
                  lineHeight: 1,
                  padding: `${Math.max(8, Math.floor(side * 0.02))}px ${Math.max(12, Math.floor(side * 0.03))}px`,
                  borderRadius: 16,
                  // subtle translucent plate that doesn't block the board view
                  background: "rgba(24,24,27,0.08)",
                  color: "rgba(17,17,17,0.7)",
                  textTransform: "lowercase",
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                {overlayText}
              </div>
            </div>
          )}

          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
            role="grid"
            aria-label="Square Sniper board"
          >
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const alg = rcToAlg(r, c);        // algebraic (white perspective)
                const light = isLightSquare(r, c);
                const piece = showPieces ? START_PIECES.get(alg) : null;

                return (
                  <button
                    key={alg}
                    className="relative"
                    style={{
                      background: light ? themeVars.light : themeVars.dark,
                      borderLeft: "1px solid rgba(113,113,122,.6)",
                      borderTop: "1px solid rgba(113,113,122,.6)",
                      ...(c === displayCols[displayCols.length - 1] ? { borderRight: "1px solid rgba(113,113,122,.6)" } : {}),
                      ...(r === displayRows[displayRows.length - 1] ? { borderBottom: "1px solid rgba(113,113,122,.6)" } : {}),
                      cursor: running ? "pointer" : "default",
                    }}
                    onClick={() => running && onClickSquare?.(alg)}
                  >
                    {piece && (
                      <img
                        src={PIECE[piece.color][piece.type]}
                        alt=""
                        draggable={false}
                        className="absolute"
                        style={{
                          width: `calc(${cell}px * .82)`,
                          height: "auto",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))",
                          zIndex: 2,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* bottom files */}
        <div
          className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
          style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}
        >
          <div style={{ width: 24 }} aria-hidden />
          <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {filesForLabels.map((f) => (
              <div key={`file-${f}`} className="flex items-center justify-center font-black" style={{ height: 24 }} aria-hidden>
                {showLabels ? f : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page: Square Sniper ---------- */
export default function SquareSniper() {
  /* theme + view */
  const [theme, setTheme] = useState("wooden");
  const themeVars = THEMES[theme] || THEMES.green;
  const [myColor, setMyColor] = useState("w");               // 'w' or 'b'
  const flipped = myColor === "b";

  /* labels & pieces */
  const [showLabels, setShowLabels] = useState(true);
  const [showPieces, setShowPieces] = useState(false);

  /* prompt location: 'footer' | 'board' */
  const [promptLocation, setPromptLocation] = useState("footer");

  /* game state */
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 100;

  const [timeLeft, setTimeLeft] = useState(60);
  const [target, setTarget] = useState(null); // "e4"
  const timerRef = useRef(null);

  /* audio (subtle tones) */
  const audioCtxRef = useRef(null);
  function ensureAudio(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!audioCtxRef.current) audioCtxRef.current = new AC();
    if(audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }
  function tone(freq, dur, type, vol){
    const ctx = audioCtxRef.current; const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.type=type; osc.frequency.value=freq; osc.connect(g); g.connect(ctx.destination);
    const t0=ctx.currentTime, t1=t0+dur; g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0001,t1);
    osc.start(t0); osc.stop(t1+.01);
  }
  function playGood(){ ensureAudio(); tone(740,.08,"sine",.06); tone(980,.10,"sine",.05); }
  function playBad(){  ensureAudio(); tone(180,.10,"triangle",.07); tone(140,.12,"triangle",.06); }

  /* helpers */
  const allSquares = useMemo(() => {
    const arr = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        arr.push(String.fromCharCode(97+c) + (8 - r));
      }
    }
    return arr;
  }, []);

  const pickNewTarget = useCallback(() => {
    const t = allSquares[Math.floor(Math.random() * allSquares.length)];
    setTarget(t);
  }, [allSquares]);

  const startGame = useCallback(() => {
    if (running) return;
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setTimeLeft(60);
    setRunning(true);
    pickNewTarget();
    setShowSheet(false);
  }, [running, pickNewTarget]);

  const stopGame = useCallback(() => {
    setRunning(false);
    setTarget(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // timer
  useEffect(() => {
    if (!running) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setRunning(false);
          setTarget(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [running]);

  // click guess
  function onClickSquare(alg) {
    if (!running || !target) return;
    setAttempts((a) => a + 1);
    if (alg === target) {
      playGood();
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
      pickNewTarget();
    } else {
      playBad();
      setStreak(0);
      // keep same target to reinforce learning
    }
  }

  /* ---------- header / sidebar / footer ---------- */
  const headerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Score */}
      <div className="text-sm md:text-base font-semibold">
        <span className="text-zinc-600 dark:text-zinc-400">Score:</span>{" "}
        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{score}</span>
      </div>

      {/* Accuracy & Streak */}
      <div className="flex items-center gap-3">
        <div className="text-sm md:text-base font-semibold">
          <span className="text-zinc-600 dark:text-zinc-400">Accuracy:</span>{" "}
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{accuracy}%</span>
        </div>
        <div className="text-sm md:text-base font-semibold">
          <span className="text-zinc-600 dark:text-zinc-400">Streak:</span>{" "}
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{streak}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="text-sm md:text-base font-semibold">
        <span className="text-zinc-600 dark:text-zinc-400">Time:</span>{" "}
        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{timeLeft}s</span>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Board */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Board</div>
        <div className="grid gap-3">
          {/* Theme */}
          <label className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Theme</span>
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1"
              value={theme}
              onChange={(e)=>setTheme(e.target.value)}
              disabled={running}
            >
              {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
            </select>
          </label>

          {/* Perspective */}
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-fit">
            <button
              className={`px-3 py-2 text-sm ${myColor==='w' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
              onClick={()=> setMyColor('w')}
              disabled={running}
            >White</button>
            <button
              className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${myColor==='b' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
              onClick={()=> setMyColor('b')}
              disabled={running}
            >Black</button>
          </div>

          {/* Labels toggle */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showLabels} onChange={()=> setShowLabels(v => !v)} />
            Show rank/file labels
          </label>

          {/* Pieces toggle */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPieces} onChange={()=> setShowPieces(v => !v)} />
            Show starting pieces
          </label>

          {/* Prompt location */}
          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Prompt location</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-fit">
              <button
                className={`px-3 py-2 text-sm ${promptLocation==='footer' ? "bg-zinc-100 dark:bg-zinc-800" : "bg-white dark:bg-zinc-900"}`}
                onClick={()=> setPromptLocation('footer')}
              >Footer</button>
              <button
                className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${promptLocation==='board' ? "bg-zinc-100 dark:bg-zinc-800" : "bg-white dark:bg-zinc-900"}`}
                onClick={()=> setPromptLocation('board')}
              >On board</button>
            </div>
          </div>
        </div>
      </div>

      {/* Start/Stop */}
      {!running ? (
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center shadow-sm bg-white dark:bg-emerald-900 text-zinc-900 dark:text-zinc-100 cursor-pointer"
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

  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  /* mobile controls sheet */
  const [showSheet, setShowSheet] = useState(false);
  const stageContainerRef = useRef(null);

  // Footer: big square prompt (only when promptLocation === 'footer')
  const footer = (
    <div className="w-full flex items-center justify-center py-3">
      {promptLocation === "footer" ? (
        <div
          className="
            rounded-2xl border border-zinc-300 dark:border-zinc-700
            bg-white dark:bg-zinc-900
            shadow-sm
            px-6 py-4
            text-2xl md:text-3xl font-black tracking-wide text-zinc-900 dark:text-zinc-100
            select-none
            min-w-[140px] text-center
          "
          style={{ textTransform: "lowercase" }}
          title="Click this coordinate on the board"
        >
          {target || (running ? "…" : "ready")}
        </div>
      ) : null}
    </div>
  );

  return (
    <GameLayout
      headerContent={
        <div className="w-full flex items-center justify-between gap-3">
          {headerContent}
          {/* Mobile Controls button */}
          <button
            className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
            onClick={()=>setShowSheet(true)}
          >
            Controls
          </button>
        </div>
      }
      sidebar={sidebar}
      footer={footer}
    >
      <div ref={stageContainerRef} className="w-full overflow-hidden">
        <Board
          containerRef={stageContainerRef}
          themeVars={themeVars}
          flipped={flipped}
          showLabels={showLabels}
          showPieces={showPieces}
          running={running}
          overlayText={promptLocation === "board" && running ? (target || "…") : null}
          onClickSquare={onClickSquare}
        />
      </div>

      {/* Mobile Controls sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 max-h-[70vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Controls</h3>
              <button className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700" onClick={() => setShowSheet(false)}>Close</button>
            </div>
            {ControlsPanel}
          </div>
        </div>
      )}
    </GameLayout>
  );
}
