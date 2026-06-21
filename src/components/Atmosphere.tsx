"use client";

import { useEffect, useState, useRef } from "react";

export default function Atmosphere() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      setIsDesktop(true);
    }

    const onMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.closest?.("button") || 
        target?.closest?.("a") || 
        target?.closest?.("input") || 
        target?.closest?.("select") || 
        target?.closest?.("textarea") || 
        target?.closest?.(".folder-item")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseover", onMouseOver, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
    };
  }, []);

  return (
    <>
      {/* NOISE LAYER */}
      <svg className="noise-layer">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      
      {/* CRT SCANLINES */}
      <div className="crt-scanlines" />

      {/* CUSTOM BRUTALIST CURSOR */}
      {isDesktop && (
        <div 
          ref={cursorRef}
          style={{
            position: "fixed",
            top: "-100px",
            left: "-100px",
            width: isHovering ? "24px" : "12px",
            height: isHovering ? "24px" : "12px",
            backgroundColor: isHovering ? "transparent" : "var(--text-color)",
            border: isHovering ? "2px solid var(--text-color)" : "none",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 99999,
            transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, border 0.15s ease, border-radius 0.15s ease",
            borderRadius: isHovering ? "0" : "50%",
            willChange: "width, height, background-color, left, top",
          }}
        />
      )}
    </>
  );
}
