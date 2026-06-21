"use client";

import { useEffect, useState } from "react";

const BOOT_LOGS = [
  "INITIALIZING SECURE TERMINAL...",
  "ESTABLISHING CONNECTION TO NEURAL NET...",
  "BYPASSING MAINFRAME PROTOCOLS...",
  "DECRYPTING PROMPT VAULT...",
  "ACCESS GRANTED."
];

export default function BootSequence() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if we've already booted this session
    if (sessionStorage.getItem("prompta-booted")) {
      setShouldRender(false);
      return;
    }

    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < BOOT_LOGS.length) {
        setLogs(prev => [...prev, BOOT_LOGS[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsComplete(true);
          sessionStorage.setItem("prompta-booted", "true");
          setTimeout(() => setShouldRender(false), 500); // Wait for fade out
        }, 600);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  if (!shouldRender) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--bg-color)",
        color: "var(--text-color)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "2rem",
        opacity: isComplete ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(0.85, 0, 0.15, 1)",
        pointerEvents: isComplete ? "none" : "all"
      }}
    >
      {logs.map((log, index) => (
        <div key={index} style={{ marginBottom: "0.5rem", fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
          {">"} {log}
        </div>
      ))}
      {!isComplete && (
        <div style={{ animation: "blink 1s step-end infinite", fontSize: "1.2rem", marginTop: "0.5rem", fontWeight: 900 }}>
          _
        </div>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
