"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import MagneticButton from "./MagneticButton";
import { useEffect, useState } from "react";

const Marquee = () => {
  return (
    <div style={{ position: "absolute", bottom: "0", left: "0", width: "100vw", overflow: "hidden", whiteSpace: "nowrap", borderTop: "2px solid var(--border-color)", padding: "clamp(0.5rem, 2vh, 1rem) 0", background: "var(--bg-color)", zIndex: 1 }}>
      <motion.div
        initial={{ x: "0%" }}
        animate={{ x: "-50%" }}
        transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
        style={{ display: "inline-block", fontSize: "clamp(0.8rem, 2vw, 1.2rem)", fontWeight: 900, letterSpacing: "clamp(2px, 0.5vw, 4px)" }}
      >
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// SECURE PROMPT VAULT</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// POSTGRES LINK ESTABLISHED</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// IN-TRANSIT TLS ENCRYPTION</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// ZERO TELEMETRY</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// MAXIMUM EFFICIENCY</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// SECURE PROMPT VAULT</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// POSTGRES LINK ESTABLISHED</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// IN-TRANSIT TLS ENCRYPTION</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// ZERO TELEMETRY</span>
        <span style={{ marginRight: "clamp(1.5rem, 4vw, 4rem)" }}>/// MAXIMUM EFFICIENCY</span>
      </motion.div>
    </div>
  );
};

const Typewriter = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      >
        _
      </motion.span>
    </span>
  );
};

export default function LandingHero() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden", width: "100%" }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ maxWidth: "850px", width: "95%", marginLeft: "auto", marginRight: "auto", marginTop: 0, marginBottom: 0, zIndex: 10, position: "relative" }}
      >
        <div className="prompt-card" style={{ textAlign: "left", padding: "clamp(1.5rem, 5vw, 3rem)" }}>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", marginBottom: "1rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-2px", lineHeight: 1.1 }}>
          <Typewriter text="WELCOME TO PROMPTA" />
        </h1>
        
        <p style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)", marginBottom: "clamp(1rem, 3vh, 2rem)", opacity: 0.9, lineHeight: 1.8 }}>
          A hyper-futuristic vault for your AI prompts.
          Store, organize, and execute your most critical interactions across most popular cloud LLMs.
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.5rem, 1.5vh, 1rem)", marginBottom: "clamp(1.5rem, 4vh, 3rem)" }}>
          {[
            "Unlimited prompt length and storage limits",
            "Direct multiple file attachment support",
            "Paste to any LLM web page on one click",
            "Share your prompts with anyone who has an email"
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + (i * 0.1) }}
              style={{ display: "flex", alignItems: "center", gap: "1rem", fontWeight: "bold", fontSize: "clamp(0.85rem, 2.2vw, 1rem)" }}
            >
              <span style={{ color: "var(--text-color)" }}>[+]</span>
              <span>{item}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <Link href="/login" style={{ textDecoration: "none", display: "block" }}>
            <MagneticButton style={{ width: "100%", display: "block" }}>
              <button style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", padding: "clamp(1rem, 2.5vh, 1.5rem) clamp(1rem, 3vw, 2rem)", width: "100%", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase" }}>
                [ INITIALIZE LOGIN ]
              </button>
            </MagneticButton>
          </Link>
        </motion.div>
        </div>
      </motion.div>

      <Marquee />
    </div>
  );
}
