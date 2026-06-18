"use client";

import React from "react";

export type Prompt = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
  folder_id?: string;
};

interface PromptCardProps {
  prompt: Prompt;
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
  isInbox?: boolean;
  senderEmail?: string;
}

export default function PromptCard({ prompt, onDelete, onSend, isInbox, senderEmail }: PromptCardProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    alert("COPIED TO CLIPBOARD");
  };

  const handleAIAction = async (url: string) => {
    await navigator.clipboard.writeText(prompt.content);
    window.open(url, "_blank");
  };

  const isImage = prompt.attachment_url && prompt.attachment_name?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  return (
    <div className="prompt-card">
      <div className="prompt-header" style={{ backgroundColor: isInbox ? "var(--text-color)" : "var(--subtle-gray)", color: isInbox ? "var(--bg-color)" : "inherit" }}>
        <strong style={{ flex: 1 }}>{prompt.title}</strong>
        {isInbox && senderEmail && (
          <span style={{ fontSize: "0.8rem", opacity: 0.8, marginRight: "1rem" }}>FROM: {senderEmail}</span>
        )}
        {!isInbox && onDelete && <button onClick={() => onDelete(prompt.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>DELETE</button>}
      </div>
      <div className="prompt-body">{prompt.content}</div>
      
      {prompt.attachment_url && (
        <div style={{ padding: "0 1.5rem 1.5rem 1.5rem", borderTop: "2px solid var(--border-color)", paddingTop: "1.5rem" }}>
          <p style={{ marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            <strong>[ATTACHMENT]:</strong> <a href={prompt.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-color)", textDecoration: "underline", textUnderlineOffset: "4px" }}>{prompt.attachment_name || "DOWNLOAD"}</a>
          </p>
          {isImage && (
            <div style={{ marginTop: "1rem", maxWidth: "100%", border: "2px solid var(--border-color)", padding: "0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prompt.attachment_url} alt="Attachment Preview" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          )}
        </div>
      )}

      <div className="prompt-actions">
        <button onClick={handleCopy}>Copy</button>
        <button onClick={() => handleAIAction("https://chatgpt.com/")}>ChatGPT</button>
        <button onClick={() => handleAIAction("https://gemini.google.com/")}>Gemini</button>
        <button onClick={() => handleAIAction("https://chat.deepseek.com/")}>DeepSeek</button>
        
        {!isInbox && onSend && (
          <button onClick={() => onSend(prompt.id)} style={{ marginLeft: "auto", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>SEND VIA COMM-LINK</button>
        )}
      </div>
    </div>
  );
}
