import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/** Themes like Eagle Eye */
const THEMES = {
  wooden: { light: "#EBD3B0", dark: "#AE6B36" },
  green:  { light: "#e6f4ea", dark: "#0d7a5f" },
  ice:    { light: "#eaf6ff", dark: "#2e5eaa" },
  wb:     { light: "#ffffff", dark: "#000000" },
};

/** Piece art (white) */
const WHITE = {
  Q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  R: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  B: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  N: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
};

const filesAll = ["a","b","c","d","e","f","g","h"];

/* ---------- Helpers ---------- */
const toKey = (r,c) => `${r},${c}`;
const inBounds = (r,c,n) => r>=0 && c>=0 && r<n && c<n;

/* Moves on an empty board */
function slidesFrom(r,c,dirs,occ,n){
  const out=[];
  for(const [dr,dc] of dirs){
    let rr=r+dr, cc=c+dc;
    while(inBounds(rr,cc,n)){
      const k=toKey(rr,cc);
      if(occ.has(k)) break;
      out.push([rr,cc]);
      rr+=dr; cc+=dc;
    }
  }
  return out;
}
function movesFor(t,r,c,occ,n){
  switch(t){
    case "N": {
      const d=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
      return d.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>inBounds(rr,cc,n) && !occ.has(toKey(rr,cc)));
    }
    case "R": return slidesFrom(r,c,[[1,0],[-1,0],[0,1],[0,-1]],occ,n);
    case "B": return slidesFrom(r,c,[[1,1],[1,-1],[-1,1],[-1,-1]],occ,n);
    case "Q": return slidesFrom(r,c,[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],occ,n);
    default: return [];
  }
}
function occupiedSet(pos){
  const s=new Set();
  for(const t of Object.keys(pos)){
    s.add(toKey(pos[t][0], pos[t][1]));
  }
  return s;
}
function distinctSquares(k,n){
  const used=new Set(), out=[];
  while(out.length<k){
    const r=Math.floor(Math.random()*n), c=Math.floor(Math.random()*n);
    const key=toKey(r,c); if(!used.has(key)){ used.add(key); out.push([r,c]); }
  }
  return out;
}

/* Map of target squares -> set of piece types that can reach them */
function computeTargets(pos,n){
  const occ=occupiedSet(pos);
  const map=new Map(); // "r,c" => Set(types)
  for(const t of Object.keys(pos)){
    const [r,c]=pos[t];
    const legal=movesFor(t,r,c,occ,n);
    for(const [rr,cc] of legal){
      const k=toKey(rr,cc);
      if(!map.has(k)) map.set(k,new Set());
      map.get(k).add(t);
    }
  }
  return map;
}

/* ---------- Board ---------- */
function Board({
  containerRef,
  n,
  themeVars,
  positions,           // {Q:[r,c], ...}
  targetSq,            // [r,c] | null
  running,
  shouldShowPieces,    // derived from peek (hold/toggle) or not running
  anim,                // { type, from:[r,c], to:[r,c], key }
  animateMoves,
}) {
  const [side, setSide] = useState(360);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const labelColW = 28, gap = 8, pad = 8;
      const availableW = Math.max(240, el.clientWidth - labelColW - gap - pad);
      const phone = window.innerWidth < 768;
      const topAllowance = phone ? 220 : 160;
      const bottomAllowance = phone ? 150 : 120;
      const availableH = Math.max(260, window.innerHeight - topAllowance - bottomAllowance);
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

  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark
  const fileLetters = useMemo(()=> filesAll.slice(0,n), [n]);
  const viewRanks = useMemo(()=> Array.from({length:n},(_,i)=> n - i), [n]);       // n..1 (top..bottom)
  const displayRows = useMemo(()=> Array.from({length:n},(_,r)=> r), [n]);
  const displayCols = useMemo(()=> Array.from({length:n},(_,c)=> c), [n]);

  // Subtle line animation overlay (~66% of path, quick fade)
  function LineAnim() {
    const color = "white";
    if (!anim || !animateMoves) return null;
    const [r1, c1] = anim.from, [r2, c2] = anim.to;
    const step = 100 / n, cx = c => c * step + step / 2, cy = r => r * step + step / 2;
    const x1 = cx(c1), y1 = cy(r1), x2 = cx(c2), y2 = cy(r2);

    return (
      <svg key={anim.key} className="absolute inset-0 z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="sd-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* blurred tail (slightly delayed, softer color/opacity) */}
        <path d={`M ${x1} ${y1} L ${x2} ${y2}`}
              pathLength="1" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
              opacity="0.38" filter="url(#sd-blur)">
          <animate attributeName="stroke-dasharray" values="0,1;0.18,0.82;0.9,0.1" dur="0.36s"
                  keyTimes="0;0.5;1" calcMode="spline" keySplines="0.25 0.8 0.25 1;0.25 0.8 0.25 1" fill="freeze" begin="0.04s" />
          <animate attributeName="opacity" values="0.0;0.38;0.0" dur="0.38s"
                  keyTimes="0;0.35;1" calcMode="spline" keySplines="0.25 0.8 0.25 1;0.25 0.8 0.25 1" />
        </path>

        {/* gentle head (short dash that glides) */}
        <path d={`M ${x1} ${y1} L ${x2} ${y2}`}
              pathLength="1" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <animate attributeName="stroke-dasharray" values="0.12 0.88;0.12 0.88;1 0" dur="0.34s"
                  keyTimes="0;0.65;1" calcMode="spline" keySplines="0.3 0.7 0.2 1;0.2 0.8 0.2 1" fill="freeze" />
          <animate attributeName="stroke-dashoffset" from="0.88" to="0" dur="0.32s"
                  calcMode="spline" keySplines="0.25 0.8 0.25 1" keyTimes="0;1" />
          <animate attributeName="opacity" values="0.55;0.7;0.0" dur="0.36s"
                  keyTimes="0;0.5;1" calcMode="spline" keySplines="0.3 0.7 0.2 1;0.2 0.8 0.2 1" />
        </path>
      </svg>
    );
  }

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
          {viewRanks.map((r) => (
            <div
              key={`rank-${r}`}
              className="flex items-center justify-center font-black"
              style={{ height: side / n, width: 24 }}
              aria-hidden
            >
              {r}
            </div>
          ))}
        </div>

        {/* board */}
        <div
          className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden relative"
          style={{ width: side, height: side, gridColumn: 2, gridRow: 1 }}
        >
          {/* subtle path animation overlay */}
          <LineAnim />

          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
            role="grid"
            aria-label="Mind Mirage board"
          >
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const light = isLightSquare(r,c);
                const bg = light ? themeVars.light : themeVars.dark;

                // draw pieces depending on peek/running
                const entry = Object.entries(positions).find(([, rc]) => rc[0]===r && rc[1]===c);
                const hereType = entry?.[0];

                const isTarget = !!targetSq && r===targetSq[0] && c===targetSq[1];

                return (
                  <div
                    key={`${r},${c}`}
                    className="relative"
                    style={{
                      background: bg,
                      borderLeft: "1px solid rgba(113,113,122,.6)",
                      borderTop: "1px solid rgba(113,113,122,.6)",
                      ...(c===n-1?{borderRight:"1px solid rgba(113,113,122,.6)"}:{}),
                      ...(r===n-1?{borderBottom:"1px solid rgba(113,113,122,.6)"}:{}),
                    }}
                  >
                    {/* target marker (centered bouncy dot) */}
                    {isTarget && (
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: "22%",
                          height: "22%",
                          left: "50%",
                          top: "50%",
                          // no inline transform: keyframes control translate to keep center + bob
                          background: "#111",
                          border: "3px solid #fff",
                          borderRadius: "9999px",
                          animation: "mm_bounce .9s ease-in-out infinite",
                          zIndex: 3,
                        }}
                      />
                    )}

                    {/* pieces (visible if !running OR peek active) */}
                    {hereType && (shouldShowPieces || !running) && (
                      <img
                        className="absolute"
                        src={WHITE[hereType]}
                        alt={hereType}
                        draggable="false"
                        style={{
                          width: `calc(${side / n}px * .78)`,
                          height: "auto",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))",
                          zIndex: 2,
                        }}
                      />
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
          style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}
        >
          <div style={{ width: 24 }} aria-hidden />
          <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {fileLetters.map((f) => (
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

      {/* local keyframes for the dot */}
      <style>{`
        @keyframes mm_bounce {
          0%,100% { transform: translate(-50%, -60%); }
          50%     { transform: translate(-50%, -40%); }
        }
      `}</style>
    </div>
  );
}

/* ---------- Mind Mirage main ---------- */
export default function MindMirage() {
  /* state */
  const [theme, setTheme] = useState("wooden");
  const themeVars = THEMES[theme] || THEMES.green;

  const [n, setN] = useState(8);                               // 3..8
  const [sel, setSel] = useState({ Q:true, R:true, B:true, N:true });
  const selectedTypes = useMemo(()=>["Q","R","B","N"].filter(t=>sel[t]),[sel]);

  const [running, setRunning] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);

  const [positions, setPositions] = useState({});              // {Q:[r,c],...}
  const [targetSq, setTarget] = useState(null);                // [r,c] | null
  const [validTypesForTarget, setValidTypesForTarget] = useState(new Set());
  const [clickedAnswer, setClickedAnswer] = useState(null);

  const [uniqueTarget, setUniqueTarget] = useState(true); // true = only one piece can reach

  // Peek: hold or toggle
  const [peekHold, setPeekHold] = useState(false);             // while P held or button held
  const [peekToggle, setPeekToggle] = useState(false);         // controls checkbox
  const shouldShowPieces = running ? (peekHold || peekToggle) : true;

  // Animation toggle
  const [animateMoves, setAnimateMoves] = useState(true);
  const [anim, setAnim] = useState(null);                      // {type, from:[r,c], to:[r,c], key}

  /* audio */
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
  function good(){ ensureAudio(); tone(720,.10,"sine",.06); tone(960,.12,"sine",.05); }
  function bad(){ ensureAudio(); tone(220,.12,"square",.08); tone(160,.14,"square",.07); }

  /* randomize */
  const randomizePositions = useCallback(()=>{
    const types = selectedTypes;
    const pos = {};
    if(types.length){
      const picks = distinctSquares(types.length, n);
      types.forEach((t,i)=>{ pos[t]=picks[i]; });
    }
    setPositions(pos);
    setTarget(null);
    setValidTypesForTarget(new Set());
  }, [selectedTypes, n]);

  useEffect(()=>{ if(!running) randomizePositions(); },
    // eslint-disable-next-line
    [n, sel.Q, sel.R, sel.B, sel.N]);

  /* target picking (now honors uniqueTarget with graceful fallback) */
  const pickTarget = useCallback((fromPos = positions, requireUnique = uniqueTarget) => {
    const map = computeTargets(fromPos, n);
    const entries = Array.from(map.entries()); // [ ["r,c", Set(types)] , ... ]

    if(entries.length === 0){
      // no legal targets from current positions — reroll
      randomizePositions();
      return;
    }

    const uniques = entries.filter(([, set]) => set.size === 1);
    const anyReach = entries.filter(([, set]) => set.size >= 1);

    let pool;
    if (requireUnique) {
      pool = uniques.length ? uniques : anyReach; // fallback if no unique squares exist
    } else {
      pool = anyReach;
    }

    if (!pool.length) {
      // extreme edge case; reroll positions
      randomizePositions();
      return;
    }

    const [k, setTypes] = pool[Math.floor(Math.random() * pool.length)];
    const [r,c] = k.split(",").map(Number);
    setTarget([r,c]);
    setValidTypesForTarget(new Set(setTypes));
  }, [positions, n, uniqueTarget, randomizePositions]);

  /* when Target Rule toggles during a run, immediately repick a compliant target */
  useEffect(() => {
    if (running) {
      pickTarget(positions, uniqueTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueTarget]);

  /* timer */
  useEffect(()=>{
    if(!running){ if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null;} return; }
    setTimeLeft(60);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){ clearInterval(timerRef.current); timerRef.current=null; setRunning(false); setTarget(null); return 0; }
        return t-1;
      });
    },1000);
    return ()=>{ if(timerRef.current){clearInterval(timerRef.current); timerRef.current=null;} };
  },[running]);

  /* game flow */
  function startGame(){
    if(running || selectedTypes.length===0) return;
    setMoves(0);
    setRunning(true);
    pickTarget(positions, uniqueTarget);
    setShowSheet(false);
  }
  function stopGame(withBuzz=false){
    setRunning(false);
    if(withBuzz) bad();
    setTarget(null);
    // reset peek-hold so it doesn't “stick” after stop
    setPeekHold(false);
  }
  function handleAnswer(t){
    if(!running || !targetSq) return;
    setClickedAnswer(t);
    setTimeout(()=>setClickedAnswer(null), 200);

    if(!validTypesForTarget.has(t)){ stopGame(true); return; }

    const from=positions[t], to=targetSq;
    good();

    if (animateMoves) {
      // start subtle line animation overlay
      const key = Date.now();
      setAnim({ type: t, from, to, key });

      // commit move shortly after the spark finishes
      setTimeout(()=>{
        const newPos={...positions, [t]: to};
        setPositions(newPos); setMoves(m=>m+1);
        setAnim(null);
        pickTarget(newPos, uniqueTarget);
      }, 380); // ~240ms draw + ~140ms fade
    } else {
      const newPos={...positions, [t]: to};
      setPositions(newPos); setMoves(m=>m+1);
      pickTarget(newPos, uniqueTarget);
    }
  }

  /* keyboard: space to start/stop; P to hold peek; Q/R/B/N to answer (J/K/L/; aliases) */
  useEffect(()=>{
    function onKeyDown(e){
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      let k = e.key.toLowerCase();

      if (k === " ") { e.preventDefault(); running? stopGame(false): startGame(); return; }

      if (k === "p") { e.preventDefault(); setPeekHold(true); }

      if (!running || !targetSq) return;
      if(k === "j") k = "q";
      if(k === "k") k = "r";
      if(k === "l") k = "b";
      if(k === ";") k = "n";
      if (["q","r","b","n"].includes(k)) {
        const T = k.toUpperCase();
        if (sel[T]) { e.preventDefault(); handleAnswer(T); }
      }
    }
    function onKeyUp(e){
      if (e.key.toLowerCase() === "p") setPeekHold(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return ()=> {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [running, targetSq, sel]);

  /* sidebar controls (Eagle-Eye style) */
  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Pieces */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Pieces</div>
        <div className="grid grid-cols-4 gap-2 w-full">
          {["Q","R","B","N"].map(t=>(
            <button
              key={t}
              className={[
                "w-full px-2 py-2 rounded-lg border text-sm flex items-center justify-center gap-2",
                sel[t] ? "border-emerald-500" : "border-zinc-300 dark:border-zinc-700",
                "bg-white dark:bg-zinc-900"
              ].join(" ")}
              onClick={()=> setSel(s=>({...s,[t]:!s[t]}))}
              disabled={running}
              title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
            >
              <img src={WHITE[t]} alt={t} style={{width:22, height:22}} />
            </button>
          ))}
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
              disabled={running}
            >
              {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
            </select>
          </label>

          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Board Size (n×n)</span>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                onClick={() => setN(v => Math.max(3, v - 1))}
                disabled={running}
                title={running ? "Stop to change size" : ""}
              >−</button>
              <div className="w-16 text-center font-black">{n}×{n}</div>
              <button
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                onClick={() => setN(v => Math.min(8, v + 1))}
                disabled={running}
                title={running ? "Stop to change size" : ""}
              >+</button>
              <button
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                onClick={randomizePositions}
                disabled={running}
              >
                Roll
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visibility & Motion */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
          Visibility & Motion
        </div>

        {/* Toggle buttons row */}
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const btnClass = (on, canClick=true) =>
              `px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2 transition
               focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70
               ${on
                 ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-300"
                 : "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"}
               ${canClick ? "hover:shadow-sm active:scale-[0.98]" : "opacity-60 cursor-not-allowed"}`;

            return (
              <>
                {/* Peek (hold) — pressed style while holding */}
                <button
                  className={btnClass(peekHold, running)}
                  onPointerDown={() => running && setPeekHold(true)}
                  onPointerUp={() => setPeekHold(false)}
                  onPointerLeave={() => setPeekHold(false)}
                  onPointerCancel={() => setPeekHold(false)}
                  aria-pressed={peekHold}
                  disabled={!running}
                  title="Hold to reveal pieces (or press P)"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      peekHold ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  />
                  Peek
                </button>

                {/* Animation (toggle) — pressed style when enabled */}
                <button
                  className={btnClass(animateMoves, true)}
                  onClick={() => setAnimateMoves(v => !v)}
                  aria-pressed={animateMoves}
                  title="Toggle move animation"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      animateMoves ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  />
                  Animation
                </button>

                {/* Target Rule */}
                <div className="ml-2">
                  <div className="text-sm text-zinc-800 dark:text-zinc-100 mb-1">Target Rule</div>
                  <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
                    <button
                      className={[
                        "px-3 py-2 text-sm",
                        uniqueTarget
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
                      ].join(" ")}
                      onClick={() => setUniqueTarget(true)}
                      aria-pressed={uniqueTarget}
                    >
                      Unique Reach
                    </button>
                    <button
                      className={[
                        "px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700",
                        !uniqueTarget
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100"
                      ].join(" ")}
                      onClick={() => setUniqueTarget(false)}
                      aria-pressed={!uniqueTarget}
                    >
                      Any Reach
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Start/Stop */}
      {!running ? (
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center shadow-sm bg-white dark:bg-green-900 text-zinc-900 dark:text-zinc-100 cursor-pointer"
          onClick={startGame}
        >
          Start
        </div>
      ) : (
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center shadow-sm bg-white dark:bg-rose-900 text-zinc-900 dark:text-zinc-100 cursor-pointer"
          onClick={()=>stopGame(false)}
        >
          Stop
        </div>
      )}
    </div>
  );

  const sidebar = <div className="hidden md:block overflow-auto max-h=[70vh] pr-1">{ControlsPanel}</div>;

  /* footer = answer buttons */
  const footer = (
    <div className="w-full flex flex-wrap gap-3 items-center justify-center">
      {["Q","R","B","N"].filter(t=>sel[t]).map(t=>(
        <button
          key={t}
          className={`h-16 w-16 rounded-full border-2 flex items-center justify-center ${clickedAnswer===t ? "border-sky-500" : "border-zinc-900 dark:border-zinc-200"}`}
          onClick={()=>handleAnswer(t)}
          disabled={!running || !targetSq}
          title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
          style={{ background: "#fff" }}
        >
          <img src={WHITE[t]} alt={t} style={{ width:44, height:44, filter:"drop-shadow(0 2px 2px rgba(0,0,0,.18))" }} />
        </button>
      ))}
    </div>
  );

  /* header content (Mind Mirage variant) */
  const headerContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Moves Done:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{moves}</span>
      </div>

      {/* Mobile-only Controls button */}
      <button
        className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
        onClick={()=>setShowSheet(true)}
      >
        Controls
      </button>

      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Time Left(s):</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{timeLeft}</span>
      </div>
    </div>
  );

  const stageContainerRef = useRef(null);

  /* mobile bottom sheet */
  const [showSheet, setShowSheet] = useState(false);

  return (
    <GameLayout
      headerContent={headerContent}
      sidebar={<div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>}
      footer={footer}
    >
      <div ref={stageContainerRef} className="w-full overflow-hidden">
        <Board
          containerRef={stageContainerRef}
          n={n}
          themeVars={themeVars}
          positions={positions}
          targetSq={targetSq}
          running={running}
          shouldShowPieces={shouldShowPieces}
          anim={anim}
          animateMoves={animateMoves}
        />
      </div>

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
