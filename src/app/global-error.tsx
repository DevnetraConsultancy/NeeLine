"use client";

import { useEffect } from "react";

/**
 * Fallback for an error thrown in the root layout itself, where the normal
 * error.tsx (which renders inside the layout) cannot help. It replaces the
 * whole document, so it ships its own <html>/<body> and self-contained
 * brand styling rather than relying on the app's theme or CSS variables.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          background: "#000000",
          color: "#f5f0e8",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.5, color: "#b3b3b3" }}>
            NeeLine hit an unexpected problem. Your saved data is not affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: "#d4af37",
              color: "#000000",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
