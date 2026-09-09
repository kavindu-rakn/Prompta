"use client";

import { useEffect } from "react";
import { logError } from "@/lib/errorLog";

/**
 * Catches the errors React's boundaries never see: uncaught exceptions from
 * event handlers and timers, and rejected promises nobody awaited. Renders
 * nothing. Mounted once in the root layout.
 */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logError(event.error ?? event.message, "window.error");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      logError(event.reason, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
