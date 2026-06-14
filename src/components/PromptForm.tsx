"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface PromptFormProps {
  onSave: (title: string, content: string, attachmentUrl: string | null, attachmentName: string | null) => void;
}

export default function PromptForm({ onSave }: PromptFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    
    setUploading(true);
    let attachmentUrl = null;
    let attachmentName = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('prompt_attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Error uploading file!");
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from('prompt_attachments')
        .getPublicUrl(filePath);
        
      attachmentUrl = data.publicUrl;
      attachmentName = file.name;
    }

    onSave(title, content, attachmentUrl, attachmentName);
    
    setTitle("");
    setContent("");
    setFile(null);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    setUploading(false);
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
        disabled={uploading}
      />
      <textarea
        className="input-field"
        placeholder="Type your prompt here..."
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        disabled={uploading}
      ></textarea>
      
      <div style={{ marginBottom: "1rem" }}>
        <input 
          id="file-upload"
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      <button type="submit" disabled={uploading}>
        {uploading ? "Saving & Uploading..." : "Save"}
      </button>
    </form>
  );
}
