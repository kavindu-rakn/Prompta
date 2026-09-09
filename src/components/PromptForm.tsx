"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logError } from "@/lib/errorLog";

import { Save } from "lucide-react";
import MagneticButton from "./MagneticButton";
import { useToast } from "./ToastProvider";
import { useAuth } from "./AuthProvider";

// Must stay in sync with the bucket config in supabase/schema.sql. The bucket
// is the real gate - these checks exist only to fail fast with a clear message
// instead of round-tripping a doomed upload.
//
// image/svg+xml is deliberately absent: an SVG served inline is a stored-XSS
// vector. Do not add it here without also changing how attachments are served.
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface PromptFormProps {
  folders: { id: string, name: string }[];
  currentFolderId: string | null;
  onSave: (title: string, content: string, attachmentPath: string | null, attachmentName: string | null, folderId: string | null) => void;
}

export default function PromptForm({ folders, currentFolderId, onSave }: PromptFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string>(currentFolderId || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast("FILE EXCEEDS 10MB LIMIT", "error");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(picked.type)) {
      toast("UNSUPPORTED FILE TYPE", "error");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!user) {
      toast("SESSION EXPIRED - PLEASE SIGN IN AGAIN", "error");
      return;
    }

    setUploading(true);
    let attachmentPath = null;
    let attachmentName = null;

    if (file) {
      // Scoped to the owner folder so the storage RLS policies can enforce
      // ownership by path prefix, and named with a CSPRNG rather than
      // Math.random(), which is neither unpredictable nor collision-safe.
      const ext = file.name.includes(".") ? file.name.split(".").pop() : null;
      const filePath = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage
        .from('prompt_attachments')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        logError(uploadError, "attachmentUpload");
        toast("ERROR UPLOADING FILE!", "error");
        setUploading(false);
        return;
      }

      // Store the object path, never a public URL. Readers mint a short-lived
      // signed URL at render time instead.
      attachmentPath = filePath;
      attachmentName = file.name;
    }

    onSave(title, content, attachmentPath, attachmentName, folderId === "" ? null : folderId);

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
        maxLength={200}
        disabled={uploading}
        style={{ marginBottom: "1rem", padding: "1rem" }}
      />

      <select
        className="input-field"
        value={folderId}
        onChange={(e) => setFolderId(e.target.value)}
        disabled={uploading}
        style={{ cursor: "pointer", marginBottom: "1rem", padding: "1rem" }}
      >
        <option value="">[ NO FOLDER ]</option>
        {folders.map(f => (
          <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
        ))}
      </select>

      <textarea
        className="input-field"
        placeholder="INPUT PROMPT DATA..."
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={100000}
        disabled={uploading}
        style={{ marginBottom: "1rem", padding: "1rem" }}
      ></textarea>

      <div style={{ marginBottom: "1rem" }}>
        <input
          id="file-upload"
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ padding: "0.8rem" }}
        />
      </div>

      <MagneticButton style={{ width: "100%", display: "block" }}>
        <button type="submit" disabled={uploading} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "0.8rem" }} title="Save Entry">
          {uploading ? "TRANSMITTING..." : <Save size={20} />}
        </button>
      </MagneticButton>
    </form>
  );
}
