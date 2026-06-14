"use client";

import { useEffect, useState } from "react";
import PromptCard, { Prompt } from "@/components/PromptCard";
import PromptForm from "@/components/PromptForm";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

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

  const handleSave = async (title: string, content: string) => {
    const { data, error } = await supabase
      .from("prompts")
      .insert([{ title, content }])
      .select();

    if (error) {
      console.error("Error saving prompt:", error);
      alert("Error saving prompt");
    } else if (data) {
      setPrompts([data[0], ...prompts]);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting prompt:", error);
      alert("Error deleting prompt");
    } else {
      setPrompts(prompts.filter((p) => p.id !== id));
    }
  };

  return (
    <main className="container">
      <PromptForm onSave={handleSave} />
      
      <hr style={{ margin: "2rem 0", border: "1px dashed var(--border-color)" }} />
      
      <h2>Saved Prompts</h2>
      <br />
      
      {loading ? (
        <p>Loading...</p>
      ) : prompts.length === 0 ? (
        <p>No prompts found. Add one above!</p>
      ) : (
        prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} onDelete={handleDelete} />
        ))
      )}
    </main>
  );
}
