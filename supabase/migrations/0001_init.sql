-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  created_at timestamptz not null default now()
);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Votes table
create table if not exists public.votes (
  id bigserial primary key,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

-- Comments table
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Follows table
create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

-- Policies for users
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can delete own profile" on public.users for delete using (auth.uid() = id);

-- Policies for questions
create policy "Questions are viewable by everyone" on public.questions for select using (true);
create policy "Users can insert own questions" on public.questions for insert with check (auth.uid() = user_id);
create policy "Users can update own questions" on public.questions for update using (auth.uid() = user_id);
create policy "Users can delete own questions" on public.questions for delete using (auth.uid() = user_id);

-- Policies for votes
create policy "Votes are viewable by everyone" on public.votes for select using (true);
create policy "Users can insert own votes" on public.votes for insert with check (auth.uid() = user_id);
create policy "Users can update own votes" on public.votes for update using (auth.uid() = user_id);
create policy "Users can delete own votes" on public.votes for delete using (auth.uid() = user_id);

-- Policies for comments
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can insert own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- Policies for follows
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can manage own follows" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can delete own follows" on public.follows for delete using (auth.uid() = follower_id);
