-- =============================================================================
-- PROMPTA - COMPLETE DATABASE SCHEMA
-- =============================================================================
-- Run this ONCE in your Supabase SQL Editor. It is idempotent: it is safe to
-- re-run, and it converges to the correct state whether you are starting from
-- an empty project or from any earlier partial migration.
--
-- This file REPLACES the previous four phase files (supabase_schema.sql,
-- supabase_storage_schema.sql, supabase_auth_schema.sql,
-- supabase_phase4_schema.sql). Those were order-dependent: running only the
-- first one left `prompts` readable, writable and DELETABLE by `anon` with no
-- authentication at all. Do not use them.
--
-- SECURITY MODEL
-- Prompta has no server-side code. Every database call is made directly from
-- the browser with the publishable (anon) key, which is public by design.
-- Postgres Row Level Security is therefore the ONLY thing protecting user
-- data. Every policy below is load-bearing. Read before you edit.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete cascade default auth.uid()
);

create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists public.prompt_shares (
  id              uuid primary key default gen_random_uuid(),
  prompt_id       uuid not null references public.prompts(id) on delete cascade,
  sender_email    text not null,
  receiver_email  text not null,
  created_at      timestamptz default now()
);

-- Columns added by later phases, for projects created before them.
alter table public.prompts add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.prompts add column if not exists attachment_name text;
alter table public.prompts add column if not exists folder_id uuid references public.folders(id) on delete set null;


-- -----------------------------------------------------------------------------
-- 2. DROP ALL LEGACY POLICIES
-- -----------------------------------------------------------------------------
-- Named drops so this script converges from any previous phase. The three
-- "Allow public *" policies are the dangerous ones: they granted `anon`
-- unauthenticated read/insert/delete over every prompt in the database.

drop policy if exists "Allow public read access"   on public.prompts;
drop policy if exists "Allow public insert access" on public.prompts;
drop policy if exists "Allow public delete access" on public.prompts;

drop policy if exists "Users can view own prompts"                    on public.prompts;
drop policy if exists "Users can view own prompts or received prompts" on public.prompts;
drop policy if exists "Users can insert own prompts"                  on public.prompts;
drop policy if exists "Users can update own prompts"                  on public.prompts;
drop policy if exists "Users can delete own prompts"                  on public.prompts;

drop policy if exists "Users can manage own folders" on public.folders;

drop policy if exists "Senders can view own shares"           on public.prompt_shares;
drop policy if exists "Receivers can view received shares"    on public.prompt_shares;
drop policy if exists "Authenticated users can create shares" on public.prompt_shares;
drop policy if exists "Users can only share prompts they own" on public.prompt_shares;
drop policy if exists "Receivers can dismiss shares"          on public.prompt_shares;
drop policy if exists "Senders can revoke shares"             on public.prompt_shares;

-- Storage: "Public Access" and "Anon Uploads" made the bucket a world-readable,
-- world-writable file host. "Authenticated Read Access" was dead code, because
-- a bucket marked public bypasses RLS on read entirely (fixed in section 7).
drop policy if exists "Public Access"                 on storage.objects;
drop policy if exists "Anon Uploads"                  on storage.objects;
drop policy if exists "Authenticated Read Access"     on storage.objects;
drop policy if exists "Authenticated Uploads"         on storage.objects;
drop policy if exists "Users upload to own folder"    on storage.objects;
drop policy if exists "Read own or shared attachments" on storage.objects;
drop policy if exists "Users delete own attachments"  on storage.objects;


-- -----------------------------------------------------------------------------
-- 3. ATTACHMENTS: store the object PATH, never a public URL
-- -----------------------------------------------------------------------------
-- Previously the app stored a permanent public URL from getPublicUrl(). Those
-- URLs are unauthenticated and never expire. We now store the storage path and
-- mint a short-lived signed URL at render time instead.

do $$
begin
  if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'prompts'
          and column_name = 'attachment_url')
     and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'prompts'
          and column_name = 'attachment_path')
  then
    alter table public.prompts rename column attachment_url to attachment_path;
  end if;
end $$;

alter table public.prompts add column if not exists attachment_path text;

-- Strip any legacy public URL down to the bare object path.
update public.prompts
set attachment_path = regexp_replace(
      attachment_path, '^.*/storage/v1/object/public/prompt_attachments/', '')
where attachment_path like '%/storage/v1/object/public/prompt_attachments/%';

-- NOTE ON PRE-EXISTING FILES
-- Legacy uploads were written to the bucket ROOT with a Math.random() filename.
-- New uploads go to '<user_id>/<uuid>.<ext>'. The owner-scoped policies in
-- section 7 match on the first path segment, so root-level legacy objects will
-- no longer be readable. Re-upload them, or accept that they are unreachable.


-- -----------------------------------------------------------------------------
-- 4. DATA HYGIENE: lowercase emails, length limits
-- -----------------------------------------------------------------------------
-- Sharing matches `receiver_email` against the JWT email as a plain string.
-- Without normalisation, sharing to "Alice@Gmail.com" when the JWT says
-- "alice@gmail.com" creates the row, reports success, and silently never
-- arrives. Normalise existing rows BEFORE adding the constraint.

update public.prompt_shares
set sender_email   = lower(trim(sender_email)),
    receiver_email = lower(trim(receiver_email))
where sender_email   <> lower(trim(sender_email))
   or receiver_email <> lower(trim(receiver_email));

alter table public.prompt_shares drop constraint if exists prompt_shares_emails_lowercase;
alter table public.prompt_shares add constraint prompt_shares_emails_lowercase
  check (sender_email = lower(sender_email) and receiver_email = lower(receiver_email));

-- The app enforced a 100-char title client-side and nothing at all on content.
-- Client-side limits are decoration; these are the real ones.
alter table public.prompts drop constraint if exists prompts_title_len;
alter table public.prompts add constraint prompts_title_len
  check (char_length(title) between 1 and 200);

alter table public.prompts drop constraint if exists prompts_content_len;
alter table public.prompts add constraint prompts_content_len
  check (char_length(content) between 1 and 100000);

alter table public.folders drop constraint if exists folders_name_len;
alter table public.folders add constraint folders_name_len
  check (char_length(name) between 1 and 100);


-- -----------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
-- These run with the definer rights, so the inner lookups are not themselves
-- subject to RLS. That keeps the policies below free of cross-table recursion
-- and avoids re-checking policies on every row.

-- Does the current user own this prompt? Used to stop a user from sharing
-- (and thereby granting themselves read access to) a prompt they do not own.
create or replace function public.owns_prompt(p_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.prompts
    where id = p_id and user_id = auth.uid()
  );
$$;

-- May the current user read the object at this storage path? True if they own
-- the prompt that references it, or if that prompt was shared with them.
-- Without the second branch, locking storage to the owner folder would
-- silently break attachments on every shared prompt.
create or replace function public.can_read_attachment(p_path text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.prompts p
    where p.attachment_path = p_path
      and (
        p.user_id = auth.uid()
        or exists (
          select 1 from public.prompt_shares s
          where s.prompt_id = p.id
            and s.receiver_email = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

revoke execute on function public.owns_prompt(uuid)         from public, anon;
revoke execute on function public.can_read_attachment(text) from public, anon;
grant  execute on function public.owns_prompt(uuid)         to authenticated;
grant  execute on function public.can_read_attachment(text) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- auth.uid() and auth.jwt() are wrapped in (select ...) throughout. This is not
-- cosmetic: without it Postgres re-evaluates them once PER ROW. With it they
-- become a cached InitPlan, which is an order-of-magnitude difference at scale.

alter table public.prompts       enable row level security;
alter table public.folders       enable row level security;
alter table public.prompt_shares enable row level security;

-- ---- prompts ----------------------------------------------------------------

create policy "Users can view own prompts or received prompts"
on public.prompts for select to authenticated
using (
  (select auth.uid()) = user_id
  or id in (
    select prompt_id from public.prompt_shares
    where receiver_email = lower((select auth.jwt() ->> 'email'))
  )
);

create policy "Users can insert own prompts"
on public.prompts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own prompts"
on public.prompts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own prompts"
on public.prompts for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---- folders ----------------------------------------------------------------

create policy "Users can manage own folders"
on public.folders for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ---- prompt_shares ----------------------------------------------------------

create policy "Senders can view own shares"
on public.prompt_shares for select to authenticated
using (sender_email = lower((select auth.jwt() ->> 'email')));

create policy "Receivers can view received shares"
on public.prompt_shares for select to authenticated
using (receiver_email = lower((select auth.jwt() ->> 'email')));

-- THE IMPORTANT ONE.
-- The previous policy checked only that you were the sender. It never checked
-- that the prompt was yours. Because the prompts SELECT policy grants read on
-- anything you are a receiver of, any authenticated user could insert
-- {prompt_id: <any uuid>, sender_email: me, receiver_email: me} from the
-- browser console and grant themselves read access to another user prompt.
-- The only thing standing in the way was UUID unguessability, which is not an
-- access control. owns_prompt() closes it.
create policy "Users can only share prompts they own"
on public.prompt_shares for insert to authenticated
with check (
  sender_email = lower((select auth.jwt() ->> 'email'))
  and public.owns_prompt(prompt_id)
);

-- Shares must be removable in both directions. There was previously NO delete
-- policy, so the app inbox delete silently affected 0 rows while reporting
-- success, and a sender could never revoke access once sent.
create policy "Receivers can dismiss shares"
on public.prompt_shares for delete to authenticated
using (receiver_email = lower((select auth.jwt() ->> 'email')));

create policy "Senders can revoke shares"
on public.prompt_shares for delete to authenticated
using (sender_email = lower((select auth.jwt() ->> 'email')));


-- -----------------------------------------------------------------------------
-- 7. STORAGE
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('prompt_attachments', 'prompt_attachments', false)
on conflict (id) do nothing;

-- public = false is the single most important line in this section. A public
-- bucket bypasses RLS on read completely, which made every "authenticated only"
-- storage policy dead code and every attachment world-readable forever.
update storage.buckets
set public = false,
    file_size_limit = 10485760,   -- 10 MB
    allowed_mime_types = array[
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown', 'application/json'
    ]
where id = 'prompt_attachments';
-- image/svg+xml is deliberately excluded: an SVG served inline is a stored-XSS
-- vector. Do not add it back without serving attachments from a separate origin.

create policy "Users upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'prompt_attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Read own or shared attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'prompt_attachments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.can_read_attachment(name)
  )
);

create policy "Users delete own attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'prompt_attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);


-- -----------------------------------------------------------------------------
-- 8. INDEXES
-- -----------------------------------------------------------------------------
-- Every column an RLS policy filters on needs one. Without these, the policies
-- above force a sequential scan on every single query.

create index if not exists idx_prompts_user_id         on public.prompts(user_id);
create index if not exists idx_prompts_folder_id       on public.prompts(folder_id);
create index if not exists idx_prompts_attachment_path on public.prompts(attachment_path) where attachment_path is not null;
create index if not exists idx_folders_user_id         on public.folders(user_id);
create index if not exists idx_shares_receiver_email   on public.prompt_shares(receiver_email);
create index if not exists idx_shares_sender_email     on public.prompt_shares(sender_email);
create index if not exists idx_shares_prompt_id        on public.prompt_shares(prompt_id);


-- -----------------------------------------------------------------------------
-- 9. ABUSE LIMITS ON SHARING
-- -----------------------------------------------------------------------------
-- There is no server to rate limit at, so the limit lives in the database where
-- it cannot be bypassed by calling PostgREST directly.

-- A prompt can only be sent to a given address once. Stops the same recipient
-- being spammed with the same prompt over and over, and makes the inbox sane.
-- Existing duplicates are collapsed to the earliest row first, or the unique
-- index below cannot be built.
delete from public.prompt_shares s
where s.id in (
  select id from (
    select id, row_number() over (
      partition by prompt_id, receiver_email order by created_at, id
    ) as rn
    from public.prompt_shares
  ) t
  where t.rn > 1
);

create unique index if not exists uq_shares_prompt_receiver
  on public.prompt_shares(prompt_id, receiver_email);

-- Supports the counting queries in the trigger below.
create index if not exists idx_shares_sender_created
  on public.prompt_shares(sender_email, created_at desc);

create or replace function public.enforce_share_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hourly int;
  daily  int;
begin
  select count(*) into hourly
  from public.prompt_shares
  where sender_email = new.sender_email
    and created_at > now() - interval '1 hour';

  if hourly >= 20 then
    raise exception 'SHARE_RATE_LIMIT_HOURLY'
      using errcode = 'check_violation';
  end if;

  select count(*) into daily
  from public.prompt_shares
  where sender_email = new.sender_email
    and created_at > now() - interval '24 hours';

  if daily >= 100 then
    raise exception 'SHARE_RATE_LIMIT_DAILY'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_share_rate_limit on public.prompt_shares;
create trigger trg_share_rate_limit
before insert on public.prompt_shares
for each row execute function public.enforce_share_rate_limit();


-- -----------------------------------------------------------------------------
-- 10. CLIENT ERROR LOG
-- -----------------------------------------------------------------------------
-- Errors previously went to console.error and died there, so a broken app was
-- invisible. This is deliberately a plain table rather than a third-party
-- service: no new dependency, no data leaving Supabase, and nothing new to
-- declare in the privacy policy beyond what is already stored here.
--
-- It does NOT alert you. Read it from the Supabase dashboard, or see the
-- upgrade note in README if you want paging.

create table if not exists public.client_errors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade default auth.uid(),
  message     text not null,
  source      text,
  stack       text,
  url         text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Bound every field so a runaway loop cannot write unbounded data.
alter table public.client_errors drop constraint if exists client_errors_len;
alter table public.client_errors add constraint client_errors_len check (
  char_length(message) between 1 and 2000
  and char_length(coalesce(source, ''))     <= 200
  and char_length(coalesce(stack, ''))      <= 8000
  and char_length(coalesce(url, ''))        <= 2000
  and char_length(coalesce(user_agent, '')) <= 500
);

create index if not exists idx_client_errors_user_created
  on public.client_errors(user_id, created_at desc);
create index if not exists idx_client_errors_created
  on public.client_errors(created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists "Authenticated users can report errors" on public.client_errors;

-- Insert-only, and only as yourself. There is deliberately NO select, update or
-- delete policy: reports are readable from the dashboard (service role) only,
-- so one user can never read another user's error text, which may quote their
-- prompt content.
create policy "Authenticated users can report errors"
on public.client_errors for insert to authenticated
with check (user_id = (select auth.uid()));

-- An error inside a render loop could otherwise write thousands of rows.
create or replace function public.enforce_error_log_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent int;
begin
  select count(*) into recent
  from public.client_errors
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent >= 50 then
    raise exception 'ERROR_LOG_RATE_LIMIT'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_error_log_rate_limit on public.client_errors;
create trigger trg_error_log_rate_limit
before insert on public.client_errors
for each row execute function public.enforce_error_log_rate_limit();
