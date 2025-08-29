
import React from "react";

/**
 * Generic game layout with:
 * - Optional sidebar (md+)
 * - Main content area
 * - Footer actions row
 * - Customizable headerContent (replaces title/subtitle)
 *
 * No horizontal scroll; dark/light-aware surfaces.
 */
export default function GameLayout({
  headerContent,   // <JSX> to render in the header (stats, etc.)
  sidebar = null,  // <JSX> controls; hidden on mobile by default (handled by caller)
  footer = null,   // <JSX> answer buttons row
  children,        // stage/board
}) {
  return (
    <div className="w-full min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
      {/* HEADER */}
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-4 py-3">
          {/* If headerContent provided, render it. Otherwise render nothing (no title/subtitle). */}
          {headerContent || null}
        </div>
      </header>

      {/* BODY: Sidebar (md+) + Main */}
      {/* <main className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4"> */}
      {/* <main className="mx-auto max-w-6xl px-0 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4"> */}
      {/* <main className="mx-auto max-w-6xl px-0 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4"> */}
{/* <main className="mx-auto max-w-none md:max-w-6xl px-0 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4"> */}
<main className="mx-auto max-w-none md:max-w-6xl px-0 md:px-6 py-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-4">
        {/* Sidebar (hidden at small sizes if the caller chooses) */}
        {sidebar ? (
          <aside className="order-2 md:order-1 md:sticky md:top-4 md:self-start overflow-visible">
            {sidebar}
          </aside>
        ) : null}

        {/* Stage / Board */}
        <section className={sidebar ? "order-1 md:order-2" : "col-span-1"}>
          {children}
        </section>
      </main>

      {/* FOOTER (sticky-ish spacing) */}
      {footer ? (
        <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="mx-auto max-w-6xl px-4 py-3">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}