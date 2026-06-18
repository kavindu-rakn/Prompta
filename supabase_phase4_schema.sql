-- Run this in your Supabase SQL Editor to enable Folders and Sharing (Inbox)

-- 1. Create Folders Table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Secure Folders
alter table public.folders enable row level security;
create policy "Users can manage own folders"
on public.folders for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 2. Update Prompts Table for Folders
alter table public.prompts
add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- 3. Create Prompt Shares Table (The Inbox)
create table if not exists public.prompt_shares (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompts(id) on delete cascade not null,
  sender_email text not null,
  receiver_email text not null,
  created_at timestamp with time zone default now()
);

-- Secure Prompt Shares
alter table public.prompt_shares enable row level security;

-- Senders can see what they sent
create policy "Senders can view own shares"
on public.prompt_shares for select
to authenticated
using (sender_email = auth.jwt()->>'email');

-- Receivers can see what they received
create policy "Receivers can view received shares"
on public.prompt_shares for select
to authenticated
using (receiver_email = auth.jwt()->>'email');

-- Senders can create shares
create policy "Authenticated users can create shares"
on public.prompt_shares for insert
to authenticated
with check (sender_email = auth.jwt()->>'email');

-- 4. Update Prompts RLS to allow receivers to view the prompt data
drop policy if exists "Users can view own prompts" on public.prompts;

create policy "Users can view own prompts or received prompts"
on public.prompts for select
to authenticated
using (
  auth.uid() = user_id OR 
  id IN (
    select prompt_id from public.prompt_shares 
    where receiver_email = auth.jwt()->>'email'
  )
);
