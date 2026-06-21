"use client";

import { useEffect, useState } from "react";

export default function Atmosphere() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      setIsDesktop(true);
    }

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") || 
        target.closest("a") || 
        target.closest("input") || 
        target.closest("select") || 
        target.closest("textarea") || 
        target.closest(".folder-item")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", onMouseOver);
    
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
    };
  }, []);

  return (
    <>
      {/* NOISE LAYER */}
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9997, opacity: 0.04 }}>
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
          style={{
            position: "fixed",
            top: position.y,
            left: position.x,
            width: isHovering ? "24px" : "12px",
            height: isHovering ? "24px" : "12px",
            backgroundColor: isHovering ? "transparent" : "var(--text-color)",
            border: isHovering ? "2px solid var(--text-color)" : "none",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 10000,
            transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease, border 0.15s ease, border-radius 0.15s ease",
            borderRadius: isHovering ? "0" : "50%",
          }}
        />
      )}
    </>
  );
}
