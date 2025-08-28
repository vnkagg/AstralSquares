import logo from './logo.svg';
import './App.css';
import EagleEye from './eagleeye';
import MindMirage from './mindmirage';
import GhostMoves from './ghostmoves';
import SquareSniper from './squaresniper';
import PieceEndgames from './pieceendgames';
import VectorHunt from './vectorhunt';
// import React, { useState } from "react";
import './tailwind.gen.css';

import './core/theme/tokens.css'


import React, { useMemo, useState, useEffect } from "react";

// ===== Example components (replace with your real imports) =====
// import Markets from "./Markets";
// import Portfolio from "./Portfolio";
// import Screener from "./Screener";
// import News from "./News";
// import Settings from "./Settings";
// import About from "./About";

// const Mock = ({ label }) => (
//   <div className="p-6 max-w-4xl mx-auto">
//     <h2 className="text-3xl font-semibold mb-4">{label}</h2>
//     <p className="text-base leading-relaxed">
//       This is a placeholder for <span className="font-medium">{label}</span>. Replace it with your actual component import.
//     </p>
//   </div>
// );

// const ComponentA = () => <Mock label="Component A" />;
// const ComponentB = () => <Mock label="Component B" />;
// const ComponentC = () => <Mock label="Component C" />;
// const ComponentD = () => <Mock label="Component D" />;
// const ComponentE = () => <Mock label="Component E" />;
// const ComponentF = () => <Mock label="Component F" />;

// ===== Utility: nice color pairs for the 6 tiles =====
const tileGradients = [
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-400 via-orange-500 to-red-500",
  "from-blue-500 via-indigo-500 to-violet-500",
  "from-lime-400 via-green-500 to-emerald-600",
  "from-sky-400 via-blue-500 to-indigo-600",
];

// ===== Main Component =====
export default function SixPanelApp() {
  // Register your components here (title, id, and element)
  const modules = useMemo(
    () => [
      { id: "comp-a", title: "Eagle Eye", element: <EagleEye />, description: "Picture all the squares", bg: "from-emerald-500 via-teal-500 to-cyan-500" },
      { id: "comp-b", title: "Mind Mirage", element: <MindMirage /> , description: "Develop Spatial Memory for Pieces", bg: "from-blue-500 via-indigo-500 to-violet-500" },
      { id: "comp-e", title: "Square Sniper", element: <SquareSniper /> , description: "Locate the Coordinates notation", bg: "from-emerald-500 via-teal-500 to-cyan-500" },
      { id: "comp-f", title: "Vector Hunt", element: <VectorHunt /> , description: "Remove the blur, Connect the coordinates using pieces", bg: "from-blue-500 via-indigo-500 to-violet-500" },
      { id: "comp-c", title: "Ghost Moves", element: <GhostMoves /> , description: "Aakhri Padav: Literally Play Blindfold Chess", bg: "from-fuchsia-500 via-pink-500 to-rose-500" },
      { id: "comp-d", title: "Roaring Rhegar", element: <PieceEndgames /> , description: "Truly master the theoretical Endgames", bg: "from-amber-400 via-orange-500 to-red-500" },
    ],
    []
  );

  const [activeId, setActiveId] = useState(null);
  const activeIndex = modules.findIndex((m) => m.id === activeId);
  const active = activeIndex >= 0 ? modules[activeIndex] : null;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Allow ESC to exit fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setActiveId(null);
    };
    // window.addEventListener("keydown", onKey);
    // return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock background scroll when sidebar is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [sidebarOpen]);

  // Basic edge-swipe gesture (mobile):
  // - Swipe right from the left edge (~24px) to open
  // - Swipe left anywhere while open to close
  useEffect(() => {
    let startX = null;
    let startY = null;

    const onTouchStart = (e) => {
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      // Only begin open-gesture if near left edge when closed
      if (!sidebarOpen && startX > 24) {
        startX = null; // ignore gesture
      }
    };

    const onTouchMove = (e) => {
      if (startX == null || !e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      // Guard against vertical scroll triggering
      if (dy > 50) return;
      if (!sidebarOpen && dx > 50) {
        setSidebarOpen(true);
        startX = null;
      } else if (sidebarOpen && dx < -50) {
        setSidebarOpen(false);
        startX = null;
      }
    };

    const onTouchEnd = () => {
      startX = null;
      startY = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [sidebarOpen]);

  // ===== Home Grid =====
  if (!active) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <header className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Astral Squares</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Apun ko chess gawd ban ne ka hai. 1st Jan 2026 tak Blindfold chess matches khelne ke hain.</p>
        </header>

        <main className="max-w-6xl mx-auto px-4 pb-12">
          {/* 2 columns on small screens (=> 3 rows), 3 columns on larger screens (=> 2 rows) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
            {modules.map((mod, i) => (
              <button
                key={mod.id}
                onClick={() => setActiveId(mod.id)}
                className={[
                  "group relative overflow-hidden rounded-2xl shadow-lg",
                  "bg-gradient-to-br text-white",
                  mod.bg,
                  "transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 focus-visible:ring-offset-white dark:focus-visible:ring-white/50 dark:focus-visible:ring-offset-zinc-900",
                ].join(" ")}
                aria-label={`Open ${mod.title}`}
              >
                {/* Decorative blur blob */}
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />

                <div className="relative aspect-square w-full p-6">
  {/* Title centered vertically & horizontally */}
  <div className="absolute inset-0 flex items-center justify-center text-center px-4">
    <h3 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight drop-shadow-sm">
      {mod.title}
    </h3>
  </div>

  {/* Description near the bottom, subtle */}
  <p className="absolute inset-x-4 bottom-4 text-xs md:text-sm italic font-semibold text-white/70 leading-snug">
    {mod.description}
  </p>
</div>

              </button>
            ))}
          </div>
        </main>

        {/* <footer className="text-center text-xs text-zinc-500 py-6">Press Esc to go back from a module</footer> */}
      </div>
    );
  }

  // ===== Fullscreen Module Viewer =====
  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Overlay Drawer (does NOT push content) */}
      <div
        className={`fixed inset-0 z-50 ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!sidebarOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 h-full w-72 md:w-80 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-xl transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label="Modules Drawer"
          tabIndex={-1}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 md:py-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Games</h2>
            <button
              className="rounded-lg px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              Close
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {modules.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => {
                  setActiveId(m.id);
                  setSidebarOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-2 rounded-lg",
                  activeId === m.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900/40",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
                  <span className="font-medium">{m.title}</span>
                </div>
                <div className="text-xs text-zinc-500">{m.description}</div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveId(null)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label="Return to Home"
            >
              ⟵ Home
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-zinc-500">/</span>
              <span className="font-semibold">{active?.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open modules"
            >
              View Games
            </button>
          </div>
        </div>
      </div>

      {/* Content (disabled by overlay via pointer-events) */}
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm bg-white dark:bg-zinc-950">
            {active?.element}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================
   How to integrate your imports
   =============================

1) Replace the mock components at the top with your real imports, e.g.

   import Markets from "./Markets";
   import Portfolio from "./Portfolio";
   ...

2) Register them in the modules array:

   const modules = useMemo(() => [
     { id: "markets",   title: "Markets",   element: <Markets /> },
     { id: "portfolio", title: "Portfolio", element: <Portfolio /> },
     { id: "screener",  title: "Screener",  element: <Screener /> },
     { id: "news",      title: "News",      element: <News /> },
     { id: "settings",  title: "Settings",  element: <Settings /> },
     { id: "about",     title: "About",     element: <About /> },
   ], []);

3) Tailwind is used for spacing, layout, and styling. Ensure Tailwind is set up in your project.

4) Behavior:
   - Home shows a responsive 6-tile grid (2 columns → 3 rows on small screens; 3 columns → 2 rows on larger screens).
   - Tiles are equally sized squares with generous gaps and padding.
   - Clicking a tile opens a fullscreen viewer for that module.
   - In fullscreen: a module list sidebar (desktop) and a quick switcher (mobile) let users jump between modules. A Home button returns to the grid.
   - Press Esc to return to Home from any module.
*/
