<div align="center">
  <img src="./public/promptalogo.svg" alt="Prompta Logo" width="120" />
  <h1>[ P R O M P T A ]</h1>
  <p><strong>A Hyper-Futuristic Vault for AI Prompts</strong></p>
</div>

---

## ❖ SYSTEM OVERVIEW

**Prompta** is a Next.js web application built for power-users, AI engineers, and prompt designers. Featuring an unapologetically brutalist, hyper-futuristic UI, it serves as a secure vault for storing, organizing, and executing AI prompts, while doubling as a communication layer to share prompts directly with peers. 

It rejects bloated interfaces in favor of pure focus: monospace typography, sharp geometric borders, CRT scanlines, and a rebellious left-aligned scrollbar.

### Core Capabilities

- ⬛ **Brutalist / Hacker Aesthetic**: Built with strict monospace typography, CSS noise layers, subtle CRT scanlines, and high-contrast glassmorphic blurs.
- 🌓 **Adaptive Themes**: A flawless Dark/Light mode engine that dynamically inverts icons, alters blurs, and adjusts noise filters automatically.
- 🗂️ **The Vault (Grid System)**: Prompts are displayed in a highly scannable 3-column grid. Clicking a card smoothly morphs it into a full-screen, distraction-free modal using Framer Motion.
- 📝 **Zen-Mode Creation**: Initiating a new entry triggers a full-screen, centered modal ensuring absolute concentration.
- 📁 **Directory Management**: Organize prompts logically with a custom horizontal folder tab system.
- 📎 **Encrypted Attachments**: Securely upload and preview reference images or files alongside your prompts.
- 🚀 **One-Click Launchers**: Instantly push copied prompts into ChatGPT, Claude, Gemini, DeepSeek, or Grok via integrated UI actions.
- 📡 **Comm-Link (Inbox)**: Send prompts directly to other registered users by email. Incoming prompts appear in a dedicated, isolated Inbox view.

---

## ❖ ARCHITECTURE & TECH STACK

Prompta was built from the ground up focusing on performance, fluid animations, and a secure backend. 

- **Frontend Framework**: [Next.js (App Router)](https://nextjs.org/) & React.
- **Styling**: Pure Vanilla CSS. No Tailwind. Uses advanced CSS variable scoping for theming, CSS Grid, and RTL/LTR tricks for left-aligned scrollbars.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) powering the `layoutId` seamless card-to-modal expansions.
- **Backend & Auth**: [Supabase](https://supabase.com/). Handles PostgreSQL database schemas, user authentication, Row Level Security (RLS), and bucket storage for attachments.
- **Icons**: [Lucide React](https://lucide.dev/) and custom icons from [Icons8](https://icons8.com/).

---

## ❖ DEPLOYMENT INSTRUCTIONS

To launch Prompta on your local terminal, follow these exact coordinates:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/prompta.git
cd prompta
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Supabase Environment
You must have a Supabase project set up with Auth, Database, and Storage enabled. 
Create a `.env.local` file in the root directory and add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*Note: Ensure your Supabase database has the necessary tables configured (`users`, `folders`, `prompts`, `prompt_shares`) and a storage bucket named `prompt_attachments`.*

### 4. Boot the Development Server
```bash
npm run dev
```

The application will initialize at `http://localhost:3000`. 

---

