import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import GameLayout from "./games/shared/GameLayout";
import { Chess } from "chess.js";

/* ---------- Themes (SquareSniper look) ---------- */
const THEMES = {
  classicWood: { light: "#F0D9B5", dark: "#B58863", texture: "classicWood" },
  walnut:      { light: "#D6BB90", dark: "#6F4628", texture: "wood" },
  glassyWood:  { light: "#E2C9A6", dark: "#7A4B28", texture: "woodGlass" },
  ice:         { light: "#EEF6FF", dark: "#255CA5", texture: "ice" },
  grass:       { light: "#E6F4E6", dark: "#0C6139", texture: "grass" },
};
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

/* ---------- Pieces (Wikimedia) ---------- */
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

/* ---------- Moves Panel ---------- */
function MovesPanel({ history, viewIndex, goToIndex, className="" }) {
  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900 ${className}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Move History</div>
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

/* ---------- Board (desktop drag + mobile tap-to-move) ---------- */
function Board({
  containerRef,
  themeVars,
  boardArray,
  flipped,
  lastFromToSet,
  mateSquare,
  markedSquares,
  legalSet,
  fromSq,
  onSquareDown,
  onSquareUp,
  onDragStart,
  onDropOnSquare,
  onRightClickSquare,
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
        const bottomAllowance = 130;
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

  const ranksForLabels = useMemo(() => (flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]), [flipped]);
  const filesForLabels = useMemo(() => (flipped ? [...FILES].reverse() : FILES), [flipped]);

  const cell = side / n;

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className="grid gap-2 max-w-full"
        style={{ gridTemplateColumns: phone ? "1fr" : "auto 1fr", gridTemplateRows: "1fr auto" }}
      >
        {/* Ranks (desktop) */}
        {!phone && (
          <div className="flex flex-col justify-between pr-1 select-none text-zinc-900 dark:text-zinc-100" style={{ gridColumn: 1, gridRow: 1 }}>
            {ranksForLabels.map((r, i) => (
              <div key={`rank-${r}-${i}`} className="flex items-center justify-center font-bold" style={{ height: side / n, width: 24 }} aria-hidden>
                {r}
              </div>
            ))}
          </div>
        )}

        {/* Board */}
        <div className="rounded-2xl overflow-hidden relative bg-white dark:bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
             style={{ width: side, height: side, gridColumn: phone ? "1" : "2", gridRow: 1 }}>
          <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }} role="grid" aria-label="Endgames board">
            {displayRows.map((r) =>
              displayCols.map((c) => {
                const alg = rcToAlg(r,c);
                const sq = boardArray[r][c];
                const light = isLightSquare(r,c);
                const pieceUrl = sq ? PIECE[sq.color][sq.type] : null;

                const isLast = lastFromToSet.has(alg);
                const isMate = mateSquare && mateSquare === alg;
                const isMarked = markedSquares.has(alg);
                const isLegal = legalSet.has(alg);
                const isFrom = fromSq === alg;

                return (
                  <button
                    key={alg}
                    className="relative touch-manipulation"
                    style={{
                      ...squareStyle(light, cell, themeVars),
                      transform: "translateZ(0)",
                      cursor: "pointer",
                      // last move subtle glow
                      boxShadow: isLast ? "inset 0 0 0 3px rgba(59,130,246,.5)" : "none",
                    }}
                    onPointerDown={() => onSquareDown?.(alg)}
                    onPointerUp={() => onSquareUp?.(alg)}
                    onDragOver={(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; }}
                    onDrop={(e)=> onDropOnSquare?.(e, alg)}
                    onContextMenu={(e)=> onRightClickSquare?.(e, alg)}
                  >
                    {/* marked ring */}
                    {isMarked && (
                      <div className="absolute inset-1 rounded-md pointer-events-none"
                           style={{ boxSizing: "border-box", border: "6px solid rgba(59,130,246,0.85)", borderRadius: 10, zIndex: 3 }} />
                    )}

                    {/* legal dot (only when empty) */}
                    {isLegal && !sq && (
                      <div className="absolute rounded-full pointer-events-none"
                           style={{
                             width: "30%", height: "30%",
                             left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                             background: "rgba(16,185,129,0.28)", boxShadow: "0 0 0 2px rgba(16,185,129,0.20)",
                             zIndex: 1,
                           }} />
                    )}

                    {/* from highlight */}
                    {isFrom && (
                      <div className="absolute inset-0 pointer-events-none"
                           style={{ boxShadow: "inset 0 0 0 3px rgba(234,179,8,.65)", zIndex: 1 }} />
                    )}

                    {/* mate square */}
                    {isMate && (
                      <div className="absolute inset-0 pointer-events-none"
                           style={{ boxShadow: "inset 0 0 0 4px rgba(244,63,94,.85)", zIndex: 1 }} />
                    )}

                    {/* piece */}
                    {pieceUrl && (
                      <img
                        src={pieceUrl}
                        alt=""
                        draggable
                        onDragStart={(e)=> onDragStart?.(e, alg)}
                        onMouseDown={()=> onDragStart?.({ dataTransfer: { setData(){} } }, alg)}
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
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Files (desktop) */}
        {!phone && (
          <div className="flex gap-0 select-none text-zinc-900 dark:text-zinc-100" style={{ gridColumn: "1 / span 2", gridRow: 2, width: side + 24 }}>
            <div style={{ width: 24 }} aria-hidden />
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {filesForLabels.map((f) => (
                <div key={`file-${f}`} className="flex items-center justify-center font-bold" style={{ height: 24 }} aria-hidden>{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Endgame helpers (same features, polished labels) ---------- */
const ENDGAME_ABBR_TO_CODE = {
  "K + Q vs K": "KQK",
  "K + R vs K": "KRK",
  "K + B + B vs K": "KBBK",
  "K + B + N vs K": "KBNK",
  "K + N + N + P vs K": "KNNPK",
  "K + P vs K": "KPK",
  "K + (a/h)P vs K": "KAhPK",
};
const CODE_TO_FULL = {
  KQK:   "Queen Checkmate",
  KRK:   "Rook Checkmate",
  KBBK:  "Bishop Pair Checkmate",
  KBNK:  "Bishop Knight Checkmate",
  KNNPK: "2 Knights and a Pawn Checkmate",
  KPK:   "Pawn Promotion",
  KAhPK: "a/h Pawn Promotion",
};
function kindLabel(code){ return CODE_TO_FULL[code] || "Endgame"; }

function randomInt(n){ return Math.floor(Math.random()*n); }
function coordToAlg(file, rank) { return FILES[file] + RANKS[rank]; }
function randomSquare() { return coordToAlg(randomInt(8), randomInt(8)); }
function kingsAdjacent(a,b){
  const df = Math.abs(a.charCodeAt(0)-b.charCodeAt(0));
  const dr = Math.abs(a.charCodeAt(1)-b.charCodeAt(1));
  return Math.max(df,dr)===1;
}
function pickFree(used){
  while(true){ const s=randomSquare(); if(!used.has(s)) return s; }
}
function generateEndgamePosition(code, sideToMove='w', maxTries=500) {
  for(let tries=0; tries<maxTries; tries++){
    const used = new Set();
    let bk = randomSquare(); used.add(bk);
    let wk = pickFree(used);
    while (kingsAdjacent(wk,bk)) wk = pickFree(used);
    used.add(wk);

    const whites = [];
    const add = (type, sq)=>{ whites.push({type,sq}); used.add(sq); };
    function place(type, constraint) {
      let sq = pickFree(used);
      if (constraint === 'pawnSafe') {
        while (sq[1]==='1' || sq[1]==='8') sq = pickFree(used);
      }
      add(type, sq);
    }

    switch(code){
      case "KQK": place('q'); break;
      case "KRK": place('r'); break;
      case "KBBK": place('b'); place('b'); break;
      case "KBNK": place('b'); place('n'); break;
      case "KNNPK": place('n'); place('n'); place('p','pawnSafe'); break;
      case "KPK": place('p','pawnSafe'); break;
      case "KAhPK": {
        const file = Math.random()<0.5 ? 'a':'h';
        const rank = String(2 + randomInt(5));
        const sq = file+rank;
        if (!used.has(sq)) add('p',sq); else place('p','pawnSafe');
        break;
      }
      default: place('q'); code = "KQK";
    }

    const board = Array.from({length:8},()=>Array(8).fill(null));
    const put = (sq,color,type)=>{
      const f = sq.charCodeAt(0)-97;
      const r = 8-parseInt(sq[1],10);
      board[r][f] = { color, type };
    };
    put(wk,'w','k'); whites.forEach(p=>put(p.sq,'w',p.type)); put(bk,'b','k');

    function rowToFen(row){
      let s="", empty=0;
      for(const cell of row){
        if(!cell){ empty++; continue; }
        if(empty){ s+=empty; empty=0; }
        const m={k:'k',q:'q',r:'r',b:'b',n:'n',p:'p'};
        s+= cell.color==='w' ? m[cell.type].toUpperCase() : m[cell.type];
      }
      if(empty) s+=empty;
      return s;
    }
    const placement = board.map(rowToFen).join('/');
    const fenLive  = `${placement} ${sideToMove} - - 0 1`;
    const fenBlack = `${placement} b - - 0 1`;

    try {
      const gLive = new Chess(); gLive.load(fenLive);
      const gBlk  = new Chess(); gBlk.load(fenBlack);
      if (gLive.isCheck()) continue;
      if (gBlk.isCheck()) continue;
      if (gLive.isCheckmate() || gLive.isStalemate()) continue;
      if (gLive.moves().length === 0) continue;
      return { fen: fenLive, code };
    } catch {}
  }
  return { fen: "8/8/8/3k4/8/8/3QK3 w - - 0 1", code: "KQK" };
}

/* ---------- Page: Piece Endgames (polished) ---------- */
export default function PieceEndgames() {
  const [theme, setTheme] = useState("classicWood");
  const themeVars = THEMES[theme] || THEMES.classicWood;

  const [endAbbr, setEndAbbr] = useState("K + Q vs K");
  const endCode = ENDGAME_ABBR_TO_CODE[endAbbr] || "KQK";
  const [playAs, setPlayAs] = useState("w");                 // player side
  const [vsMode, setVsMode] = useState("engine");            // 'engine' | 'human'
  const [engineStyle, setEngineStyle] = useState("top");     // 'top' | 'random'

  const [game] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  const [history, setHistory] = useState([]); // [{san}]
  const [viewIndex, setViewIndex] = useState(-1); // -1 live
  function pushHistorySAN(san) { setHistory(h => [...h, { san }]); }

  const [lastMove, setLastMove] = useState(null); // {from,to}
  const lastFromToSet = useMemo(() => new Set(lastMove ? [lastMove.from, lastMove.to] : []), [lastMove]);

  const [mateSquare, setMateSquare] = useState(null);

  const [markedSquares, setMarkedSquares] = useState(() => new Set());
  function toggleMark(alg){
    setMarkedSquares(s => { const n = new Set(s); n.has(alg) ? n.delete(alg) : n.add(alg); return n; });
  }

  const boardArray = useMemo(() => game.board(), [boardKey]);
  const flipped = playAs === 'b';

  /* ----- Mobile-friendly selection (tap-to-move) ----- */
  const [fromSq, setFromSq] = useState(null);
  const sideReachMap = useMemo(() => {
    try {
      const moves = game.moves({ verbose: true }).filter(m => m.color === game.turn());
      const map = new Map();
      for (const m of moves) {
        if (!map.has(m.to)) map.set(m.to, new Set());
        map.get(m.to).add(m.from);
      }
      return map;
    } catch { return new Map(); }
  }, [boardKey]);

  function legalTargets(from) {
    try {
      return game.moves({ square: from, verbose: true }).map(m => {
        const reachers = sideReachMap.get(m.to) || new Set();
        return { to: m.to, unique: reachers.size === 1 };
      });
    } catch { return []; }
  }
  const [ghostList, setGhostList] = useState([]); // [{to,unique}]
  const legalSet = useMemo(() => new Set(ghostList.map(g => g.to)), [ghostList]);

  /* ----- Engine state ----- */
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineEval, setEngineEval] = useState(null);
  const [engineMate, setEngineMate] = useState(null);
  const inFlight = useRef(null);

  // Audio feedback (check / mate)
  const audioCtxRef = useRef(null);
  function ensureAudio(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!audioCtxRef.current) audioCtxRef.current = new AC();
    if(audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }
  function tone(freq, dur, type="sine", vol=0.06, delay=0){
    const ctx = audioCtxRef.current; if(!ctx) return;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq; osc.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime + delay, t1 = t0 + dur;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0); osc.stop(t1 + 0.02);
  }
  function playCheck(){ ensureAudio(); tone(820, .10, "triangle", .06); tone(980, .10, "triangle", .05, .04); }
  function playMate(){ ensureAudio(); tone(310, .18, "sine", .09); tone(620, .20, "sine", .08, .04); tone(930, .24, "sine", .07, .08); }

  // Randomized engine depth streak (rotate every 2–3 engine moves)
  const depthBag = [6, 8, 10, 12, 14];
  const [engineDepth, setEngineDepth] = useState(() => depthBag[Math.floor(Math.random()*depthBag.length)]);
  const [depthMovesLeft, setDepthMovesLeft] = useState(() => 2 + Math.floor(Math.random()*2));
  function rotateEngineDepthIfNeeded() {
    setDepthMovesLeft((left) => {
      if (left > 1) return left - 1;
      setEngineDepth(depthBag[Math.floor(Math.random()*depthBag.length)]);
      return 2 + Math.floor(Math.random()*2);
    });
  }

  const startFENRef = useRef(null);

  /* ---------- Timer (unchanged) ---------- */
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMin, setTimerMin] = useState(0);
  const [timerSec, setTimerSec] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  function totalFromInputs(){ 
    const m = Math.max(0, parseInt(timerMin||0,10));
    const s = Math.max(0, parseInt(timerSec||0,10));
    return Math.min(59, m) * 60 + Math.min(59, s);
  }
  function startTimer(){
    if (!timerEnabled) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const total = totalFromInputs();
    setTimeLeft(total);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current); timerRef.current = null;
          setTimerRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }
  function stopTimer(){ if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setTimerRunning(false); }
  function resetTimer(){ stopTimer(); setTimeLeft(totalFromInputs()); }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  const timeUp = timerEnabled && timeLeft === 0 && !timerRunning;

  /* ---------- init / randomize position ---------- */
  function loadRandomPosition() {
    const toMove = playAs;
    const { fen } = generateEndgamePosition(endCode, toMove);
    game.load(fen);
    startFENRef.current = fen;
    setHistory([]); setLastMove(null); setMateSquare(null);
    setMarkedSquares(new Set());
    setFromSq(null); setGhostList([]);
    setBoardKey(k => k + 1); setViewIndex(-1);
    setEngineDepth(depthBag[Math.floor(Math.random()*depthBag.length)]);
    setDepthMovesLeft(2 + Math.floor(Math.random()*2));
    if (timerEnabled) resetTimer();
    // if engine to move first (when you play Black), reply now after a tick
    setTimeout(() => maybeEngineMove(), 0);
  }
  useEffect(() => { loadRandomPosition(); /* mount */ }, []); // eslint-disable-line
  useEffect(() => { loadRandomPosition(); /* when options change */ }, [endAbbr, playAs]); // eslint-disable-line

  /* ---------- Engine ---------- */
  function parseBestmove(bestmoveField) {
    if (!bestmoveField || typeof bestmoveField !== 'string') return null;
    const parts = bestmoveField.trim().split(/\s+/);
    const idx = parts.indexOf('bestmove');
    if (idx === -1 || idx === parts.length - 1) return null;
    return parts[idx + 1];
  }
  async function callEngineForBestMove() {
    try {
      if (inFlight.current) inFlight.current.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setEngineThinking(true);

      const depth = engineStyle === "top" ? 12 : engineDepth;
      const fen = game.fen();
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`;

      const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, mode: 'cors', signal: controller.signal });
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
      // rotate depth if randomized style
      if (engineStyle === "random") rotateEngineDepthIfNeeded();

      afterAnyMoveEffects();
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    } finally {
      setEngineThinking(false);
    }
  }
  function maybeEngineMove() {
    if (vsMode !== "engine" || timeUp) return;
    const engineColor = (playAs === 'w') ? 'b' : 'w';
    if (game.turn() === engineColor && !game.isGameOver()) {
      // nudge to next tick to allow React state to settle
      setTimeout(() => callEngineForBestMove(), 0);
    }
  }
  useEffect(() => { maybeEngineMove(); /* on board changes or mode changes */ }, [boardKey, vsMode, playAs, engineStyle]); // eslint-disable-line

  /* ---------- History nav ---------- */
  function goToIndex(idx) {
    if (idx < -1 || idx >= history.length) return;
    const g = new Chess();
    g.load(startFENRef.current || game.fen());
    for (let i = 0; i <= idx; i++) g.move(history[i].san);
    game.load(g.fen());
    setBoardKey(k => k + 1);
    setViewIndex(idx);
  }

  /* ---------- After-move effects ---------- */
  function findKingSquare(color) {
    const b = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = b[r][c];
        if (cell && cell.type === 'k' && cell.color === color) {
          return String.fromCharCode(97 + c) + (8 - r);
        }
      }
    }
    return null;
  }
  function afterAnyMoveEffects() {
    setBoardKey(k => k + 1);
    setViewIndex(-1);
    if (game.isCheckmate()) {
      const matedColor = game.turn();
      const ksq = findKingSquare(matedColor);
      setMateSquare(ksq);
      playMate();
      stopTimer();
    } else if (game.isStalemate()) {
      setMateSquare(null);
      stopTimer();
    } else if (game.isCheck()) {
      setMateSquare(null);
      playCheck();
    } else {
      setMateSquare(null);
    }
  }

  /* ---------- Make moves (desktop drag + mobile taps) ---------- */
  function tryHumanMove(from, to) {
    try {
      if (vsMode === "engine" && game.turn() !== playAs) return false; // enforce turn when vs engine
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
      afterAnyMoveEffects();
      // engine reply (reliable)
      maybeEngineMove();
      return true;
    } catch { return false; }
  }

  // Desktop drag
  function onDragStart(e, from) {
    if (game.isGameOver() || timeUp) { e?.preventDefault?.(); return; }
    if (vsMode === "engine" && game.turn() !== playAs) { e?.preventDefault?.(); return; }
    e?.dataTransfer?.setData?.("text/from", from);
    if (e?.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }
  function onDropOnSquare(e, to) {
    e.preventDefault();
    if (timeUp) return;
    const from = e.dataTransfer?.getData("text/from");
    if (!from) return;
    tryHumanMove(from, to);
  }
  function onRightClickSquare(e, alg){ e.preventDefault(); toggleMark(alg); }

  // Mobile taps
  const beginSelect = useCallback((from) => {
    const pc = game.get(from);
    if (!pc) { setFromSq(null); setGhostList([]); return; }
    if (vsMode === "engine" && pc.color !== playAs) return; // can't move engine pieces
    if (pc.color !== game.turn()) return; // not to move
    setFromSq(from);
    setGhostList(legalTargets(from));
  }, [game, playAs, vsMode, legalTargets]); // eslint-disable-line

  function onSquareDown(alg) {
    if (!fromSq) { beginSelect(alg); return; }
    if (legalSet.has(alg) && tryHumanMove(fromSq, alg)) return;
    beginSelect(alg);
  }
  function onSquareUp(alg) {
    if (fromSq && legalSet.has(alg)) { tryHumanMove(fromSq, alg); return; }
  }

  /* ---------- Mobile swipe (right edge → left) to open Moves ---------- */
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

  /* ---------- UI: header / sidebar / footer ---------- */
  const fullMoves = Math.floor(history.length / 2);
  function fmtMMSS(s){
    const m = Math.floor(s/60), r = s%60;
    return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
  }
  const [showSheet, setShowSheet] = useState(false);
  // Header
  const headerContent = (
    <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {/* Left: mobile Controls */}
      <div className="flex items-center gap-2">
        <button
          className="md:hidden ml-2 rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 bg-white/80 dark:bg-zinc-900/80"
          onClick={()=>setShowSheet(true)}
        >
          Controls
        </button>
      </div>

      {/* Center: Endgame label */}
      <div className="text-center font-black text-base md:text-lg text-zinc-900 dark:text-zinc-100">
        {kindLabel(endCode)}
      </div>

      {/* Right: desktop Moves + Randomize icon */}
      <div className="flex items-center gap-2 justify-end">
        {/* Randomize icon button (always visible) */}
        <button
          className="rounded-xl w-9 h-9 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm active:scale-[.98]"
          onClick={loadRandomPosition}
          title="Randomize position"
        >
          {/* dice icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2"/>
            <circle cx="8" cy="8" r="1.4" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
            <circle cx="16" cy="16" r="1.4" fill="currentColor"/>
          </svg>
        </button>

        {/* Moves button (desktop only) */}
        <button
          className="hidden md:inline-flex rounded-lg px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900"
          onClick={()=> setShowMovesPanel(true)}
        >
          Moves
        </button>
      </div>
    </div>
  );

  // Compact Controls Panel (trim spacing)
  const ControlsPanel = (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm bg-white dark:bg-zinc-900">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Setup</div>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Endgame</span>
          <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                  value={endAbbr} onChange={(e)=> setEndAbbr(e.target.value)}>
            {Object.keys(ENDGAME_ABBR_TO_CODE).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>

        <div className="grid gap-1">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Side</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-max">
            <button className={`px-3 py-1.5 text-sm ${playAs==='w' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
                    onClick={()=> setPlayAs('w')}>White</button>
            <button className={`px-3 py-1.5 text-sm border-l border-zinc-300 dark:border-zinc-700 ${playAs==='b' ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" : "bg-white dark:bg-zinc-900"}`}
                    onClick={()=> setPlayAs('b')}>Black</button>
          </div>
        </div>

        <div className="grid gap-1">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Opponent</span>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-max">
            <button className={`px-3 py-1.5 text-sm ${vsMode==='engine' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-white dark:bg-zinc-900"}`}
                    onClick={()=> setVsMode('engine')}>Stockfish</button>
            <button className={`px-3 py-1.5 text-sm border-l border-zinc-300 dark:border-zinc-700 ${vsMode==='human' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-white dark:bg-zinc-900"}`}
                    onClick={()=> setVsMode('human')}>Human</button>
          </div>
        </div>

        {vsMode === 'engine' && (
          <div className="grid gap-1">
            <span className="text-sm text-zinc-800 dark:text-zinc-100">Engine Style</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-max">
              <button className={`px-3 py-1.5 text-sm ${engineStyle==='top' ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-white dark:bg-zinc-900"}`}
                      onClick={()=> setEngineStyle('top')}>Top</button>
              <button className={`px-3 py-1.5 text-sm border-l border-zinc-300 dark:border-zinc-700 ${engineStyle==='random' ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-white dark:bg-zinc-900"}`}
                      onClick={()=> setEngineStyle('random')}>Randomized</button>
            </div>
          </div>
        )}

        <label className="grid gap-1">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Theme</span>
          <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                  value={theme} onChange={(e)=>setTheme(e.target.value)}>
            {Object.keys(THEMES).map(k => (<option key={k} value={k}>{k}</option>))}
          </select>
        </label>

        <div className="grid gap-1">
          <span className="text-sm text-zinc-800 dark:text-zinc-100">Time Limit</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button className={`px-3 py-1.5 rounded-lg border text-sm ${timerEnabled ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-zinc-300 dark:border-zinc-700"}`}
                    onClick={()=> setTimerEnabled(v=>!v)}>{timerEnabled ? "On" : "Off"}</button>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={59} className="w-14 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                     value={timerMin} onChange={(e)=> setTimerMin(e.target.value)} disabled={!timerEnabled} aria-label="Minutes" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">:</span>
              <input type="number" min={0} max={59} className="w-14 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                     value={timerSec} onChange={(e)=> setTimerSec(e.target.value)} disabled={!timerEnabled} aria-label="Seconds" />
            </div>
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 w-max">
              <button className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900" onClick={startTimer} disabled={!timerEnabled}>Start</button>
              <button className="px-3 py-1.5 text-sm border-l bg-white dark:bg-zinc-900" onClick={stopTimer} disabled={!timerEnabled}>Stop</button>
              <button className="px-3 py-1.5 text-sm border-l bg-white dark:bg-zinc-900" onClick={resetTimer} disabled={!timerEnabled}>Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const sidebar = <div className="hidden md:block overflow-auto max-h-[70vh] pr-1">{ControlsPanel}</div>;

  const stageContainerRef = useRef(null);

  /* ---------- Render ---------- */
  const footer = (
    <div className="w-full flex flex-wrap gap-3 items-center justify-center">
      <div className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
        Moves: <span className="font-bold">{fullMoves}/50 {game.isCheckmate() ? "#" : ""} {game.isStalemate() ? "½-½" : ""}</span>
      </div>
      <div className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
        Timer: <span className="font-bold">{timerEnabled ? fmtMMSS(timeLeft) : "—"}</span>
      </div>
    </div>
  );

  return (
    <GameLayout headerContent={headerContent} sidebar={sidebar} footer={footer}>
      <div ref={stageContainerRef} className="w-full overflow-hidden">
        {/* Full-bleed on phones */}
        <div className="md:hidden" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}>
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            boardArray={boardArray}
            flipped={flipped}
            lastFromToSet={lastFromToSet}
            mateSquare={mateSquare}
            markedSquares={markedSquares}
            legalSet={legalSet}
            fromSq={fromSq}
            onSquareDown={onSquareDown}
            onSquareUp={onSquareUp}
            onDragStart={onDragStart}
            onDropOnSquare={onDropOnSquare}
            onRightClickSquare={onRightClickSquare}
          />
        </div>
        {/* Normal container on md+ */}
        <div className="hidden md:block">
          <Board
            containerRef={stageContainerRef}
            themeVars={themeVars}
            boardArray={boardArray}
            flipped={flipped}
            lastFromToSet={lastFromToSet}
            mateSquare={mateSquare}
            markedSquares={markedSquares}
            legalSet={legalSet}
            fromSq={fromSq}
            onSquareDown={onSquareDown}
            onSquareUp={onSquareUp}
            onDragStart={onDragStart}
            onDropOnSquare={onDropOnSquare}
            onRightClickSquare={onRightClickSquare}
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

      {/* Moves drawer (right) */}
      {showMovesPanel && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowMovesPanel(false)} />
          <div
            className="fixed z-50 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 right-0 top-0 bottom-0 w-[92vw] sm:w-[460px] p-4 shadow-xl animate-[slideIn_.18s_ease-out]"
            role="dialog"
            aria-label="Move list"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Move List</h3>
              <button className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700" onClick={() => setShowMovesPanel(false)}>Close</button>
            </div>
            <MovesPanel history={history} viewIndex={viewIndex} goToIndex={goToIndex} className="border-0 p-0 shadow-none" />
          </div>
          <style>{`@keyframes slideIn { from { transform: translateX(8%); opacity: .6; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </>
      )}
    </GameLayout>
  );

  /* ===== helpers used inside component ===== */
  function onSquareDown(alg) {
    if (timeUp) return;
    if (!fromSq) { beginSelect(alg); return; }
    if (legalSet.has(alg) && tryHumanMove(fromSq, alg)) return;
    beginSelect(alg);
  }
  function onSquareUp(alg) {
    if (timeUp) return;
    if (fromSq && legalSet.has(alg)) { tryHumanMove(fromSq, alg); return; }
  }
}
