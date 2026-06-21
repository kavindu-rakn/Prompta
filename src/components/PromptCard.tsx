import React from "react";
import { Copy, Send, Trash2 } from "lucide-react";
import MagneticButton from "./MagneticButton";
import { useToast } from "./ToastProvider";

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
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    toast("COPIED TO CLIPBOARD", "success");
  };

  const handleAIAction = async (url: string) => {
    await navigator.clipboard.writeText(prompt.content);
    window.open(url, "_blank");
  };

  const isImage = prompt.attachment_url && prompt.attachment_name?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  return (
    <div className="prompt-card">
      <div className="prompt-header" style={{ backgroundColor: isInbox ? "var(--text-color)" : "var(--subtle-gray)", color: isInbox ? "var(--bg-color)" : "inherit", padding: "1rem 1.5rem" }}>
        <strong style={{ flex: 1 }}>{prompt.title}</strong>
        {isInbox && senderEmail && (
          <span style={{ fontSize: "0.8rem", opacity: 0.8, marginRight: "1rem" }}>FROM: {senderEmail}</span>
        )}
        {!isInbox && onDelete && (
          <MagneticButton>
            <button onClick={() => onDelete(prompt.id)} title="Delete" style={{ padding: "0.4rem", display: "flex", alignItems: "center" }}>
              <Trash2 size={16} />
            </button>
          </MagneticButton>
        )}
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

      <div className="prompt-actions" style={{ gap: "0.5rem" }}>
        <MagneticButton><button onClick={handleCopy} title="Copy" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><Copy size={18} /></button></MagneticButton>
        <MagneticButton><button onClick={() => handleAIAction("https://chatgpt.com/")} title="ChatGPT" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/chatgpt.svg" alt="ChatGPT" className="ai-icon" /></button></MagneticButton>
        <MagneticButton><button onClick={() => handleAIAction("https://gemini.google.com/")} title="Gemini" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/gemini.svg" alt="Gemini" className="ai-icon" /></button></MagneticButton>
        <MagneticButton><button onClick={() => handleAIAction("https://chat.deepseek.com/")} title="DeepSeek" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/deepseek.svg" alt="DeepSeek" className="ai-icon" /></button></MagneticButton>
        <MagneticButton><button onClick={() => handleAIAction("https://claude.ai/")} title="Claude" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/claude.svg" alt="Claude" className="ai-icon" /></button></MagneticButton>
        <MagneticButton><button onClick={() => handleAIAction("https://grok.com/")} title="Grok" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/grok.svg" alt="Grok" className="ai-icon" /></button></MagneticButton>
        
        {!isInbox && onSend && (
          <MagneticButton style={{ marginLeft: "auto" }}>
            <button onClick={() => onSend(prompt.id)} title="Send Via Comm-Link" style={{ padding: "0.6rem", display: "flex", alignItems: "center", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>
              <Send size={18} />
            </button>
          </MagneticButton>
        )}
      </div>
    </div>
  );
}
