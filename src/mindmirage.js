import React, { useEffect, useMemo, useRef, useState } from "react";

function MindMirage() {
  // ------- Piece art (white only; board is white-bottom) -------
  const WHITE = {
    Q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
    R: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
    B: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
    N: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  };

  // ------- Styles -------
  const CSS = `
  :root{
    --answersH: 122px;
    --boardSide: min(92vmin, calc(100vh - 240px - var(--answersH)));
    --ease: cubic-bezier(.2,.7,.2,1);
  }
  *{box-sizing:border-box}
  body{margin:0; background: radial-gradient(1200px 740px at 50% -12%, #fff 30%, #f1f5f9); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;}
  .app{min-height:100vh; color:#0f172a; display:grid; grid-template-rows:auto 1fr auto}

  /* ---------- Compact, centered top controls ---------- */
  .topWrap{ display:flex; justify-content:center; padding:16px 14px 10px; }
  .topBox{
    display:grid; gap:12px; grid-template-columns: repeat(3, minmax(280px, 1fr));
    background: rgba(255,255,255,.92); backdrop-filter: blur(10px);
    border:1px solid #e2e8f0; border-radius:18px; padding:12px;
    box-shadow: 0 10px 28px rgba(2,8,23,.08);
    max-width: 1180px;
  }
  @media (max-width: 1100px){ .topBox{ grid-template-columns:1fr } }

  .panel{ border:1px solid #e2e8f0; border-radius:14px; background:#fff; padding:10px;
          box-shadow: 0 6px 18px rgba(2,8,23,.06); transition: box-shadow .2s var(--ease), transform .16s var(--ease); }
  .panel:hover{ box-shadow: 0 10px 26px rgba(2,8,23,.10); transform: translateY(-1px); }
  .panelTitle{ font-size:12px; font-weight:900; color:#334155; letter-spacing:.8px; text-transform:uppercase; margin-bottom:8px; }

  /* Pieces panel */
  .pieceToggles{ display:flex; gap:10px; flex-wrap:wrap }
  .pToggle{
    width:62px; height:62px; border-radius:12px; border:2px solid transparent; background:#fff;
    display:grid; place-items:center; cursor:pointer;
    box-shadow: 0 8px 16px rgba(2,8,23,.10), inset 0 0 0 2px rgba(15,23,42,.06);
    transition: transform .12s var(--ease), border-color .2s var(--ease), box-shadow .2s var(--ease), opacity .2s var(--ease);
  }
  .pToggle:active{ transform: translateY(1px) scale(.99); }
  .pToggle.selected{ border-color:#10b981; box-shadow: 0 12px 20px rgba(16,185,129,.22), inset 0 0 0 2px rgba(16,185,129,.28) }
  .pIcon{ width:38px; height:38px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.18)); }

  /* Board controls panel */
  .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap }
  .chip{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:#fff; border:1px solid #e2e8f0; font-weight:800; box-shadow:0 1px 2px rgba(0,0,0,.05) }
  .step{ width:40px; height:40px; border-radius:999px; border:none; cursor:pointer; background:#fff;
    box-shadow:0 8px 14px rgba(2,8,23,.10), inset 0 0 0 2px rgba(15,23,42,.08); font-weight:900;
    transition: transform .12s var(--ease), box-shadow .2s var(--ease); }
  .step:active{ transform: translateY(1px) }
  .sizeNum{ min-width:56px; text-align:center; font-weight:900; }

  .btn{ height:40px; padding:0 14px; border:none; border-radius:12px; cursor:pointer; font-weight:900;
    background:linear-gradient(#f8fafc, #e2e8f0);
    box-shadow:0 10px 16px rgba(2,8,23,.08), inset 0 0 0 2px rgba(15,23,42,.08);
    transition: transform .12s var(--ease), box-shadow .2s var(--ease), opacity .2s var(--ease);
  }
  .btn:active{ transform: translateY(1px) }

  /* Hold buttons */
  .hold{ height:40px; padding:0 12px; border:none; border-radius:999px; background:linear-gradient(#f8fafc, #e2e8f0); font-weight:800; cursor:pointer;
    box-shadow:0 10px 16px rgba(2,8,23,.08), inset 0 0 0 2px rgba(15,23,42,.08); font-size:12px; }
  .hold:active{ transform: translateY(1px) }

  /* Game panel acts/looks like a big button */
  .gameCard{ position:relative; cursor:pointer; user-select:none; }
  .cta{
    display:grid; place-items:center; height:64px; border-radius:12px; color:#fff; font-weight:900; letter-spacing:.4px;
    background: linear-gradient(135deg, #10b981, #0ea5e9); box-shadow: 0 14px 28px rgba(2,8,23,.18), inset 0 0 0 2px rgba(255,255,255,.22);
    transition: transform .12s var(--ease), filter .2s var(--ease);
  }
  .stopping{ background: linear-gradient(135deg, #ef4444, #f59e0b); }
  .gameCard:active .cta{ transform: translateY(1px) }

  .stats{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; }
  .stat{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; text-align:center; box-shadow:0 1px 2px rgba(0,0,0,.04) }
  .sLbl{ font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.5px }
  .sVal{ font-size:22px; font-weight:900 }

  .dim{ opacity:.5; pointer-events:none }

  /* ---------- Centered Board ---------- */
  .stage{ display:grid; place-items:center; padding: 6px 14px; }
  .shell{
    width: var(--boardSide); height: var(--boardSide);
    display:grid; grid-template-columns:auto 1fr auto; grid-template-rows:auto 1fr auto; gap:10px; align-items:center; justify-items:center;
  }
  .sideLbls{ grid-row:2; display:grid; grid-template-rows:repeat(var(--n), 1fr); height:100%; }
  .botLbls{ grid-column:2; display:grid; grid-template-columns:repeat(var(--n), 1fr); width:100% }
  .lbl{ display:flex; align-items:center; justify-content:center; font-weight:900; user-select:none; color:#0f172a; transition: opacity .2s var(--ease) }

  .boardOuter{ grid-column:2; grid-row:2; width:100%; height:100%; background:#e2e8f0; padding:10px; border-radius:16px; box-shadow: inset 0 2px 8px rgba(0,0,0,.08) }
  .board{ position:relative; width:100%; height:100%; display:grid; grid-template-columns:repeat(var(--n), 1fr); grid-template-rows:repeat(var(--n), 1fr);
          border-radius:14px; overflow:hidden; background:#fff; }

  .square{ position:relative; display:flex; align-items:center; justify-content:center; transition: transform .12s var(--ease), background-color .2s var(--ease), box-shadow .2s var(--ease); }
  .sqLight{ background:#EBD3B0 }
  .sqDark{ background:#AE6B36 }

  /* ---- Target: Bounce Dot (only) ---- */
  @keyframes bounce { 0%,100%{ transform: translateY(-20%) } 50%{ transform: translateY(20%) } }
  .marker{ position:absolute; width:20%; height:20%; background:#111; border-radius:50%; border:3px solid #fff; animation: bounce .9s ease-in-out infinite; z-index:3 }

  /* ---- Pieces (reverted sizing) ---- */
  .piece{ position:relative; z-index:2; width:calc((var(--boardSide) / var(--n)) * .80); height:auto; /* larger: back to original feel */
           filter: drop-shadow(0 3px 6px rgba(0,0,0,.25));
           transition: transform .12s var(--ease), opacity .2s var(--ease), filter .2s var(--ease); }
  .halo{ position:absolute; inset:10%; border-radius:10px; box-shadow: 0 0 0 4px rgba(14,165,233,.28) inset; z-index:1; transition: opacity .2s var(--ease); }
  .dot{ width:16px; height:16px; border-radius:50%; border:2px solid #000; background: rgba(255,255,255,.86); z-index:3; }

  /* ---- Movement animation: Smooth Straight Twin Lines ---- */
  .anim{ position:absolute; inset:0; pointer-events:none; z-index:5 }
  .brush{ stroke-width:3; stroke-linecap:round; opacity:.76; filter: drop-shadow(0 1px 2px rgba(0,0,0,.14)); }
  .aPrimary{ stroke:#fff }
  .aSecondary{ stroke:#fff }
  /* ---------- Bottom answers (centered box, not full width) ---------- */
  .answersWrap{ display:flex; justify-content:center; padding:10px 14px 16px; }
  .answersBox{
    background: rgba(255,255,255,.95); border:1px solid #e2e8f0; border-radius:18px; padding:12px 16px;
    box-shadow: 0 -8px 24px rgba(2,8,23,.06); backdrop-filter: blur(8px);
    display:flex; gap:18px; justify-content:center; flex-wrap:wrap; max-width: 920px;
  }
  .answer{ width:100px; height:100px; border-radius:9999px; border:3px solid transparent; background:#fff; display:grid; place-items:center; cursor:pointer;
           box-shadow: 0 16px 28px rgba(2,8,23,.16), inset 0 0 0 2px rgba(15,23,42,.08);
           transition: transform .12s var(--ease), border-color .2s var(--ease), box-shadow .2s var(--ease); }
  .answer:active{ transform: translateY(1px) scale(.99); }
  .answer.selected{ border-color:#0ea5e9; box-shadow: 0 18px 32px rgba(14,165,233,.25), inset 0 0 0 2px rgba(14,165,233,.22); }
  .answerIcon{ width:66px; height:66px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.18)); transition: transform .12s var(--ease); }
  `;

  // ------- State -------
  const [n, setN] = useState(8);                  // 3..8
  const [sel, setSel] = useState({ Q:true, R:false, B:true, N:true });
  const selectedTypes = useMemo(()=>["Q","R","B","N"].filter(t=>sel[t]),[sel]);

  const [running, setRunning] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);

  const [positions, setPositions] = useState({});
  const [targetSq, setTarget] = useState(null);
  const [validTypesForTarget, setValidTypesForTarget] = useState(new Set());

  const [peekPieces, setPeekPieces] = useState(false);
  const [peekOcc, setPeekOcc] = useState(false);

  const [anim, setAnim] = useState(null);        // {from:[r,c], to:[r,c]}
  const [clickedAnswer, setClickedAnswer] = useState(null);
  // const [showAnim, setShowAnim] = useState(true);
  // ------- Audio -------
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

  // ------- Coords (white bottom only) -------
  const files = useMemo(()=> "abcdefghijklmnopqrstuvwxyz".slice(0,26).split(""), []);
  const fileLetters = useMemo(()=> files.slice(0, n), [files, n]);
  const displayRows = useMemo(()=> Array.from({length:n},(_,r)=>r), [n]);  // 0 top .. n-1 bottom
  const displayCols = useMemo(()=> Array.from({length:n},(_,c)=>c), [n]);  // 0 left .. n-1 right
  function isLightSquare(r, c){ return ((c + (n-1-r)) % 2) === 1; } // a1 is dark
  function label(r, c){ return `${fileLetters[c]}${n - r}`; }
  const inBounds = (r,c)=> r>=0 && c>=0 && r<n && c<n;
  const toKey = (r,c)=>`${r},${c}`;

  // ------- Move generation -------
  function occupiedSet(pos){ const s=new Set(); for(const t of Object.keys(pos)) s.add(toKey(pos[t][0], pos[t][1])); return s; }
  function slidesFrom(r,c,dirs,occ){
    const out=[]; for(const [dr,dc] of dirs){ let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){ const k=toKey(rr,cc); if(occ.has(k)) break; out.push([rr,cc]); rr+=dr; cc+=dc; } }
    return out;
  }
  function movesFor(t,r,c,occ){
    switch(t){
      case "N": { const d=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        return d.map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>inBounds(rr,cc)&&!occ.has(toKey(rr,cc))); }
      case "R": return slidesFrom(r,c,[[1,0],[-1,0],[0,1],[0,-1]],occ);
      case "B": return slidesFrom(r,c,[[1,1],[1,-1],[-1,1],[-1,-1]],occ);
      case "Q": return slidesFrom(r,c,[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],occ);
      default: return [];
    }
  }

  // ------- Random placement -------
  function distinctSquares(k){
    const used=new Set(), out=[];
    while(out.length<k){
      const r=Math.floor(Math.random()*n), c=Math.floor(Math.random()*n);
      const key=toKey(r,c); if(!used.has(key)){ used.add(key); out.push([r,c]); }
    }
    return out;
  }
  function randomizePositions(){
    const types = selectedTypes;
    const pos = {};
    if(types.length){
      const picks = distinctSquares(types.length);
      types.forEach((t,i)=>{ pos[t]=picks[i]; });
    }
    setPositions(pos);
    setTarget(null);                   // game-off => no target
    setValidTypesForTarget(new Set());
    setAnim(null);
  }
  useEffect(()=>{ if(!running) randomizePositions(); },
    // eslint-disable-next-line
    [n, sel.Q, sel.R, sel.B, sel.N]);

  // ------- Targets with "unique-reach" preference -------
  function computeTargets(pos){
    const occ=occupiedSet(pos); const map=new Map(); // "r,c" => Set(types)
    for(const t of Object.keys(pos)){
      const [r,c]=pos[t]; const legal=movesFor(t,r,c,occ);
      for(const [rr,cc] of legal){
        const k=toKey(rr,cc);
        if(!map.has(k)) map.set(k,new Set());
        map.get(k).add(t);
      }
    }
    return map;
  }
  function pickTarget(fromPos=positions){
    const map = computeTargets(fromPos);
    const entries = Array.from(map.entries());
    if(entries.length===0){ randomizePositions(); return; }
    const unique = entries.filter(([,set]) => set.size === 1);
    const pool = unique.length ? unique : entries;
    const [k, setTypes] = pool[Math.floor(Math.random()*pool.length)];
    const [r,c] = k.split(",").map(Number);
    setTarget([r,c]); setValidTypesForTarget(new Set(setTypes));
  }

  // ------- Timer -------
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

  // ------- Game flow -------
  function startGame(){
    if(running || selectedTypes.length===0) return;
    setMoves(0);
    setPeekPieces(false); setPeekOcc(false);
    setRunning(true);
    pickTarget(positions);
  }
  function stopGame(withBuzz=false){
    setRunning(false);
    if(withBuzz) bad();
    setTarget(null); // game-off => remove target highlight
  }
  function handleAnswer(t){
    if(!running || !targetSq) return;
    setClickedAnswer(t);
    setTimeout(()=>setClickedAnswer(null), 220);

    if(!validTypesForTarget.has(t)){ stopGame(true); return; }

    const from=positions[t], to=targetSq;
    setAnim({from,to}); good();
    const newPos={...positions, [t]: to};
    setPositions(newPos); setMoves(m=>m+1);
    setTimeout(()=>{ setAnim(null); pickTarget(newPos); }, 320);
  }

  // ------- Keyboard shortcuts -------
  useEffect(()=>{
    function onKeyDown(e){
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      var k = e.key.toLowerCase();

      // Hold peeks
      if (k === "p") { e.preventDefault(); setPeekPieces(true); }
      if (k === "o") { e.preventDefault(); setPeekOcc(true); }

      if (k === " ") {e.preventDefault(); !running? startGame(): stopGame(false);}

      // Piece answers (while running)
      if (!running || !targetSq) return;
      if(k === "j") k = "q"
      if(k === "k") k = "r"
      if(k === "l") k = "b"
      if(k === ";") k = "n"
      if (["q","r","b","n"].includes(k)) {
        const T = k.toUpperCase();
        if (sel[T]) { e.preventDefault(); handleAnswer(T); }
      }
    }
    function onKeyUp(e){
      const k = e.key.toLowerCase();
      if (k === "p") setPeekPieces(false);
      if (k === "o") setPeekOcc(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return ()=>{ window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [running, targetSq, sel]);

  // ------- Movement animation: Smooth Straight Twin Lines -------
  function Anim(){
    if(!anim) return null;
    const [r1,c1]=anim.from, [r2,c2]=anim.to;
    const step = 100 / n; const cx=c=>c*step + step/2; const cy=r=>r*step + step/2;
    const x1=cx(c1), y1=cy(r1), x2=cx(c2), y2=cy(r2);

    // Two parallel straight lines, slightly offset from the normal
    const nx = y2 - y1, ny = -(x2 - x1);        // perpendicular
    const len = Math.hypot(nx, ny) || 1;
    const off = 1.6;                             // softness spread
    const ux = (nx/len)*off, uy=(ny/len)*off;

    const d1 = `M ${x1+ux} ${y1+uy} L ${x2+ux} ${y2+uy}`;
    const d2 = `M ${x1-ux} ${y1-uy} L ${x2-ux} ${y2-uy}`;

    return (
      <svg className="anim" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="brush aPrimary" d={d1}>
          <animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="0.58s" fill="freeze" />
          {/* <animate attributeName="opacity" from="0.36" to="0.12" dur="0.28s" fill="freeze" /> */}
        </path>
        <path className="brush aSecondary" d={d2}>
          <animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="0.58s" fill="freeze" />
          {/* <animate attributeName="opacity" from="0.30" to="0.10" dur="0.28s" fill="freeze" /> */}
        </path>
      </svg>
    );
  }

  // ------- Render helpers -------
  const togglesLocked = running;
  const shouldShowPieces = running ? peekPieces : true;
  const shouldShowOcc    = running ? peekOcc    : false;

  return (
    <div className="app" style={{ ["--n"]: n }}>
      <style>{CSS}</style>

      {/* TOP — centered box with three panels */}
      <div className="topWrap">
        <div className="topBox">
          {/* Panel 1: Pieces */}
          <div className={`panel ${togglesLocked?'dim':''}`}>
            <div className="panelTitle">Pieces on Board</div>
            <div className="pieceToggles">
              {["Q","R","B","N"].map(t=>(
                <button key={t}
                  className={`pToggle ${sel[t] ? "selected" : ""}`}
                  onClick={()=> setSel(s=>({...s,[t]:!s[t]}))}
                  title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
                >
                  <img className="pIcon" src={WHITE[t]} alt={t} draggable="false" />
                </button>
              ))}
            </div>
          </div>
          <div className="panel">

          {/* Panel 2: Board controls */}
            <div className="panelTitle">Board Controls</div>
            <div className="row" style={{gap:12}}>
              <div className={`chip ${togglesLocked?'dim':''}`}>
                <button className="step" onClick={()=> setN(v=>Math.max(3, v-1))}>−</button>
                <div className="sizeNum">{n} × {n}</div>
                <button className="step" onClick={()=> setN(v=>Math.min(8, v+1))}>+</button>
              </div>

              <button className="btn" onClick={randomizePositions} disabled={running}>Reroll</button>

              {/* <button
                title="Animate"
                className={`pToggle ${showAnim ? "selected": ""}`}
                onClick={() => {setShowAnim(!showAnim);}}
              >A</button> */}
{/* 
              <button
                className="hold" title="Hold to peek occupied squares (O)"
                onMouseDown={()=>setPeekOcc(true)} onMouseUp={()=>setPeekOcc(false)} onMouseLeave={()=>setPeekOcc(false)}
                onTouchStart={()=>setPeekOcc(true)} onTouchEnd={()=>setPeekOcc(false)} onTouchCancel={()=>setPeekOcc(false)}
              >Hold: Occupied (O)</button> */}
            </div>
          </div>

          {/* Panel 3: Game panel — whole card is a button */}
          <div
            className="panel gameCard"
            role="button"
            tabIndex={0}
            onClick={()=> running ? stopGame(false) : startGame()}
            onKeyDown={(e)=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); running ? stopGame(false) : startGame(); } }}
            aria-pressed={running ? "true" : "false"}
            title={running ? "Stop" : "Start"}
          >
            <div className={`cta ${running?'stopping':''}`}>{running ? "■ Stop" : "▶ Start"}</div>
            <div className="stats">
              <div className="stat">
                <div className="sLbl">Moves</div>
                <div className="sVal">{moves}</div>
              </div>
              <div className="stat">
                <div className="sLbl">Time</div>
                <div className="sVal">{timeLeft}s</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER — Board */}
      <div className="stage">
        <div className="shell">
          {/* Left row labels */}
          <div className="sideLbls">
            {displayRows.map((r)=> <div key={`r${r}`} className="lbl">{n - r}</div>)}
          </div>

          {/* Board */}
          <div className="boardOuter">
            <div className="board">
              <Anim />
              {displayRows.map((r)=>
                displayCols.map((c)=>{
                  const isT = !!targetSq && r===targetSq[0] && c===targetSq[1];
                  const cls = `square ${isLightSquare(r,c)?'sqLight':'sqDark'}`;
                  const entry = Object.entries(positions).find(([, rc]) => rc[0]===r && rc[1]===c);
                  const hereType = entry?.[0];
                  return (
                    <div key={`${r},${c}`} className={cls} title={label(r,c)}>
                      {isT && <div className="marker" />}

                      {/* Occupancy peeks */}
                      {hereType && (running ? peekOcc : false) && !peekPieces && <div className="halo" />}
                      {hereType && (running ? peekOcc : false) && !peekPieces && <div className="dot" />}

                      {/* Pieces (visible when game off, or while holding peek) */}
                      {hereType && (running ? peekPieces : true) && (
                        <img className="piece" src={WHITE[hereType]} alt={hereType} draggable="false" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom column labels */}
          <div className="botLbls">
            {displayCols.map((c)=> <div key={`c${c}`} className="lbl">{fileLetters[c]}</div>)}
          </div>
        </div>
      </div>

      {/* BOTTOM — centered answers box */}
      <div className="answersWrap">
        <div className="answersBox" role="group" aria-label="Answer with the correct piece">
          {["Q","R","B","N"].filter(t=>sel[t]).map(t=>(
            <button key={t}
              className={`answer ${clickedAnswer===t ? "selected": ""}`}
              onClick={()=>handleAnswer(t)}
              disabled={!running || !targetSq}
              title={{Q:"Queen",R:"Rook",B:"Bishop",N:"Knight"}[t]}
            >
              <img className="answerIcon" src={WHITE[t]} alt={t} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


export default MindMirage;