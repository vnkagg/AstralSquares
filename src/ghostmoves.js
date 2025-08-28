import React, { useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";
import { Chess } from "chess.js";

/* ---------- Theme ---------- */
const THEMES = {
  wooden: { light: "#EBD3B0", dark: "#AE6B36" },
  green:  { light: "#e6f4ea", dark: "#0d7a5f" },
  ice:    { light: "#eaf6ff", dark: "#2e5eaa" },
  wb:     { light: "#ffffff", dark: "#000000" },
};

/* Piece sprites (Wikimedia) */
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

const filesAll = ["a","b","c","d","e","f","g","h"];

/* ---------- Moves Panel (reusable) ---------- */
function MovesPanel({ history, viewIndex, goToIndex, className="" }) {
  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900 ${className}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
        Move History
      </div>
      <div className="grid grid-cols-[46px_1fr_1fr] gap-2 max-h-[60vh] overflow-auto rounded-lg">
        <div className="text-xs font-bold text-zinc-500 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1">#</div>
        <div className="text-xs font-bold text-zinc-500 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1">White</div>
        <div className="text-xs font-bold text-zinc-500 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1">Black</div>
        {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => {
          const w = history[i * 2];
          const b = history[i * 2 + 1];
          const isActiveW = (viewIndex === i * 2) || (viewIndex === -1 && i * 2 === history.length - 1);
          const isActiveB = (viewIndex === i * 2 + 1) || (viewIndex === -1 && i * 2 + 1 === history.length - 1);
          return (
            <React.Fragment key={i}>
              <div className="px-2 py-1 text-xs text-zinc-500">{i + 1}.</div>
              <button
                className={`text-sm text-left px-2 py-1 rounded ${isActiveW ? 'bg-sky-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                onClick={() => w && goToIndex(i * 2)}
              >
                {w ? w.san : ''}
              </button>
              <button
                className={`text-sm text-left px-2 py-1 rounded ${isActiveB ? 'bg-sky-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                onClick={() => b && goToIndex(i * 2 + 1)}
              >
                {b ? b.san : ''}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Board ---------- */
function Board({
  containerRef,
  themeVars,
  boardArray,         // chess.board()
  showPieces,
  ghostMetaMap,       // Map<to, {capture:boolean, unique:boolean}>
  onDragStart,
  onDropOnSquare,
  lastFromToSet,      // Set([from,to]) for last move outline
  flipped,            // boolean: show from Black's perspective
}) {
  const [side, setSide] = useState(520);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const labelColW = 28; // ranks on left always visible
      const gap = 8, pad = 8;
      const availableW = Math.max(260, el.clientWidth - labelColW - gap - pad);
      const phone = window.innerWidth < 768;
      const topAllowance = phone ? 220 : 160;
      const bottomAllowance = phone ? 180 : 130;
      const availableH = Math.max(320, window.innerHeight - topAllowance - bottomAllowance);
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
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark
  const displayRows = useMemo(()=> {
    const arr = Array.from({length:n},(_,r)=> r);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);
  const displayCols = useMemo(()=> {
    const arr = Array.from({length:n},(_,c)=> c);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);

  const ranksForLabels = useMemo(() => {
    return flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  }, [flipped]);

  const filesForLabels = useMemo(() => {
    return flipped ? [...filesAll].reverse() : filesAll;
  }, [flipped]);

  const rcToAlg = (r,c) => String.fromCharCode(97+c) + (8-r);

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
            <div
              key={`rank-${r}-${i}`}
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
          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
            role="grid"
            aria-label="Ghost Moves chessboard"
          >
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const sq = boardArray[r][c]; // {color,type} or null
                const alg = rcToAlg(r,c);
                const light = isLightSquare(r,c);
                const bg = light ? themeVars.light : themeVars.dark;
                const isActive = lastFromToSet.has(alg);
                const ghost = ghostMetaMap.get(alg); // {capture, unique}

                return (
                  <div
                    key={alg}
                    className={`relative ${isActive ? "ring-2 ring-sky-300" : ""}`}
                    style={{
                      background: bg,
                      borderLeft: "1px solid rgba(113,113,122,.6)",
                      borderTop: "1px solid rgba(113,113,122,.6)",
                      ...(c===displayCols[displayCols.length-1]?{borderRight:"1px solid rgba(113,113,122,.6)"}:{}),
                      ...(r===displayRows[displayRows.length-1]?{borderBottom:"1px solid rgba(113,113,122,.6)"}:{}),
                    }}
                    onDragOver={(e) => { if (ghost) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                    onDrop={(e) => onDropOnSquare(e, alg)}
                  >
                    {/* ghost dot (centered) */}
                    {ghost && !sq && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "30%",
                          height: "30%",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          background: ghost.unique ? "rgba(16,185,129,0.28)" : "rgba(113,113,122,0.26)",
                          boxShadow: ghost.unique
                            ? "0 0 0 2px rgba(16,185,129,0.20)"
                            : "0 0 0 2px rgba(113,113,122,0.18)",
                          outline: ghost.capture ? "2px solid rgba(239,68,68,0.35)" : "none",
                          outlineOffset: "-2px",
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* piece */}
                    {showPieces && sq && (
                      <img
                        className="absolute"
                        src={PIECE[sq.color][sq.type]}
                        alt=""
                        draggable
                        onDragStart={(e)=> onDragStart(e, alg)}
                        onMouseDown={()=> onDragStart({ dataTransfer: { setData(){} } }, alg)} // click-select too
                        style={{
                          width: `calc(${side / n}px * .86)`,
                          height: "auto",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))",
                          zIndex: 2,
                          cursor: "grab",
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
            {filesForLabels.map((f) => (
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

/* ---------- Page: GhostMoves ---------- */
export default function GhostMoves() {
  const [theme, setTheme] = useState("wooden");
  const themeVars = THEMES[theme] || THEMES.green;

  // chess engine (rules)
  const [game] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  // selection & ghosts
  const [fromSq, setFromSq] = useState(null);
  const [ghostList, setGhostList] = useState([]); // [{to,capture,unique}]
  const ghostMetaMap = useMemo(() => {
    const m = new Map();
    for (const g of ghostList) m.set(g.to, { capture: g.capture, unique: g.unique });
    return m;
  }, [ghostList]);

  // last move highlight
  const [lastMove, setLastMove] = useState(null); // {from,to}
  const lastFromToSet = useMemo(() => new Set(lastMove ? [lastMove.from, lastMove.to] : []), [lastMove]);

  // engine & side
  const [myColor, setMyColor] = useState('w'); // viewer side
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineEval, setEngineEval] = useState(null);
  const [engineMate, setEngineMate] = useState(null);
  const inFlight = useRef(null);

  // Depth streak policy: keep same depth for 2–3 engine moves, then refresh.
  const depthBag = [6, 8, 10, 12, 14]; // candidate depths
  const [engineDepth, setEngineDepth] = useState(() => depthBag[Math.floor(Math.random()*depthBag.length)]);
  const [depthMovesLeft, setDepthMovesLeft] = useState(() => 2 + Math.floor(Math.random()*2)); // 2 or 3

  // blindfold + toggles
  const [blindfold, setBlindfold] = useState(false);
  const [showPieces, setShowPieces] = useState(true);

  // footer input
  const [moveInput, setMoveInput] = useState("");

  // history (SAN) + scrubbing
  const [history, setHistory] = useState([]); // [{san}]
  const [viewIndex, setViewIndex] = useState(-1); // -1 live
  function pushHistorySAN(san) { setHistory(h => [...h, { san }]); }

  // derived board and status
  const boardArray = useMemo(() => game.board(), [boardKey]);
  const turnColor = game.turn(); // 'w' | 'b'
  const status = useMemo(() => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) return "Checkmate";
      if (game.isDraw()) return "Draw";
      return "Game over";
    }
    if (game.isCheck()) return `${turnColor === 'w' ? 'White' : 'Black'} to move — Check!`;
    return `${turnColor === 'w' ? 'White' : 'Black'} to move`;
  }, [boardKey]);

  // last move line (e.g., "12. Bc4 – ...")
  const lastPairText = useMemo(() => {
    const n = Math.ceil(history.length / 2) || 1;
    const w = history[(n - 1) * 2]?.san || "";
    const b = history[(n - 1) * 2 + 1]?.san || "";
    return `${n}. ${w || "…"} – ${b || "…"}`;
  }, [history]);

  /* ---------- engine helpers ---------- */
  function parseBestmove(bestmoveField) {
    if (!bestmoveField || typeof bestmoveField !== 'string') return null;
    const parts = bestmoveField.trim().split(/\s+/);
    const idx = parts.indexOf('bestmove');
    if (idx === -1 || idx === parts.length - 1) return null;
    return parts[idx + 1]; // "e2e4"
  }

  function rotateEngineDepthIfNeeded() {
    setDepthMovesLeft((left) => {
      if (left > 1) return left - 1;
      // rotate: pick new depth and reset streak (2 or 3)
      setEngineDepth(depthBag[Math.floor(Math.random()*depthBag.length)]);
      return 2 + Math.floor(Math.random()*2);
    });
  }

  async function callEngineForBestMove() {
    try {
      if (inFlight.current) inFlight.current.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setEngineThinking(true);

      const fen = game.fen();
      const depth = engineDepth; // use current streak depth
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data || data.success !== true) throw new Error(data && data.data ? String(data.data) : 'Engine error');

      setEngineEval(
        typeof data.evaluation === 'number' ? data.evaluation
        : typeof data.eval === 'number' ? data.eval
        : null
      );
      setEngineMate(data.mate ?? null);

      const uci = parseBestmove(data.bestmove);
      if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) throw new Error('No valid bestmove');

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci[4];

      const res = game.move({ from, to, promotion: promo });
      if (!res) throw new Error(`Engine suggested illegal move: ${uci}`);

      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null);
      setGhostList([]);
      setBoardKey(k => k + 1);
      setViewIndex(-1);

      // consume one move from the current depth streak
      rotateEngineDepthIfNeeded();
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    } finally {
      setEngineThinking(false);
    }
  }

  function maybeEngineMove() {
    const engineColor = (myColor === 'w') ? 'b' : 'w';
    if (game.turn() === engineColor && !game.isGameOver()) {
      callEngineForBestMove();
    }
  }
  useEffect(() => { maybeEngineMove(); }, [myColor, boardKey]);

  /* ---------- ghosts ---------- */
  const sideReachMap = useMemo(() => {
    try {
      const moves = game.moves({ verbose: true }).filter(m => m.color === turnColor);
      const map = new Map();
      for (const m of moves) {
        const k = m.to;
        if (!map.has(k)) map.set(k, new Set());
        map.get(k).add(m.from);
      }
      return map;
    } catch { return new Map(); }
  }, [boardKey, turnColor]);

  function computeLegal(from) {
    try {
      const verbose = game.moves({ square: from, verbose: true });
      return verbose.map(m => {
        const reachers = sideReachMap.get(m.to) || new Set();
        return { to: m.to, capture: !!m.captured, unique: reachers.size === 1 };
      });
    } catch { return []; }
  }

  /* ---------- actions ---------- */
  function reset() {
    game.reset();
    setHistory([]);
    setFromSq(null);
    setGhostList([]);
    setLastMove(null);
    setBoardKey(k => k + 1);
    setViewIndex(-1);
    // refresh depth streak on reset
    setEngineDepth(depthBag[Math.floor(Math.random()*depthBag.length)]);
    setDepthMovesLeft(2 + Math.floor(Math.random()*2));
    if (myColor === 'b') callEngineForBestMove(); // engine (White) opens
  }

  function beginSelect(from) {
    const pc = game.get(from);
    if (!pc) { setFromSq(null); setGhostList([]); return; }
    if (pc.color !== turnColor) return; // enforce side to move
    setFromSq(from);
    setGhostList(computeLegal(from));
  }

  function onDragStart(e, from) {
    const pc = game.get(from);
    if (!pc || pc.color !== turnColor || !showPieces) { if (e?.preventDefault) e.preventDefault(); return; }
    if (e?.dataTransfer?.setData) {
      e.dataTransfer.setData("text/from", from);
      e.dataTransfer.effectAllowed = "move";
    }
    beginSelect(from);
  }

  function tryMove(from, to) {
    try {
      const pawn = game.get(from);
      const needsPromo = pawn && pawn.type === 'p' && (
        (pawn.color === 'w' && to[1] === '8') ||
        (pawn.color === 'b' && to[1] === '1')
      );
      const res = game.move({ from, to, promotion: needsPromo ? 'q' : undefined });
      if (!res) return false;
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null);
      setGhostList([]);
      setBoardKey(k => k + 1);
      setViewIndex(-1);
      // engine reply
      maybeEngineMove();
      return true;
    } catch { return false; }
  }

  function onDropOnSquare(e, to) {
    e.preventDefault();
    const from = e.dataTransfer?.getData("text/from") || fromSq;
    if (!from) return;
    if (from === to) { setFromSq(null); setGhostList([]); return; }
    tryMove(from, to);
  }

  // Input: SAN/ UCI
  function normalizeInput(s) {
    let t = (s || "").trim(); if (!t) return "";
    t = t.replaceAll("0", "O");
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(t)) return t.toLowerCase();
    if (/^[kqrbn]/i.test(t)) t = t[0].toUpperCase() + t.slice(1);
    return t;
  }
  function playByInput(raw) {
    if (myColor !== turnColor) return false;
    const s = normalizeInput(raw);
    if (!s) return false;
    let res = null;
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s)) {
      const from = s.slice(0,2), to = s.slice(2,4), promo = s[4];
      res = game.move({ from, to, promotion: promo });
    } else {
      res = game.move(s);
      if (!res) {
        const leg = game.moves({ verbose: true }).map(m => m.san);
        const guess = leg.find(m => m.replace("x","").toLowerCase() === s.replace("x","").toLowerCase());
        if (guess) res = game.move(guess);
      }
    }
    if (!res) return false;
    pushHistorySAN(res.san);
    setLastMove({ from: res.from, to: res.to });
    setFromSq(null);
    setGhostList([]);
    setBoardKey(k => k + 1);
    setViewIndex(-1);
    maybeEngineMove();
    return true;
  }

  // History navigation
  function goToIndex(idx) {
    if (idx < -1 || idx >= history.length) return;
    const g = new Chess();
    for (let i = 0; i <= idx; i++) g.move(history[i].san);
    game.load(g.fen());
    setBoardKey(k => k + 1);
    setViewIndex(idx);
  }

  /* ---------- header / sidebar / footer ---------- */

  // Panels state
  const [showSheet, setShowSheet] = useState(false);         // Controls (mobile)
  const [showMovesPanel, setShowMovesPanel] = useState(false);

  // Header: emphasize last move, add Moves button (desktop + mobile)
  const headerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Left: Status */}
      <div className="text-sm md:text-base font-semibold">
        <span className="text-zinc-600 dark:text-zinc-400">Status:</span>{" "}
        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{status}</span>
        {engineThinking && <span className="ml-2 text-xs text-zinc-500">engine thinking…</span>}
      </div>

      {/* Center: Last move highlight */}
      <div
        className="
          px-5 py-1.5 rounded-full
          bg-gradient-to-r from-sky-600 to-rose-600
          text-white font-black tracking-wide
          text-base md:text-lg
          shadow-md
        "
        title="Last full move"
      >
        {lastPairText}
      </div>

      {/* Right: eval + buttons (Moves always visible) */}
      <div className="flex items-center gap-2">
        {(engineMate != null || engineEval != null) && (
          <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300">
            {engineMate != null ? `Mate ${engineMate>0?engineMate:-engineMate}` : `Eval ${engineEval?.toFixed?.(2)}`}
          </span>
        )}
        <button
          className="rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          onClick={()=> setShowMovesPanel(true)}
          title="Show move list"
        >
          Moves
        </button>
        <button
          className="md:hidden rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          onClick={()=>setShowSheet(true)}
        >
          Controls
        </button>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Board controls */}
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

          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
              <button
                className={`px-3 py-2 text-sm ${myColor==='w' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
                onClick={()=> setMyColor('w')}
              >Play White</button>
              <button
                className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${myColor==='b' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
                onClick={()=> setMyColor('b')}
              >Play Black</button>
            </div>

            <button
              className={`px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 ${blindfold ? "bg-zinc-900 text-white" : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"}`}
              onClick={()=> setBlindfold(v=>!v)}
            >
              {blindfold ? "Show Board" : "Blindfold"}
            </button>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showPieces} onChange={()=> setShowPieces(v => !v)} />
              Pieces
            </label>

            <button
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // DESKTOP SIDEBAR: Controls + Moves history
  const sidebar = (
    <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">
      <div className="grid gap-4">
        {ControlsPanel}
        {/* <MovesPanel
          history={history}
          viewIndex={viewIndex}
          goToIndex={goToIndex}
        /> */}
      </div>
    </div>
  );

  const stageContainerRef = useRef(null);

  // FOOTER: input only
  const footer = (
    <div className="w-full flex flex-wrap gap-2 items-center justify-center">
      <input
        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 w-[260px]"
        placeholder="Enter move (SAN e.g. Bc4, or UCI e2e4)"
        value={moveInput}
        onChange={(e)=> setMoveInput(e.target.value)}
        onKeyDown={(e)=> { if (e.key === "Enter") { if (playByInput(moveInput)) setMoveInput(""); } }}
        disabled={myColor !== turnColor}
        title={myColor !== turnColor ? "It's not your turn" : ""}
      />
      <button
        className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        onClick={()=> { if (playByInput(moveInput)) setMoveInput(""); }}
        disabled={myColor !== turnColor}
      >
        Play
      </button>
      {(engineMate != null || engineEval != null) && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
          {engineMate != null ? `Mate ${engineMate>0?engineMate:-engineMate}` : `Eval ${engineEval.toFixed(2)}`}
        </span>
      )}
    </div>
  );

  /* ---------- Mobile edge-swipe to open Moves ---------- */
  useEffect(() => {
    let startX = null;
    let tracking = false;

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      // start near the right edge (24px)
      if (vw - x <= 24) {
        startX = x;
        tracking = true;
      }
    }
    function onTouchMove(e) {
      if (!tracking || startX == null) return;
      const x = e.touches[0].clientX;
      const dx = x - startX; // will be negative when swiping left
      if (dx < -30) {
        setShowMovesPanel(true);
        tracking = false;
        startX = null;
      }
    }
    function onTouchEnd() {
      tracking = false;
      startX = null;
    }

    // only bind on small screens
    const mq = window.matchMedia("(max-width: 767px)");
    function bindOrUnbind() {
      if (mq.matches) {
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
      } else {
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      }
    }
    bindOrUnbind();
    mq.addEventListener?.("change", bindOrUnbind);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      mq.removeEventListener?.("change", bindOrUnbind);
    };
  }, []);

  /* ---------- Render ---------- */
  return (
    <GameLayout
      headerContent={headerContent}
      sidebar={sidebar}
      footer={footer}
    >
      {/* Stage content */}
      {!blindfold ? (
        <div ref={stageContainerRef} className="w-full overflow-hidden">
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            boardArray={boardArray}
            showPieces={showPieces}
            ghostMetaMap={ghostMetaMap}
            onDragStart={onDragStart}
            onDropOnSquare={onDropOnSquare}
            lastFromToSet={lastFromToSet}
            flipped={myColor === 'b'}
          />
        </div>
      ) : (
        // In blindfold mode, show the Moves Panel in the main stage
        <MovesPanel history={history} viewIndex={viewIndex} goToIndex={goToIndex} />
      )}

      {/* Mobile Controls sheet (bottom) */}
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

      {/* Moves sheet: slides from RIGHT (desktop + mobile) */}
      {showMovesPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowMovesPanel(false)}
          />
          {/* Right drawer */}
          <div
            className="
              fixed z-50 top-0 right-0 bottom-0
              w-[92vw] max-w-[420px]
              bg-white dark:bg-zinc-950
              border-l border-zinc-200 dark:border-zinc-800
              shadow-2xl
              animate-[slideIn_.18s_ease-out]
            "
            role="dialog"
            aria-label="Move list"
          >
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Move List</h3>
              <button
                className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700"
                onClick={() => setShowMovesPanel(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <MovesPanel
                history={history}
                viewIndex={viewIndex}
                goToIndex={(idx)=>{ goToIndex(idx); /* keep drawer open */ }}
                className="border-0 p-0 shadow-none"
              />
            </div>
          </div>

          {/* keyframes for slide-in */}
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(8%); opacity: .6; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </>
      )}
    </GameLayout>
  );

  /* === inner helper used above === */
  function beginSelect(from) {
    const pc = game.get(from);
    if (!pc) { setFromSq(null); setGhostList([]); return; }
    if (pc.color !== turnColor) return;
    setFromSq(from);
    setGhostList(computeLegal(from));
  }
}
