"use client";

import { useDeferredValue, useEffect, useMemo, useState, Suspense } from "react";
import PromptCard, { Prompt } from "@/components/PromptCard";
import PromptForm, { type PromptDraft } from "@/components/PromptForm";
import MagneticButton from "@/components/MagneticButton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { logError } from "@/lib/errorLog";
import LegalLinks from "@/components/LegalLinks";
import { useToast } from "@/components/ToastProvider";
import LandingHero from "@/components/LandingHero";
import SearchBar from "@/components/SearchBar";
import { buildHaystack, matchesTerms, parseQuery } from "@/lib/searchPrompts";
import { useSearchParams } from "next/navigation";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FolderType = { id: string; name: string };
type Share = { id: string; sender_email: string; prompts: Prompt };

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "vault";
  
  // Data States
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [inbox, setInbox] = useState<Share[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  // One state for the prompt editor, so "creating" and "editing" can never both be open.
  const [editor, setEditor] = useState<{ mode: "create" } | { mode: "edit"; prompt: Prompt } | null>(null);
  const [sendPromptId, setSendPromptId] = useState<string | null>(null);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string, type: "prompt" | "inbox" } | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Search. Each view keeps its own query, so a vault search is never silently
  // applied to the inbox when switching between them.
  const viewKey = currentView === "inbox" ? "inbox" : "vault";
  const [queries, setQueries] = useState({ vault: "", inbox: "" });
  const query = queries[viewKey];
  const setQuery = (value: string) => setQueries((current) => ({ ...current, [viewKey]: value }));

  // The input updates immediately; filtering catches up when React has time,
  // so typing stays responsive even in a large vault.
  const deferredQuery = useDeferredValue(query);
  const searchTerms = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);

  // Searchable text is built once per load, not once per keystroke.
  const promptHaystacks = useMemo(
    () => new Map(prompts.map((p) => [p.id, buildHaystack([p.title, p.content, p.attachment_name])])),
    [prompts]
  );
  const inboxHaystacks = useMemo(
    () => new Map(inbox.map((s) => [
      s.id,
      buildHaystack([s.prompts?.title, s.prompts?.content, s.prompts?.attachment_name, s.sender_email]),
    ])),
    [inbox]
  );

  // Deliberately does not flip `loading` on at the top: doing so synchronously
  // from the mount effect below causes a cascading render. `loading` already
  // starts true, and callers that re-fetch from an event handler set it
  // themselves.
  const fetchData = async (userId: string, userEmail: string) => {
    const [folderRes, promptRes, inboxRes] = await Promise.all([
      supabase.from("folders").select("*").order("created_at"),
      // Own prompts only. The SELECT policy also exposes prompts shared WITH
      // this user; those belong in the inbox view, not the vault.
      supabase
        .from("prompts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("prompt_shares")
        .select(`id, sender_email, prompts (*)`)
        .eq("receiver_email", userEmail.trim().toLowerCase())
        .order("created_at", { ascending: false }),
    ]);

    // A failed fetch used to be discarded entirely, rendering as "NO ENTRIES
    // FOUND" - indistinguishable from a genuinely empty vault. Say what
    // actually happened instead.
    const failure = folderRes.error || promptRes.error || inboxRes.error;
    if (failure) {
      logError(failure, "fetchData");
      setLoadError(true);
      toast("FAILED TO LOAD DATA", "error");
    } else {
      setLoadError(false);
    }

    if (folderRes.data) setFolders(folderRes.data);
    if (promptRes.data) setPrompts(promptRes.data);
    if (inboxRes.data) setInbox(inboxRes.data as unknown as Share[]);

    setLoading(false);
  };

  // Declared after fetchData on purpose: referencing it from an effect above
  // its own declaration is a temporal dead zone the linter rightly flags.
  useEffect(() => {
    if (user) {
      fetchData(user.id, user.email ?? "");
    }
  }, [user]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    const { data, error } = await supabase
      .from("folders")
      .insert([{ name: newFolderName.trim() }])
      .select();

    if (error || !data?.length) {
      logError(error, "handleCreateFolder");
      toast("FAILED TO CREATE DIRECTORY", "error");
      return;
    }

    setFolders([...folders, data[0]]);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleDeleteFolderClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(id);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete || !user) return;

    const { data, error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderToDelete)
      .select();

    if (error || !data?.length) {
      logError(error, "confirmDeleteFolder");
      toast("FAILED TO PURGE DIRECTORY", "error");
      setFolderToDelete(null);
      return;
    }

    setFolders(folders.filter(f => f.id !== folderToDelete));
    if (activeFolderId === folderToDelete) setActiveFolderId(null);
    setLoading(true); // Safe here - this is an event handler, not an effect.
    fetchData(user.id, user.email ?? ""); // Refresh prompts to show them in NO FOLDER
    setFolderToDelete(null);
    toast("DIRECTORY PURGED", "success");
  };

  // Both save handlers resolve false on failure rather than throwing, so the
  // form knows to keep what the user entered and discard any file it uploaded.

  const handleCreatePrompt = async (draft: PromptDraft): Promise<boolean> => {
    const upload = draft.attachment.kind === "uploaded" ? draft.attachment : null;

    const { data, error } = await supabase
      .from("prompts")
      .insert([{
        title: draft.title,
        content: draft.content,
        folder_id: draft.folderId,
        attachment_path: upload?.path ?? null,
        attachment_name: upload?.name ?? null,
      }])
      .select();

    if (error || !data?.length) {
      logError(error ?? new Error("insert returned no rows"), "handleCreatePrompt");
      toast("ERROR SAVING ENTRY", "error");
      return false;
    }

    setPrompts((current) => [data[0], ...current]);
    setEditor(null);
    toast("ENTRY SECURED", "success");
    return true;
  };

  const handleUpdatePrompt = async (original: Prompt, draft: PromptDraft): Promise<boolean> => {
    const changes: Record<string, string | null> = {
      title: draft.title,
      content: draft.content,
      folder_id: draft.folderId,
    };
    // An "unchanged" attachment is deliberately left out of the update entirely.
    if (draft.attachment.kind === "uploaded") {
      changes.attachment_path = draft.attachment.path;
      changes.attachment_name = draft.attachment.name;
    } else if (draft.attachment.kind === "removed") {
      changes.attachment_path = null;
      changes.attachment_name = null;
    }

    const { data, error } = await supabase
      .from("prompts")
      .update(changes)
      .eq("id", original.id)
      .select();

    // RLS turns an unauthorised update into zero rows with no error, which
    // would otherwise be reported as a successful save.
    if (error || !data?.length) {
      logError(error ?? new Error("update matched no rows"), "handleUpdatePrompt");
      toast("ERROR SAVING CHANGES", "error");
      return false;
    }

    // Only now is the old file unreferenced. Deleting it before the update
    // succeeded would leave a failed save pointing at a file that no longer exists.
    if (draft.attachment.kind !== "unchanged" && original.attachment_path) {
      const { error: cleanupError } = await supabase.storage
        .from("prompt_attachments")
        .remove([original.attachment_path]);
      if (cleanupError) logError(cleanupError, "attachmentCleanup");
    }

    setPrompts((current) => current.map((p) => (p.id === original.id ? data[0] : p)));
    setEditor(null);
    toast("CHANGES SECURED", "success");
    return true;
  };

  const handleDeletePromptClick = (id: string) => {
    setEntryToDelete({ id, type: "prompt" });
  };

  const handleDeleteInboxClick = (id: string) => {
    setEntryToDelete({ id, type: "inbox" });
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    if (entryToDelete.type === "prompt") {
      const target = prompts.find((p) => p.id === entryToDelete.id);

      // Remove the stored object BEFORE the row. There is no server-side
      // cleanup, so deleting the row first orphans the file in the bucket
      // permanently, with no remaining reference to find it by.
      if (target?.attachment_path) {
        const { error: storageError } = await supabase.storage
          .from("prompt_attachments")
          .remove([target.attachment_path]);
        if (storageError) logError(storageError, "attachmentCleanup");
      }

      const { data, error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", entryToDelete.id)
        .select();

      if (error || !data?.length) {
        logError(error, "deletePrompt");
        toast("PURGE FAILED", "error");
        setEntryToDelete(null);
        return;
      }

      setPrompts(prompts.filter((p) => p.id !== entryToDelete.id));
      toast("ENTRY PURGED", "success");
    } else {
      const { data, error } = await supabase
        .from("prompt_shares")
        .delete()
        .eq("id", entryToDelete.id)
        .select();

      // This previously reported success unconditionally. With no DELETE
      // policy on prompt_shares, PostgREST matched zero rows and returned no
      // error, so the item silently reappeared on the next refresh. Verify
      // that a row actually went away before claiming it did.
      if (error || !data?.length) {
        logError(error, "deleteShare");
        toast("PURGE FAILED", "error");
        setEntryToDelete(null);
        return;
      }

      setInbox(inbox.filter((s) => s.id !== entryToDelete.id));
      toast("INBOX TRANSMISSION PURGED", "success");
    }

    setEntryToDelete(null);
  };

  const handleSendPromptClick = (id: string) => {
    setSendPromptId(id);
    setReceiverEmail("");
  };

  const confirmSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendPromptId || !receiverEmail) return;
    
    if (!user?.email) {
      toast("SESSION EXPIRED - PLEASE SIGN IN AGAIN", "error");
      return;
    }

    // Both sides are lowercased. Sharing matches the receiver against the JWT
    // email as a plain string, so an uppercased address would create the row,
    // report success, and never arrive.
    const { data, error } = await supabase
      .from("prompt_shares")
      .insert([{
        prompt_id: sendPromptId,
        receiver_email: receiverEmail.trim().toLowerCase(),
        sender_email: user.email.trim().toLowerCase()
      }])
      .select();

    if (error || !data?.length) {
      logError(error ?? new Error("share insert returned no rows"), "confirmSendPrompt");

      // The database enforces these, so the messages have to be decoded here.
      const message = error?.message ?? "";
      if (error?.code === "23505") {
        toast("ALREADY SENT TO THIS RECIPIENT", "error");
      } else if (message.includes("SHARE_RATE_LIMIT_HOURLY")) {
        toast("RATE LIMIT: 20 TRANSMISSIONS PER HOUR", "error");
      } else if (message.includes("SHARE_RATE_LIMIT_DAILY")) {
        toast("RATE LIMIT: 100 TRANSMISSIONS PER DAY", "error");
      } else if (error?.code === "42501") {
        toast("NOT AUTHORIZED TO SEND THIS ENTRY", "error");
      } else {
        toast("FAILED TO SEND COMM-LINK", "error");
      }
    } else {
      toast("PROMPT SENT SUCCESSFULLY!", "success");
    }

    setSendPromptId(null);
  };

  if (authLoading) {
    return <main className="container"><h2 style={{ borderBottom: "none" }}>[ INITIALIZING SYSTEM... ]</h2></main>;
  }

  if (!user) {
    return (
      <main style={{ width: "100%", height: "calc(100vh - var(--nav-height))", position: "relative" }}>
        <style dangerouslySetInnerHTML={{ __html: `body { overflow: hidden; }` }} />
        <LandingHero />
      </main>
    );
  }

  const searching = searchTerms.length > 0;
  const matchesSearch = (p: Prompt) =>
    !searching || matchesTerms(promptHaystacks.get(p.id) ?? "", searchTerms);

  const folderPrompts = activeFolderId
    ? prompts.filter(p => p.folder_id === activeFolderId)
    : prompts;
  const filteredPrompts = folderPrompts.filter(matchesSearch);

  // Matches the active folder is hiding. Surfaced so a search inside one folder
  // never silently misses a prompt that was filed somewhere else.
  const matchesInOtherFolders = activeFolderId && searching
    ? prompts.filter(matchesSearch).length - filteredPrompts.length
    : 0;

  const receivedShares = inbox.filter((s) => s.prompts);
  const visibleShares = receivedShares.filter(
    (s) => !searching || matchesTerms(inboxHaystacks.get(s.id) ?? "", searchTerms)
  );

  const noMatchesMessage = (
    <div style={{ marginBottom: "2rem" }}>
      <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem", overflowWrap: "anywhere" }}>
        NOTHING MATCHES &ldquo;{deferredQuery.trim()}&rdquo;
        {currentView !== "inbox" && activeFolderId ? " IN THIS DIRECTORY" : ""}.
      </p>
      <button type="button" onClick={() => setQuery("")}>[ CLEAR SEARCH ]</button>
    </div>
  );

  return (
    <main className="container" style={{ maxWidth: "1200px", padding: "2rem" }}>
      
      {currentView === "inbox" ? (
        <section>
          <h2 style={{ marginBottom: "2rem" }}>[ INCOMING TRANSMISSIONS ]</h2>
          {loading ? (
            <p>SCANNING COMMS...</p>
          ) : loadError ? (
            <p style={{ opacity: 0.9, fontSize: "1.2rem", fontWeight: "bold", color: "#ff3333" }}>DATA LINK FAILURE. COULD NOT REACH THE SERVER.</p>
          ) : receivedShares.length === 0 ? (
            <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold" }}>NO INCOMING TRANSMISSIONS.</p>
          ) : (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                label="Search your inbox"
                placeholder="TITLE, CONTENT, FILE OR SENDER..."
                matchCount={visibleShares.length}
                totalCount={receivedShares.length}
              />
              {visibleShares.length === 0 ? noMatchesMessage : (
                <div className="prompt-grid">
                  {visibleShares.map((share) => (
                    <PromptCard
                      key={share.id}
                      prompt={share.prompts}
                      isInbox={true}
                      senderEmail={share.sender_email}
                      onDelete={() => handleDeleteInboxClick(share.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section>
          <MagneticButton style={{ width: "100%", marginBottom: "3rem", display: "block" }}>
            <button 
              onClick={() => setEditor({ mode: "create" })}
              style={{ width: "100%", padding: "1.5rem", fontSize: "1.2rem", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}
            >
              [ + INITIATE NEW ENTRY ]
            </button>
          </MagneticButton>

          <div className="folder-tabs">
            <div 
              className={`folder-tab ${activeFolderId === null ? "active" : ""}`}
              onClick={() => setActiveFolderId(null)}
            >
              [ ALL FOLDERS ]
            </div>
            {folders.map(folder => (
              <div 
                key={folder.id}
                className={`folder-tab ${activeFolderId === folder.id ? "active" : ""}`}
                onClick={() => setActiveFolderId(folder.id)}
              >
                <span>{folder.name}</span>
                <span onClick={(e) => handleDeleteFolderClick(folder.id, e)} style={{ opacity: 0.5, marginLeft: "0.5rem" }}><X size={14} /></span>
              </div>
            ))}
            
            {isCreatingFolder ? (
              <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  type="text" 
                  placeholder="NAME..." 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  style={{ padding: "0.2rem 0.5rem", width: "120px", border: "2px solid var(--border-color)", background: "transparent", color: "var(--text-color)", fontFamily: "inherit", textTransform: "uppercase", outline: "none" }}
                  autoFocus
                />
                <button type="button" onClick={() => setIsCreatingFolder(false)} style={{ padding: "0.2rem 0.5rem" }}>X</button>
                <button type="submit" style={{ padding: "0.2rem 0.5rem" }}>OK</button>
              </form>
            ) : (
              <div className="folder-tab" onClick={() => setIsCreatingFolder(true)}>
                [ + NEW ]
              </div>
            )}
          </div>
          
          {loading ? (
            <p>FETCHING DATA...</p>
          ) : loadError ? (
            <p style={{ opacity: 0.9, fontSize: "1.2rem", fontWeight: "bold", color: "#ff3333" }}>DATA LINK FAILURE. COULD NOT REACH THE SERVER.</p>
          ) : prompts.length === 0 ? (
            <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold" }}>NO ENTRIES FOUND IN THIS DIRECTORY.</p>
          ) : (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                label={activeFolderId ? "Search this folder" : "Search your vault"}
                placeholder="TITLE, CONTENT OR FILE NAME..."
                matchCount={filteredPrompts.length}
                totalCount={folderPrompts.length}
              />

              {matchesInOtherFolders > 0 && (
                <p style={{ marginBottom: "2rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", fontWeight: "bold", letterSpacing: "1px" }}>
                  {matchesInOtherFolders} MORE {matchesInOtherFolders === 1 ? "MATCH" : "MATCHES"} IN OTHER FOLDERS.
                  <button type="button" onClick={() => setActiveFolderId(null)}>[ SEARCH ALL FOLDERS ]</button>
                </p>
              )}

              {folderPrompts.length === 0 && !searching ? (
                <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold" }}>NO ENTRIES FOUND IN THIS DIRECTORY.</p>
              ) : filteredPrompts.length === 0 ? noMatchesMessage : (
                <div className="prompt-grid">
                  {filteredPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      onDelete={handleDeletePromptClick}
                      onSend={handleSendPromptClick}
                      onEdit={(p) => setEditor({ mode: "edit", prompt: p })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {editor && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(12px)", overflowY: "auto", padding: "2rem" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ width: "100%", maxWidth: "1000px", position: "relative" }}
            >
              <button
                onClick={() => setEditor(null)}
                style={{ position: "absolute", top: "-3rem", right: "0", background: "none", border: "none", color: "var(--border-color)", fontSize: "1.2rem", padding: "0", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold" }}
              >
                {editor.mode === "edit" ? "[ ABORT EDIT ]" : "[ ABORT ENTRY ]"} <X size={24} />
              </button>
              {/* Keyed so switching between prompts remounts the form with fresh values. */}
              <PromptForm
                key={editor.mode === "edit" ? editor.prompt.id : "new"}
                folders={folders}
                currentFolderId={activeFolderId}
                initialPrompt={editor.mode === "edit" ? editor.prompt : undefined}
                onSave={(draft) =>
                  editor.mode === "edit"
                    ? handleUpdatePrompt(editor.prompt, draft)
                    : handleCreatePrompt(draft)
                }
              />
            </motion.div>
          </div>
        )}

        {sendPromptId && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(4px)" }}>
            <motion.form 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={confirmSendPrompt}
              className="prompt-card" 
              style={{ padding: "2rem", width: "90%", maxWidth: "450px" }}
            >
              <h3 style={{ borderBottom: "none", marginBottom: "1.5rem" }}>[ INITIATE COMM-LINK ]</h3>
              <input 
                type="email" 
                className="input-field" 
                placeholder="RECEIVER EMAIL ADDRESS..." 
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
                required
                autoFocus
                style={{ marginBottom: "1.5rem" }}
              />
              <div style={{ display: "flex", gap: "1rem" }}>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="button" onClick={() => setSendPromptId(null)} style={{ width: "100%", padding: "0.8rem", backgroundColor: "var(--subtle-gray)", color: "var(--text-color)" }}>CANCEL</button>
                </MagneticButton>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="submit" style={{ width: "100%", padding: "0.8rem", backgroundColor: "var(--text-color)", color: "var(--bg-color)" }}>TRANSMIT</button>
                </MagneticButton>
              </div>
            </motion.form>
          </div>
        )}

        {folderToDelete && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(4px)" }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="prompt-card" 
              style={{ padding: "2rem", width: "90%", maxWidth: "450px" }}
            >
              <h3 style={{ borderBottom: "none", marginBottom: "1.5rem" }}>[ PURGE DIRECTORY ]</h3>
              <p style={{ marginBottom: "2rem", opacity: 0.8 }}>
                Are you sure you want to delete this folder? Prompts inside will be moved to [ ALL ENTRIES ].
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="button" onClick={() => setFolderToDelete(null)} style={{ width: "100%", padding: "0.8rem", backgroundColor: "var(--subtle-gray)", color: "var(--text-color)" }}>CANCEL</button>
                </MagneticButton>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="button" onClick={confirmDeleteFolder} style={{ width: "100%", padding: "0.8rem", backgroundColor: "#ff3333", color: "white" }}>CONFIRM</button>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        )}

        {entryToDelete && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(4px)" }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="prompt-card" 
              style={{ padding: "2rem", width: "90%", maxWidth: "450px" }}
            >
              <h3 style={{ borderBottom: "none", marginBottom: "1.5rem" }}>
                [ {entryToDelete.type === "prompt" ? "PURGE ENTRY" : "PURGE TRANSMISSION"} ]
              </h3>
              <p style={{ marginBottom: "2rem", opacity: 0.8 }}>
                Are you sure you want to delete this {entryToDelete.type === "prompt" ? "entry" : "transmission"}? This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="button" onClick={() => setEntryToDelete(null)} style={{ width: "100%", padding: "0.8rem", backgroundColor: "var(--subtle-gray)", color: "var(--text-color)" }}>CANCEL</button>
                </MagneticButton>
                <MagneticButton style={{ flex: 1 }}>
                  <button type="button" onClick={confirmDeleteEntry} style={{ width: "100%", padding: "0.8rem", backgroundColor: "#ff3333", color: "white" }}>CONFIRM</button>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LegalLinks style={{ marginTop: "5rem", paddingTop: "2rem", borderTop: "2px solid var(--border-color)" }} />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="container"><h2 style={{ borderBottom: "none" }}>[ INITIALIZING... ]</h2></main>}>
      <DashboardContent />
    </Suspense>
  );
}
