-- =============================================================================
-- PROMPTA - ROW LEVEL SECURITY TESTS
-- =============================================================================
-- Paste the whole file into the Supabase SQL Editor and run it. Re-run it after
-- every change to supabase/schema.sql.
--
-- WHAT IT DOES
-- Creates three throwaway users (A, B and C) with prompts, a folder, shares and
-- attachments, then impersonates each of them and attempts the attacks the RLS
-- policies exist to stop - including SEC-1, the hole where any signed-in user
-- could grant themselves read access to any prompt.
--
-- IT CHANGES NOTHING
-- All test data is created inside a savepoint that is always rolled back, pass
-- or fail, so no users, prompts, shares or files survive the run. It needs no
-- real second account. The only thing left behind is a temp table holding the
-- results, which disappears when the connection closes.
--
-- The SQL Editor may warn that this query contains destructive operations. That
-- is the DROP of the results temp table and the DELETE/UPDATE attack attempts,
-- all of which are either temporary or rolled back.
--
-- READING THE RESULT
-- Row 0 is the summary. Anything other than PASS needs attention:
--   FAIL   The policy is wrong: an attack succeeded, or a legitimate action was
--          blocked. Do not deploy.
--   ERROR  The check hit an unexpected error, so it proves nothing either way.
--          An attack only counts as blocked if RLS itself blocked it - never
--          because something unrelated happened to break.
--   SKIP   The check could not run in this environment. The reason is given.
--
-- Positive checks ("B can read their own prompt") are deliberately mixed in
-- with the attacks. Without them, a database that denied everything - with the
-- app completely broken - would pass every attack check.
-- =============================================================================

drop table if exists pg_temp.rls_results;
create temp table rls_results (
  n          int,
  area       text,
  check_name text,
  result     text,
  detail     text
);

do $$
declare
  -- Fresh random ids every run, so the test can never collide with real rows.
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_c uuid := gen_random_uuid();

  -- .invalid is a reserved top-level domain: these can never be real addresses.
  email_a text := 'rls-test-a-' || left(user_a::text, 8) || '@example.invalid';
  email_b text := 'rls-test-b-' || left(user_b::text, 8) || '@example.invalid';
  email_c text := 'rls-test-c-' || left(user_c::text, 8) || '@example.invalid';

  prompt_a_private uuid := gen_random_uuid();  -- owned by A, never shared
  prompt_a_shared  uuid := gen_random_uuid();  -- owned by A, shared with B and C
  prompt_b_own     uuid := gen_random_uuid();  -- owned by B
  folder_a         uuid := gen_random_uuid();  -- owned by A
  share_ab         uuid := gen_random_uuid();  -- A sends prompt_a_shared to B
  share_ac         uuid := gen_random_uuid();  -- A sends prompt_a_shared to C

  file_a_private text := user_a::text || '/private.png';
  file_a_shared  text := user_a::text || '/shared.png';

  results    jsonb := '[]'::jsonb;
  i          int := 0;
  area_label text;
  chk        text;
  phase      text;
  cnt        int;
  before_cnt int;
  after_cnt  int;
  size_limit bigint;
  err_constraint text;
  skip_name  text;

  storage_ready       boolean := false;
  storage_skip_reason text := 'not attempted';
  b_shared_own        boolean := false;
  b_logged_error      boolean := false;
begin
  -- ===========================================================================
  -- SANDBOX. Everything in this block is rolled back when it ends. Results are
  -- kept in the `results` variable, which a rollback does not touch.
  -- ===========================================================================
  begin

    -- ---- Setup, as the admin role (bypasses RLS) ----------------------------

    phase := 'setup: creating test users';
    insert into auth.users (id, email, aud, role, created_at, updated_at)
    values (user_a, email_a, 'authenticated', 'authenticated', now(), now()),
           (user_b, email_b, 'authenticated', 'authenticated', now(), now()),
           (user_c, email_c, 'authenticated', 'authenticated', now(), now());

    phase := 'setup: creating prompts, folder and shares';
    insert into public.folders (id, user_id, name)
    values (folder_a, user_a, 'rls test folder');

    insert into public.prompts (id, user_id, title, content, attachment_path, attachment_name)
    values (prompt_a_private, user_a, 'rls test: A private', 'private', file_a_private, 'private.png'),
           (prompt_a_shared,  user_a, 'rls test: A shared',  'shared',  file_a_shared,  'shared.png'),
           (prompt_b_own,     user_b, 'rls test: B own',     'own',     null,           null);

    insert into public.prompt_shares (id, prompt_id, sender_email, receiver_email)
    values (share_ab, prompt_a_shared, email_a, email_b),
           (share_ac, prompt_a_shared, email_a, email_c);

    phase := 'setup: creating attachment objects';
    begin
      -- Claims are set to A so this also succeeds where the admin role does not
      -- bypass RLS on storage.objects.
      perform set_config('request.jwt.claims',
        json_build_object('sub', user_a, 'email', email_a, 'role', 'authenticated')::text, true);
      insert into storage.objects (bucket_id, name)
      values ('prompt_attachments', file_a_private),
             ('prompt_attachments', file_a_shared);
      storage_ready := true;
    exception when others then
      storage_skip_reason := format('could not create test objects (%s: %s)', sqlstate, sqlerrm);
    end;
    perform set_config('request.jwt.claims', '', true);

    -- ---- Config -------------------------------------------------------------

    phase := 'config checks';
    area_label := 'Config';

    chk := 'Attachment bucket is private';
    select count(*) into cnt from storage.buckets
    where id = 'prompt_attachments' and public = false;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 1 then 'PASS' else 'FAIL' end,
      'detail', case when cnt = 1 then 'public = false'
                     else 'bucket is public or missing: every attachment is readable without signing in' end);

    chk := 'SVG uploads are not allowed';
    select count(*) into cnt from storage.buckets
    where id = 'prompt_attachments'
      and allowed_mime_types is not null
      and not ('image/svg+xml' = any (allowed_mime_types));
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 1 then 'PASS' else 'FAIL' end,
      'detail', case when cnt = 1 then 'image/svg+xml is not in allowed_mime_types'
                     else 'SVG is allowed, or every type is: stored XSS risk' end);

    chk := 'Attachment size limit is set';
    select file_size_limit into size_limit from storage.buckets where id = 'prompt_attachments';
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when size_limit is not null then 'PASS' else 'FAIL' end,
      'detail', case when size_limit is not null then format('file_size_limit = %s bytes', size_limit)
                     else 'no size limit on uploads' end);

    -- ---- Anonymous ----------------------------------------------------------

    phase := 'anonymous checks';
    area_label := 'Anonymous';
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

    chk := 'Cannot read any prompt';
    begin
      select count(*) into cnt from public.prompts
      where id in (prompt_a_private, prompt_a_shared, prompt_b_own);
    exception when insufficient_privilege then cnt := 0;
    end;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s of 3', cnt));

    chk := 'Cannot create a prompt';
    begin
      insert into public.prompts (user_id, title, content) values (user_a, 'rls test: anon', 'x');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded without signing in');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    chk := 'Cannot read any share';
    begin
      select count(*) into cnt from public.prompt_shares where id in (share_ab, share_ac);
    exception when insufficient_privilege then cnt := 0;
    end;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s of 2', cnt));

    chk := 'Cannot read any attachment';
    if storage_ready then
      begin
        select count(*) into cnt from storage.objects
        where bucket_id = 'prompt_attachments' and name in (file_a_private, file_a_shared);
      exception when insufficient_privilege then cnt := 0;
      end;
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
        'detail', format('visible: %s of 2', cnt));
    else
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'SKIP', 'detail', storage_skip_reason);
    end if;

    -- ---- Prompts, as B ------------------------------------------------------

    phase := 'prompt checks';
    area_label := 'Prompts';
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', user_b, 'email', email_b, 'role', 'authenticated')::text, true);

    chk := 'B can read their own prompt';
    select count(*) into cnt from public.prompts where id = prompt_b_own;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 1 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 1', cnt));

    chk := 'B cannot read a private prompt owned by A';
    select count(*) into cnt from public.prompts where id = prompt_a_private;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 0', cnt));

    chk := 'B can read a prompt A shared with them';
    select count(*) into cnt from public.prompts where id = prompt_a_shared;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 1 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 1', cnt));

    chk := 'B cannot edit a prompt owned by A';
    update public.prompts set content = 'rls test: tampered' where id = prompt_a_private;
    get diagnostics cnt = row_count;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('rows changed: %s, expected 0', cnt));

    chk := 'B cannot edit a prompt shared with them (shares are read-only)';
    update public.prompts set content = 'rls test: tampered' where id = prompt_a_shared;
    get diagnostics cnt = row_count;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('rows changed: %s, expected 0', cnt));

    chk := 'B cannot delete a prompt owned by A';
    delete from public.prompts where id = prompt_a_private;
    get diagnostics cnt = row_count;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('rows deleted: %s, expected 0', cnt));

    chk := 'B cannot create a prompt owned by A';
    begin
      insert into public.prompts (user_id, title, content) values (user_a, 'rls test: forged', 'x');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: users can plant prompts in other accounts');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    -- ---- Folders, as B ------------------------------------------------------

    phase := 'folder checks';
    area_label := 'Folders';

    chk := 'B cannot read a folder owned by A';
    select count(*) into cnt from public.folders where id = folder_a;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 0', cnt));

    chk := 'B cannot create a folder owned by A';
    begin
      insert into public.folders (user_id, name) values (user_a, 'rls test: forged');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    -- ---- Attachments, as B --------------------------------------------------

    phase := 'attachment checks';
    area_label := 'Attachments';

    if storage_ready then

      chk := 'B cannot read a private attachment owned by A';
      begin
        select count(*) into cnt from storage.objects
        where bucket_id = 'prompt_attachments' and name = file_a_private;
      exception when insufficient_privilege then cnt := 0;
      end;
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
        'detail', format('visible: %s, expected 0', cnt));

      chk := 'B can read the attachment on a prompt shared with them';
      begin
        select count(*) into cnt from storage.objects
        where bucket_id = 'prompt_attachments' and name = file_a_shared;
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', case when cnt = 1 then 'PASS' else 'FAIL' end,
          'detail', case when cnt = 1 then 'visible'
                         else 'not visible: attachments on shared prompts are broken' end);
      exception when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'FAIL', 'detail', format('%s: %s', sqlstate, sqlerrm));
      end;

      chk := 'B cannot upload into the folder of A';
      begin
        insert into storage.objects (bucket_id, name)
        values ('prompt_attachments', user_a::text || '/rls-test-forged.png');
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'FAIL', 'detail', 'upload succeeded: users can write into other users folders');
      exception
        when insufficient_privilege then
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', 'PASS', 'detail', 'rejected by RLS');
        when others then
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
      end;

      chk := 'B can upload into their own folder';
      begin
        insert into storage.objects (bucket_id, name)
        values ('prompt_attachments', user_b::text || '/rls-test.png');
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'upload accepted');
      exception when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'FAIL', 'detail', format('%s: %s', sqlstate, sqlerrm));
      end;

      chk := 'B cannot delete an attachment owned by A';
      begin
        delete from storage.objects
        where bucket_id = 'prompt_attachments' and name = file_a_private;
        get diagnostics cnt = row_count;
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
          'detail', format('rows deleted: %s, expected 0', cnt));
      exception
        when insufficient_privilege then
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', 'PASS', 'detail', 'rejected');
        when others then
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', case when sqlerrm ilike '%direct deletion%' then 'SKIP' else 'ERROR' end,
            'detail', case when sqlerrm ilike '%direct deletion%'
                           then 'Supabase blocks direct SQL deletes on storage.objects, so this policy can only be exercised through the Storage API'
                           else format('unexpected %s: %s', sqlstate, sqlerrm) end);
      end;

    else
      foreach skip_name in array array[
        'B cannot read a private attachment owned by A',
        'B can read the attachment on a prompt shared with them',
        'B cannot upload into the folder of A',
        'B can upload into their own folder',
        'B cannot delete an attachment owned by A'
      ] loop
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', skip_name,
          'result', 'SKIP', 'detail', storage_skip_reason);
      end loop;
    end if;

    -- ---- Sharing, as B ------------------------------------------------------

    phase := 'sharing checks';
    area_label := 'Sharing';

    chk := 'SEC-1: B cannot share a private prompt of A to themselves';
    begin
      insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
      values (prompt_a_private, email_b, email_b);
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: SEC-1 IS OPEN, any signed-in user can read any prompt');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    chk := 'SEC-1: the private prompt of A is still unreadable by B afterwards';
    select count(*) into cnt from public.prompts where id = prompt_a_private;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 0', cnt));

    chk := 'B cannot re-share a prompt they only received';
    begin
      insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
      values (prompt_a_shared, email_b, 'rls-test-outsider@example.invalid');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: received prompts can be forwarded to anyone');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    chk := 'B cannot send a share that claims to be from A';
    begin
      insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
      values (prompt_b_own, email_a, email_c);
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: sender identity can be forged');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    chk := 'B can share their own prompt';
    begin
      insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
      values (prompt_b_own, email_b, email_c);
      b_shared_own := true;
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'PASS', 'detail', 'share created');
    exception when others then
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', format('%s: %s', sqlstate, sqlerrm));
    end;

    chk := 'The same prompt cannot be sent to the same address twice';
    if b_shared_own then
      begin
        insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
        values (prompt_b_own, email_b, email_c);
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'FAIL', 'detail', 'duplicate share accepted');
      exception
        when unique_violation then
          get stacked diagnostics err_constraint = constraint_name;
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', case when err_constraint = 'uq_shares_prompt_receiver' then 'PASS' else 'ERROR' end,
            'detail', format('rejected by %s', err_constraint));
        when others then
          i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
            'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
      end;
    else
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'SKIP', 'detail', 'depends on "B can share their own prompt", which did not pass');
    end if;

    chk := 'Mixed-case email addresses are rejected';
    begin
      insert into public.prompt_shares (prompt_id, sender_email, receiver_email)
      values (prompt_b_own, email_b, 'RLS-Test-Mixed@Example.invalid');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: a mixed-case address creates a share that never arrives');
    exception
      when check_violation then
        -- The share rate limit also raises check_violation, so insist on the
        -- specific constraint rather than counting any check_violation as a pass.
        get stacked diagnostics err_constraint = constraint_name;
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', case when err_constraint = 'prompt_shares_emails_lowercase' then 'PASS' else 'ERROR' end,
          'detail', case when err_constraint = 'prompt_shares_emails_lowercase'
                         then 'rejected by prompt_shares_emails_lowercase'
                         else format('rejected, but not by the email constraint: %s', sqlerrm) end);
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    -- ---- Sharing, as C (not part of the A -> B share) ----------------------

    perform set_config('request.jwt.claims',
      json_build_object('sub', user_c, 'email', email_c, 'role', 'authenticated')::text, true);

    chk := 'A third user cannot see a share between A and B';
    select count(*) into cnt from public.prompt_shares where id = share_ab;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('visible: %s, expected 0', cnt));

    chk := 'A third user cannot delete a share between A and B';
    delete from public.prompt_shares where id = share_ab;
    get diagnostics cnt = row_count;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('rows deleted: %s, expected 0', cnt));

    -- ---- Sharing, receiver B dismisses --------------------------------------

    perform set_config('request.jwt.claims',
      json_build_object('sub', user_b, 'email', email_b, 'role', 'authenticated')::text, true);

    chk := 'The receiver cannot redirect a share to another address';
    update public.prompt_shares set receiver_email = 'rls-test-attacker@example.invalid' where id = share_ab;
    get diagnostics cnt = row_count;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('rows changed: %s, expected 0', cnt));

    chk := 'The receiver can dismiss a share, and then loses access';
    select count(*) into before_cnt from public.prompts where id = prompt_a_shared;
    delete from public.prompt_shares where id = share_ab;
    get diagnostics cnt = row_count;
    select count(*) into after_cnt from public.prompts where id = prompt_a_shared;
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when before_cnt = 1 and cnt = 1 and after_cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('readable before: %s, shares deleted: %s, readable after: %s (expected 1, 1, 0)',
                       before_cnt, cnt, after_cnt));

    -- ---- Sharing, sender A revokes the share to C ---------------------------

    perform set_config('request.jwt.claims',
      json_build_object('sub', user_c, 'email', email_c, 'role', 'authenticated')::text, true);
    select count(*) into before_cnt from public.prompts where id = prompt_a_shared;

    perform set_config('request.jwt.claims',
      json_build_object('sub', user_a, 'email', email_a, 'role', 'authenticated')::text, true);
    delete from public.prompt_shares where id = share_ac;
    get diagnostics cnt = row_count;

    perform set_config('request.jwt.claims',
      json_build_object('sub', user_c, 'email', email_c, 'role', 'authenticated')::text, true);
    select count(*) into after_cnt from public.prompts where id = prompt_a_shared;

    chk := 'The sender can revoke a share, and the recipient loses access';
    i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
      'result', case when before_cnt = 1 and cnt = 1 and after_cnt = 0 then 'PASS' else 'FAIL' end,
      'detail', format('readable before: %s, shares deleted: %s, readable after: %s (expected 1, 1, 0)',
                       before_cnt, cnt, after_cnt));

    -- ---- Error log, as B ----------------------------------------------------

    phase := 'error log checks';
    area_label := 'Error log';
    perform set_config('request.jwt.claims',
      json_build_object('sub', user_b, 'email', email_b, 'role', 'authenticated')::text, true);

    chk := 'B can report their own error';
    begin
      insert into public.client_errors (user_id, message, source) values (user_b, 'rls test', 'rls-test');
      b_logged_error := true;
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'PASS', 'detail', 'insert accepted');
    exception when others then
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', format('%s: %s', sqlstate, sqlerrm));
    end;

    chk := 'B cannot report an error as A';
    begin
      insert into public.client_errors (user_id, message, source) values (user_a, 'rls test: forged', 'rls-test');
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'FAIL', 'detail', 'insert succeeded: error reports can be attributed to other users');
    exception
      when insufficient_privilege then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'PASS', 'detail', 'rejected by RLS');
      when others then
        i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
          'result', 'ERROR', 'detail', format('unexpected %s: %s', sqlstate, sqlerrm));
    end;

    chk := 'B cannot read the error log, not even their own rows';
    if b_logged_error then
      begin
        select count(*) into cnt from public.client_errors where user_id = user_b;
      exception when insufficient_privilege then cnt := 0;
      end;
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', case when cnt = 0 then 'PASS' else 'FAIL' end,
        'detail', case when cnt = 0 then 'no rows visible (1 exists)'
                       else format('%s rows visible: error text can quote prompt content', cnt) end);
    else
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', area_label, 'check', chk,
        'result', 'SKIP', 'detail', 'depends on "B can report their own error", which did not pass');
    end if;

    -- ---- Discard every row created above ------------------------------------

    phase := 'rolling back test data';
    raise exception using errcode = 'TRBCK', message = 'rls test sandbox rollback';

  exception
    when sqlstate 'TRBCK' then
      null;  -- The intended exit: the rollback has already discarded all test data.
    when others then
      i := i + 1; results := results || jsonb_build_object('n', i, 'area', 'Harness', 'check', 'Test run finished',
        'result', 'ERROR',
        'detail', format('stopped during %s (%s: %s). Checks after this point did not run.',
                         phase, sqlstate, sqlerrm));
  end;

  -- Outside the sandbox: test data is gone and the role is back to the admin.
  insert into rls_results (n, area, check_name, result, detail)
  select (e ->> 'n')::int, e ->> 'area', e ->> 'check', e ->> 'result', e ->> 'detail'
  from jsonb_array_elements(results) as e;

  insert into rls_results (n, area, check_name, result, detail)
  select 0, 'Summary',
    case when count(*) filter (where result in ('FAIL', 'ERROR')) = 0
         then 'RLS policies hold'
         else 'RLS PROBLEMS FOUND - see the rows below' end,
    case when count(*) filter (where result in ('FAIL', 'ERROR')) = 0 then 'PASS' else 'FAIL' end,
    format('%s passed, %s failed, %s errors, %s skipped',
           count(*) filter (where result = 'PASS'),
           count(*) filter (where result = 'FAIL'),
           count(*) filter (where result = 'ERROR'),
           count(*) filter (where result = 'SKIP'))
  from rls_results;
end $$;

select n, area, check_name, result, detail
from rls_results
order by n;
