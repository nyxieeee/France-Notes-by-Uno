-- ============================================================================
-- France Notes — complete database schema
-- ============================================================================
-- Paste into the Supabase SQL editor and run. Safe to run more than once and
-- on an existing database: tables are only created if missing, and columns the
-- app needs are added if an older table lacks them. Nothing is dropped.
--
-- Security (see the section at the end):
--   * Row Level Security is enabled AND forced on every table: a signed-in user
--     can only read, add, change or delete rows whose user_id is their own id.
--   * Separate policies per action; updates can't move a row to another user.
--   * Signed-out visitors (anon) have no access at all; signed-in users get only
--     select/insert/update/delete. user_id defaults to the signed-in user.
--   * Size limits on large text/image columns so the database can't be flooded.
--
-- Profile details (full name, school, year level, avatar) live in the Supabase
-- auth user's metadata, so there is no separate profiles table.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Study Box: uploaded and generated study materials ───────────────────────
create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_type text not null default 'txt',
  file_size bigint not null default 0,
  storage_path text,
  extracted_text text,
  preview_image text,
  topic_id text,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  summary text,
  created_at timestamptz not null default now()
);
alter table public.study_materials add column if not exists file_size bigint not null default 0;
alter table public.study_materials add column if not exists storage_path text;
alter table public.study_materials add column if not exists preview_image text;
alter table public.study_materials add column if not exists tags text[] not null default '{}';
alter table public.study_materials add column if not exists summary text;

-- ── Knowledge Garden: saved trusted-source references ───────────────────────
create table if not exists public.saved_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  source text,
  url text,
  category text,
  date_saved timestamptz not null default now()
);

-- ── Reviewer Library: AI reviewers and slide decks ──────────────────────────
create table if not exists public.reviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text,
  title text not null,
  source_file text,
  content jsonb not null default '{}'::jsonb,  -- summary, key_points, flashcards, mnemonics, slides
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Quizzes: completed quizzes with questions and answers ───────────────────
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text,
  title text not null,
  total_items integer not null default 0,
  question_type text not null default 'mixed',
  score integer,
  completed boolean not null default false,
  timer_type text default 'untimed',
  timer_value integer default 0,
  questions jsonb,
  user_answers jsonb,
  created_at timestamptz not null default now()
);
alter table public.quizzes add column if not exists timer_type text default 'untimed';
alter table public.quizzes add column if not exists timer_value integer default 0;
alter table public.quizzes add column if not exists questions jsonb;
alter table public.quizzes add column if not exists user_answers jsonb;

-- ── Planner: reminders and deadlines ────────────────────────────────────────
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_date timestamptz not null,
  reminder_type text not null default 'other'
    check (reminder_type in ('assignment', 'quiz', 'exam', 'retdem', 'duty', 'other')),
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ── Notes: typed and handwritten notes ──────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  kind text not null default 'text' check (kind in ('text', 'handwriting')),
  drawing jsonb,  -- handwriting: { paper, pages, strokes: [{ tool, color, size, points: [[x, y, pressure]] }] }
  topic_id text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes add column if not exists kind text not null default 'text';
alter table public.notes add column if not exists drawing jsonb;

-- ── Clinical Simulations: RetDem procedures, uploads and session results ────
create table if not exists public.retdem_procedures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'General',
  description text,
  duration text,
  rationale text,
  materials jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,  -- [{ step, action, rationale }]
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.retdem_upload_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  text text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('recitation', 'retdem')),
  topic text not null,
  difficulty text not null,
  source_name text,
  scores jsonb not null,  -- { accuracy, safety, reasoning, confidence }
  feedback jsonb,         -- { correct[], missed[], safetyViolations[] }
  created_at timestamptz not null default now()
);

-- ── Doc Uno / Nurse Florence chat backup ────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
-- Which conversation a message belongs to, so chats sync across devices
alter table public.chat_messages add column if not exists session_id text;
alter table public.chat_messages add column if not exists session_title text;

-- ── Nursepod episodes (ids are generated by the app, so text) ───────────────
create table if not exists public.podcast_episodes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  topic text,
  script jsonb not null default '[]'::jsonb,  -- [{ speaker, text }]
  source_type text,
  created_at timestamptz not null default now()
);

-- ── Dosage Calculator history (ids are generated by the app, so text) ───────
create table if not exists public.dosage_calculations (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  calc_type text not null,
  title text not null,
  summary text,
  details text,
  created_at timestamptz not null default now()
);

-- ── Reference Lab Charts: starred labs ──────────────────────────────────────
create table if not exists public.saved_labs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lab_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, lab_name)
);

-- ── Study Box folders she creates (built-in subject folders live in the app) ─
create table if not exists public.study_folders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  color text not null default '#F2B8C6',
  created_at timestamptz not null default now()
);

-- ── Profile photos: full-size originals (so they can be re-cropped) and the cover photo ─
create table if not exists public.profile_media (
  user_id uuid primary key references auth.users (id) on delete cascade,
  avatar_original text,
  avatar_crop jsonb,
  cover_image text,
  cover_original text,
  cover_crop jsonb,
  updated_at timestamptz not null default now()
);

-- ── Indexes for the per-user, newest-first lists the app loads ──────────────
create index if not exists study_materials_user_created_idx on public.study_materials (user_id, created_at desc);
create index if not exists saved_knowledge_user_saved_idx on public.saved_knowledge (user_id, date_saved desc);
create index if not exists reviewers_user_created_idx on public.reviewers (user_id, created_at desc);
create index if not exists quizzes_user_created_idx on public.quizzes (user_id, created_at desc);
create index if not exists reminders_user_due_idx on public.reminders (user_id, due_date);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index if not exists retdem_procedures_user_created_idx on public.retdem_procedures (user_id, created_at desc);
create index if not exists retdem_upload_history_user_idx on public.retdem_upload_history (user_id, uploaded_at desc);
create index if not exists simulation_sessions_user_created_idx on public.simulation_sessions (user_id, created_at desc);
create index if not exists chat_messages_user_created_idx on public.chat_messages (user_id, created_at);
create index if not exists chat_messages_user_session_idx on public.chat_messages (user_id, session_id);
create index if not exists podcast_episodes_user_created_idx on public.podcast_episodes (user_id, created_at desc);
create index if not exists dosage_calculations_user_created_idx on public.dosage_calculations (user_id, created_at desc);
create index if not exists study_folders_user_created_idx on public.study_folders (user_id, created_at);

-- ── Security ────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'study_materials', 'saved_knowledge', 'reviewers', 'quizzes', 'reminders', 'notes',
    'retdem_procedures', 'retdem_upload_history', 'simulation_sessions', 'chat_messages',
    'podcast_episodes', 'dosage_calculations', 'saved_labs', 'study_folders', 'profile_media'
  ];
begin
  foreach t in array tables loop
    -- Row Level Security on, and enforced even for the table owner
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    -- New rows belong to whoever is signed in unless the app says otherwise (policies still check it)
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);

    -- No access for signed-out visitors; signed-in users get only the four row operations
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    -- One policy per action. (select auth.uid()) is evaluated once per query, not per row.
    execute format('drop policy if exists "Users manage their own rows" on public.%I', t);
    execute format('drop policy if exists "Read own rows" on public.%I', t);
    execute format('drop policy if exists "Add own rows" on public.%I', t);
    execute format('drop policy if exists "Change own rows" on public.%I', t);
    execute format('drop policy if exists "Delete own rows" on public.%I', t);
    execute format('create policy "Read own rows" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Add own rows" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Change own rows" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Delete own rows" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Size limits (characters). NOT VALID: existing rows are left alone, new and changed rows are checked.
do $$
declare
  c record;
begin
  for c in select * from (values
    ('study_materials', 'study_materials_extracted_text_size', 'length(extracted_text) <= 5000000'),
    ('study_materials', 'study_materials_preview_image_size', 'length(preview_image) <= 4000000'),
    ('study_materials', 'study_materials_summary_size', 'length(summary) <= 500000'),
    ('study_materials', 'study_materials_file_name_size', 'length(file_name) <= 500'),
    ('notes', 'notes_content_size', 'length(content) <= 1000000'),
    ('notes', 'notes_drawing_size', 'pg_column_size(drawing) <= 20000000'),
    ('chat_messages', 'chat_messages_content_size', 'length(content) <= 200000'),
    ('reviewers', 'reviewers_content_size', 'pg_column_size(content) <= 5000000'),
    ('quizzes', 'quizzes_questions_size', 'pg_column_size(questions) <= 5000000'),
    ('retdem_upload_history', 'retdem_upload_history_text_size', 'length(text) <= 2000000'),
    ('podcast_episodes', 'podcast_episodes_id_size', 'length(id) <= 200'),
    ('podcast_episodes', 'podcast_episodes_script_size', 'pg_column_size(script) <= 2000000'),
    ('dosage_calculations', 'dosage_calculations_id_size', 'length(id) <= 200'),
    ('study_folders', 'study_folders_id_size', 'length(id) <= 200'),
    ('study_folders', 'study_folders_title_size', 'length(title) <= 200'),
    ('profile_media', 'profile_media_avatar_size', 'length(avatar_original) <= 4000000'),
    ('profile_media', 'profile_media_cover_size', 'length(cover_image) <= 4000000 and length(cover_original) <= 4000000')
  ) as v(tbl, name, expr)
  loop
    if not exists (select 1 from pg_constraint where conname = c.name) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
    end if;
  end loop;
end $$;

-- ── Realtime: changes made on one device show up on her other devices ───────
-- Realtime respects the Row Level Security policies above, so each user only
-- receives events for their own rows.
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'study_materials', 'study_folders', 'saved_knowledge', 'reviewers', 'quizzes',
      'reminders', 'notes', 'retdem_procedures'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
