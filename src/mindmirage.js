import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/* ---------- Themes (includes classicWood) ---------- */
const THEMES = {
  classicWood: { light: "#F0D9B5", dark: "#B58863", texture: "classicWood" },
  wooden:      { light: "#EBD3B0", dark: "#AE6B36", texture: "wood" },
  green:       { light: "#e6f4ea", dark: "#0d7a5f", texture: "grass" },
  ice:         { light: "#eaf6ff", dark: "#2e5eaa", texture: "ice" },
  wb:          { light: "#ffffff", dark: "#000000", texture: null },
};

const FILES = ["a","b","c","d","e","f","g","h"];
const WHITE = {
  Q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  R: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  B: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  N: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
};

/* ---------- Helpers ---------- */
const keyOf = (r,c) => `${r},${c}`;
const inBounds = (r,c,n) => r>=0 && c>=0 && r<n && c<n;

function slide(r,c,dirs,occ,n){
  const out=[];
  for(const [dr,dc] of dirs){
    let rr=r+dr, cc=c+dc;
    while(inBounds(rr,cc,n)){
      const k=keyOf(rr,cc);
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
      return d.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>inBounds(rr,cc,n) && !occ.has(keyOf(rr,cc)));
    }
    case "R": return slide(r,c,[[1,0],[-1,0],[0,1],[0,-1]],occ,n);
    case "B": return slide(r,c,[[1,1],[1,-1],[-1,1],[-1,-1]],occ,n);
    case "Q": return slide(r,c,[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],occ,n);
    default: return [];
  }
}
function occupiedSet(pos){ const s=new Set(); for(const t of Object.keys(pos)) s.add(keyOf(pos[t][0], pos[t][1])); return s; }
function computeTargets(pos,n){
  const occ=occupiedSet(pos);
  const map=new Map(); // "r,c" => Set(types)
  for(const t of Object.keys(pos)){
    const [r,c]=pos[t];
    const legal=movesFor(t,r,c,occ,n);
    for(const [rr,cc] of legal){
      const k=keyOf(rr,cc);
      if(!map.has(k)) map.set(k,new Set());
      map.get(k).add(t);
    }
  }
  return map;
}
function distinctSquares(k,n){
  const used=new Set(), out=[];
  while(out.length<k){
    const r=Math.floor(Math.random()*n), c=Math.floor(Math.random()*n);
    const k2=keyOf(r,c); if(!used.has(k2)){ used.add(k2); out.push([r,c]); }
  }
  return out;
}

/* ---------- Subtle textures for squares & wood buttons ---------- */
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
    case "ice":
      return { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0) 60%)`,
               backgroundBlendMode: "soft-light" };
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
    default: return {};
  }
}
function squareStyle(light, cell, themeVars) {
  const base = light ? themeVars.light : themeVars.dark;
  const tex  = textureLayers(themeVars.texture, light);
  return {
    backgroundColor: base,
    ...tex,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)", // faint gridlines
    willChange: "transform",
  };
}
function woodButtonStyle(themeVars) {
  // Classic wood, subtle sheen
  const light = themeVars?.light || "#F0D9B5";
  const dark  = themeVars?.dark  || "#B58863";
  return {
    backgroundImage: `
      linear-gradient(180deg, ${light}, ${dark}),
      repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 2px, rgba(0,0,0,0) 2px 10px)
    `,
    backgroundBlendMode: "normal, multiply",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 2px 6px rgba(0,0,0,.15)",
  };
}

/* ---------- Board ---------- */
function Board({
  containerRef,
  n,
  themeVars,
  positions,
  targetSq,
  running,
  shouldShowPieces,
  animateMoves,
  anim,
  showLabels,
}) {
  const [side, setSide] = useState(360);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const measure = () => {
      const isPhone = window.innerWidth < 768;
      setPhone(isPhone);

      if (isPhone) {
        const availableW = Math.max(240, window.innerWidth);
        setSide(Math.floor(availableW)); // exact viewport width
      } else {
        const labelColW = showLabels ? 24 : 0;
        const gap = 8, pad = 8;
        const availableW = Math.max(280, el.clientWidth - labelColW - gap - pad);
        const topAllowance = 160, bottomAllowance = 120;
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
  }, [containerRef, showLabels]);

  const fileLetters = useMemo(()=> FILES.slice(0,n), [n]);
  const ranksView  = useMemo(()=> Array.from({length:n},(_,i)=> n - i), [n]);
  const rows = useMemo(()=> Array.from({length:n},(_,r)=> r), [n]);
  const cols = useMemo(()=> Array.from({length:n},(_,c)=> c), [n]);
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark
  const rcToAlg = (r,c) => String.fromCharCode(97 + c) + (n - r); // for labels on non-8 boards
  const cell = side / n;

  function LineAnim() {
    if (!anim || !animateMoves) return null;
    const color = "white";
    const [r1, c1] = anim.from, [r2, c2] = anim.to;
    const step = 100 / n, cx = c => c * step + step / 2, cy = r => r * step + step / 2;
    const x1 = cx(c1), y1 = cy(r1), x2 = cx(c2), y2 = cy(r2);

    return (
      <svg key={anim.key} className="absolute inset-0 z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="mm-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>
        <path d={`M ${x1} ${y1} L ${x2} ${y2}`} pathLength="1"
              stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
              opacity="0.38" filter="url(#mm-blur)">
          <animate attributeName="stroke-dasharray" values="0,1;0.2,0.8;1,0" dur="0.36s"
                   keyTimes="0;0.5;1" calcMode="spline" keySplines="0.25 0.8 0.25 1;0.25 0.8 0.25 1" fill="freeze" />
          <animate attributeName="opacity" values="0.0;0.38;0.0" dur="0.38s"
                   keyTimes="0;0.35;1" calcMode="spline" keySplines="0.25 0.8 0.25 1;0.25 0.8 0.25 1" />
        </path>
      </svg>
    );
  }

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid max-w-full"
        style={{
          gridTemplateColumns: phone ? "1fr" : (showLabels ? "auto 1fr" : "1fr"),
          gridTemplateRows: phone ? "1fr" : "1fr auto",
          gap: phone ? 0 : 8, // avoid overflow on mobile
        }}
      >
        {/* ranks (desktop only, if labels on) */}
        {(!phone && showLabels) && (
          <div
            className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {ranksView.map((r) => (
              <div key={`rank-${r}`} className="flex items-center justify-center font-black"
                   style={{ height: side / n, width: 24 }} aria-hidden>
                {r}
              </div>
            ))}
          </div>
        )}

        {/* board */}
        <div
          className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden relative"
          style={{ width: side, height: side, gridColumn: phone ? "1" : (showLabels ? "2" : "1"), gridRow: 1 }}
        >
          <LineAnim />
          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
            role="grid"
            aria-label="Mind Mirage board"
          >
            {rows.map((r) =>
              cols.map((c) => {
                const light = isLightSquare(r,c);
                const bgStyle = squareStyle(light, cell, themeVars);
                const entry = Object.entries(positions).find(([, rc]) => rc[0]===r && rc[1]===c);
                const hereType = entry?.[0];
                const isTarget = !!targetSq && r===targetSq[0] && c===targetSq[1];

                const alg = rcToAlg(r,c);
                const fileLetter = String.fromCharCode(97 + c);
                const rankNumber = (n - r);

                return (
                  <div key={`${r},${c}`} className="relative" style={bgStyle}>
                    {/* target marker */}
                    {isTarget && (
                      <div
                        className="absolute"
                        style={{
                          width: "22%", height: "22%",
                          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                          background: "#111", border: "3px solid #fff", borderRadius: "9999px",
                          animation: "mm_bounce .9s ease-in-out infinite", zIndex: 3,
                        }}
                      />
                    )}

                    {/* piece display while not running or when peeking (parent controls visibility) */}
                    {hereType && shouldShowPieces && (
                      <img
                        src={WHITE[hereType]} alt={hereType} draggable="false" className="absolute"
                        style={{
                          width: `calc(${cell}px * .78)`, height: "auto",
                          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))", zIndex: 2,
                        }}
                      />
                    )}

                    {/* Inside labels on phones (if enabled) */}
                    {phone && showLabels && (
                      <>
                        {/* rank (left-top) */}
                        {c === 0 && (
                          <span
                            className="absolute select-none"
                            style={{
                              color: "rgba(26,18,10,.95)",
                              fontWeight: 900, letterSpacing: "0.02em",
                              textShadow: "0 1px 0 rgba(255,255,255,.4)",
                              fontSize: Math.max(11, Math.floor(cell * 0.18)),
                              top: Math.max(3, Math.floor(cell * 0.06)),
                              left: Math.max(5, Math.floor(cell * 0.07)),
                              zIndex: 1,
                            }}
                            aria-hidden
                          >
                            {rankNumber}
                          </span>
                        )}
                        {/* file (bottom-right) */}
                        {r === n-1 && (
                          <span
                            className="absolute select-none"
                            style={{
                              color: "rgba(26,18,10,.95)",
                              fontWeight: 900, letterSpacing: "0.02em",
                              textShadow: "0 1px 0 rgba(255,255,255,.4)",
                              fontSize: Math.max(11, Math.floor(cell * 0.18)),
                              right: Math.max(5, Math.floor(cell * 0.07)),
                              bottom: Math.max(3, Math.floor(cell * 0.06)),
                              zIndex: 1, textTransform: "lowercase",
                            }}
                            aria-hidden
                          >
                            {fileLetter}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* files (desktop only, if labels on) */}
        {(!phone && showLabels) && (
          <div className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
               style={{ gridColumn: showLabels ? "1 / span 2" : "1", gridRow: 2, width: side + 24 }}>
            <div style={{ width: 24 }} aria-hidden />
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {fileLetters.map((f) => (
                <div key={`file-${f}`} className="flex items-center justify-center font-black" style={{ height: 24 }} aria-hidden>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes mm_bounce {
          0%,100% { transform: translate(-50%, -58%); }
          50%     { transform: translate(-50%, -42%); }
        }
      `}</style>
    </div>
  );
}

/* ---------- Main ---------- */
export default function MindMirage() {
  const [theme, setTheme] = useState("classicWood");
  const themeVars = THEMES[theme] || THEMES.classicWood;

  const [n, setN] = useState(8);
  const [sel, setSel] = useState({ Q:true, R:true, B:true, N:true });
  const selectedTypes = useMemo(()=>["Q","R","B","N"].filter(t=>sel[t]),[sel]);

  const [running, setRunning] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);

  const [positions, setPositions] = useState({});
  const [targetSq, setTarget] = useState(null);
  const [validTypesForTarget, setValidTypesForTarget] = useState(new Set());
  const [clickedAnswer, setClickedAnswer] = useState(null);

  const [uniqueTarget, setUniqueTarget] = useState(true);
  const [peekHold, setPeekHold] = useState(false);
  const shouldShowPieces = running ? peekHold : true;

  const [animateMoves, setAnimateMoves] = useState(true);
  const [anim, setAnim] = useState(null);

  const [showLabels, setShowLabels] = useState(true);

  /* Audio */
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

  /* Randomize & targets */
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

  const pickTarget = useCallback((fromPos = positions, requireUnique = uniqueTarget) => {
    const map = computeTargets(fromPos, n);
    const entries = Array.from(map.entries());
    if(entries.length === 0){ randomizePositions(); return; }

    const uniques = entries.filter(([, set]) => set.size === 1);
    const anyReach = entries.filter(([, set]) => set.size >= 1);
    const pool = requireUnique ? (uniques.length ? uniques : anyReach) : anyReach;
    if (!pool.length) { randomizePositions(); return; }

    const [k, setTypes] = pool[Math.floor(Math.random() * pool.length)];
    const [r,c] = k.split(",").map(Number);
    setTarget([r,c]);
    setValidTypesForTarget(new Set(setTypes));
  }, [positions, n, uniqueTarget, randomizePositions]);

  /* Timer */
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

  /* Game actions */
  function startGame(){
    if(running || selectedTypes.length===0) return;
    ensureAudio();
    setMoves(0);
    setRunning(true);
    pickTarget(positions, uniqueTarget);
    setShowSheet(false);
    setPeekHold(false);
  }
  function stopGame(withBuzz=false){
    setRunning(false);
    if(withBuzz) bad();
    setTarget(null);
    setPeekHold(false);
  }
  function handleAnswer(t){
    if(!running || !targetSq) return;
    setClickedAnswer(t);
    setTimeout(()=>setClickedAnswer(null), 180);

    if(!validTypesForTarget.has(t)){ stopGame(true); return; }

    const from=positions[t], to=targetSq;
    good();

    if (animateMoves) {
      const key = Date.now();
      setAnim({ type: t, from, to, key });
      setTimeout(()=>{
        const newPos={...positions, [t]: to};
        setPositions(newPos); setMoves(m=>m+1);
        setAnim(null);
        pickTarget(newPos, uniqueTarget);
      }, 380);
    } else {
      const newPos={...positions, [t]: to};
      setPositions(newPos); setMoves(m=>m+1);
      pickTarget(newPos, uniqueTarget);
    }
  }

  /* Keyboard */
  useEffect(()=>{
    function onKeyDown(e){
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      let k = e.key.toLowerCase();

      if (k === " ") { e.preventDefault(); running? stopGame(false): startGame(); return; }
      if (k === "p") { e.preventDefault(); setPeekHold(true); }

      if (!running || !targetSq) return;
      if(k === "j") k = "q"; if(k === "k") k = "r"; if(k === "l") k = "b"; if(k === ";") k = "n";
      if (["q","r","b","n"].includes(k)) {
        const T = k.toUpperCase();
        if (sel[T]) { e.preventDefault(); handleAnswer(T); }
      }
    }
    function onKeyUp(e){ if (e.key.toLowerCase() === "p") setPeekHold(false); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return ()=> { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [running, targetSq, sel]);

  /* Controls panel (desktop sidebar & mobile sheet content) */
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
              <button className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700" onClick={() => setN(v => Math.max(3, v - 1))} disabled={running}>−</button>
              <div className="w-16 text-center font-black">{n}×{n}</div>
              <button className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700" onClick={() => setN(v => Math.min(8, v + 1))} disabled={running}>+</button>
              <button className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900" onClick={randomizePositions} disabled={running}>Roll</button>
            </div>
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Target Rule</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
              <button
                className={`px-3 py-2 text-sm ${uniqueTarget ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-white dark:bg-zinc-900"}`}
                onClick={() => setUniqueTarget(true)}
                aria-pressed={uniqueTarget}
              >Unique Reach</button>
              <button
                className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${!uniqueTarget ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-white dark:bg-zinc-900"}`}
                onClick={() => setUniqueTarget(false)}
                aria-pressed={!uniqueTarget}
              >Any Reach</button>
            </div>
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Animation</span>
            <button
              className={`px-3 py-2 rounded-lg border text-sm w-fit ${
                animateMoves
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              }`}
              onClick={() => setAnimateMoves(v=>!v)}
            >
              {animateMoves ? "On" : "Off"}
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showLabels} onChange={()=> setShowLabels(v => !v)} />
            Show labels
          </label>
        </div>
      </div>
    </div>
  );

  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  /* Header with Start/Stop */
  const headerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Moves:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{moves}</span>
      </div>

      <div className="flex items-center gap-2">
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
            onClick={()=>stopGame(false)}
            className="rounded-xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[.99]"
            style={{ backgroundColor: "#8B5A2B" }} // warm walnut
          >
            Stop
          </button>
        )}

        {/* Mobile Controls button with bg */}
        <button
          className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 bg-white/70 dark:bg-zinc-900/70"
          onClick={()=>setShowSheet(true)}
        >
          Controls
        </button>
      </div>

      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Timer:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{timeLeft}</span>
      </div>
    </div>
  );

  /* Footer (mobile):
     - NOT running: show selection chips (wood textured)
     - Running:     show answer buttons + Peek
  */
  const FooterMobile = () => {
    const woodBG = woodButtonStyle(themeVars);

    if (!running) {
        return;
      return (
        <div className="md:hidden w-full px-3 py-3 flex flex-wrap gap-3 items-center justify-center">
          {["Q","R","B","N"].map(t=>(
            <button
              key={`sel-${t}`}
              className={[
                "h-14 w-14 rounded-full border-2 flex items-center justify-center transition active:scale-[0.98]",
                clickedAnswer===t ? "border-sky-500" : "border-zinc-900 dark:border-zinc-200",
                "text-zinc-900 dark:text-zinc-100 shadow-sm"
              ].join(" ")}
              style={woodBG}
              onClick={()=> setSel(s=>({...s,[t]:!s[t]}))}
              disabled={!running || !targetSq}
              title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
            >
              <img src={WHITE[t]} alt={t} style={{width:34, height:34}} />
              {/* {t} */}
            </button>
          ))}
        </div>
      );
    }

    // Running: answers + Peek
    return (
      <div className=" w-full px-3 py-3 flex flex-wrap gap-3 items-center justify-center">
        {["Q","R","B","N"].filter(t=>sel[t]).map(t=>(
          <button
            key={t}
            className={[
              "h-14 w-14 rounded-full border-2 flex items-center justify-center transition active:scale-[0.98]",
              clickedAnswer===t ? "border-sky-500" : "border-zinc-900 dark:border-zinc-200",
              "text-zinc-900 dark:text-zinc-100 shadow-sm"
            ].join(" ")}
            style={woodBG}
            onClick={()=>handleAnswer(t)}
            disabled={!running || !targetSq}
            title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
          >
            <img src={WHITE[t]} alt={t} style={{ width:34, height:34, filter:"drop-shadow(0 2px 2px rgba(0,0,0,.18))" }} />
          </button>
        ))}

        {/* Peek (hold) */}
        <button
          key="peek"
          className={[
            "h-14 w-14 rounded-full border-2 flex items-center justify-center transition active:scale-[0.98]",
            peekHold ? "border-amber-600 ring-2 ring-amber-400/60" : "border-amber-700",
            "text-white shadow-sm"
          ].join(" ")}
          style={{
            background: "linear-gradient(180deg, rgba(255,190,92,1), rgba(216,139,39,1))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)",
          }}
          onPointerDown={() => running && setPeekHold(true)}
          onPointerUp={() => setPeekHold(false)}
          onPointerLeave={() => setPeekHold(false)}
          onPointerCancel={() => setPeekHold(false)}
          aria-pressed={peekHold}
          disabled={!running}
          title="Hold to Peek (or press P)"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M2.2 12c2.2-4 5.9-6.4 9.8-6.4S19.6 8 21.8 12c-2.2 4-5.9 6.4-9.8 6.4S4.4 16 2.2 12Z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    );
  };

  /* Stage container ref for measuring */
  const stageContainerRef = useRef(null);
  const [showSheet, setShowSheet] = useState(false);

  return (
    <GameLayout
      headerContent={headerContent}
      sidebar={sidebar}
      footer={<FooterMobile />}
    >
      <div ref={stageContainerRef} className="w-full overflow-visible">
        {/* Full-bleed on phones so the board uses 100% of the screen width */}
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
            n={n}
            themeVars={themeVars}
            positions={positions}
            targetSq={targetSq}
            running={running}
            shouldShowPieces={shouldShowPieces}
            anim={anim}
            animateMoves={animateMoves}
            showLabels={showLabels}
          />
        </div>

        {/* Regular container on md+ */}
        <div className="hidden md:block">
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
            showLabels={showLabels}
          />
        </div>
      </div>

      {/* Mobile Controls Sheet */}
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
