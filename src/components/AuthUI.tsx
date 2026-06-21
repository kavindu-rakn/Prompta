"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "./ToastProvider";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";

export default function AuthUI() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOAuth = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) toast(error.message, "error");
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (error) toast(error.message, "error");
    else toast("MAGIC LINK SENT TO YOUR EMAIL! PLEASE CHECK YOUR INBOX.", "success");
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ maxWidth: "850px", width: "95%", marginLeft: "auto", marginRight: "auto", marginTop: 0, marginBottom: 0, zIndex: 10, position: "relative" }}
    >
      <div className="prompt-card" style={{ textAlign: "left", padding: "clamp(1.5rem, 5vw, 3rem)" }}>
        <h2 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", borderBottom: "none", marginBottom: "clamp(1rem, 3vh, 2rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-2px", lineHeight: 1.1 }}>
          [ ACCESS TERMINAL ]
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "clamp(1rem, 3vh, 2rem)" }}>
          <MagneticButton style={{ width: "100%", display: "block" }}>
            <button onClick={() => handleOAuth('google')} style={{ width: "100%", fontSize: "clamp(1rem, 2.5vw, 1.2rem)", padding: "clamp(1rem, 2.5vh, 1.5rem) clamp(1rem, 3vw, 2rem)", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase" }}>[ SIGN IN WITH GOOGLE ]</button>
          </MagneticButton>
        </div>

        <hr style={{ margin: "clamp(1.5rem, 4vh, 3rem) 0", borderBottom: "2px solid var(--border-color)" }} />

        <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 3vh, 1.5rem)" }}>
          <p style={{ textAlign: "left", fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)", opacity: 0.9 }}>OR USE SECURE MAGIC LINK (EMAIL):</p>
          <input 
            type="email" 
            className="input-field" 
            placeholder="ENTER EMAIL ADDRESS..." 
            style={{ marginBottom: 0, padding: "clamp(1rem, 2vh, 1.5rem)", fontSize: "clamp(1rem, 2.5vw, 1.2rem)" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <MagneticButton style={{ width: "100%", display: "block" }}>
            <button type="submit" disabled={loading} style={{ width: "100%", fontSize: "clamp(1rem, 2.5vw, 1.2rem)", padding: "clamp(1rem, 2.5vh, 1.5rem) clamp(1rem, 3vw, 2rem)", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>
              {loading ? "TRANSMITTING..." : "[ SEND MAGIC LINK ]"}
            </button>
          </MagneticButton>
        </form>
      </div>
    </motion.div>
  );
}
