-- Run this in your Supabase SQL Editor to create the necessary table

create table public.prompts (
  id uuid not null default gen_random_uuid (),
  title text not null,
  content text not null,
  created_at timestamp with time zone not null default now(),
  constraint prompts_pkey primary key (id)
);

-- Enable Row Level Security (RLS) and allow anon public access (since this is currently for personal/open use)
-- If you add authentication later, you should restrict these policies.
alter table public.prompts enable row level security;

create policy "Allow public read access"
on public.prompts
for select
to anon
using (true);

create policy "Allow public insert access"
on public.prompts
for insert
to anon
with check (true);

create policy "Allow public delete access"
on public.prompts
for delete
to anon
using (true);
