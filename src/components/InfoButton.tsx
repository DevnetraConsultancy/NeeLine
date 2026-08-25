"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function InfoButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-8 h-8 rounded-lg border border-[#c9a84c]/20 text-[#c9a84c]/50 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors flex items-center justify-center"
        title="Help & About"
      >
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="bg-[#0a1628] border border-[#c9a84c]/30 rounded-xl p-5 max-w-md w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h1
                className="text-xl font-bold tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="text-[#f5f0e8]">Nee</span>
                <span className="text-[#c9a84c]">Line</span>
              </h1>
              <p
                className="text-sm text-[#f5f0e8]/40 mt-1"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Visualize History on a Number Line
              </p>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mb-6">
              <h2
                className="text-[#c9a84c] font-semibold text-sm mb-2 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Keyboard Shortcuts
              </h2>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <kbd className="px-2 py-0.5 rounded bg-[#f5f0e8]/10 text-[#f5f0e8]/80 font-mono text-xs min-w-[40px] text-center">
                    0
                  </kbd>
                  <span>Fit all events</span>
                </div>
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <kbd className="px-2 py-0.5 rounded bg-[#f5f0e8]/10 text-[#f5f0e8]/80 font-mono text-xs min-w-[40px] text-center">
                    Click
                  </kbd>
                  <span>Add event at position</span>
                </div>
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <kbd className="px-2 py-0.5 rounded bg-[#f5f0e8]/10 text-[#f5f0e8]/80 font-mono text-xs min-w-[40px] text-center">
                    Drag
                  </kbd>
                  <span>Pan the timeline</span>
                </div>
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <kbd className="px-2 py-0.5 rounded bg-[#f5f0e8]/10 text-[#f5f0e8]/80 font-mono text-xs min-w-[40px] text-center">
                    Scroll
                  </kbd>
                  <span>Zoom in / out</span>
                </div>
              </div>
            </div>

            {/* Touch Controls */}
            <div className="mb-6">
              <h2
                className="text-[#c9a84c] font-semibold text-sm mb-3 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Touch Controls
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <span>1 finger drag</span>
                  <span>Pan</span>
                </div>
                <div className="flex justify-between items-center text-sm text-[#f5f0e8]/70">
                  <span>Pinch</span>
                  <span>Zoom</span>
                </div>
              </div>
            </div>

            {/* What You Can Do */}
            <div className="mb-6">
              <h2
                className="text-[#c9a84c] font-semibold text-sm mb-3 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Features
              </h2>
              <ul className="space-y-1.5 text-sm text-[#f5f0e8]/70">
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Create and edit timeline events with dates and descriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Switch between evenly-spaced and time-proportional layouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Toggle time-gap indicators between events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Import events from a JSON file</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Export your timeline as a PNG image</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#c9a84c]/60 mt-0.5">•</span>
                  <span>Customize colors via Timeline Settings</span>
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="border-t border-[#c9a84c]/10 pt-5">
              <h2
                className="text-[#c9a84c] font-semibold text-sm mb-3"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Contact Us
              </h2>
              <p className="text-sm text-[#f5f0e8]/60 mb-3">
                Made by <span className="text-[#f5f0e8]/80 font-medium">Devnetra Consultancy</span>
              </p>
              <div className="space-y-2 text-sm text-[#f5f0e8]/50">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#c9a84c]/50 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <a
                    href="mailto:devnetraconsultancy@gmail.com"
                    className="hover:text-[#c9a84c] transition-colors"
                  >
                    devnetraconsultancy@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#c9a84c]/50 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <a
                    href="https://www.instagram.com/scien_nee/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#c9a84c] transition-colors"
                  >
                    @scien_nee on Instagram
                  </a>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] text-sm font-medium hover:bg-[#c9a84c]/20 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
