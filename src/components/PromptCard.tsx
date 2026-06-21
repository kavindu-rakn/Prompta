"use client";

import React, { useState } from "react";
import { Copy, Send, Trash2, X } from "lucide-react";
import MagneticButton from "./MagneticButton";
import { useToast } from "./ToastProvider";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    toast("COPIED TO CLIPBOARD", "success");
  };

  const handleAIAction = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    window.open(url, "_blank");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(prompt.id);
  };

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSend) onSend(prompt.id);
  };

  const isImage = prompt.attachment_url && prompt.attachment_name?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  const cardContent = (isModal: boolean) => (
    <div className={`prompt-card ${isModal ? 'prompt-card-full' : 'prompt-card-collapsed'}`} onClick={!isModal ? () => setIsExpanded(true) : undefined} style={!isModal ? { marginBottom: 0 } : {}}>
      <div className="prompt-header" style={{ backgroundColor: isInbox ? "var(--text-color)" : "var(--subtle-gray)", color: isInbox ? "var(--bg-color)" : "inherit", padding: "1rem 1.5rem" }}>
        <strong style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prompt.title}</strong>
        {isInbox && senderEmail && (
          <span style={{ fontSize: "0.8rem", opacity: 0.8, marginRight: "1rem" }}>FROM: {senderEmail}</span>
        )}
      </div>
      <div className="prompt-body">
        <div style={{ direction: "ltr", height: "100%" }}>
          {prompt.content}
        </div>
      </div>
      
      {isModal && prompt.attachment_url && (
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

      {isModal && (
        <div className="prompt-actions" style={{ gap: "0.5rem" }}>
          <MagneticButton><button onClick={handleCopy} title="Copy" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><Copy size={18} /></button></MagneticButton>
          <MagneticButton><button onClick={(e) => handleAIAction(e, "https://chatgpt.com/")} title="ChatGPT" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/chatgpt.svg" alt="ChatGPT" className="ai-icon" /></button></MagneticButton>
          <MagneticButton><button onClick={(e) => handleAIAction(e, "https://gemini.google.com/")} title="Gemini" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/gemini.svg" alt="Gemini" className="ai-icon" /></button></MagneticButton>
          <MagneticButton><button onClick={(e) => handleAIAction(e, "https://chat.deepseek.com/")} title="DeepSeek" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/deepseek.svg" alt="DeepSeek" className="ai-icon" /></button></MagneticButton>
          <MagneticButton><button onClick={(e) => handleAIAction(e, "https://claude.ai/")} title="Claude" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/claude.svg" alt="Claude" className="ai-icon" /></button></MagneticButton>
          <MagneticButton><button onClick={(e) => handleAIAction(e, "https://grok.com/")} title="Grok" style={{ padding: "0.6rem", display: "flex", alignItems: "center" }}><img src="/ai-icons/grok.svg" alt="Grok" className="ai-icon" /></button></MagneticButton>
          
          {!isInbox && onSend && (
            <MagneticButton style={{ marginLeft: "auto" }}>
              <button onClick={handleSend} title="Send Via Comm-Link" style={{ padding: "0.6rem", display: "flex", alignItems: "center", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>
                <Send size={18} />
              </button>
            </MagneticButton>
          )}

          {!isInbox && onDelete && (
            <MagneticButton>
              <button onClick={handleDelete} title="Purge Entry" style={{ padding: "0.6rem", display: "flex", alignItems: "center", backgroundColor: "var(--bg-color)", color: "var(--text-color)" }}>
                <Trash2 size={18} />
              </button>
            </MagneticButton>
          )}
          
          {isInbox && onDelete && (
            <MagneticButton style={{ marginLeft: "auto" }}>
              <button onClick={handleDelete} title="Purge Transmission" style={{ padding: "0.6rem", display: "flex", alignItems: "center", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>
                <Trash2 size={18} />
              </button>
            </MagneticButton>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <motion.div layoutId={`prompt-card-${prompt.id}`} style={{ height: "100%" }}>
        {cardContent(false)}
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(12px)", overflowY: "auto", padding: "2rem" }}>
            <motion.div 
              layoutId={`prompt-card-${prompt.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ width: "100%", height: "80vh", maxWidth: "1200px", position: "relative" }}
            >
              <button 
                onClick={() => setIsExpanded(false)}
                style={{ position: "absolute", top: "-3rem", right: "0", background: "none", border: "none", color: "var(--border-color)", fontSize: "1.2rem", padding: "0", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold" }}
              >
                [ ABORT REVIEW ] <X size={24} />
              </button>
              {cardContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
