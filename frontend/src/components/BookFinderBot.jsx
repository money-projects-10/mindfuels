import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

// The wizard code loads only when someone opens the bot (keeps the first page load small)
const BookFinderWizard = lazy(() =>
  import('../pages/BookFinder.jsx').then(m => ({ default: m.BookFinderWizard }))
);

// Friendly robot that holds a book. Drawn as SVG so it stays sharp on any screen and loads instantly.
function BookBotIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* antenna */}
      <line x1="32" y1="6" x2="32" y2="13" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.5" fill="#FFD166" />
      {/* head */}
      <rect x="12" y="13" width="40" height="30" rx="12" fill="#fff" />
      {/* eyes */}
      <circle cx="24" cy="27" r="4.5" fill="#1e293b" />
      <circle cx="40" cy="27" r="4.5" fill="#1e293b" />
      <circle cx="25.5" cy="25.5" r="1.4" fill="#fff" />
      <circle cx="41.5" cy="25.5" r="1.4" fill="#fff" />
      {/* smile */}
      <path d="M24 35 Q32 41 40 35" fill="none" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
      {/* book held at the bottom */}
      <rect x="18" y="47" width="28" height="13" rx="3" fill="#FFD166" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="32" y1="47" x2="32" y2="60" stroke="#1e293b" strokeWidth="1.5" />
      <line x1="22" y1="52" x2="29" y2="52" stroke="#1e293b" strokeWidth="1.2" opacity="0.5" />
      <line x1="35" y1="52" x2="42" y2="52" stroke="#1e293b" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

// Chat-style helper in the bottom-right corner. Opens the same three questions in a small panel.
export default function BookFinderBot({ navigate, currentPath }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Not shown on the full Book Finder pages or in the admin area
  const hidden = currentPath.startsWith('/book-finder') || currentPath.startsWith('/admin');

  // Move focus into the panel when it opens; Escape closes it and returns focus to the button
  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        .bf-bot-wrap {
          position: fixed;
          right: 16px;
          bottom: 20px;
          z-index: 1400;
        }
        .bf-bot-button {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid #fff;
          background: linear-gradient(145deg, #FF7E5F, #FF5A36);
          box-shadow: 0 8px 22px rgba(255, 90, 54, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bf-bot-button:hover { transform: scale(1.06); box-shadow: 0 10px 26px rgba(255, 90, 54, 0.5); }
        .bf-bot-button:active { transform: scale(0.96); }
        .bf-bot-button:focus-visible { outline: 3px solid #1e293b; outline-offset: 3px; }
        .bf-bot-online {
          position: absolute;
          right: 4px;
          top: 4px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid #fff;
        }
        /* Name shows on hover or keyboard focus only */
        .bf-bot-label {
          position: absolute;
          right: 76px;
          top: 50%;
          transform: translateY(-50%) translateX(6px);
          background: #1e293b;
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
          padding: 8px 12px;
          border-radius: 10px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .bf-bot-wrap:hover .bf-bot-label,
        .bf-bot-button:focus-visible + .bf-bot-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .bf-bot-panel {
          position: fixed;
          right: 16px;
          bottom: 96px;
          z-index: 1400;
          width: min(380px, calc(100vw - 32px));
          max-height: min(72vh, 620px);
          overflow-y: auto;
          background: #fff;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
          padding: 16px;
        }
        .bf-bot-panel:focus { outline: none; }
        @media (max-width: 768px) {
          /* Sit above the phone's bottom navigation bar */
          .bf-bot-wrap { bottom: 84px; right: 12px; }
          .bf-bot-panel { right: 12px; left: 12px; width: auto; bottom: 160px; max-height: 60vh; }
        }
        @media (hover: none) {
          .bf-bot-wrap:hover .bf-bot-label { opacity: 0; }
        }
        /* Gentle bob to show it is alive; stopped for people who prefer less motion */
        @keyframes bf-bot-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .bf-bot-button svg { animation: bf-bot-bob 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bf-bot-button svg { animation: none; }
        }
      `}</style>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Book Finder"
          id="bf-bot-panel"
          className="bf-bot-panel"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--dark)' }}>📚 Book Finder</p>
              <p style={{ margin: '2px 0 0', color: 'var(--dark-light)', fontSize: '0.9rem' }}>
                Hi! Answer three quick questions and I'll find the right books.
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
              aria-label="Close Book Finder"
              style={{ width: '44px', height: '44px', minWidth: '44px', borderRadius: '50%', border: 'none', background: 'var(--light)', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <Suspense fallback={<p role="status" style={{ color: 'var(--dark-light)' }}>Loading…</p>}>
            <BookFinderWizard navigate={navigate} inPanel onDone={() => setOpen(false)} />
          </Suspense>
        </div>
      )}

      <div className="bf-bot-wrap">
        <button
          ref={buttonRef}
          className="bf-bot-button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close Book Finder' : 'Open Book Finder'}
          aria-expanded={open}
          aria-controls="bf-bot-panel"
        >
          <BookBotIcon />
          <span className="bf-bot-online" aria-hidden="true" />
        </button>
        {/* Visible on hover / keyboard focus; the button's aria-label is what screen readers announce */}
        <span className="bf-bot-label" aria-hidden="true">{open ? 'Close' : 'Book Finder'}</span>
      </div>
    </>
  );
}
