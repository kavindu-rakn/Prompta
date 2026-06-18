"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Save } from "lucide-react";

interface PromptFormProps {
  folders: { id: string, name: string }[];
  currentFolderId: string | null;
  onSave: (title: string, content: string, attachmentUrl: string | null, attachmentName: string | null, folderId: string | null) => void;
}

export default function PromptForm({ folders, currentFolderId, onSave }: PromptFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string>(currentFolderId || "");
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
        alert("ERROR UPLOADING FILE!");
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from('prompt_attachments')
        .getPublicUrl(filePath);
        
      attachmentUrl = data.publicUrl;
      attachmentName = file.name;
    }

    onSave(title, content, attachmentUrl, attachmentName, folderId === "" ? null : folderId);
    
    setTitle("");
    setContent("");
    setFile(null);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="prompt-card" style={{ padding: "2.5rem" }}>
      <h3>[ INITIALIZE NEW ENTRY ]</h3>
      
      <input
        type="text"
        className="input-field"
        placeholder="ENTER TITLE..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        disabled={uploading}
      />
      
      <select 
        className="input-field" 
        value={folderId} 
        onChange={(e) => setFolderId(e.target.value)}
        disabled={uploading}
        style={{ cursor: "pointer" }}
      >
        <option value="">[ NO FOLDER ]</option>
        {folders.map(f => (
          <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
        ))}
      </select>

      <textarea
        className="input-field"
        placeholder="INPUT PROMPT DATA..."
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={uploading}
      ></textarea>
      
      <div style={{ marginBottom: "2rem" }}>
        <input 
          id="file-upload"
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
        />
      </div>

      <button type="submit" disabled={uploading} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "0.8rem" }} title="Save Entry">
        {uploading ? "TRANSMITTING..." : <Save size={20} />}
      </button>
    </form>
  );
}
