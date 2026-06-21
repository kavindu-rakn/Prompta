"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import PromptCard, { Prompt } from "@/components/PromptCard";
import PromptForm from "@/components/PromptForm";
import MagneticButton from "@/components/MagneticButton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import LandingHero from "@/components/LandingHero";
import { useSearchParams } from "next/navigation";

import { Folder, Inbox, X, Plus } from "lucide-react";
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
  const [isWritingPrompt, setIsWritingPrompt] = useState(false);
  const [sendPromptId, setSendPromptId] = useState<string | null>(null);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string, type: "prompt" | "inbox" } | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Folders
    const { data: folderData } = await supabase.from("folders").select("*").order("created_at");
    if (folderData) setFolders(folderData);
    
    // Fetch Prompts (Only owned by the user)
    const { data: promptData } = await supabase
      .from("prompts")
      .select("*")
      .eq("user_id", user?.id || "")
      .order("created_at", { ascending: false });
    if (promptData) setPrompts(promptData);
    
    // Fetch Inbox (Only received by the user)
    const { data: inboxData, error: inboxError } = await supabase
      .from("prompt_shares")
      .select(`id, sender_email, prompts (*)`)
      .eq("receiver_email", user?.email || "")
      .order("created_at", { ascending: false });
      
    if (inboxError) {
      console.error("Inbox Error:", inboxError);
    } else if (inboxData) {
      setInbox(inboxData as unknown as Share[]);
    }

    setLoading(false);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    const { data, error } = await supabase
      .from("folders")
      .insert([{ name: newFolderName }])
      .select();
      
    if (!error && data) {
      setFolders([...folders, data[0]]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolderClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(id);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    await supabase.from("folders").delete().eq("id", folderToDelete);
    setFolders(folders.filter(f => f.id !== folderToDelete));
    if (activeFolderId === folderToDelete) setActiveFolderId(null);
    fetchData(); // Refresh prompts to show them in NO FOLDER
    setFolderToDelete(null);
    toast("DIRECTORY PURGED", "success");
  };

  const handleSavePrompt = async (title: string, content: string, attachment_url: string | null, attachment_name: string | null, folder_id: string | null) => {
    const { data, error } = await supabase
      .from("prompts")
      .insert([{ title, content, attachment_url, attachment_name, folder_id }])
      .select();

    if (error) {
      console.error("Error saving prompt:", error);
      toast("ERROR SAVING ENTRY", "error");
    } else if (data) {
      setPrompts([data[0], ...prompts]);
      setIsWritingPrompt(false);
      toast("ENTRY SECURED", "success");
    }
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
      await supabase.from("prompts").delete().eq("id", entryToDelete.id);
      setPrompts(prompts.filter((p) => p.id !== entryToDelete.id));
      toast("ENTRY PURGED", "success");
    } else {
      await supabase.from("prompt_shares").delete().eq("id", entryToDelete.id);
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
    
    const { error } = await supabase
      .from("prompt_shares")
      .insert([{ 
        prompt_id: sendPromptId, 
        receiver_email: receiverEmail,
        sender_email: user?.email || "unknown"
      }]);
      
    if (error) {
      console.error(error);
      toast("FAILED TO SEND COMM-LINK", "error");
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
      <main style={{ width: "100%", height: "calc(100vh - 85px)", position: "relative" }}>
        <style dangerouslySetInnerHTML={{ __html: `body { overflow: hidden; }` }} />
        <LandingHero />
      </main>
    );
  }

  const filteredPrompts = activeFolderId 
    ? prompts.filter(p => p.folder_id === activeFolderId)
    : prompts;

  return (
    <main className="container" style={{ maxWidth: "800px", padding: "2rem" }}>
      
      {currentView === "inbox" ? (
        <section>
          <h2 style={{ marginBottom: "2rem" }}>[ INCOMING TRANSMISSIONS ]</h2>
          {loading ? (
            <p>SCANNING COMMS...</p>
          ) : inbox.length === 0 ? (
            <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold" }}>NO INCOMING TRANSMISSIONS.</p>
          ) : (
            inbox.map((share) => share.prompts && (
              <PromptCard 
                key={share.id} 
                prompt={share.prompts} 
                isInbox={true} 
                senderEmail={share.sender_email} 
                onDelete={() => handleDeleteInboxClick(share.id)}
              />
            ))
          )}
        </section>
      ) : (
        <section>
          <MagneticButton style={{ width: "100%", marginBottom: "3rem", display: "block" }}>
            <button 
              onClick={() => setIsWritingPrompt(true)}
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
          ) : filteredPrompts.length === 0 ? (
            <p style={{ opacity: 0.7, fontSize: "1.2rem", fontWeight: "bold" }}>NO ENTRIES FOUND IN THIS DIRECTORY.</p>
          ) : (
            filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} onDelete={handleDeletePromptClick} onSend={handleSendPromptClick} />
            ))
          )}
        </section>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isWritingPrompt && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "flex-start", backgroundColor: "var(--overlay-bg)", backdropFilter: "blur(12px)", overflowY: "auto", padding: "4rem 1rem" }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ width: "100%", maxWidth: "800px", position: "relative" }}
            >
              <button 
                onClick={() => setIsWritingPrompt(false)}
                style={{ position: "absolute", top: "-3rem", right: "0", background: "none", border: "none", color: "var(--border-color)", fontSize: "1.2rem", padding: "0", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold" }}
              >
                [ ABORT ENTRY ] <X size={24} />
              </button>
              <PromptForm folders={folders} currentFolderId={activeFolderId} onSave={handleSavePrompt} />
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
