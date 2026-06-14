"use client";

import React, { useState } from "react";

interface PromptFormProps {
  onSave: (title: string, content: string) => void;
}

export default function PromptForm({ onSave }: PromptFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    onSave(title, content);
    setTitle("");
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="prompt-card" style={{ padding: "1rem" }}>
      <h3>New Prompt</h3>
      <br />
      <input
        type="text"
        className="input-field"
        placeholder="Title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
      />
      <textarea
        className="input-field"
        placeholder="Type your prompt here..."
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
      ></textarea>
      
      {/* Placeholder for future file attachments feature */}
      <div style={{ marginBottom: "1rem" }}>
        <input type="file" disabled title="File attachments coming soon!" />
        <small style={{ color: "var(--border-color)", marginLeft: "0.5rem" }}>(Attachments coming soon)</small>
      </div>

      <button type="submit">Save</button>
    </form>
  );
}
