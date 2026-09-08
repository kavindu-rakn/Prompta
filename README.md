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
- 📎 **Private Attachments**: Attach one reference image or file (10MB max) to a prompt. Files live in a private Supabase bucket, scoped to your own folder, and are reached only through short-lived signed URLs — never a public link.
- 🚀 **One-Click Launchers**: Copies the prompt to your clipboard and opens ChatGPT, Claude, Gemini, DeepSeek, or Grok in a new tab, ready for you to paste.
- 📡 **Comm-Link (Inbox)**: Send a prompt to another Prompta user by email address. It appears in their in-app Inbox on their next visit. *No email notification is sent* — the recipient has to open Prompta to see it.

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
git clone https://github.com/kavindu-rakn/Prompta.git
cd prompta
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Supabase Environment
You must have a Supabase project set up with Auth, Database, and Storage enabled.
Copy `.env.example` to `.env.local` and fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Both values are safe to expose in the browser. **Never** put the `service_role`
key in a `NEXT_PUBLIC_` variable — it bypasses Row Level Security entirely.

### 4. Apply the Database Schema
Open the Supabase SQL Editor and run **`supabase/schema.sql`** in full. It creates
the `prompts`, `folders` and `prompt_shares` tables, the private
`prompt_attachments` bucket, and every Row Level Security policy the app depends
on. It is idempotent, so it is safe to re-run.

> Users are handled by Supabase's built-in `auth.users` — there is no `users`
> table to create.

### 5. Boot the Development Server
```bash
npm run dev
```

The application will initialize at `http://localhost:3000`. 

---


## ❖ SECURITY MODEL

Prompta has **no server-side code**. Every database call goes straight from the
browser to Supabase using the publishable key, which is public by design.
**Postgres Row Level Security is therefore the only boundary protecting user
data.** Everything in `supabase/schema.sql` is load-bearing — read it before you
change it.

What that model guarantees today:

- **Prompts and folders** are readable and writable only by their owner.
- **Sharing** requires you to own the prompt you are sharing. The check lives in
  the `prompt_shares` INSERT policy, and it is the reason a user cannot grant
  themselves access to someone else's prompt by inserting a share row.
- **Attachments** sit in a private bucket under a per-user path prefix. Reads are
  restricted to the owner and to anyone the prompt was explicitly shared with,
  and are served only through signed URLs that expire in 60 seconds.
- **Emails are normalised to lowercase** on both sides of a share, so a
  mismatched-case address cannot silently swallow a transmission.
- **Security headers** (CSP, HSTS, `frame-ancestors`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.

Known gaps, deliberately not yet closed:

- Sessions are stored in `localStorage` rather than `httpOnly` cookies, so an XSS
  would expose a token. Migrating to `@supabase/ssr` with a `proxy.ts` is the fix.
- `script-src` still needs `'unsafe-inline'`, because the App Router streams its
  RSC payload through inline `<script>` tags. A per-request nonce (also via
  `proxy.ts`) would remove it.
- There is no rate limiting on share creation.

Found something? Please open an issue rather than a pull request.
