-- Run this in your Supabase SQL Editor to secure the database

-- 1. Add user_id column to prompts table
alter table public.prompts 
add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 2. Secure Prompts Table with Row Level Security (RLS)
-- Drop the old public policies we made in Phase 1
drop policy if exists "Allow public read access" on public.prompts;
drop policy if exists "Allow public insert access" on public.prompts;
drop policy if exists "Allow public delete access" on public.prompts;

-- Create secure user-specific policies
create policy "Users can view own prompts"
on public.prompts for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own prompts"
on public.prompts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own prompts"
on public.prompts for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own prompts"
on public.prompts for delete
to authenticated
using (auth.uid() = user_id);

-- 3. Secure Storage (Attachments)
-- Drop old public upload policies
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Anon Uploads" on storage.objects;

-- Allow only logged in users to upload and read
create policy "Authenticated Read Access"
on storage.objects for select
to authenticated
using ( bucket_id = 'prompt_attachments' );

create policy "Authenticated Uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'prompt_attachments' );
