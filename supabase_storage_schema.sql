-- Run this in your Supabase SQL Editor to support file attachments

-- 1. Add attachment columns to the prompts table
alter table public.prompts add column if not exists attachment_url text;
alter table public.prompts add column if not exists attachment_name text;

-- 2. Create the storage bucket
insert into storage.buckets (id, name, public) 
values ('prompt_attachments', 'prompt_attachments', true)
on conflict (id) do nothing;

-- 3. Set up Storage Policies for public read and anonymous upload
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'prompt_attachments' );

create policy "Anon Uploads"
on storage.objects for insert
to public
with check ( bucket_id = 'prompt_attachments' );
