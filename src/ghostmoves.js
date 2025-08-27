import React, { useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "./games/shared/GameLayout";
import { Chess } from "chess.js";

/* ---------- Theme: reuse your palette style ---------- */
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

/* ---------- Board ---------- */
function Board({
  containerRef,
  themeVars,
  boardArray,         // chess.board()
  showLabels,
  showPieces,
  ghostMetaMap,       // Map<to, {capture:boolean, unique:boolean}>
  onDragStart,
  onDropOnSquare,
  lastFromToSet,      // Set([from,to]) for last move highlight
}) {
  const [side, setSide] = useState(480);

  // responsive square
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const labelColW = showLabels ? 28 : 0;
      const gap = 8, pad = 8;
      const availableW = Math.max(260, el.clientWidth - labelColW - gap - pad);
      const phone = window.innerWidth < 768;
      const topAllowance = phone ? 220 : 160;
      const bottomAllowance = phone ? 150 : 120;
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
  }, [containerRef, showLabels]);

  const n = 8;
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark
  const ranks = useMemo(()=> Array.from({length:n},(_,i)=> n - i), []);
  const displayRows = useMemo(()=> Array.from({length:n},(_,r)=> r), []);
  const displayCols = useMemo(()=> Array.from({length:n},(_,c)=> c), []);

  const rcToAlg = (r,c) => String.fromCharCode(97+c) + (8-r);

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: `${showLabels ? "auto " : ""}1fr`, gridTemplateRows: "1fr auto" }}
      >
        {/* left ranks */}
        {showLabels && (
          <div
            className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {ranks.map((r) => (
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
        )}

        {/* board */}
        <div
          className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden relative"
          style={{ width: side, height: side, gridColumn: showLabels ? 2 : 1, gridRow: 1 }}
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
                const ghost = ghostMetaMap.get(alg); // {capture, unique} if current selection allows this square

                return (
                  <div
                    key={alg}
                    className={`relative ${isActive ? "ring-2 ring-sky-300" : ""}`}
                    style={{
                      background: bg,
                      borderLeft: "1px solid rgba(113,113,122,.6)",
                      borderTop: "1px solid rgba(113,113,122,.6)",
                      ...(c===n-1?{borderRight:"1px solid rgba(113,113,122,.6)"}:{}),
                      ...(r===n-1?{borderBottom:"1px solid rgba(113,113,122,.6)"}:{}),
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
                        onMouseDown={()=> onDragStart({ dataTransfer: { setData(){} } }, alg)} // allow click-select too
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
        {showLabels && (
          <div
            className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: showLabels ? "1 / span 2" : "1 / span 1", gridRow: 2, width: side + (showLabels ? 24 : 0) }}
          >
            <div style={{ width: showLabels ? 24 : 0 }} aria-hidden />
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {filesAll.map((f) => (
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
        )}
      </div>
    </div>
  );
}

/* ---------- Page: GhostMoves (GameLayout shell) ---------- */
export default function GhostMoves() {
  const [theme, setTheme] = useState("wooden");
  const themeVars = THEMES[theme] || THEMES.green;

  // chess engine (rules)
  const [game] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  // selection & ghosts
  const [fromSq, setFromSq] = useState(null);               // e.g. "e2"
  const [ghostList, setGhostList] = useState([]);           // [{to,capture,unique}]
  const ghostMetaMap = useMemo(() => {
    const m = new Map();
    for (const g of ghostList) m.set(g.to, { capture: g.capture, unique: g.unique });
    return m;
  }, [ghostList]);

  // ui toggles
  const [showPieces, setShowPieces] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // last move highlight
  const [lastMove, setLastMove] = useState(null);           // {from,to}
  const lastFromToSet = useMemo(() => new Set(lastMove ? [lastMove.from, lastMove.to] : []), [lastMove]);

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

  /* --- helpers --- */
  const files = ["a","b","c","d","e","f","g","h"];
  const rcToAlg = (r,c) => String.fromCharCode(97+c) + (8-r);

  // Build "sideReachMap": for the side to move, which squares are reachable from how many different pieces.
  const sideReachMap = useMemo(() => {
    try {
      const moves = game.moves({ verbose: true }).filter(m => m.color === turnColor);
      const map = new Map();
      for (const m of moves) {
        const k = m.to;
        if (!map.has(k)) map.set(k, new Set());
        map.get(k).add(m.from); // a unique origin square per piece
      }
      return map;
    } catch {
      return new Map();
    }
  }, [boardKey, turnColor]);

  function computeLegal(from) {
    try {
      const verbose = game.moves({ square: from, verbose: true });
      return verbose.map(m => {
        const reachers = sideReachMap.get(m.to) || new Set();
        return { to: m.to, capture: !!m.captured, unique: reachers.size === 1 };
      });
    } catch {
      return [];
    }
  }

  /* --- actions --- */
  function reset() {
    game.reset();
    setFromSq(null);
    setGhostList([]);
    setLastMove(null);
    setBoardKey(k => k + 1);
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
    if (!pc || pc.color !== turnColor || !showPieces) return;
    if (e?.dataTransfer?.setData) {
      e.dataTransfer.setData("text/from", from);
      e.dataTransfer.effectAllowed = "move";
    }
    beginSelect(from);
  }

  function tryMove(from, to) {
    try {
      const res = game.move({ from, to });
      if (!res) return false;
      setLastMove({ from, to });
      setFromSq(null);
      setGhostList([]);
      setBoardKey(k => k + 1);
      return true;
    } catch {
      return false;
    }
  }

  function onDropOnSquare(e, to) {
    e.preventDefault();
    const from = e.dataTransfer?.getData("text/from") || fromSq;
    if (!from) return;
    if (from === to) { setFromSq(null); setGhostList([]); return; }
    tryMove(from, to);
  }

  /* --- header / sidebar / footer (GameLayout style) --- */
  const headerContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Turn:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">
          {turnColor === "w" ? "White" : "Black"}
        </span>
      </div>

      <div className="text-base md:text-lg font-semibold">
        <span className="text-zinc-700 dark:text-zinc-300">Status:</span>{" "}
        <span className="font-black text-zinc-900 dark:text-zinc-100">{status}</span>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
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

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showPieces} onChange={()=> setShowPieces(v => !v)} />
              Pieces
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLabels} onChange={()=> setShowLabels(v => !v)} />
              Edge Labels
            </label>
          </div>

          <button
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
        <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Ghost Moves</div>
        <ul className="text-sm text-zinc-700 dark:text-zinc-300 list-disc pl-5 space-y-1">
          <li>Press/click a piece or start dragging it to preview destinations.</li>
          <li>Green dot = uniquely reachable square; Grey dot = shared by multiple pieces.</li>
          <li>Drop on a dotted square to make the move.</li>
        </ul>
      </div>
    </div>
  );
  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  const stageContainerRef = useRef(null);

  const footer = (
    <div className="w-full flex flex-wrap gap-3 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
      Tip: You can also click a piece (without dragging) to reveal its ghost moves.
    </div>
  );

  // mobile sheet
  const [showSheet, setShowSheet] = useState(false);

  return (
    <GameLayout
      headerContent={headerContent}
      sidebar={sidebar}
      footer={footer}
    >
      <div ref={stageContainerRef} className="w-full overflow-hidden">
        <Board
          containerRef={stageContainerRef}
          themeVars={themeVars}
          boardArray={boardArray}
          showLabels={showLabels}
          showPieces={showPieces}
          ghostMetaMap={ghostMetaMap}
          onDragStart={onDragStart}
          onDropOnSquare={onDropOnSquare}
          lastFromToSet={lastFromToSet}
        />
      </div>

      {/* mobile controls */}
      <div className="md:hidden mt-4">
        <button
          className="rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          onClick={()=>setShowSheet(true)}
        >
          Controls
        </button>
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
