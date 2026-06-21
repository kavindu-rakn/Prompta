"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "./ToastProvider";

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
    <div className="prompt-card" style={{ padding: "3rem", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ borderBottom: "none" }}>[ ACCESS TERMINAL ]</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
        <button onClick={() => handleOAuth('google')} style={{ width: "100%" }}>[ SIGN IN WITH GOOGLE ]</button>
      </div>

      <hr style={{ margin: "2rem 0", borderBottom: "2px solid var(--border-color)" }} />

      <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ textAlign: "left", fontSize: "0.9rem", opacity: 0.8 }}>OR USE SECURE MAGIC LINK (EMAIL):</p>
        <input 
          type="email" 
          className="input-field" 
          placeholder="ENTER EMAIL ADDRESS..." 
          style={{ marginBottom: 0 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "TRANSMITTING..." : "[ SEND MAGIC LINK ]"}
        </button>
      </form>
    </div>
  );
}
