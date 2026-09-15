"use client";

import React, { useId, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logError } from "@/lib/errorLog";

import { Save } from "lucide-react";
import MagneticButton from "./MagneticButton";
import { useToast } from "./ToastProvider";
import { useAuth } from "./AuthProvider";
import type { Prompt } from "./PromptCard";

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

// Some browsers report an empty File.type for text formats the operating system
// has no mapping for. Fall back to the extension for those, and only those.
const MIME_BY_EXTENSION: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  json: "application/json",
};

const resolveMime = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  return MIME_BY_EXTENSION[ext] ?? "";
};

/**
 * The attachment is described as a change, not a value, so an edit that never
 * touches the file cannot accidentally clear it.
 */
export type AttachmentChange =
  | { kind: "unchanged" }
  | { kind: "removed" }
  | { kind: "uploaded"; path: string; name: string };

export type PromptDraft = {
  title: string;
  content: string;
  folderId: string | null;
  attachment: AttachmentChange;
};

interface PromptFormProps {
  folders: { id: string; name: string }[];
  currentFolderId: string | null;
  /** The prompt being edited. Omit to create a new one. */
  initialPrompt?: Prompt;
  /**
   * Resolves true once the prompt is saved. On false, the form keeps everything
   * the user entered so they can retry instead of retyping it.
   */
  onSave: (draft: PromptDraft) => Promise<boolean>;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.8rem",
  fontWeight: "bold",
  letterSpacing: "2px",
  textTransform: "uppercase",
};

export default function PromptForm({ folders, currentFolderId, initialPrompt, onSave }: PromptFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const id = useId();

  const isEditing = initialPrompt !== undefined;
  const existingAttachment = initialPrompt?.attachment_path
    ? initialPrompt.attachment_name || "ATTACHMENT"
    : null;

  const [title, setTitle] = useState(initialPrompt?.title ?? "");
  const [content, setContent] = useState(initialPrompt?.content ?? "");
  const [folderId, setFolderId] = useState<string>(
    isEditing ? initialPrompt.folder_id ?? "" : currentFolderId ?? ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!ALLOWED_MIME.includes(resolveMime(picked))) {
      toast("UNSUPPORTED FILE TYPE", "error");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // `required` blocks empty fields; this catches whitespace-only ones.
    if (!title.trim() || !content.trim()) {
      toast("TITLE AND CONTENT ARE REQUIRED", "error");
      return;
    }
    if (!user) {
      toast("SESSION EXPIRED - PLEASE SIGN IN AGAIN", "error");
      return;
    }

    setSaving(true);

    let attachment: AttachmentChange = removeExisting ? { kind: "removed" } : { kind: "unchanged" };

    if (file) {
      // Scoped to the owner folder so the storage RLS policies can enforce
      // ownership by path prefix, and named with a CSPRNG rather than
      // Math.random(), which is neither unpredictable nor collision-safe.
      const ext = file.name.includes(".") ? file.name.split(".").pop() : null;
      const filePath = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage
        .from("prompt_attachments")
        .upload(filePath, file, { contentType: resolveMime(file), upsert: false });

      if (uploadError) {
        logError(uploadError, "attachmentUpload");
        toast("ERROR UPLOADING FILE!", "error");
        setSaving(false);
        return;
      }

      // Store the object path, never a public URL. Readers mint a short-lived
      // signed URL at render time instead.
      attachment = { kind: "uploaded", path: filePath, name: file.name };
    }

    const saved = await onSave({
      title,
      content,
      folderId: folderId === "" ? null : folderId,
      attachment,
    });

    if (!saved) {
      // The file this attempt uploaded is now referenced by nothing. Remove it,
      // or every failed save leaves a permanent orphan in the bucket. A retry
      // uploads it again under a fresh name.
      if (attachment.kind === "uploaded") {
        const { error: cleanupError } = await supabase.storage
          .from("prompt_attachments")
          .remove([attachment.path]);
        if (cleanupError) logError(cleanupError, "attachmentCleanup");
      }
      // Everything the user entered is still in state, so they can simply retry.
      setSaving(false);
    }
    // On success the parent closes the form, so there is nothing to reset.
  };

  const fileHintId = `${id}-file-hint`;

  return (
    <form onSubmit={handleSubmit} className="prompt-card" style={{ padding: "2.5rem" }}>
      <h3>{isEditing ? "[ EDIT ENTRY ]" : "[ INITIALIZE NEW ENTRY ]"}</h3>

      {isEditing && (
        <p style={{ marginBottom: "1.5rem", fontSize: "0.85rem", opacity: 0.7, letterSpacing: "1px" }}>
          EDITS ARE ALSO VISIBLE TO ANYONE YOU HAVE SENT THIS ENTRY TO.
        </p>
      )}

      <label htmlFor={`${id}-title`} style={labelStyle}>Title</label>
      <input
        id={`${id}-title`}
        name="title"
        type="text"
        className="input-field"
        placeholder="ENTER TITLE..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
        disabled={saving}
        style={{ marginBottom: "1.25rem", padding: "1rem" }}
      />

      <label htmlFor={`${id}-folder`} style={labelStyle}>Folder</label>
      <select
        id={`${id}-folder`}
        name="folder"
        className="input-field"
        value={folderId}
        onChange={(e) => setFolderId(e.target.value)}
        disabled={saving}
        style={{ cursor: "pointer", marginBottom: "1.25rem", padding: "1rem" }}
      >
        <option value="">[ NO FOLDER ]</option>
        {folders.map(f => (
          <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
        ))}
      </select>

      <label htmlFor={`${id}-content`} style={labelStyle}>Prompt</label>
      <textarea
        id={`${id}-content`}
        name="content"
        className="input-field"
        placeholder="INPUT PROMPT DATA..."
        rows={isEditing ? 10 : 5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={100000}
        required
        disabled={saving}
        style={{ marginBottom: "1.25rem", padding: "1rem" }}
      ></textarea>

      {existingAttachment && (
        <div style={{ marginBottom: "1rem", padding: "1rem", border: "2px dashed var(--border-color)" }}>
          <p style={{ marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", overflowWrap: "anywhere" }}>
            <strong>CURRENT FILE:</strong> {existingAttachment}
            {file ? " - WILL BE REPLACED" : removeExisting ? " - WILL BE REMOVED" : ""}
          </p>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: "bold", letterSpacing: "1px" }}>
            <input
              type="checkbox"
              name="remove_attachment"
              checked={removeExisting}
              onChange={(e) => setRemoveExisting(e.target.checked)}
              // A chosen replacement already supersedes the current file.
              disabled={saving || file !== null}
            />
            REMOVE CURRENT FILE
          </label>
        </div>
      )}

      <label htmlFor={`${id}-file`} style={labelStyle}>
        {existingAttachment ? "Replace file (optional)" : "Attach file (optional)"}
      </label>
      <input
        id={`${id}-file`}
        name="attachment"
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={handleFileChange}
        disabled={saving}
        aria-describedby={fileHintId}
        style={{ padding: "0.8rem" }}
      />
      <p id={fileHintId} style={{ marginTop: "0.4rem", marginBottom: "1.5rem", fontSize: "0.75rem", opacity: 0.6, letterSpacing: "1px" }}>
        PNG, JPEG, GIF, WEBP, PDF, TXT, MD OR JSON. UP TO 10 MB.
      </p>

      <MagneticButton style={{ width: "100%", display: "block" }}>
        <button
          type="submit"
          disabled={saving}
          style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", padding: "0.8rem", fontWeight: "bold", letterSpacing: "2px" }}
        >
          {saving ? "TRANSMITTING..." : (
            <>
              <Save size={20} aria-hidden="true" />
              {isEditing ? "[ SAVE CHANGES ]" : "[ SAVE ENTRY ]"}
            </>
          )}
        </button>
      </MagneticButton>
    </form>
  );
}
