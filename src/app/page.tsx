"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PromptCard, { Prompt } from "@/components/PromptCard";
import PromptForm from "@/components/PromptForm";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user]);

  const fetchPrompts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompts:", error);
    } else {
      setPrompts(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (title: string, content: string, attachment_url: string | null, attachment_name: string | null) => {
    const { data, error } = await supabase
      .from("prompts")
      .insert([{ title, content, attachment_url, attachment_name }])
      .select();

    if (error) {
      console.error("Error saving prompt:", error);
      alert("ERROR SAVING ENTRY");
    } else if (data) {
      setPrompts([data[0], ...prompts]);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting prompt:", error);
      alert("ERROR DELETING ENTRY");
    } else {
      setPrompts(prompts.filter((p) => p.id !== id));
    }
  };

  if (authLoading) {
    return <main className="container"><h2 style={{ borderBottom: "none" }}>[ INITIALIZING SYSTEM... ]</h2></main>;
  }

  if (!user) {
    return (
      <main className="container" style={{ textAlign: "center", paddingTop: "5vh" }}>
        <div className="prompt-card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left", padding: "3rem" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: 900 }}>WELCOME TO PROMPTA</h1>
          <p style={{ fontSize: "1.1rem", marginBottom: "2rem", opacity: 0.9, lineHeight: 1.8 }}>
            A hyper-futuristic vault for your AI prompts.
            Store, organize, and execute your most critical interactions across ChatGPT, Gemini, and DeepSeek.
          </p>
          <ul style={{ listStyleType: "square", paddingLeft: "1.5rem", marginBottom: "3rem", fontSize: "1rem", opacity: 0.8, lineHeight: 1.8 }}>
            <li>Unlimited prompt storage limits</li>
            <li>Direct file attachment support</li>
            <li>One-click copy & execute routing</li>
            <li>Secure, encrypted personal access</li>
          </ul>
          <Link href="/login" style={{ textDecoration: "none", display: "block" }}>
            <button style={{ fontSize: "1.1rem", padding: "1rem 2rem", width: "100%" }}>
              [ JOIN PROMPTA ]
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <PromptForm onSave={handleSave} />
      
      <hr />
      
      <h2>[ SAVED ENTRIES ]</h2>
      <br />
      
      {loading ? (
        <p>FETCHING DATA...</p>
      ) : prompts.length === 0 ? (
        <p>NO ENTRIES FOUND. INITIALIZE ONE ABOVE.</p>
      ) : (
        prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} onDelete={handleDelete} />
        ))
      )}
    </main>
  );
}
