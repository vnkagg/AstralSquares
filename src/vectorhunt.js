import React, { useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";

/* ---------- helpers: coordinates ---------- */
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["1","2","3","4","5","6","7","8"];

function randSq() {
  const f = FILES[Math.floor(Math.random()*8)];
  const r = RANKS[Math.floor(Math.random()*8)];
  return f + r;
}
function toRC(sq){ const c = sq.charCodeAt(0) - 97; const r = parseInt(sq[1],10) - 1; return { r, c }; }
function toAlg(r,c){ return FILES[c] + RANKS[r]; }

/* CORRECT color mapping: a1,h8 dark ; a8,h1 light */
function squareColor(sq){
  const {r,c} = toRC(sq);
  return ((r + c) % 2 === 0) ? "dark" : "light";
}

/* ---------- shortest paths ---------- */
function rookPath(s1, s2){
  const a = toRC(s1), b = toRC(s2);
  if (a.r === b.r || a.c === b.c) return [s1, s2];
  const pivot = toAlg(a.r, b.c);
  return [s1, pivot, s2];
}
function bishopPath(s1, s2){
  if (squareColor(s1) !== squareColor(s2)) return null; // unreachable
  const a = toRC(s1), b = toRC(s2);
  const dr = b.r - a.r, dc = b.c - a.c;
  if (Math.abs(dr) === Math.abs(dc)) return [s1, s2];

  const d1 = a.r + a.c, d2 = a.r - a.c;
  const e1 = b.r + b.c, e2 = b.r - b.c;

  const r1 = (d1 + e2) / 2, c1 = r1 - e2;
  const r2 = (d2 + e1) / 2, c2 = e1 - r2;

  const cand = [];
  for (const [rr,cc] of [[r1,c1],[r2,c2]]) {
    if (Number.isInteger(rr) && rr>=0 && rr<8 && cc>=0 && cc<8) cand.push(toAlg(rr,cc));
  }
  if (cand.length) return [s1, cand[0], s2];
  return [s1, s2];
}
function knightPath(s1, s2){
  if (s1 === s2) return [s1];
  const start = toRC(s1), goal = toRC(s2);
  const deltas = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
  const vis = Array.from({length:8},()=>Array(8).fill(false));
  const parent = Array.from({length:8},()=>Array(8).fill(null));
  const q = [[start.r, start.c]];
  vis[start.r][start.c] = true;

  while(q.length){
    const [r,c] = q.shift();
    if (r===goal.r && c===goal.c) break;
    for(const [dr,dc] of deltas){
      const rr = r+dr, cc = c+dc;
      if (rr>=0 && rr<8 && cc>=0 && cc<8 && !vis[rr][cc]){
        vis[rr][cc] = true; parent[rr][cc] = [r,c]; q.push([rr,cc]);
      }
    }
  }
  const path = [];
  let cur = [goal.r, goal.c];
  if (!parent[cur[0]][cur[1]] && !(cur[0]===start.r && cur[1]===start.c)) return [s1, s2];
  while(cur){
    path.push(toAlg(cur[0], cur[1]));
    const p = parent[cur[0]][cur[1]];
    if (!p) break;
    cur = p;
  }
  path.reverse();
  if (path[0] !== s1) path.unshift(s1);
  return path;
}

/* ---------- TTS (Web Speech API) ---------- */
function speakChunks(chunks, opts) {
  const { rate = 1.0, voice = null } = opts || {};
  const synth = window.speechSynthesis;
  let cancelled = false;
  const done = new Promise(resolve => {
    if (!synth || !window.SpeechSynthesisUtterance) { resolve(); return; }
    let idx = 0;
    const next = () => {
      if (cancelled || idx >= chunks.length) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(chunks[idx]);
      u.rate = rate;
      if (voice) u.voice = voice;
      u.onend = () => { idx++; next(); };
      try { synth.speak(u); } catch { idx++; next(); }
    };
    next();
  });
  return { cancel: () => { cancelled = true; try{synth?.cancel();}catch{}; }, done };
}

/* ---------- small UI bits ---------- */
function ColorBadge({ sq, enabled }) {
  if (!enabled) return null;
  const clr = squareColor(sq);
  const bg = clr === "light" ? "bg-amber-50" : "bg-zinc-900";
  const fg = clr === "light" ? "text-amber-800" : "text-amber-50";
  return (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${bg} ${fg} border border-zinc-200 dark:border-zinc-800`}>
      {clr}
    </span>
  );
}
function PillSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition
        ${checked
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"}`}
      aria-pressed={checked}
    >
      <span className={`inline-block w-3 h-3 rounded-full ${checked ? "bg-white" : "bg-zinc-400"}`} />
      {label}
    </button>
  );
}

/* ---------- Main: Vector Hunt ---------- */
export default function VectorHunt() {
  // options
  const [colorizeBlocks, setColorizeBlocks] = useState(true);
  const [dictate, setDictate] = useState(false);
  const [includeColorWords, setIncludeColorWords] = useState(true);
  const [pieceMode, setPieceMode] = useState("random"); // 'n','b','r','random'

  // drill
  const [drillRunning, setDrillRunning] = useState(false);
  const [drillEndsAt, setDrillEndsAt] = useState(0);
  const timerRef = useRef(null);   // setTimeout id
  const cycleRef = useRef(0);      // increments to invalidate old loops

  // speech config
  const [speed, setSpeed] = useState(0.9);      // 0.03..2.0
  const [accent, setAccent] = useState("en-US");// en-US | en-GB | en-IN

  // squares & piece
  const [s1, setS1] = useState(() => randSq());
  const [s2, setS2] = useState(() => randSq());
  const [piece, setPiece] = useState(() => (["n","b","r"])[Math.floor(Math.random()*3)]);
  const activePiece = pieceMode === "random" ? piece : pieceMode;

  // ---- refs for fresh reads inside async/timeouts ----
  const s1Ref = useRef(s1);      useEffect(()=>{ s1Ref.current = s1; },[s1]);
  const s2Ref = useRef(s2);      useEffect(()=>{ s2Ref.current = s2; },[s2]);
  const pieceModeRef = useRef(pieceMode); useEffect(()=>{ pieceModeRef.current = pieceMode; },[pieceMode]);
  const pieceRef = useRef(piece); useEffect(()=>{ pieceRef.current = piece; },[piece]);
  const dictateRef = useRef(dictate); useEffect(()=>{ dictateRef.current = dictate; },[dictate]);
  const speedRef = useRef(speed); useEffect(()=>{ speedRef.current = speed; },[speed]);

  // voice pick
  const selVoiceRef = useRef(null);
  function refreshVoices() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const list = synth.getVoices() || [];
    const pick = list.find(v => (v.lang || "").toLowerCase().startsWith(accent.toLowerCase()))
             || list.find(v => v.name.toLowerCase().includes(accent.toLowerCase()))
             || null;
    selVoiceRef.current = pick || null;
  }
  useEffect(() => {
    refreshVoices();
    if (window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }, []);
  useEffect(() => { refreshVoices(); }, [accent]);

  // TTS handle
  const ttsRef = useRef(null);
  function cancelSpeak(){ try { ttsRef.current?.cancel?.(); } catch {} ttsRef.current = null; }

  function pickRandomPiece() { return (["n","b","r"])[Math.floor(Math.random()*3)]; }

  // path (for Speak Path button)
  const path = useMemo(() => {
    switch(activePiece){
      case "n": return knightPath(s1, s2);
      case "r": return rookPath(s1, s2);
      case "b": return bishopPath(s1, s2);
      default:  return [];
    }
  }, [s1,s2,activePiece]);

  function pieceName(p){ return ({n:"knight", b:"bishop", r:"rook"})[p] || "piece"; }
  function clrWord(c){ return `${c} coloured`; }

  function promptChunks(s1p, s2p, p){
    const c1 = squareColor(s1p), c2 = squareColor(s2p);
    if (includeColorWords) return [`Move the ${pieceName(p)} from the ${clrWord(c1)} ${s1p} square to the ${clrWord(c2)} ${s2p} square.`];
    return [`Move the ${pieceName(p)} from ${s1p} to ${s2p}.`];
  }
  function pathChunks(s1p, s2p, p){
    if (p === "b" && bishopPath(s1p, s2p) === null) return ["Opposite coloured squares. No direct bishop path. Moving on."];
    let route;
    if (p === "n") route = knightPath(s1p, s2p);
    else if (p === "r") route = rookPath(s1p, s2p);
    else route = bishopPath(s1p, s2p);
    if (!route || route.length < 1) return [];
    const start = includeColorWords ? `${clrWord(squareColor(route[0]))} ${route[0]}` : route[0];
    const seq = [`${pieceName(p)} on ${start}`];
    for (let i = 1; i < route.length; i++){
      const sq = route[i];
      const seg = includeColorWords ? `${clrWord(squareColor(sq))} ${sq}` : sq;
      seq.push(`goes to ${seg}`);
    }
    return [seq.join(" ") + "."];
  }

  async function speakPromptNow(s1p, s2p, p){
    if (!dictateRef.current) return;
    cancelSpeak();
    const chunks = promptChunks(s1p, s2p, p);
    const rate = Math.max(0.03, Math.min(2.0, speedRef.current));
    const voice = selVoiceRef.current;
    ttsRef.current = speakChunks(chunks, { rate, voice });
    await ttsRef.current.done;
  }
  async function speakPathNow(s1p, s2p, p){
    if (!dictateRef.current) return;
    cancelSpeak();
    const chunks = pathChunks(s1p, s2p, p);
    const rate = Math.max(0.03, Math.min(2.0, speedRef.current));
    const voice = selVoiceRef.current;
    ttsRef.current = speakChunks(chunks, { rate, voice });
    await ttsRef.current.done;
  }

  /* ---------- new squares ---------- */
  async function newSquares() {
    let a = randSq(), b = randSq();
    if (b === a) b = randSq();
    const p = (pieceModeRef.current === "random") ? pickRandomPiece() : pieceModeRef.current;
    setS1(a); s1Ref.current = a;
    setS2(b); s2Ref.current = b;
    if (pieceModeRef.current === "random") { setPiece(p); pieceRef.current = p; }
    await speakPromptNow(a, b, p);
  }

  /* ---------- Drill (timer-based, non-blocking) ---------- */
  const scheduleNext = useRef(() => {});
  scheduleNext.current = (myCycle) => {
    // if stopped or expired, bail
    if (!drillRunning || Date.now() >= drillEndsAt || myCycle !== cycleRef.current) { stopDrill(); return; }

    // perform one cycle
    (async () => {
      // choose piece (respect random each cycle)
      const pNow = (pieceModeRef.current === "random") ? pickRandomPiece() : pieceModeRef.current;
      if (pieceModeRef.current === "random") { setPiece(pNow); pieceRef.current = pNow; }

      // speak PATH for current squares (or skip if dictation off)
      await speakPathNow(s1Ref.current, s2Ref.current, pNow);
      if (!drillRunning || myCycle !== cycleRef.current) return;

      // roll next squares
      let ns1 = randSq(), ns2 = randSq();
      if (ns2 === ns1) ns2 = randSq();
      setS1(ns1); s1Ref.current = ns1;
      setS2(ns2); s2Ref.current = ns2;

      // pace
      const gap = Math.max(150, 450 / Math.max(0.03, Math.min(2.0, speedRef.current)));
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => scheduleNext.current(myCycle), gap);
    })();
  };

  function startDrill(seconds = 30) {
    // toggle if running
    if (drillRunning) { stopDrill(); return; }

    setDrillRunning(true);
    const endAt = Date.now() + seconds * 1000;
    setDrillEndsAt(endAt);

    // invalidate previous cycles and kick a new one
    const myCycle = cycleRef.current + 1;
    cycleRef.current = myCycle;

    // start immediately on current squares
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => scheduleNext.current(myCycle), 0);
  }

  function stopDrill() {
    setDrillRunning(false);
    cycleRef.current += 1; // invalidate any pending schedule
    clearTimeout(timerRef.current);
    timerRef.current = null;
    cancelSpeak();
  }

  useEffect(() => () => { stopDrill(); }, []); // cleanup on unmount

  /* ---------- header / sidebar / footer ---------- */
  const [showSheet, setShowSheet] = useState(false);

  const headerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Left: dictation toggle (icon) */}
      <button
        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
        onClick={() => {
          setDictate(v => {
            const next = !v;
            if (!next) cancelSpeak();
            return next;
          });
        }}
        aria-label={dictate ? "Turn dictation off" : "Turn dictation on"}
        title={dictate ? "Dictation: on" : "Dictation: off"}
      >
        {dictate ? (
          <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
            <path d="M3 10v4h4l5 5V5L7 10H3zm13.59 1.41L15.17 10l-1.41 1.41L15.17 13l1.41-1.59zM19 3l-1.41 1.41C19.78 6.61 21 9.17 21 12s-1.22 5.39-3.41 7.59L19 21c2.76-2.76 4-6.34 4-9s-1.24-6.24-4-9z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM3.27 2L2 3.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.88.69-1.9 1.2-3.03 1.41v2.06c1.93-.34 3.68-1.25 5.04-2.61l2.73 2.73L22 20.73 3.27 2zM14 3.23v2.06c3.39.49 6 3.39 6 6 0 .22-.02.43-.05.63l1.62 1.62c.27-.72.43-1.5.43-2.25 0-4.17-3.05-7.6-7-8.06z"/>
          </svg>
        )}
      </button>

      {/* Center: Start/Stop 30s Drill */}
      <button
        onClick={() => (drillRunning ? stopDrill() : startDrill(30))}
        className={`px-4 py-2 rounded-lg font-semibold border border-zinc-300 dark:border-zinc-700 transition
          ${drillRunning ? "bg-rose-600 text-white hover:bg-rose-700"
                         : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
        title={drillRunning ? "Stop drill" : "Start timed drill (30s)"}
      >
        {drillRunning ? "Stop Drill" : "Start 30s Drill"}
      </button>

      {/* Right: mobile-only Controls */}
      <div className="md:hidden">
        <button
          className="rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          onClick={() => setShowSheet(true)}
          title="Controls"
        >
          Controls
        </button>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Dictation */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Dictation</div>
        <div className="flex flex-wrap items-center gap-3">
          <PillSwitch checked={dictate} onChange={(v)=>{ setDictate(v); if (!v) cancelSpeak(); }} label="Dictation" />
          <PillSwitch checked={includeColorWords} onChange={setIncludeColorWords} label="Say colors" />
        </div>

        <div className="grid gap-1 mt-3">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Speed</span>
          <input
            type="range" min="0.03" max="2.0" step="0.02"
            value={speed}
            onChange={(e)=> setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-zinc-500">{speed.toFixed(2)}×</div>
        </div>

        <div className="grid gap-1 mt-3">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Accent</span>
          <select
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-2 py-1 w-full"
            value={accent}
            onChange={(e)=> setAccent(e.target.value)}
          >
            <option value="en-US">American (en-US)</option>
            <option value="en-GB">British (en-GB)</option>
            <option value="en-IN">Indian (en-IN)</option>
          </select>
          <span className="text-xs text-zinc-500">Uses your browser’s voices if available.</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button
            className={`px-3 py-1.5 rounded-lg border text-sm ${drillRunning ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"}`}
            onClick={() => (drillRunning ? stopDrill() : startDrill(30))}
            title={drillRunning ? "Stop 30s drill" : "Start 30s drill"}
          >
            {drillRunning ? "Stop 30s Drill" : "Start 30s Drill"}
          </button>
        </div>
      </div>

      {/* Piece selection */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Piece</div>
        <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-max">
          {["random","n","b","r"].map(p => (
            <button
              key={p}
              className={`px-3 py-1.5 text-sm ${((p==="random" && pieceMode==="random") || p===pieceMode) ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
              onClick={()=> setPieceMode(p)}
            >
              {p === "random" ? "Random" : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  /* ---------- central blocks (no board) ---------- */
  function blockStyle(sq) {
    const clr = squareColor(sq);
    const bg = !colorizeBlocks ? "#ffffff" : (clr === "light" ? "#f7edd4" : "#101014");
    const fg = clr === "light" ? "#111" : "#fff";
    return { background:bg, color:fg };
  }

  const mainStage = (
    <div className="w-full flex items-center justify-center py-6">
      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-300 dark:border-zinc-700 p-8 text-center shadow-sm" style={blockStyle(s1)}>
          <div className="text-xs uppercase tracking-wider opacity-70 mb-2">From</div>
          <div className="text-5xl font-black">{s1}</div>
          <ColorBadge sq={s1} enabled={colorizeBlocks} />
        </div>
        <div className="rounded-2xl border border-zinc-300 dark:border-zinc-700 p-8 text-center shadow-sm" style={blockStyle(s2)}>
          <div className="text-xs uppercase tracking-wider opacity-70 mb-2">To</div>
          <div className="text-5xl font-black">{s2}</div>
          <ColorBadge sq={s2} enabled={colorizeBlocks} />
        </div>
      </div>
    </div>
  );

  /* ---------- footer ---------- */
  const footer = (
    <div className="w-full flex flex-wrap gap-3 items-center justify-center">
      <button
        className="px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base font-semibold"
        onClick={newSquares}
        disabled={drillRunning}
        title={drillRunning ? "Stop 30s drill to pick specific squares" : "Pick new random squares (will speak prompt if dictation is ON)"}
      >
        New Squares
      </button>

      <button
        className="px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base font-semibold"
        onClick={()=> speakPathNow(s1, s2, activePiece)}
        title="Speak the path for current squares"
        disabled={!dictate || drillRunning}
      >
        Speak Path
      </button>
    </div>
  );

  return (
    <GameLayout headerContent={headerContent} sidebar={sidebar} footer={footer}>
      {mainStage}

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
