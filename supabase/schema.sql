-- ============================================================================
-- France Notes — complete database schema
-- ============================================================================
-- Paste into the Supabase SQL editor and run. Safe to run more than once and
-- on an existing database: tables are only created if missing, and columns the
-- app needs are added if an older table lacks them. Nothing is dropped.
--
-- Every table is private per user via Row Level Security: a signed-in user can
-- only read and write rows where user_id = their own auth id.
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

-- ── Row Level Security: each user only sees their own rows ──────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'study_materials', 'saved_knowledge', 'reviewers', 'quizzes', 'reminders', 'notes',
    'retdem_procedures', 'retdem_upload_history', 'simulation_sessions', 'chat_messages',
    'podcast_episodes', 'dosage_calculations', 'saved_labs', 'study_folders'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Users manage their own rows" on public.%I', t);
    execute format(
      'create policy "Users manage their own rows" on public.%I for all to authenticated '
      'using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;
