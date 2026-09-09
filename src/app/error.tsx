"use client";

import { useEffect } from "react";
import { logError } from "@/lib/errorLog";

/**
 * Route-level error boundary. Without this, an unhandled render error shows the
 * user a blank page and tells you nothing.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, `route-error${error.digest ? `:${error.digest}` : ""}`);
  }, [error]);

  return (
    <main
      className="container"
      style={{
        minHeight: "calc(100vh - var(--nav-height))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="prompt-card" style={{ padding: "2.5rem", maxWidth: "600px", width: "100%" }}>
        <h2 style={{ borderBottom: "none", marginBottom: "1.5rem" }}>[ SYSTEM FAULT ]</h2>
        <p style={{ marginBottom: "2rem", opacity: 0.85, lineHeight: 1.7 }}>
          Something broke while rendering this view. The fault has been logged.
          Your saved entries are unaffected.
        </p>
        {error.digest && (
          <p style={{ marginBottom: "2rem", opacity: 0.6, fontSize: "0.85rem" }}>
            REFERENCE: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              flex: 1,
              minWidth: "160px",
              padding: "0.8rem",
              backgroundColor: "var(--text-color)",
              color: "var(--bg-color)",
            }}
          >
            [ RETRY ]
          </button>
          {/* A full page load, not a <Link>: if the client router itself is
              what broke, soft navigation can land right back here. */}
          <button
            onClick={() => window.location.assign("/")}
            style={{
              flex: 1,
              minWidth: "160px",
              padding: "0.8rem",
              backgroundColor: "var(--subtle-gray)",
              color: "var(--text-color)",
            }}
          >
            [ RETURN TO VAULT ]
          </button>
        </div>
      </div>
    </main>
  );
}
