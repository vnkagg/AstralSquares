import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/* ---------- Themes (default: classicWood = screenshot look) ---------- */
const THEMES = {
  classicWood: { light: "#F0D9B5", dark: "#B58863", texture: "classicWood" },
  walnut:      { light: "#D6BB90", dark: "#6F4628", texture: "wood" },
  glassyWood:  { light: "#E2C9A6", dark: "#7A4B28", texture: "woodGlass" },
  ice:         { light: "#EEF6FF", dark: "#255CA5", texture: "ice" },
  grass:       { light: "#E6F4E6", dark: "#0C6139", texture: "grass" },
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

/* Starting pieces map */
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

/* ---------- Subtle textures (NO borders or shadows on squares) ---------- */
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
        backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0) 60%)
        `,
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

/* Labels: inside, dark */
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

// /* Aesthetic glassy toggle */
// function Toggle({ label, checked, onChange, disabled }) {
//   return (
//     <label
//       className={`group inline-flex items-center gap-3 select-none ${
//         disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
//       }`}
//     >
//       <input
//         type="checkbox"
//         className="peer sr-only"
//         checked={checked}
//         onChange={(e) => onChange?.(e.target.checked)}
//         disabled={disabled}
//       />
//       <span
//         className={[
//           "relative inline-flex w-12 h-7 items-center rounded-full transition-all duration-300 ease-out",
//           "bg-gradient-to-b from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800",
//           "ring-1 ring-inset ring-black/10 dark:ring-white/10",
//           "peer-checked:from-amber-500 peer-checked:to-amber-600",
//           "peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/70",
//           "group-hover:shadow-sm",
//         ].join(" ")}
//       >
//         <span className="pointer-events-none absolute inset-0 rounded-full bg-white/30 mix-blend-overlay opacity-60" />
//         <span className="absolute left-1.5 text-[10px] font-medium text-zinc-600/80 dark:text-zinc-300/80 transition-opacity peer-checked:opacity-0">
//           off
//         </span>
//         <span className="absolute right-1.5 text-[10px] font-medium text-white/90 opacity-0 transition-opacity peer-checked:opacity-100">
//           on
//         </span>
//         <span
//           className={[
//             "absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-100",
//             "shadow-[0_2px_6px_rgba(0,0,0,0.18)]",
//             "transition-transform duration-300 ease-out",
//             "peer-checked:translate-x-5",
//           ].join(" ")}
//         />
//       </span>
//       <span className="text-sm text-zinc-800 dark:text-zinc-100">{label}</span>
//     </label>
//   );
// }
/* Pretty toggle (for the two checkboxes) */
function Toggle({ label, checked, onChange, disabled }) {
    return (
      <label className={`inline-flex items-center gap-3 select-none ${disabled ? "opacity-60" : ""}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
        <span className="relative w-10 h-6 rounded-full bg-zinc-300 peer-checked:bg-amber-700 transition-colors">
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="text-sm text-zinc-800 dark:text-zinc-100">{label}</span>
      </label>
    );
  }

/* ---------- Board ---------- */
function Board({
  containerRef,
  themeVars,
  flipped,
  showLabels,
  showPieces,
  running,
  overlayText,
  onClickSquare,
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

  const n = 8;
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1;
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
        style={{ gridTemplateColumns: phone ? "1fr" : "auto 1fr", gridTemplateRows: phone ? "1fr" : "1fr auto" }}
      >
        {/* Desktop left ranks (hide on phones) */}
        {!phone && (
          <div className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100" style={{ gridColumn: 1, gridRow: 1 }}>
            {ranksForLabels.map((r, i) => (
              <div key={`rank-${r}-${i}`} className="flex items-center justify-center font-bold"
                   style={{ height: side / n, width: 24 }} aria-hidden>
                {showLabels ? r : ""}
              </div>
            ))}
          </div>
        )}

        {/* Board frame */}
        <div
          className="rounded-2xl overflow-hidden relative bg-white dark:bg-zinc-900"
          style={{ width: side, height: side, gridColumn: phone ? "1" : "2", gridRow: 1 }}
        >
          {/* On-board prompt (text only; no pill) */}
          {overlayText ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[3]">
              <div
                style={{
                  fontSize: Math.max(32, Math.floor(side * 0.36)),
                  lineHeight: 1,
                  color: "#3B2A1A",
                  opacity: 0.6,
                  fontWeight: 800,
                  letterSpacing: "0.01em",
                  textTransform: "lowercase",
                  textShadow: "0 2px 8px rgba(0,0,0,.15), 0 1px 0 rgba(255,255,255,.6)",
                }}
              >
                {overlayText}
              </div>
            </div>
          ) : null}

          {/* Squares grid */}
          <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }} role="grid" aria-label="Square Sniper board">
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const alg = rcToAlg(r, c);
                const light = isLightSquare(r, c);
                const piece = showPieces ? START_PIECES.get(alg) : null;

                const isLeftEdge   = c === displayCols[0];
                const isBottomEdge = r === displayRows[displayRows.length - 1];
                const fileLetter = alg[0];
                const rankNumber = alg[1];

                return (
                  <button
                    key={alg}
                    className="relative"
                    style={{
                      ...squareStyle(light, cell, themeVars),
                      cursor: "pointer",
                      transform: "translateZ(0)",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.985)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "translateZ(0)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateZ(0)")}
                    onClick={() => onClickSquare?.(alg)}
                  >
                    {/* pieces: ~90% of the cell */}
                    {piece && (
                      <img
                        src={PIECE[piece.color][piece.type]} alt=""
                        draggable={false}
                        className="absolute"
                        style={{
                          width: `calc(${cell}px * .90)`,
                          height: "auto",
                          left: "50%", top: "50%",
                          transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))",
                          zIndex: 2,
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Inside labels (phones only) — always dark */}
                    {phone && showLabels && (
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
                            {rankNumber}
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
                            {fileLetter}
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
          <div className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100" style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}>
            <div style={{ width: 24 }} aria-hidden />
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {filesForLabels.map((f) => (
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

/* ---------- Page: Square Sniper ---------- */
export default function SquareSniper() {
  // Default to the screenshot look
  const [theme, setTheme] = useState("classicWood");
  const themeVars = THEMES[theme] || THEMES.classicWood;

  const [myColor, setMyColor] = useState("w");
  const flipped = myColor === "b";
  const [showLabels, setShowLabels] = useState(true);
  const [showPieces, setShowPieces] = useState(false);

  // Sound + Haptics
  const [enableHaptics, setEnableHaptics] = useState(false); // auto-enable if supported (see effect)

  // Game
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 100;
  const [timeLeft, setTimeLeft] = useState(30);
  const [target, setTarget] = useState(null);
  const timerRef = useRef(null);

  /* ---------- AUDIO: robust unlock + tones ---------- */
  const audioCtxRef = useRef(null);

  function ensureAudio(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!audioCtxRef.current) audioCtxRef.current = new AC();
    if(audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }

  // Prime AudioContext on first user gesture (fixes mobile auto-play policy)
  useEffect(() => {
    const unlock = () => {
      try {
        ensureAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        // Play a 1-sample silent buffer to unlock on iOS
        const buffer = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        if (ctx.state !== "running") ctx.resume();
        src.start(0);
      } catch {}
    };
    const opts = { once: true, passive: true };
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function tone(freq, durSec, type, vol){
    try {
      ensureAudio();
      const ctx = audioCtxRef.current;
      if(!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(g); g.connect(ctx.destination);

      const t0 = ctx.currentTime;
      const v0 = vol; // e.g., 0.10
      const t1 = t0 + durSec;

      g.gain.setValueAtTime(v0, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.start(t0);
      osc.stop(t1 + 0.01);
    } catch {}
  }

  function playGood(){
    // slightly longer/louder so phones hear it
    tone(750, .12, "sine", .10);
    tone(980, .14, "sine", .08);
  }
  function playBad(){
    tone(200, .14, "triangle", .12);
    tone(150, .16, "triangle", .10);
  }

  /* ---------- HAPTICS (Android & supported browsers) ---------- */
  const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;

  useEffect(() => {
    if (canVibrate) setEnableHaptics(true);
  }, [canVibrate]);

  function hapticGood(){
    if (!enableHaptics || !canVibrate) return;
    navigator.vibrate?.(35); // short tick
  }
  function hapticBad(){
    if (!enableHaptics || !canVibrate) return;
    navigator.vibrate?.([20, 40, 20]); // double pulse
  }

  /* ---------- helpers ---------- */
  const allSquares = useMemo(() => {
    const arr = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) arr.push(String.fromCharCode(97+c) + (8 - r));
    return arr;
  }, []);
  const pickNewTarget = useCallback(() => {
    setTarget(allSquares[Math.floor(Math.random() * allSquares.length)]);
  }, [allSquares]);

  const startGame = useCallback(() => {
    if (running) return;
    // also prime audio on explicit Start press (desktop/mobile)
    ensureAudio();
    setScore(0); setAttempts(0); setStreak(0); setTimeLeft(30);
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

  function onClickSquare(alg) {
    if (!running || !target) return;
    setAttempts((a) => a + 1);
    if (alg === target) {
      playGood(); hapticGood();
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
      pickNewTarget();
    } else {
      playBad(); hapticBad();
      setStreak(0);
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

      {/* Desktop Start/Stop */}
      <div className="md:flex items-center gap-2">
        {!running ? (
          <button
            onClick={startGame}
            className="rounded-xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[.99]"
            style={{ backgroundColor: "#7E8F64" }} // muted olive
          >
            Start
          </button>
        ) : (
          <button
            onClick={stopGame}
            className="rounded-xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[.99]"
            style={{ backgroundColor: "#8B5A2B" }} // warm walnut
          >
            Stop
          </button>
        )}
      </div>

      {/* Mobile controls button */}
      <button
        className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
        onClick={()=>setShowSheet(true)}
      >
        Controls
      </button>

      {/* Timer */}
      <div className="text-sm md:text-base font-semibold">
        <span className="text-zinc-600 dark:text-zinc-400">Timer:</span>{" "}
        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{timeLeft}</span>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Board options (NO start/stop here) */}
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

          {/* Styled toggles */}
          <Toggle label="Show rank/file labels" checked={showLabels} onChange={setShowLabels} />
          <Toggle label="Show starting pieces" checked={showPieces} onChange={setShowPieces} />

          {/* Haptics (show only if browser can vibrate) */}
          { (typeof navigator !== "undefined" && "vibrate" in navigator) && (
            <Toggle label="Haptic feedback" checked={enableHaptics} onChange={setEnableHaptics} />
          )}
        </div>
      </div>
    </div>
  );

  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;
  const [showSheet, setShowSheet] = useState(false);
  const stageContainerRef = useRef(null);

  // Footer: MOBILE-ONLY Start/Stop (muted wood-friendly colors). Prompt is on-board.
//   const footer = (
//     <div className="w-full md:hidden px-4 py-4 flex items-center justify-center gap-3">
//       {!running ? (
//         <button
//           onClick={startGame}
//           className="w-full rounded-2xl px-6 py-4 text-xl font-bold text-white shadow-md active:scale-[.99]"
//           style={{ backgroundColor: "#7E8F64" }}
//         >
//           Start
//         </button>
//       ) : (
//         <button
//           onClick={stopGame}
//           className="w-full rounded-2xl px-6 py-4 text-xl font-bold text-white shadow-md active:scale-[.99]"
//           style={{ backgroundColor: "#8B5A2B" }}
//         >
//           Stop
//         </button>
//       )}
//     </div>
//   );
const footer = NaN;

  return (
    <GameLayout
      headerContent={<div className="w-full flex items-center justify-between gap-3">{headerContent}</div>}
      sidebar={sidebar}
      footer={footer}
    >
      <div ref={stageContainerRef} className="w-full overflow-visible">
        {/* Full-bleed wrapper on phones */}
        <div
          className="md:hidden"
          style={{
            width: "100vw",
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)"
          }}
        >
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            flipped={flipped}
            showLabels={showLabels}
            showPieces={showPieces}
            running={running}
            overlayText={running ? (target || "…") : null}
            onClickSquare={onClickSquare}
          />
        </div>

        {/* Normal container on md+ screens */}
        <div className="hidden md:block">
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            flipped={flipped}
            showLabels={showLabels}
            showPieces={showPieces}
            running={running}
            overlayText={running ? (target || "…") : null}
            onClickSquare={onClickSquare}
          />
        </div>
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
