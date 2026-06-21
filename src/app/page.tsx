"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PromptCard, { Prompt } from "@/components/PromptCard";
import PromptForm from "@/components/PromptForm";
import MagneticButton from "@/components/MagneticButton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";

import { Folder, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FolderType = { id: string; name: string };
type Share = { id: string; sender_email: string; prompts: Prompt };

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Data States
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [inbox, setInbox] = useState<Share[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [sendPromptId, setSendPromptId] = useState<string | null>(null);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

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
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (!error) {
      setPrompts(prompts.filter((p) => p.id !== id));
    }
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
      <main className="container" style={{ textAlign: "center", paddingTop: "5vh" }}>
        <div className="prompt-card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left", padding: "3rem" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: 900 }}>WELCOME TO PROMPTA</h1>
          <p style={{ fontSize: "1.1rem", marginBottom: "2rem", opacity: 0.9, lineHeight: 1.8 }}>
            A hyper-futuristic vault for your AI prompts.
            Store, organize, and execute your most critical interactions across ChatGPT, Gemini, and DeepSeek.
          </p>
          <ul style={{ listStyleType: "square", paddingLeft: "1.5rem", marginBottom: "3rem", fontSize: "1rem", opacity: 0.8, lineHeight: 1.8 }}>
            <li>Unlimited prompt storage limits</li>
            <li>Direct file attachment support</li>
            <li>One-click copy & execute routing</li>
            <li>Secure, encrypted personal access</li>
          </ul>
          <Link href="/login" style={{ textDecoration: "none", display: "block" }}>
            <MagneticButton style={{ width: "100%", display: "block" }}>
              <button style={{ fontSize: "1.1rem", padding: "1rem 2rem", width: "100%" }}>
                [ JOIN PROMPTA ]
              </button>
            </MagneticButton>
          </Link>
        </div>
      </main>
    );
  }

  const filteredPrompts = activeFolderId 
    ? prompts.filter(p => p.folder_id === activeFolderId)
    : prompts;

  return (
    <main className="container" style={{ maxWidth: "1600px", padding: "2rem" }}>
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: FOLDERS */}
        <aside>
          <div className="column-header">
            <span title="Folders"><Folder size={24} /></span>
            <MagneticButton>
              <button onClick={() => setIsCreatingFolder(!isCreatingFolder)} style={{ padding: "0.2rem 0.6rem", fontSize: "0.9rem", display: "flex", alignItems: "center" }}>+</button>
            </MagneticButton>
          </div>
          
          {isCreatingFolder && (
            <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="NAME..." 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                style={{ padding: "0.5rem", marginBottom: 0 }}
                autoFocus
              />
              <button type="submit" style={{ padding: "0.5rem" }}>OK</button>
            </form>
          )}

          <div 
            className={`folder-item ${activeFolderId === null ? "active" : ""}`}
            onClick={() => setActiveFolderId(null)}
          >
            [ ALL ENTRIES ]
          </div>
          
          {folders.map(folder => (
            <div 
              key={folder.id}
              className={`folder-item ${activeFolderId === folder.id ? "active" : ""}`}
              onClick={() => setActiveFolderId(folder.id)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
              <span onClick={(e) => handleDeleteFolderClick(folder.id, e)} style={{ opacity: 0.5, fontSize: "0.8rem", paddingLeft: "0.5rem" }}>X</span>
            </div>
          ))}
        </aside>

        {/* MIDDLE COLUMN: PROMPTS */}
        <section>
          <PromptForm folders={folders} currentFolderId={activeFolderId} onSave={handleSavePrompt} />
          
          <hr style={{ margin: "2rem 0" }} />
          
          <div className="column-header">
            <span>[ {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name || "FOLDER" : "ALL ENTRIES"} ]</span>
          </div>
          
          {loading ? (
            <p>FETCHING DATA...</p>
          ) : filteredPrompts.length === 0 ? (
            <p style={{ opacity: 0.7 }}>NO ENTRIES FOUND IN THIS DIRECTORY.</p>
          ) : (
            filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} onDelete={handleDeletePrompt} onSend={handleSendPromptClick} />
            ))
          )}
        </section>

        {/* RIGHT COLUMN: INBOX */}
        <aside>
          <div className="column-header">
            <span title="Inbox"><Inbox size={24} /></span>
          </div>
          
          {loading ? (
            <p>SCANNING COMMS...</p>
          ) : inbox.length === 0 ? (
            <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>NO INCOMING TRANSMISSIONS.</p>
          ) : (
            inbox.map((share) => share.prompts && (
              <PromptCard 
                key={share.id} 
                prompt={share.prompts} 
                isInbox={true} 
                senderEmail={share.sender_email} 
              />
            ))
          )}
        </aside>

      </div>

      <AnimatePresence>
        {sendPromptId && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
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
          <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
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
      </AnimatePresence>
    </main>
  );
}
