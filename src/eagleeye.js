import React, { useEffect, useMemo, useRef, useState } from "react";

function EagleEye() {
  // ---- Configurable Themes ----
  const THEMES = {
    wooden: { light: "#EBD3B0", dark: "#AE6B36" },
    green:  { light: "#e6f4ea", dark: "#0d7a5f" },
    ice:    { light: "#eaf6ff", dark: "#2e5eaa" },
    wb:     { light: "#ffffff", dark: "#000000" },
  };

  // ---- Styles (self-contained) ----
  const styles = `
  :root {
    /* Fill space between top controls and bottom bar, avoid horizontal scroll */
    --boardSide: min(
      92vmin,
      calc(100vh - 260px - 100px - 64px),
      calc(100vw - 120px)
    );
    --mesh: #d3d3d3;
    --mesh-border: #000;
    --good: rgba(16,185,129,0.9);
    --bad: rgba(239,68,68,0.9);
    --focus-dim: rgba(0,0,0,.4);
    --focus-border: #0ea5e9;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: radial-gradient(1200px 600px at 50% -10%, #fff 30%, #f1f5f9); }
  .app { min-height: 100vh; color: #0f172a; display: grid; grid-template-rows: auto 1fr; padding-bottom: 132px; overflow-x: hidden; }
  .container { max-width: 1280px; margin: 0 auto; width: 100%; padding: 10px 18px; }

  .stage { display: grid; place-items: center; padding: 6px 14px; width: 100%; }

  /* Panels */
  .controls { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(260px, 1fr)); margin-top: 18px; }
  @media (max-width: 920px) { .controls { grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
  @media (max-width: 620px) { .controls { grid-template-columns: 1fr; } }
  .panel { background: rgba(255,255,255,.8); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; box-shadow: 0 8px 30px rgba(2,8,23,.05); display: grid; gap: 12px; align-content: start; }
  .panelTitle { font-size: 12px; font-weight: 900; letter-spacing: .8px; color: #334155; text-transform: uppercase; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .row.one { grid-template-columns: 1fr; }

  .btn { background: #059669; color: white; border: none; padding: 10px 14px; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.08); letter-spacing: .2px; }
  .btn.secondary { background: #e2e8f0; color: #0f172a; font-weight: 600; }
  .btn.destructive { background: #e11d48; }
  .btn.round { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; font-weight: 900; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  .field { display: grid; gap: 6px; }
  .label { font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: .6px; }
  .input, .select, .range { width: 100%; padding: 8px 10px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; background: white; }
  .range { padding: 6px 0; }

  /* Toggle Switch */
  .toggle { 
    display:flex; align-items:center; justify-content:space-between; gap: 12px;
    padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;
  }
  .tlabel { font-size: 14px; font-weight: 700; color:#0f172a; }
  .switch { 
    position: relative; width: 56px; height: 32px; border-radius: 9999px; 
    background: #e2e8f0; cursor: pointer; transition: background .15s ease;
  }
  .switch[aria-checked="true"] { background: #059669; }
  .switchHandle { 
    position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; 
    border-radius: 50%; background: white; box-shadow: 0 1px 2px rgba(0,0,0,.2);
    transition: transform .15s ease;
  }
  .switch[aria-checked="true"] .switchHandle { transform: translateX(24px); }

  /* Number control for n */
  .numCtrl { display:flex; align-items:center; gap:8px; }
  .numBtn { width:40px; height:40px; border-radius:999px; border:none; cursor:pointer; background:#fff;
    box-shadow:0 8px 14px rgba(2,8,23,.10), inset 0 0 0 2px rgba(15,23,42,.08); font-weight:900; }
  .numVal { min-width:60px; text-align:center; font-weight:900; padding:6px 10px; border-radius:10px; border:1px solid #e2e8f0; background:#fff; }

  /* Board (2 columns: [ranks][board]) */
  .boardWrap {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto auto;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255,255,255,.85);
    border: 1px solid #e2e8f0;
    box-shadow: 0 12px 40px rgba(2,8,23,.06);
    align-items: center;
    justify-items: center;
    margin: 0 auto;
    max-width: calc(var(--boardSide) + 70px);
    width: max-content;
  }
  .ranksCol { grid-row: 2; display: grid; height: var(--boardSide); grid-template-rows: repeat(var(--rows), 1fr); padding: 8px 0; }
  .ranksCol.left  { grid-column: 1; }
  .filesRow { display: grid; width: var(--boardSide); padding: 8px; }
  .filesRow.top    { grid-row: 1; grid-column: 2; padding-bottom: 0; }
  .filesRow.bottom { grid-row: 3; grid-column: 2; padding-top: 0; grid-template-columns: repeat(var(--cols), 1fr); }
  .rankLbl, .fileLbl { display: flex; align-items: center; justify-content: center; color: #0f172a; user-select: none; font-weight: 900; font-size: clamp(16px, 2.8vmin, 24px); letter-spacing: .3px; }

  .boardOuter { grid-row: 2; grid-column: 2; background: #e2e8f0; padding: 8px; border-radius: 16px; width: var(--boardSide); height: var(--boardSide); }
  .board { display: grid; grid-template-columns: repeat(var(--cols), 1fr); grid-template-rows: repeat(var(--rows), 1fr); border-radius: 12px; overflow: hidden; background: white; width: 100%; height: 100%; }
  .square { position: relative; display: flex; align-items: center; justify-content: center; transition: box-shadow .15s ease, background-color .15s ease, transform .08s ease; font-size: 20px; line-height: 1; user-select: none; }
  .square.targetMesh { transform: scale(1.02); }
  .square.dim::after { content: ""; position: absolute; inset: 0; background: var(--focus-dim); }
  .square.focusEdge { outline: 2px solid #0ea5e9; outline-offset: -2px; }
  .coordCenter { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0b1220; font-size: calc( (var(--boardSide) / var(--rows)) * 0.6 ); letter-spacing: .6px; text-shadow: 0 2px 0 rgba(255,255,255,.7), 0 0 10px rgba(255,255,255,.4); }
  .shadowGood { box-shadow: 0 0 0 5px var(--good) inset, 0 0 0 4px var(--good); }
  .shadowBad  { box-shadow: 0 0 0 5px var(--bad)  inset, 0 0 0 4px var(--bad); }

  /* PROMPT-ONLY (Mode 2) — big centered card with glow */
  .promptZone { width: 100%; display: grid; place-items: center; }
  .promptCard {
    width: min(900px, 96vw);
    min-height: clamp(220px, 34vmin, 420px);
    border-radius: 24px;
    background:
      radial-gradient(120% 120% at 20% -10%, rgba(255,255,255,.95), rgba(255,255,255,.88)),
      linear-gradient(135deg, rgba(14,165,233,.12), rgba(16,185,129,.12));
    border: 1px solid rgba(226,232,240,.9);
    box-shadow:
      0 20px 60px rgba(2,8,23,.12),
      inset 0 0 0 1px rgba(255,255,255,.6);
    padding: clamp(18px, 3vmin, 32px);
    display: grid;
    gap: 10px;
    place-items: center;
    text-align: center;
    animation: float 8s ease-in-out infinite;
  }
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .promptCoord {
    font-weight: 900;
    letter-spacing: .6px;
    font-size: clamp(56px, 16vmin, 148px);
    color: #0b1220;
    text-shadow: 0 2px 0 rgba(255,255,255,.7), 0 0 18px rgba(14,165,233,.25);
    line-height: 1;
  }
  .promptHint {
    margin-top: 4px;
    font-weight: 700;
    font-size: clamp(13px, 2.2vmin, 16px);
    color: #475569;
  }
  .promptBadge {
    display:inline-flex; align-items:center; gap:8px;
    padding: 6px 10px; border-radius: 999px;
    background: rgba(14,165,233,.14);
    color: #0b5394; font-weight: 800; font-size: 12px; letter-spacing:.4px;
    border: 1px solid rgba(14,165,233,.25);
  }

  /* Bottom Answer Bar */
  .answerBar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: rgba(255,255,255,.9); backdrop-filter: blur(10px); border-top: 1px solid #e2e8f0; box-shadow: 0 -12px 30px rgba(2,8,23,.08); }
  .answerWrap { max-width: 1180px; margin: 0 auto; padding: 14px 18px; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
  .answerBtns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .btnAnswer { height: 64px; border-radius: 14px; font-size: 22px; font-weight: 900; letter-spacing: .4px; border: 2px solid #0f172a; background: white; color: #0f172a; cursor: pointer; box-shadow: 0 4px 16px rgba(2,8,23,.06); }
  .btnAnswer:disabled { opacity: .45; cursor: not-allowed; }

  .actionsPanel { display: grid; gap: 14px; align-items: center; justify-items: center; }
  .statGrid { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 12px; width: 100%; }
  .statCard { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; text-align: center; box-shadow: 0 1px 2px rgba(2,8,23,.03); }
  .statLabel { font-size: 11px; font-weight: 800; letter-spacing: .5px; color: #64748b; text-transform: uppercase; }
  .statValue { font-size: 22px; font-weight: 900; color: #0f172a; }
  `;

  // ---- State ----
  const [theme, setTheme] = useState("wooden");
  const [mode, setMode] = useState(2); // you can change default to 1 if you prefer

  const [revealMode, setRevealMode] = useState("board"); // square | 2x2 | 3x3 | board
  const [revealMs, setRevealMs] = useState(900);
  const [repeatIncorrect, setRepeatIncorrect] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [duration, setDuration] = useState(100);
  const [timeLeft, setTimeLeft] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | mesh | reveal
  const [target, setTarget] = useState(null); // {r, c}
  const [lastResult, setLastResult] = useState(null); // "correct" | "incorrect" | null
  const [score, setScore] = useState(0);

  // board size & restricted sub-board
  const [boardSize, setBoardSize] = useState(8); // n (3..8)
  const [restricted, setRestricted] = useState(false);
  const [anchor, setAnchor] = useState({ file: 0, rank: 0 });

  // Audio
  const [volume] = useState(0.75);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Orientation (fixed to white for simplicity here)
  const filesAll = ["a","b","c","d","e","f","g","h"];
  const ranksAll = [1,2,3,4,5,6,7,8];
  const filesLeftToRight = filesAll;
  const ranksTopToBottom = [8,7,6,5,4,3,2,1];

  // ACTIVE RANGE
  const activeStart = restricted ? anchor : { file: 0, rank: 0 };
  const n = Math.min(Math.max(boardSize, 1), 8);

  // Render full board when restricted or n===8; else render n×n
  const renderFullBoard = restricted || n === 8;

  const viewFiles = useMemo(() => {
    if (renderFullBoard) return filesLeftToRight; // 8
    const slice = filesAll.slice(activeStart.file, activeStart.file + n);
    return slice;
  }, [renderFullBoard, filesLeftToRight, activeStart.file, n]);

  const viewRanks = useMemo(() => {
    if (renderFullBoard) return ranksTopToBottom; // 8
    const slice = ranksAll.slice(activeStart.rank, activeStart.rank + n);
    return [...slice].reverse();
  }, [renderFullBoard, ranksTopToBottom, activeStart.rank, n]);

  function fileToIndex(fileLetter) { return filesAll.indexOf(fileLetter); }
  function rankToIndex(rankNum) { return rankNum - 1; }

  function coordAtViewCell(rowIdx, colIdx) {
    const rank = viewRanks[rowIdx];
    const file = viewFiles[colIdx];
    return file + String(rank);
  }

  // a1 is dark; light if (fileIndex + rankIndex) % 2 === 1
  function isLightSquare(fileLetter, rankNum) {
    const fileIndex = fileToIndex(fileLetter);
    const rankIndex = rankToIndex(rankNum);
    return (fileIndex + rankIndex) % 2 === 1;
  }

  function validAnchor(fIdx, rIdx) { return fIdx >= 0 && rIdx >= 0 && fIdx <= 8 - n && rIdx <= 8 - n; }

  function inActiveRegionAbs(fileIdx, rankIdx) {
    return (
      fileIdx >= activeStart.file && fileIdx < activeStart.file + n &&
      rankIdx >= activeStart.rank && rankIdx < activeStart.rank + n
    );
  }

  // ---- Target picking ----
  function pickRandomTarget() {
    if (renderFullBoard) {
      const f = activeStart.file + Math.floor(Math.random() * n);
      const r = activeStart.rank + Math.floor(Math.random() * n);
      const fileLetter = filesAll[f];
      const rankNum = r + 1;
      const col = viewFiles.indexOf(fileLetter);
      const row = viewRanks.indexOf(rankNum);
      setTarget({ r: row, c: col });
    } else {
      setTarget({ r: Math.floor(Math.random() * n), c: Math.floor(Math.random() * n) });
    }
  }

  // For Mode 2 (prompt card)
  const targetCoord = target ? coordAtViewCell(target.r, target.c) : null;

  // ---- Timer ----
  useEffect(() => {
    if (!isRunning || !timerEnabled) return;
    setTimeLeft(duration);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsRunning(false);
          setPhase("idle");
          setTarget(null);
          setLastResult(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, duration, timerEnabled]);

  // ---- Start/Stop (restored) ----
  function startGame() {
    setScore(0);
    setLastResult(null);
    setIsRunning(true);
    setPhase("mesh");
    if (timerEnabled) setTimeLeft(duration);
    pickRandomTarget();
  }

  function stopGame() {
    setIsRunning(false);
    setPhase("idle");
    setTarget(null);
    setLastResult(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Reset target when settings change while running
  useEffect(() => {
    if (isRunning) pickRandomTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restricted, boardSize, anchor.file, anchor.rank]);

  // ---- Audio ----
  function ensureAudio() {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }

  function tone(freq = 440, when = 0, dur = 0.12, type = "sine", gainBase = 0.08) {
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime + when;
    const t1 = t0 + dur;
    const gval = Math.max(0.0001, gainBase * Math.min(1, Math.max(0, volume)));
    g.gain.setValueAtTime(gval, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  }

  function playFeedback(correct) {
    ensureAudio();
    const base = 0;
    if (correct) {
      tone(660, base + 0.00, 0.10, "sine", 0.08);
      tone(880, base + 0.10, 0.12, "sine", 0.08);
    } else {
      tone(220, base + 0.00, 0.10, "square", 0.07);
      tone(160, base + 0.09, 0.14, "square", 0.07);
    }
  }

  // ---- Answer handling ----
  function submitAnswer(choice) {
    if (phase !== "mesh" || !target) return;

    const coord = targetCoord;
    const file = coord[0];
    const rank = parseInt(coord.slice(1), 10);
    const light = isLightSquare(file, rank);
    const correct = (choice === "light" && light) || (choice === "dark" && !light);

    setLastResult(correct ? "correct" : "incorrect");
    setScore((s) => s + (correct ? 1 : 0));
    playFeedback(correct);

    setPhase("reveal");
    const delay = Math.max(100, revealMs);
    setTimeout(() => {
      if (!isRunning) return;
      if (!correct && repeatIncorrect) {
        setPhase("mesh");
        setLastResult(null);
      } else {
        setPhase("mesh");
        setLastResult(null);
        pickRandomTarget();
      }
    }, delay);
  }

  // ---- Reveal patch logic (Mode 1) ----
  function inRevealPatch(rowIdx, colIdx) {
    if (!target) return false;
    if (revealMode === "board") return true;
    if (revealMode === "square") return rowIdx === target.r && colIdx === target.c;
    if (revealMode === "2x2") {
      const r0 = Math.min(target.r, (renderFullBoard?7:n-1));
      const c0 = Math.min(target.c, (renderFullBoard?7:n-1));
      const r1 = Math.min(r0 + 1, (renderFullBoard?7:n-1));
      const c1 = Math.min(c0 + 1, (renderFullBoard?7:n-1));
      return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
    }
    const r0 = Math.max(0, target.r - 1);
    const c0 = Math.max(0, target.c - 1);
    const r1 = Math.min((renderFullBoard?7:n-1), target.r + 1);
    const c1 = Math.min((renderFullBoard?7:n-1), target.c + 1);
    return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
  }

  // ---- Square rendering helper ----
  function squareVisual(rowIdx, colIdx) {
    const coord = coordAtViewCell(rowIdx, colIdx);
    const file = coord[0];
    const rank = parseInt(coord.slice(1), 10);
    const light = isLightSquare(file, rank);

    const isTarget = target && target.r === rowIdx && target.c === colIdx;
    const { light: lightCol, dark: darkCol } = THEMES[theme];

    let bg;
    let border = (phase !== "idle") ? `1px solid var(--mesh-border)` : "none";

    if (phase === "idle") {
      bg = light ? lightCol : darkCol;
    } else if (phase === "mesh") {
      bg = isTarget ? "#9ca3af" : "var(--mesh)";
    } else {
      const showColor = revealMode === "board" ? true : inRevealPatch(rowIdx, colIdx);
      bg = showColor ? (light ? lightCol : darkCol) : "var(--mesh)";
    }

    let shadow = "";
    if (phase === "reveal" && isTarget) {
      shadow = lastResult === "correct" ? "shadowGood" : "shadowBad";
    }
    const extraClass = phase === "mesh" && isTarget ? "targetMesh" : "";

    const fileIdxAbs = fileToIndex(file);
    const rankIdxAbs = rankToIndex(rank);
    const inside = inActiveRegionAbs(fileIdxAbs, rankIdxAbs);

    const classes = ["square", shadow, extraClass, (restricted && !inside) ? "dim" : ""];
    if (restricted && inside) {
      const left = fileIdxAbs === activeStart.file;
      const right = fileIdxAbs === activeStart.file + n - 1;
      const bottom = rankIdxAbs === activeStart.rank;
      const top = rankIdxAbs === activeStart.rank + n - 1;
      if (left || right || top || bottom) classes.push("focusEdge");
    }

    return { bg, border, classes: classes.join(" ") };
  }

  // --- Anchor click (restricted mode) ---
  function handleSquareClick(rowIdx, colIdx) {
    if (!restricted) return;
    const coord = coordAtViewCell(rowIdx, colIdx);
    const fIdx = fileToIndex(coord[0]);
    const rIdx = rankToIndex(parseInt(coord.slice(1), 10));
    if (validAnchor(fIdx, rIdx)) {
      setAnchor({ file: fIdx, rank: rIdx });
      if (isRunning) pickRandomTarget();
    }
  }

  // ---- Keyboard shortcuts ----
  function isTypingInEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    const editable = el.isContentEditable;
    return editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (isTypingInEditable(e.target)) return;

      const k = e.key.toLowerCase();

      // Space -> start/stop
      if (k === " ") {
        e.preventDefault();
        isRunning ? stopGame() : startGame();
        return;
      }

      // Answering during mesh
      const canAnswer = isRunning && phase === "mesh";
      if (canAnswer && (k === "l" || e.key === "ArrowLeft")) {
        e.preventDefault(); submitAnswer("light"); return;
      }
      if (canAnswer && (k === "d" || e.key === "ArrowRight")) {
        e.preventDefault(); submitAnswer("dark"); return;
      }

      // Board size (only when stopped)
      if (!isRunning && (k === "[" || k === "]")) {
        e.preventDefault();
        setBoardSize((cur) => (k === "[" ? Math.max(3, cur - 1) : Math.min(8, cur + 1)));
        return;
      }

      // Reveal mode 1/2/3/4
      if (["1","2","3","4"].includes(k)) {
        e.preventDefault();
        const map = { "1":"square", "2":"2x2", "3":"3x3", "4":"board" };
        setRevealMode(map[k]);
        return;
      }

      // Theme cycle (t)
      if (k === "t") {
        e.preventDefault();
        const order = ["wooden","green","ice","wb"];
        setTheme((cur) => order[(order.indexOf(cur) + 1) % order.length]);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, phase]);

  // ---- JSX ----
  const themeVars = THEMES[theme] || THEMES.green;
  const answerLightStyle = { background: themeVars.light, borderColor: "#059669", color: "#065f46" };
  const answerDarkStyle  = { background: themeVars.dark,  borderColor: "#0ea5e9", color: "#0c4a6e" };

  const rows = renderFullBoard ? 8 : n;
  const cols = renderFullBoard ? 8 : n;

  return (
    <div className="app">
      <style>{styles}</style>

      <div className="container">
        {/* Controls (usable in both modes) */}
        <div className="controls">
          {/* Gameplay */}
          <div className="panel">
            <div className="panelTitle">Gameplay</div>
            <div className="row one">
              <div className="field">
                <label className="label" htmlFor="mode">Mode</label>
                <select id="mode" className="select" value={mode} onChange={(e)=>setMode(Number(e.target.value))}>
                  <option value={1}>Mode 1 — Board visible</option>
                  <option value={2}>Mode 2 — Prompt only</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                {/* <label className="label">Repeat Wrong</label>
                <div className="toggle" onClick={()=>setRepeatIncorrect(v=>!v)} role="switch" aria-checked={repeatIncorrect}>
                  <span className="tlabel">{repeatIncorrect ? "On" : "Off"}</span>
                  <div className="switch" aria-checked={repeatIncorrect ? "true" : "false"}>
                    <div className="switchHandle" />
                  </div>
                </div> */}
              </div>

              
            </div>

            {/* Reveal length – visible & usable in both modes */}
            <div className="row">
              <div className="field">
                <label className="label" htmlFor="revealLen">Reveal length (ms)</label>
                <input
                  id="revealLen"
                  className="range"
                  type="range"
                  min={300}
                  max={2000}
                  step={50}
                  value={revealMs}
                  onChange={(e) => setRevealMs(Number(e.target.value))}
                />
                <div style={{fontSize:12, color:"#475569"}}><b>{revealMs} ms</b></div>
              </div>
              <div className="field">
                <label className="label" htmlFor="revealMode">Reveal Mode</label>
                <select id="revealMode" className="select" value={revealMode} onChange={(e) => setRevealMode(e.target.value)}>
                  <option value="square">Only selected square</option>
                  <option value="2x2">2×2 patch (from target)</option>
                  <option value="3x3">3×3 patch (centered)</option>
                  <option value="board">Full board</option>
                </select>
              </div>
            </div>
          </div>

          {/* Board controls – usable in Mode 2 as well */}
          <div className="panel">
            <div className="panelTitle">Board</div>
            <div className="row one">
              
              <div className="field">
                {/* <label className="label">Timer</label> */}
                {/* <div className="toggle" onClick={()=>setTimerEnabled(v=>!v)} role="switch" aria-checked={timerEnabled}>
                  <span className="tlabel">{timerEnabled ? "On" : "Off"}</span>
                  <div className="switch" aria-checked={timerEnabled ? "true" : "false"}>
                    <div className="switchHandle" />
                  </div>
                </div> */}
                {/* {timerEnabled && (
                  <input
                    className="range"
                    type="range"
                    min={10}
                    max={300}
                    step={5}
                    value={duration}
                    onChange={(e)=>setDuration(Number(e.target.value))}
                    title="Round duration (s)"
                  />
                )} */}
              </div>
              <div className="field">
                <label className="label" htmlFor="theme">Theme</label>
                <select id="theme" className="select" value={theme} onChange={(e)=>setTheme(e.target.value)}>
                  <option value="wooden">Wooden</option>
                  <option value="green">Green</option>
                  <option value="ice">Ice</option>
                  <option value="wb">White / Black</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label className="label">Board Size (n×n)</label>
                <div className="numCtrl">
                  <button
                    className="numBtn"
                    onClick={()=>{
                      const newN = Math.max(3, boardSize - 1);
                      setBoardSize(newN);
                      if (!validAnchor(anchor.file, anchor.rank)) {
                        setAnchor({ file: Math.min(anchor.file, 8 - newN), rank: Math.min(anchor.rank, 8 - newN) });
                      }
                    }}
                  >−</button>
                  <div className="numVal">{boardSize}×{boardSize}</div>
                  <button
                    className="numBtn"
                    onClick={()=>{
                      const newN = Math.min(8, boardSize + 1);
                      setBoardSize(newN);
                      if (!validAnchor(anchor.file, anchor.rank)) {
                        setAnchor({ file: Math.min(anchor.file, 8 - newN), rank: Math.min(anchor.rank, 8 - newN) });
                      }
                    }}
                  >+</button>
                </div>
              </div>
              <div className="field">
                <label className="label">Restricted</label>
                <div className="toggle" onClick={()=>setRestricted(v=>!v)} role="switch" aria-checked={restricted}>
                  <span className="tlabel">{restricted ? "On" : "Off"}</span>
                  <div className="switch" aria-checked={restricted ? "true" : "false"}>
                    <div className="switchHandle" />
                  </div>
                </div>
              </div>
            </div>

            
          </div>

          {/* Actions */}
          <div className="panel">
            <div className="panelTitle">Actions</div>
            <div className="actionsPanel">
              {!isRunning ? (
                <button className="btn round" onClick={startGame} title="Start">Start</button>
              ) : (
                <button className="btn round destructive" onClick={stopGame}>Stop</button>
              )}

              <div className="statGrid">
                <div className="statCard">
                  <div className="statLabel">Time</div>
                  <div className="statValue">{timerEnabled ? `${timeLeft}s` : "∞"}</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Score</div>
                  <div className="statValue">{score}</div>
                </div>
              </div>
            </div>
          </div> 
        </div>

        {/* Center Stage */}
        <div className="stage">
          {mode === 1 ? (
            <div
              className="boardWrap"
              style={{
                ["--light"]: (THEMES[theme] || THEMES.green).light,
                ["--dark"]: (THEMES[theme] || THEMES.green).dark,
                ["--rows"]: renderFullBoard?8:n,
                ["--cols"]: renderFullBoard?8:n
              }}
            >
              {/* left ranks */}
              <div className="ranksCol left">
                {viewRanks.map((r) => (
                  <div key={`L${r}`} className="rankLbl" style={{width: 22}}>{r}</div>
                ))}
              </div>

              <div className="boardOuter">
                <div className="board">
                  {viewRanks.map((rank, rowIdx) =>
                    viewFiles.map((file, colIdx) => {
                      const { bg, border, classes } = squareVisual(rowIdx, colIdx);
                      const key = file + rank;
                      return (
                        <div
                          key={key}
                          className={classes}
                          style={{ background: bg, border }}
                          onClick={() => handleSquareClick(rowIdx, colIdx)}
                        >
                          {target && target.r === rowIdx && target.c === colIdx && phase === "mesh" && (
                            <span className="coordCenter">{file}{rank}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* bottom files */}
              <div className="filesRow bottom">
                {viewFiles.map((f) => (
                  <div key={`BF${f}`} className="fileLbl">{f}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="promptZone">
              <div className="promptCard" role="region" aria-label="Prompt only">
                {phase === "mesh" && (
                  <>
                    <div className="promptCoord">{targetCoord ?? "e4"}</div>
                    <div className="promptHint">
                      Press <span className="promptBadge">L ← / D →</span> or use the buttons below
                    </div>
                  </>
                )}
                {phase === "reveal" && (
                  <div className="promptHint" style={{color: lastResult === "correct" ? "#059669" : "#e11d48"}}>
                    {lastResult === "correct" ? "Correct" : "Wrong"}
                  </div>
                )}
                {phase === "idle" && (
                  <>
                    <div className="promptCoord">Ready?</div>
                    <div className="promptHint">Press <span className="promptBadge">Start</span> to begin.</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Answer Bar */}
      <div className="answerBar" aria-live="polite">
        <div className="answerWrap">
          <div className="answerBtns" role="group" aria-label="Choose square color">
            <button className="btnAnswer" style={answerDarkStyle} onClick={() => submitAnswer("dark")} disabled={!isRunning || phase !== "mesh"}>Dark</button>
            <button className="btnAnswer" style={answerLightStyle} onClick={() => submitAnswer("light")} disabled={!isRunning || phase !== "mesh"}>Light</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EagleEye;