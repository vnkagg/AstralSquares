import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

// React Chessboard — Project2-style board skin (WOODEN ONLY) + Drag-only moves
// Now using: Remote Stockfish API (no local/wasm). White/Black toggle + Blindfold mode.

export default function GhostMoves() {
  // ------- Piece artwork (Wikimedia standard) -------
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

  // ---- Fixed Theme (wooden only) ----
  const BOARD_THEME = { light: "#EBD3B0", dark: "#AE6B36" };

  // ------- Styles (Project2 board look & feel) -------
  const CSS = `
  :root {
    --mesh: #d3d3d3;
    --mesh-border: #000;
    --good: rgba(16,185,129,0.9);
    --bad: rgba(239,68,68,0.9);
    --focus-dim: rgba(0,0,0,.4);
    --focus-border: #0ea5e9;
  }
  *{box-sizing:border-box}
  html,body,#root{ height:100% }
  body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; background: radial-gradient(1400px 900px at 50% -12%, #fff 30%, #f5f7fb); color:#0f172a }
  button{ font-family: inherit }

  .wrap{ min-height:100vh; display:flex; flex-direction:column; gap:6px }

  /* Top bar */
  .top{ display:flex; gap:12px; align-items:center; justify-content:center; padding:12px 16px; flex-wrap:wrap }
  .tag{ padding:6px 10px; border:1px solid rgba(148,163,184,.35); border-radius:999px; background:#fff; font-weight:700; color:#475569; box-shadow:0 1px 2px rgba(2,8,23,.05) }
  .btn{ padding:9px 12px; border:none; border-radius:10px; background:#0ea5e9; color:#fff; font-weight:800; cursor:pointer; transition: transform .08s ease, box-shadow .2s ease }
  .btn:hover{ transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14,165,233,.35) }
  .btn.secondary{ background:transparent; color:#0f172a; border:1px solid rgba(148,163,184,.35) }
  .seg{ display:flex; padding:4px; background:#fff; border:1px solid rgba(148,163,184,.35); border-radius:999px; gap:4px }
  .seg button{ background:transparent; color:#475569; padding:6px 10px; border-radius:999px }
  .seg .active{ background:#0ea5e9; color:#fff }

  .status{ text-align:center; padding:4px 12px; font-weight:800; color:#475569 }

  /* Main layout */
  .main{ flex:1; display:grid; grid-template-columns: 1fr minmax(300px, 360px); gap:18px; padding:10px 14px; align-items:start }
  @media (max-width: 980px){ .main{ grid-template-columns: 1fr; } }

  .stage{ display:grid; align-content:center; justify-items:center; min-height: 380px }

  /* === Project2-style framed board with edge labels === */
  .boardWrap { display: grid; grid-template-columns: auto auto auto; grid-template-rows: auto auto auto; gap: 10px; padding: 12px 14px; border-radius: 18px; background: rgba(255,255,255,.85); border:1px solid #e2e8f0; box-shadow: 0 12px 40px rgba(2,8,23,.06); align-items: center; justify-items: center; }
  .ranksCol { grid-row: 2; display: grid; height: var(--boardSide); grid-template-rows: repeat(8, 1fr); padding: 8px 0; }
  .ranksCol.left  { grid-column: 1; }
  .ranksCol.right { grid-column: 3; }
  .filesRow { display: grid; width: var(--boardSide); padding: 8px; grid-template-columns: repeat(8, 1fr); }
  .filesRow.top    { grid-row: 1; grid-column: 2; padding-bottom: 0; }
  .filesRow.bottom { grid-row: 3; grid-column: 2; padding-top: 0; }
  .rankLbl, .fileLbl { display: flex; align-items: center; justify-content: center; color: #0f172a; user-select: none; font-weight: 900; font-size: clamp(14px, 2.3vmin, 20px); letter-spacing: .3px; }

  .boardOuter { grid-row: 2; grid-column: 2; background: #e2e8f0; padding: 8px; border-radius: 16px; width: var(--boardSide); height: var(--boardSide); }
  .board { position:relative; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); border-radius: 12px; overflow: hidden; background: white; width: 100%; height: 100%; }

  .square { position: relative; display: flex; align-items: center; justify-content: center; transition: box-shadow .15s ease, background-color .15s ease, transform .08s ease; user-select: none }
  .square:hover{ filter: brightness(1.02) }
  .square.targetMesh { transform: scale(1.02); }
  .square.dim::after { content: ""; position: absolute; inset: 0; background: var(--focus-dim); }
  .square.focusEdge { outline: 2px solid #0ea5e9; outline-offset: -2px; }

  .shadowGood { box-shadow: 0 0 0 5px var(--good) inset, 0 0 0 4px var(--good); }
  .shadowBad  { box-shadow: 0 0 0 5px var(--bad)  inset, 0 0 0 4px var(--bad); }

  /* Indicators (tweaked opacity) */
  .dot{ width:20%; height:20%; border-radius:50%; background: rgba(255,255,255,.6); border:3px solid rgba(0,0,0,.6); box-shadow:0 2px 6px rgba(0,0,0,.18) }
  .dot.capture{ background: rgba(239,68,68,.16); border-color:#ef4444 }
  .last{ box-shadow: inset 0 0 0 4px rgba(14,165,233,.22), 0 0 0 6px rgba(14,165,233,.10) }

  .piece{ width:86%; max-width:none; filter: drop-shadow(0 3px 6px rgba(0,0,0,.25)); transition: transform .08s ease }
  .piece:hover{ transform: translateY(-1px) }
  .draggable{ cursor:grab }
  .draggable:active{ cursor:grabbing }

  /* Sidebar (compact) */
  .side{ background:#fff; border:1px solid rgba(148,163,184,.35); border-radius:16px; padding:12px; display:grid; grid-template-rows: auto auto auto 1fr auto; gap:10px; box-shadow:0 8px 22px rgba(2,8,23,.06) }
  .side h3{ margin:0; font-size:11px; letter-spacing:.7px; text-transform:uppercase; color:#475569 }
  .row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
  .input{ flex:1; padding:9px 10px; border:1px solid rgba(148,163,184,.55); border-radius:10px; font-size:14px; background:transparent; color:#0f172a; outline:none }
  .input:focus{ box-shadow: 0 0 0 3px rgba(14,165,233,.33) }
  .miniBtn{ padding:9px 10px; border:none; border-radius:10px; background:#0ea5e9; color:#fff; font-weight:800; cursor:pointer }
  .toggle{ display:flex; gap:6px; align-items:center; font-size:13px; color:#475569 }
  .toggle input{ width:14px; height:14px }

  /* Move sheet */
  .sheet{ display:grid; grid-template-columns: 46px 1fr 1fr; align-items:stretch; gap:6px; overflow:auto; border-radius:12px; padding:6px; background:linear-gradient(180deg, rgba(241,245,249,.7), rgba(241,245,249,.45)); border:1px solid rgba(148,163,184,.35); max-height: 56vh; scroll-behavior:smooth }
  .cell{ background:rgba(248,250,252,.95); border-radius:8px; padding:6px 8px; font-weight:700; font-size:14px; display:flex; align-items:center; min-height:32px; justify-content:center; color:#0f172a }
  .head{ background:rgba(238,242,247,.9); color:#64748b; position:sticky; top:0; z-index:1 }
  .num{ color:#64748b }
  .activeCell{ background:#0ea5e9 !important; color:#fff }

  .toast{ position:fixed; left:50%; transform:translateX(-50%); bottom:18px; background:#111; color:#fff; border-radius:10px; padding:10px 12px; font-weight:800; box-shadow:0 10px 22px rgba(0,0,0,.25); opacity:.96; font-size:13px }

  /* Promotions */
  .promoMask{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:grid; place-items:center; z-index:50; animation: fadeIn .15s ease }
  .promo{ background:#fff; border:1px solid rgba(148,163,184,.35); border-radius:14px; padding:14px; width:min(92vw, 380px); box-shadow:0 16px 36px rgba(0,0,0,.25) }
  .promo h3{ margin:0 0 8px; font-size:15px; color:#0f172a }
  .promoGrid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px }
  .promoBtn{ border:1px solid rgba(148,163,184,.35); border-radius:10px; padding:10px; background:linear-gradient(180deg, rgba(241,245,249,.9), rgba(241,245,249,.6)); cursor:pointer; display:grid; place-items:center }
  .promoBtn img{ width:40px; height:40px }

  /* Blindfold console */
  .blindfoldBox{ background:#0f172a; color:#e2e8f0; border-radius:16px; padding:14px; border:1px solid rgba(148,163,184,.35); box-shadow:0 10px 24px rgba(2,8,23,.35) }
  .bfRow{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px }
  .bfBadge{ padding:4px 8px; border-radius:999px; background:#0ea5e9; color:#fff; font-weight:800; font-size:12px }
  .bfMove{ font-weight:900; font-size:18px; letter-spacing:.4px }
  .bfSmall{ opacity:.8; font-size:12px }
  .bfThinking{ animation: pulse 1.2s infinite }
  @keyframes pulse{ 0%{opacity:.7} 50%{opacity:1} 100%{opacity:.7} }

  @keyframes fadeIn{ from{ opacity:0 } to{ opacity:1 } }
  `;

  // ------- State -------
  const [game] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);
  const [fromSq, setFromSq] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]); // {to,capture}
  const [lastMove, setLastMove] = useState(null); // {from,to}

  const [history, setHistory] = useState([]); // [{san}]
  const [viewIndex, setViewIndex] = useState(-1); // -1 = live
  const [sanInput, setSanInput] = useState("");

  // Visuals
  const [showPieces, setShowPieces] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);

  // Toast
  const [toast, setToast] = useState("");
  function showToast(msg){ setToast(msg); setTimeout(()=> setToast(""), 1400); }

  // Promotions
  const [promoOpen, setPromoOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState(null); // {from,to}

  // Layout measuring – control --boardSide so it never overflows
  const stageRef = useRef(null);
  const sideRef = useRef(null);
  const sheetRef = useRef(null);
  const [sidePx, setSidePx] = useState(520);
  useEffect(() => {
    function measure() {
      try {
        const stage = stageRef.current; const side = sideRef.current;
        if (!stage) return;
        const gap = 18; const pad = 22;
        const rect = stage.getBoundingClientRect();
        const sideW = side ? side.getBoundingClientRect().width : 0;
        const availW = Math.max(260, rect.width - sideW - gap - pad);

        // Height cap: bound by stage height and viewport height margin
        const stageH = rect.height - pad;
        const vhCap = Math.max(340, Math.floor(window.innerHeight * 0.72));
        const availH = Math.max(300, Math.min(stageH, vhCap));

        setSidePx(Math.floor(Math.min(availW, availH)));
      } catch {}
    }
    measure();
    const ro = new ResizeObserver(measure);
    if(stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, []);

  // Derived
  const board = useMemo(() => game.board(), [boardKey]);
  const turnColor = game.turn(); // 'w' | 'b'

  const filesAll = ["a","b","c","d","e","f","g","h"];
  const ranksAll = [8,7,6,5,4,3,2,1]; // white at bottom

  function rcToAlg(r, c) { return String.fromCharCode(97 + c) + (8 - r); }
  function fileToIndex(fileLetter) { return filesAll.indexOf(fileLetter); }
  function rankToIndex(rankNum) { return 8 - rankNum; }
  function isLightSquare(fileLetter, rankNum){
    const f = fileToIndex(fileLetter);
    const r = rankToIndex(rankNum);
    return (f + r) % 2 === 1; // a1 dark -> light if sum odd
  }

  // ------- Move helpers -------
  function computeLegal(from) {
    try { return game.moves({ square: from, verbose: true }).map(m => ({ to: m.to, capture: !!m.captured })); } catch { return []; }
  }

  function beginSelect(from) {
    try {
      const piece = game.get(from);
      if (!piece) { setFromSq(null); setLegalTargets([]); return; }
      if (piece.color !== turnColor) return; // turn enforcement
      setFromSq(from);
      setLegalTargets(computeLegal(from));
    } catch {}
  }

  function pushHistorySAN(san) { setHistory(h => [...h, { san }]); }

  function needsPromotion(from, to){
    try{
      const piece = game.get(from);
      if(!piece || piece.type !== 'p') return false;
      const rank = Number(to[1]);
      return (piece.color === 'w' && rank === 8) || (piece.color === 'b' && rank === 1);
    }catch{ return false }
  }

  function confirmPromotion(piece){
    if(!pendingMove) return;
    const { from, to } = pendingMove;
    try{
      const res = game.move({ from, to, promotion: piece });
      if(!res) { showToast("Illegal move"); return; }
      pushHistorySAN(res.san);
      setLastMove({ from, to });
      setFromSq(null); setLegalTargets([]);
      setBoardKey(k => k + 1); setViewIndex(-1);
      setPendingMove(null); setPromoOpen(false);
      // After player's move, ask API if enabled
      maybeEngineMove();
    }catch{}
  }

  function tryMove(from, to, promotion){
    try{
      if(needsPromotion(from, to) && !promotion){ setPendingMove({ from, to }); setPromoOpen(true); return true; }
      const res = game.move({ from, to, promotion: promotion || undefined });
      if (!res) { showToast("Illegal move"); return false; }
      pushHistorySAN(res.san);
      setLastMove({ from, to });
      setFromSq(null); setLegalTargets([]);
      setBoardKey(k => k + 1); setViewIndex(-1);
      requestAnimationFrame(()=>{ if(sheetRef.current) sheetRef.current.scrollTop = sheetRef.current.scrollHeight; });
      // After player move
      maybeEngineMove();
      return true;
    } catch { showToast("Illegal move"); return false; }
  }

  // ------- Input parsing (tolerant) -------
  function normalizeInput(s) {
    let t = (s || "").trim(); if (!t) return "";
    t = t.replaceAll("0", "O"); // 0-0 -> O-O
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(t)) return t.toLowerCase();
    if (/^[kqrbn]/i.test(t)) t = t[0].toUpperCase() + t.slice(1);
    return t;
  }
  function moveByInput(raw) {
    const s = normalizeInput(raw); if (!s) return false;
    let res = null;
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s)) { // UCI
      const from = s.slice(0, 2), to = s.slice(2, 4), promo = s[4];
      if(needsPromotion(from, to) && !promo){ setPendingMove({ from, to }); setPromoOpen(true); return true; }
      res = game.move({ from, to, promotion: promo });
    } else {
      res = game.move(s);
      if (!res) {
        const leg = game.moves({ verbose: true }).map(m => m.san);
        const guess = leg.find(m => m.replace("x", "").toLowerCase() === s.replace("x", "").toLowerCase());
        if (guess) res = game.move(guess);
      }
    }
    if (!res) { showToast("Illegal move"); return false; }
    pushHistorySAN(res.san);
    setBoardKey(k => k + 1); setViewIndex(-1);
    requestAnimationFrame(()=>{ if(sheetRef.current) sheetRef.current.scrollTop = sheetRef.current.scrollHeight; });
    // After player move
    maybeEngineMove();
    return true;
  }

  // ------- DnD only -------
  function onDragStart(e, from) {
    const pc = game.get(from);
    if (engineEnabled && myColor !== turnColor) { e.preventDefault(); return; }
    if (!pc || pc.color !== turnColor || !showPieces) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/from", from);
    e.dataTransfer.effectAllowed = "move";
    beginSelect(from);
  }
  function onDrop(e, to) {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/from");
    if (!from) return;
    if (from === to) { setFromSq(null); setLegalTargets([]); return; }
    tryMove(from, to);
  }

  const legalSet = useMemo(() => new Set(legalTargets.map(m => m.to)), [legalTargets]);
  const captureSet = useMemo(() => new Set(legalTargets.filter(m => m.capture).map(m => m.to)), [legalTargets]);
  const lastFromTo = useMemo(() => new Set(lastMove ? [lastMove.from, lastMove.to] : []), [lastMove]);

  // ------- History navigation -------
  function goToIndex(idx) {
    if (idx < -1 || idx >= history.length) return;
    const g = new Chess();
    for (let i = 0; i <= idx; i++) { g.move(history[i].san); }
    game.load(g.fen());
    setBoardKey(k => k + 1); setViewIndex(idx);
  }
  function back() { if (viewIndex >= 0) goToIndex(viewIndex - 1); }
  function fwd() { if (viewIndex < history.length - 1) goToIndex(viewIndex + 1); }
  function live() { goToIndex(history.length - 1); setViewIndex(-1); }

  // Keyboard shortcuts: ← (Back), → (Next), L (Live)
  useEffect(()=>{
    const onKey = (e)=>{
      if(e.key === 'ArrowLeft') back();
      if(e.key === 'ArrowRight') fwd();
      if(e.key.toLowerCase() === 'l') live();
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [viewIndex, history.length]);

  // ------- Labels & status -------
  const status = useMemo(() => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) return "Checkmate";
      if (game.isDraw()) return "Draw";
      return "Game over";
    }
    if (game.isCheck()) return `${turnColor === 'w' ? 'White' : 'Black'} to move — Check!`;
    return `${turnColor === 'w' ? 'White' : 'Black'} to move`;
  }, [boardKey]);

  // Reset
  function resetAll(){
    try{
      game.reset(); setHistory([]); setFromSq(null); setLegalTargets([]); setLastMove(null); setBoardKey(k=>k+1); setViewIndex(-1);
      if(sheetRef.current) sheetRef.current.scrollTop = 0;
      showToast('New game');
      if (engineEnabled && myColor === 'b') maybeEngineMove(); // engine as White
    }catch{}
  }

  const themeVars = BOARD_THEME;

  // ============================
  // REMOTE ENGINE (HTTP API)
  // ============================
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineDepthChoice, setEngineDepthChoice] = useState(8); // using "Skill" buttons; we map to API depth
  const [myColor, setMyColor] = useState('w'); // 'w' or 'b'
  const [engineLastSAN, setEngineLastSAN] = useState('');
  const [engineLastUCI, setEngineLastUCI] = useState('');
  const [engineEval, setEngineEval] = useState(null); // number | null
  const [engineMate, setEngineMate] = useState(null); // number | null

  const inFlight = useRef(null); // AbortController for API calls

  // Map your “Skill” preset to API depth (<16)
  function mapSkillToDepth(skill) {
    // 4→6, 8→8, 12→10, 16→12, 20→14 (clamped)
    const mapping = { 4: 6, 8: 8, 12: 10, 16: 12, 20: 14 };
    const depth = mapping[skill] ?? 8;
    return Math.min(15, Math.max(1, depth));
  }

  function parseBestmove(bestmoveField) {
    // Input example: "bestmove b7b6 ponder f3e5"
    if (!bestmoveField || typeof bestmoveField !== 'string') return null;
    const parts = bestmoveField.trim().split(/\s+/);
    const idx = parts.indexOf('bestmove');
    if (idx === -1 || idx === parts.length - 1) return null;
    return parts[idx + 1]; // UCI like "b7b6" or "e7e8q"
  }

  async function callEngineForBestMove() {
    try {
      if (inFlight.current) {
        inFlight.current.abort();
      }
      const controller = new AbortController();
      inFlight.current = controller;

      setEngineThinking(true);

      const fen = game.fen();
      const depth = mapSkillToDepth(engineDepthChoice);
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();

      if (!data || data.success !== true) {
        throw new Error(data && data.data ? String(data.data) : 'Engine error');
      }

      // Optional evaluation/mate
      setEngineEval(
        typeof data.evaluation === 'number' ? data.evaluation
        : typeof data.eval === 'number' ? data.eval
        : null
      );
      setEngineMate(data.mate ?? null);

      const uci = parseBestmove(data.bestmove);
      if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) {
        throw new Error('No valid bestmove from engine');
      }

      // Play the engine move on our board
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci[4];

      const res = game.move({ from, to, promotion: promo });
      if (!res) {
        // If the remote move somehow doesn't fit our board state, don’t crash.
        throw new Error(`Engine suggested illegal move: ${uci}`);
      }

      setEngineLastUCI(uci);
      setEngineLastSAN(res.san);
      pushHistorySAN(res.san);
      setLastMove({ from, to });
      setBoardKey(k => k + 1);
      setViewIndex(-1);
      requestAnimationFrame(()=>{ if(sheetRef.current) sheetRef.current.scrollTop = sheetRef.current.scrollHeight; });
    } catch (err) {
      if (err?.name === 'AbortError') {
        // silently ignore (newer request started)
      } else {
        console.error(err);
        showToast(`Engine error: ${err.message || err}`);
      }
    } finally {
      setEngineThinking(false);
    }
  }

  function maybeEngineMove() {
    const toMove = game.turn(); // 'w' or 'b'
    const engineColor = (myColor === 'w') ? 'b' : 'w';
    if (engineEnabled && toMove === engineColor && !game.isGameOver()) {
      callEngineForBestMove();
    }
  }

  // When switching sides or enabling engine, let it move if it's its turn
  useEffect(() => {
    if (engineEnabled) maybeEngineMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineEnabled, myColor, boardKey]);

  // ============================
  // Blindfold mode
  // ============================
  const [blindfold, setBlindfold] = useState(false);

  return (
    <div className={`wrap`}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div className="top" role="toolbar" aria-label="Top controls">
        <button className="btn secondary" onClick={resetAll} aria-label="Reset game">Reset</button>

        {/* Play vs Engine toggle */}
        <div className="seg" aria-label="Play vs Engine">
          <button className={engineEnabled ? 'active' : ''} onClick={()=> setEngineEnabled(true)}>Stockfish API</button>
          <button className={!engineEnabled ? 'active' : ''} onClick={()=> setEngineEnabled(false)}>Human</button>
        </div>

        {/* Side select */}
        <div className="seg" aria-label="Side select">
          <button className={myColor === 'w' ? 'active' : ''} onClick={()=> setMyColor('w')}>Play White</button>
          <button className={myColor === 'b' ? 'active' : ''} onClick={()=> setMyColor('b')}>Play Black</button>
        </div>

        {/* Engine depth (mapped from your old "Skill") */}
        <div className="seg" aria-label="Engine depth">
          <button className="active" style={{pointerEvents:'none'}}>Depth</button>
          {[4,8,12,16,20].map(s=>(
            <button key={s} className={engineDepthChoice===s?'active':''} onClick={()=> setEngineDepthChoice(s)}>{mapSkillToDepth(s)}</button>
          ))}
        </div>

        {/* Blindfold toggle */}
        <label className="toggle">
          <input type="checkbox" checked={blindfold} onChange={e=> setBlindfold(e.target.checked)} />
          Blindfold mode
        </label>
      </div>

      <div className="status" aria-live="polite">
        {status}
        {engineEnabled && engineThinking && <span className="bfSmall bfThinking">&nbsp;• engine thinking…</span>}
      </div>

      <div className="main" ref={stageRef}>
        {/* BOARD AREA (hidden in blindfold) */}
        {!blindfold ? (
          <div className="stage" style={{ ["--boardSide"]: sidePx + "px" }}>
            <div
              className="boardWrap"
              style={{ ["--light"]: themeVars.light, ["--dark"]: themeVars.dark }}
            >
              {/* Left ranks */}
              {showEdgeLabels ? (
                <div className="ranksCol left">
                  {ranksAll.map((r) => (
                    <div key={`L${r}`} className="rankLbl" style={{width:22}}>{r}</div>
                  ))}
                </div>
              ) : (<div style={{width:22}} />)}

              {/* Board frame */}
              <div className="boardOuter">
                <div className="board" role="grid" aria-label="Chessboard, white at bottom">
                  {board.map((row, r) => row.map((sq, c) => {
                    const alg = rcToAlg(r, c);
                    const file = String.fromCharCode(97 + c);
                    const rank = 8 - r;
                    const canDropHere = legalSet.has(alg);
                    const isCaptureHere = captureSet.has(alg);
                    const draggable = showPieces && sq ? (sq.color === turnColor && (!engineEnabled || myColor === turnColor)) : false;

                    const isLight = isLightSquare(file, rank);
                    const bg = isLight ? themeVars.light : themeVars.dark;
                    const isActive = lastFromTo.has(alg);

                    return (
                      <div
                        key={alg}
                        className={`square ${isActive ? 'last' : ''}`}
                        style={{ background: bg}}
                        onDragOver={(e) => { if (canDropHere) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                        onDrop={(e) => onDrop(e, alg)}
                      >
                        {/* Only show dot on empty legal target squares */}
                        {canDropHere && !sq && (
                          <div className={`dot ${isCaptureHere ? 'capture' : ''}`} />
                        )}
                        {showPieces && sq && (
                          <img
                            src={PIECE[sq.color][sq.type]}
                            alt=""
                            className={`piece ${draggable ? 'draggable' : ''}`}
                            draggable={draggable}
                            onDragStart={(e) => onDragStart(e, alg)}
                          />
                        )}
                      </div>
                    );
                  }))}
                </div>
              </div>

              {/* Bottom files */}
              {showEdgeLabels ? (
                <div className="filesRow bottom">
                  {filesAll.map((f) => (
                    <div key={`BF${f}`} className="fileLbl">{f}</div>
                  ))}
                </div>
              ) : (<div className="filesRow bottom">{Array.from({length:8}).map((_,i)=>(<div key={i} />))}</div>)}
            </div>
          </div>
        ) : (
          // Blindfold Console
          <div className="stage" style={{ ["--boardSide"]: sidePx + "px", width:'100%' }}>
            <div className="blindfoldBox" style={{ width:'min(760px, 100%)' }}>
              <div className="bfRow">
                <span className="bfBadge">Blindfold</span>
                <span className="bfSmall">Board hidden — use the input to play. You’re <b>{myColor==='w'?'White':'Black'}</b>.</span>
              </div>
              <div className="bfRow">
                <div>Engine last move:&nbsp;
                  <span className="bfMove">{engineLastSAN || '—'}</span>
                  {engineLastUCI && <span className="bfSmall">&nbsp;({engineLastUCI})</span>}
                </div>
              </div>
              <div className="bfSmall">
                {engineMate != null
                  ? <>Mate in {engineMate > 0 ? engineMate : -engineMate}</>
                  : (engineEval != null ? <>Eval {engineEval.toFixed(2)}</> : <>Eval —</>)
                }
              </div>
              <div className="bfSmall">Tip: enter SAN (e.g. <b>Bc4</b>, <b>O-O</b>) or UCI (<b>e2e4</b>, <b>e7e8q</b>). Illegal moves are rejected.</div>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        <aside className="side" ref={sideRef}>
          <h3>Moves</h3>
          <div className="row">
            <input
              className="input"
              placeholder="Enter move (e.g. Bc4, e2e4, O-O)"
              value={sanInput}
              onChange={e => setSanInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (engineEnabled && myColor !== turnColor) { showToast("It's not your turn"); return; }
                  if (moveByInput(sanInput)) setSanInput('');
                }
              }}
              aria-label="Move input"
            />
            <button className="miniBtn" onClick={() => {
              if (engineEnabled && myColor !== turnColor) { showToast("It's not your turn"); return; }
              if (moveByInput(sanInput)) setSanInput('');
            }}>Play</button>
          </div>
          <div className="row" role="group" aria-label="Toggles">
            <label className="toggle"><input type="checkbox" checked={showPieces} onChange={e => setShowPieces(e.target.checked)} /> Pieces</label>
          </div>

          <div className="sheet" role="table" aria-label="Move list" ref={sheetRef}>
            <div className="cell head">#</div>
            <div className="cell head">White</div>
            <div className="cell head">Black</div>
            {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => {
              const w = history[i * 2];
              const b = history[i * 2 + 1];
              const isActiveW = (viewIndex === i * 2) || (viewIndex === -1 && i * 2 === history.length - 1);
              const isActiveB = (viewIndex === i * 2 + 1) || (viewIndex === -1 && i * 2 + 1 === history.length - 1);
              return (
                <React.Fragment key={i}>
                  <div className="cell num">{i + 1}.</div>
                  <div className={`cell ${isActiveW ? 'activeCell' : ''}`} onClick={() => w && goToIndex(i * 2)}>{w ? w.san : ''}</div>
                  <div className={`cell ${isActiveB ? 'activeCell' : ''}`} onClick={() => b && goToIndex(i * 2 + 1)}>{b ? b.san : ''}</div>
                </React.Fragment>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Promotions modal */}
      {promoOpen && (
        <div className="promoMask" role="dialog" aria-modal="true" aria-label="Choose promotion piece" onClick={()=> setPromoOpen(false)}>
          <div className="promo" onClick={(e)=> e.stopPropagation()}>
            <h3>Promote to</h3>
            <div className="promoGrid">
              {['q','r','b','n'].map(p => (
                <button key={p} className="promoBtn" onClick={()=> confirmPromotion(p)}>
                  <img alt={p} src={PIECE[turnColor][p]} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {!!toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
