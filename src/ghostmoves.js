import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import GameLayout from "./games/shared/GameLayout";
import { Chess } from "chess.js";

/* ---------- Themes (match SquareSniper look) ---------- */
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

/* ---------- Subtle textures (no borders/shadows on squares) ---------- */
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

/* Inside labels on phones — dark, crisp */
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

/* Icon toggles (used on mobile + desktop headers) */
function IconToggle({ title, pressed, onClick, kind="eye" }) {
  const base = "w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm active:scale-[.98] transition";
  const bg   = pressed
    ? "bg-gradient-to-b from-amber-500 to-amber-600 text-white"
    : "bg-gradient-to-b from-zinc-200 to-zinc-300 text-zinc-800";
  return (
    <button className={`${base} ${bg}`} onClick={onClick} aria-pressed={pressed} title={title}>
      {kind === "eye" ? (
        pressed ? (
          // eye-off
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10.6 10.6A3 3 0 0013.4 13.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 10c1-1 5-7 10-7 5.5 0 10 6 10 7-1 1.2-2.5 3.2-4.7 4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          // eye
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        )
      ) : (
        // chess piece (pawn)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a3 3 0 00-2.8 4H9a3 3 0 103.6 0h-.2A3 3 0 0012 3zM8 14h8l-2-3h-4l-2 3zM7 16h10v2H7zM6 20h12v1H6z"/>
        </svg>
      )}
    </button>
  );
}

/* ---------- Board (touch-friendly) ---------- */
function Board({
  containerRef,
  themeVars,
  boardArray,
  showPieces,
  showLabels,
  ghostMetaMap,
  fromSq,
  legalSet,
  onSquareDown,
  onSquareUp,
  lastFromToSet,
  flipped,
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
        const availableH = Math.max(320, window.innerHeight - topAllowance - bottomAllowance);
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
  const isLightSquare = (r,c) => ((c + (n-1-r)) % 2) === 1; // a1 dark
  const rcToAlg = (r,c) => String.fromCharCode(97 + c) + (8 - r);

  const displayRows = useMemo(() => {
    const arr = Array.from({ length: n }, (_, r) => r);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);
  const displayCols = useMemo(() => {
    const arr = Array.from({ length: n }, (_, c) => c);
    return flipped ? arr.slice().reverse() : arr;
  }, [flipped]);

  const ranksForLabels = useMemo(
    () => (flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]),
    [flipped]
  );
  const filesForLabels = useMemo(
    () => (flipped ? [...FILES].reverse() : FILES),
    [flipped]
  );

  const cell = side / n;

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: phone ? "1fr" : "auto 1fr", gridTemplateRows: phone ? "1fr" : "1fr auto" }}
      >
        {/* Desktop ranks (outside) */}
        {!phone && (
          <div
            className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {ranksForLabels.map((r, i) => (
              <div key={`rank-${r}-${i}`} className="flex items-center justify-center font-bold"
                   style={{ height: cell, width: 24 }} aria-hidden>
                {showLabels ? r : ""}
              </div>
            ))}
          </div>
        )}

        {/* Board */}
        <div
          className="rounded-2xl overflow-hidden relative bg-white dark:bg-zinc-900"
          style={{ width: side, height: side, gridColumn: phone ? "1" : "2", gridRow: 1 }}
        >
          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
            role="grid"
            aria-label="Ghost Moves board"
          >
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const alg = rcToAlg(r,c);
                const sq = boardArray[r][c];
                const light = isLightSquare(r,c);
                const piece = sq && showPieces ? PIECE[sq.color][sq.type] : null;

                const isLeftEdge   = c === displayCols[0];
                const isBottomEdge = r === displayRows[displayRows.length - 1];
                const fileLetter = alg[0];
                const rankNumber = alg[1];

                const isLast = lastFromToSet.has(alg);
                const isLegal = legalSet.has(alg);

                return (
                  <button
                    key={alg}
                    className="relative touch-manipulation"
                    style={{
                      ...squareStyle(light, cell, themeVars),
                      cursor: "pointer",
                      transform: "translateZ(0)",
                      boxShadow: isLast ? "inset 0 0 0 3px rgba(59,130,246,.5)" : "none",
                    }}
                    onPointerDown={() => onSquareDown(alg)}
                    onPointerUp={() => onSquareUp(alg)}
                    onClick={(e)=> e.preventDefault()}
                  >
                    {/* ghost dots for legal targets */}
                    {isLegal && !sq && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "30%",
                          height: "30%",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          background: "rgba(16,185,129,0.28)",
                          boxShadow: "0 0 0 2px rgba(16,185,129,0.20)",
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* piece */}
                    {piece && (
                      <img
                        src={piece}
                        alt=""
                        draggable={false}
                        className="absolute pointer-events-none"
                        style={{
                          width: `calc(${cell}px * .88)`,
                          height: "auto",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,.25))",
                          zIndex: 2,
                        }}
                      />
                    )}

                    {/* Inside labels on phones */}
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

        {/* Desktop files (outside) */}
        {!phone && (
          <div
            className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100"
            style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}
          >
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

/* ---------- Move List Panel (used only in drawer) ---------- */
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
          const isActiveW = viewIndex === i * 2;
          const isActiveB = viewIndex === i * 2 + 1;
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

/* ---------- Page: GhostMoves ---------- */
export default function GhostMoves() {
  /* theme + labels + perspective */
  const [theme, setTheme] = useState("classicWood");
  const themeVars = THEMES[theme] || THEMES.classicWood;
  const [showLabels, setShowLabels] = useState(true);
  const [myColor, setMyColor] = useState("w");
  const flipped = myColor === "b";

  /* chess engine and state */
  const [game] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  /* blindfold + pieces */
  const [blindfold, setBlindfold] = useState(false);
  const [showPieces, setShowPieces] = useState(true);

  /* selection + ghosts */
  const [fromSq, setFromSq] = useState(null);
  const [ghostList, setGhostList] = useState([]); // [{to,capture,unique}]
  const ghostMetaMap = useMemo(() => {
    const m = new Map();
    for (const g of ghostList) m.set(g.to, { capture: g.capture, unique: g.unique });
    return m;
  }, [ghostList]);
  const legalSet = useMemo(() => new Set(ghostList.map(g => g.to)), [ghostList]);

  /* last move highlight */
  const [lastMove, setLastMove] = useState(null); // {from,to}
  const lastFromToSet = useMemo(() => new Set(lastMove ? [lastMove.from, lastMove.to] : []), [lastMove]);

  /* engine depth “streak” */
  const depthBag = [6, 8, 10, 12, 14];
  const [engineDepth, setEngineDepth] = useState(() => depthBag[Math.floor(Math.random()*depthBag.length)]);
  const [depthMovesLeft, setDepthMovesLeft] = useState(() => 2 + Math.floor(Math.random()*2));

  /* footer input + history */
  const [moveInput, setMoveInput] = useState("");
  const [history, setHistory] = useState([]); // [{san}]
  const [viewIndex, setViewIndex] = useState(-1); // -1 live

  /* eval */
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineEval, setEngineEval] = useState(null);
  const [engineMate, setEngineMate] = useState(null);
  const inFlight = useRef(null);

  /* Toaster */
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

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
  }, [boardKey, turnColor]);

  const lastPairText = useMemo(() => {
    const n = Math.ceil(history.length / 2) || 1;
    const w = history[(n - 1) * 2]?.san || "";
    const b = history[(n - 1) * 2 + 1]?.san || "";
    return `${n}. ${w || "…"} – ${b || "…"}`;
  }, [history]);

  function pushHistorySAN(san) { setHistory(h => [...h, { san }]); }

  /* legal moves for selection */
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

  /* engine helpers */
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
      const depth = engineDepth;
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
  useEffect(() => { maybeEngineMove(); /* eslint-disable-next-line */ }, [myColor, boardKey]);

  /* actions */
  function reset() {
    game.reset();
    setHistory([]);
    setFromSq(null);
    setGhostList([]);
    setLastMove(null);
    setBoardKey(k => k + 1);
    setViewIndex(-1);
    setEngineDepth(depthBag[Math.floor(Math.random()*depthBag.length)]);
    setTimeout(() => { if (myColor === 'b') callEngineForBestMove(); }, 0);
  }

  const beginSelect = useCallback((from) => {
    const pc = game.get(from);
    if (!pc) { setFromSq(null); setGhostList([]); return; }
    if (pc.color !== turnColor) return; // enforce side to move
    setFromSq(from);
    setGhostList(computeLegal(from));
  }, [game, turnColor]); // eslint-disable-line

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
      maybeEngineMove();
      return true;
    } catch { return false; }
  }

  /* ----- Touch-friendly square handlers ----- */
  function onSquareDown(alg) {
    if (!fromSq) { beginSelect(alg); return; }
    if (legalSet.has(alg) && tryMove(fromSq, alg)) return;
    beginSelect(alg);
  }
  function onSquareUp(alg) {
    if (fromSq && legalSet.has(alg)) { tryMove(fromSq, alg); return; }
  }

  /* history navigation */
  function goToIndex(idx) {
    if (idx < -1 || idx >= history.length) return;
    const g = new Chess();
    for (let i = 0; i <= idx; i++) g.move(history[i].san);
    game.load(g.fen());
    setBoardKey(k => k + 1);
    setViewIndex(idx);
    setFromSq(null);
    setGhostList([]);
  }

  /* ---------- Mobile right-to-left swipe to open Moves ---------- */
  const [showMovesPanel, setShowMovesPanel] = useState(false);
  useEffect(() => {
    let startX = null, tracking = false;
    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      if (vw - x <= 24) { startX = x; tracking = true; }
    }
    function onTouchMove(e) {
      if (!tracking || startX == null) return;
      const x = e.touches[0].clientX;
      const dx = x - startX; // negative when swiping left
      if (dx < -30) { setShowMovesPanel(true); tracking = false; startX = null; }
    }
    function onTouchEnd(){ tracking = false; startX = null; }

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

  /* ---------- header / sidebar / footer ---------- */

  // Mobile/desktop header
  const [showControls, setShowControls] = useState(false);

  const headerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Status (desktop only) */}
      <div className="hidden md:block text-sm md:text-base font-semibold">
        <span className="text-zinc-600 dark:text-zinc-400">Status:</span>{" "}
        <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{status}</span>
        {engineThinking && <span className="ml-2 text-xs text-zinc-500">engine thinking…</span>}
      </div>

      {/* Last move pill (desktop only, as per revert) */}
      <div className="md:block px-5 py-1.5 rounded-full bg-gradient-to-r from-sky-600 to-rose-600 text-white font-black tracking-wide text-base shadow-md">
        {lastPairText}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* Desktop Moves button (drawer) */}
        <button
          className="hidden md:inline-flex rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100"
          onClick={()=> setShowMovesPanel(true)}
          title="Show move list"
        >
          Moves
        </button>

        {/* Desktop Perspective */}
        <div className="hidden md:inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
          <button
            className={`px-3 py-2 text-sm ${myColor==='w' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
            onClick={()=> setMyColor('w')}
          >White</button>
          <button
            className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${myColor==='b' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
            onClick={()=> setMyColor('b')}
          >Black</button>
        </div>

        {/* Desktop icon toggles (added) */}
        <div className="hidden md:flex items-center gap-3">
          <IconToggle
            title={blindfold ? "Show board" : "Blindfold"}
            pressed={blindfold}
            onClick={()=> setBlindfold(v=>!v)}
            kind="eye"
          />
          <IconToggle
            title={showPieces ? "Hide pieces" : "Show pieces"}
            pressed={showPieces}
            onClick={()=> setShowPieces(v=>!v)}
            kind="piece"
          />
        </div>

        {/* MOBILE: Controls button + icon toggles (no Moves button) */}
        <button
          className="md:hidden rounded-lg px-3 py-2 text-sm text-white shadow-sm active:scale-[.98] bg-gradient-to-b from-amber-500 to-amber-600"
          onClick={()=> setShowControls(true)}
          title="Controls"
        >
          Controls
        </button>
        <div className="md:hidden flex items-center gap-3">
          <IconToggle
            title={blindfold ? "Show board" : "Blindfold"}
            pressed={blindfold}
            onClick={()=> setBlindfold(v=>!v)}
            kind="eye"
          />
          <IconToggle
            title={showPieces ? "Hide pieces" : "Show pieces"}
            pressed={showPieces}
            onClick={()=> setShowPieces(v=>!v)}
            kind="piece"
          />
        </div>
      </div>
    </div>
  );

  const ControlsPanel = (
    <div className="grid gap-4">
      {/* Board controls */}
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
            >
              {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
            </select>
          </label>

          {/* Perspective */}
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-fit">
            <button
              className={`px-3 py-2 text-sm ${myColor==='w' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
              onClick={()=> setMyColor('w')}
            >White</button>
            <button
              className={`px-3 py-2 text-sm border-l border-zinc-300 dark:border-zinc-700 ${myColor==='b' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
              onClick={()=> setMyColor('b')}
            >Black</button>
          </div>

          {/* Labels */}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showLabels} onChange={()=> setShowLabels(v => !v)} />
            Show rank/file labels
          </label>

          {/* NOTE: blindfold & pieces toggles REMOVED from controls (header only) */}
          <button
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700"
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );

  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;
  const stageContainerRef = useRef(null);

  /* ---------- Render ---------- */
  return (
    <GameLayout
      headerContent={headerContent}
      sidebar={sidebar}
      footer={
        <div className="w-full flex flex-wrap gap-2 items-center justify-center">
          <input
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 w-[260px]"
            placeholder="Enter move (SAN: Bc4  or UCI: e2e4)"
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
              {engineMate != null ? `Mate ${engineMate>0?engineMate:-engineMate}` : `Eval ${Number(engineEval).toFixed(2)}`}
            </span>
          )}
        </div>
      }
    >
      {/* Stage */}
      {!blindfold ? (
        <div ref={stageContainerRef} className="w-full overflow-visible">
          {/* Full-bleed on phones */}
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
              boardArray={boardArray}
              showPieces={showPieces}
              showLabels={showLabels}
              ghostMetaMap={ghostMetaMap}
              fromSq={fromSq}
              legalSet={legalSet}
              onSquareDown={onSquareDown}
              onSquareUp={onSquareUp}
              lastFromToSet={lastFromToSet}
              flipped={flipped}
            />
          </div>

          {/* Normal container on md+ */}
          <div className="hidden md:block">
            <Board
              containerRef={stageContainerRef}
              themeVars={themeVars}
              boardArray={boardArray}
              showPieces={showPieces}
              showLabels={showLabels}
              ghostMetaMap={ghostMetaMap}
              fromSq={fromSq}
              legalSet={legalSet}
              onSquareDown={onSquareDown}
              onSquareUp={onSquareUp}
              lastFromToSet={lastFromToSet}
              flipped={flipped}
            />
          </div>
        </div>
      ) : (
        <div className="px-3">
          <MovesPanel history={history} viewIndex={viewIndex} goToIndex={goToIndex} />
        </div>
      )}

      {/* Moves drawer (slides from right) */}
      {showMovesPanel && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowMovesPanel(false)} />
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
                goToIndex={(idx)=>{ goToIndex(idx); }}
                className="border-0 p-0 shadow-none"
              />
            </div>
          </div>

          <style>{`
            @keyframes slideIn {
              from { transform: translateX(8%); opacity: .6; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </>
      )}

      {/* Mobile Controls sheet */}
      {showControls && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowControls(false)} />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 max-h-[70vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Controls</h3>
              <button className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700" onClick={() => setShowControls(false)}>Close</button>
            </div>
            {ControlsPanel}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </GameLayout>
  );

  /* ===== Robust input handling ===== */
  function normalizeForMatch(s) {
    if (!s) return "";
    let t = s.trim();
    // normalize castles 0-0 etc.
    t = t.replace(/0/g, "O");
    // promote forms: e8=Q or e8q -> e8q (lower)
    t = t.replace(/=([QRBN])/gi, (_, p) => p); // strip "="
    t = t.toLowerCase();
    // remove capture/check decorators & commentary
    t = t.replace(/[x+#?!]/g, "");
    // drop "e.p." / "ep"
    t = t.replace(/e\.?p\.?/g, "");
    // remove spaces and hyphens except keep O-O patterns (already Os)
    if (!/^o-o(-o)?$/i.test(t)) t = t.replace(/[-\s]/g, "");
    return t;
  }

  function legalMovesWithSanAndUci() {
    const moves = game.moves({ verbose: true });
    return moves.map(m => {
      const san = m.san;                           // e.g. "Bxc4", "O-O", "e8=Q+"
      const sanNorm = normalizeForMatch(san);      // e.g. "bc4", "oo", "e8q"
      const uci = `${m.from}${m.to}${m.promotion ? m.promotion : ""}`; // "e2e4", "e7e8q"
      return { san, sanNorm, uci, m };
    });
  }

  function parseUciLike(t) {
    // "e2e4", "e7e8q" in any case
    const u = t.toLowerCase();
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) {
      const from = u.slice(0,2), to = u.slice(2,4), promo = u[4];
      return { from, to, promotion: promo };
    }
    return null;
  }

  function playByInput(raw) {
    if (myColor !== turnColor) { showToast("It's not your turn."); return false; }
    const text = (raw || "").trim();
    if (!text) return false;

    // UCI path
    const maybeUci = parseUciLike(text);
    if (maybeUci) {
      const res = game.move(maybeUci);
      if (!res) { showToast(`Illegal move "${text}".`); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null); setGhostList([]); setBoardKey(k => k + 1); setViewIndex(-1);
      maybeEngineMove();
      return true;
    }

    // SAN-ish path (case-insensitive, capture/check agnostic)
    const wanted = normalizeForMatch(text);
    if (!wanted) { showToast("Enter a move like 'Bc4' or 'e2e4'."); return false; }

    // Normalize castles input so "o-o", "O-O", "0-0" all match
    if (/^o-o-?o?$/i.test(wanted)) {
      const san = wanted === "ooo" ? "O-O-O" : "O-O";
      const res = game.move(san);
      if (!res) { showToast(`Illegal move "${text}".`); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null); setGhostList([]); setBoardKey(k => k + 1); setViewIndex(-1);
      maybeEngineMove();
      return true;
    }

    const leg = legalMovesWithSanAndUci();

    // Exact SAN (case-insensitive) first
    const exact = leg.find(x => x.san.toLowerCase() === text.toLowerCase());
    if (exact) {
      const res = game.move(exact.san);
      if (!res) { showToast(`Illegal move "${text}".`); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null); setGhostList([]); setBoardKey(k => k + 1); setViewIndex(-1);
      maybeEngineMove();
      return true;
    }

    // Fuzzy SAN: ignore x, +, #, !?, case
    const fuzzyMatches = leg.filter(x => x.sanNorm === wanted);
    if (fuzzyMatches.length === 1) {
      const chosen = fuzzyMatches[0];
      const res = game.move(chosen.san);
      if (!res) { showToast(`Illegal move "${text}".`); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null); setGhostList([]); setBoardKey(k => k + 1); setViewIndex(-1);
      maybeEngineMove();
      return true;
    }

    if (fuzzyMatches.length > 1) {
      const opts = fuzzyMatches.map(x => x.san).slice(0,4).join("  •  ");
      showToast(`Ambiguous: ${opts}`);
      return false;
    }

    // Last chance: SAN without file/rank disambiguators but with capture-insensitive compare
    const simpler = leg.filter(x => x.san.replace(/[x+#?!]/gi,"").toLowerCase() === text.replace(/[x+#?!]/gi,"").toLowerCase());
    if (simpler.length === 1) {
      const res = game.move(simpler[0].san);
      if (!res) { showToast(`Illegal move "${text}".`); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from: res.from, to: res.to });
      setFromSq(null); setGhostList([]); setBoardKey(k => k + 1); setViewIndex(-1);
      maybeEngineMove();
      return true;
    }
    if (simpler.length > 1) {
      const opts = simpler.map(x => x.san).slice(0,4).join("  •  ");
      showToast(`Ambiguous: ${opts}`);
      return false;
    }

    showToast(`Couldn't parse "${text}". Try SAN (Bc4) or UCI (e2e4).`);
    return false;
  }
}
