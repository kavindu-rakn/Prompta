"use client";

import React from "react";

export type Prompt = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

interface PromptCardProps {
  prompt: Prompt;
  onDelete: (id: string) => void;
}

export default function PromptCard({ prompt, onDelete }: PromptCardProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    alert("Copied to clipboard!");
  };

  const handleAIAction = async (url: string) => {
    await navigator.clipboard.writeText(prompt.content);
    window.open(url, "_blank");
  };

  return (
    <div className="prompt-card">
      <div className="prompt-header">
        <strong>{prompt.title}</strong>
        <button onClick={() => onDelete(prompt.id)}>Delete</button>
      </div>
      <div className="prompt-body">{prompt.content}</div>
      <div className="prompt-actions">
        <button onClick={handleCopy}>Copy</button>
        <button onClick={() => handleAIAction("https://chatgpt.com/")}>ChatGPT</button>
        <button onClick={() => handleAIAction("https://gemini.google.com/")}>Gemini</button>
        <button onClick={() => handleAIAction("https://chat.deepseek.com/")}>DeepSeek</button>
      </div>
    </div>
  );
}
