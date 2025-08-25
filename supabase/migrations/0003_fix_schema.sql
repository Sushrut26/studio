-- Fix database schema to match the application code

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns to questions table
alter table public.questions add column if not exists question_text text;
alter table public.questions add column if not exists yes_votes integer not null default 0;
alter table public.questions add column if not exists no_votes integer not null default 0;
alter table public.questions add column if not exists comments_count integer not null default 0;
alter table public.questions add column if not exists expires_at timestamptz;
alter table public.questions add column if not exists author_id uuid references auth.users(id) on delete cascade;

-- Update existing questions to have question_text from title
update public.questions set question_text = title where question_text is null;

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = id);

-- Update questions policies to work with both user_id and author_id
create policy "Questions are viewable by everyone" on public.questions for select using (true);
create policy "Users can insert own questions" on public.questions for insert with check (auth.uid() = user_id or auth.uid() = author_id);
create policy "Users can update own questions" on public.questions for update using (auth.uid() = user_id or auth.uid() = author_id);
create policy "Users can delete own questions" on public.questions for delete using (auth.uid() = user_id or auth.uid() = author_id);

-- Update votes policies to work with Firebase auth
create policy "Votes are viewable by everyone" on public.votes for select using (true);
create policy "Users can insert own votes" on public.votes for insert with check (true);
create policy "Users can update own votes" on public.votes for update using (true);
create policy "Users can delete own votes" on public.votes for delete using (true);

-- Update comments policies to work with Firebase auth
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can insert own comments" on public.comments for insert with check (true);
create policy "Users can update own comments" on public.comments for update using (true);
create policy "Users can delete own comments" on public.comments for delete using (true);

-- Update follows policies to work with Firebase auth
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can manage own follows" on public.follows for insert with check (true);
create policy "Users can delete own follows" on public.follows for delete using (true);

-- Create function to update vote counts
create or replace function update_vote_counts()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.value = 1 then
      update questions set yes_votes = yes_votes + 1 where id = new.question_id;
    else
      update questions set no_votes = no_votes + 1 where id = new.question_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.value = 1 then
      update questions set yes_votes = yes_votes - 1 where id = old.question_id;
    else
      update questions set no_votes = no_votes - 1 where id = old.question_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.value = 1 and new.value = -1 then
      update questions set yes_votes = yes_votes - 1, no_votes = no_votes + 1 where id = new.question_id;
    elsif old.value = -1 and new.value = 1 then
      update questions set yes_votes = yes_votes + 1, no_votes = no_votes - 1 where id = new.question_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

-- Create trigger for vote counts
drop trigger if exists update_vote_counts_trigger on votes;
create trigger update_vote_counts_trigger
  after insert or update or delete on votes
  for each row execute function update_vote_counts();
