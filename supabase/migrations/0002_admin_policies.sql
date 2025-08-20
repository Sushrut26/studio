-- Add role to users for admin support
alter table public.users add column if not exists role text not null default 'user';

-- Track question status
alter table public.questions add column if not exists status text not null default 'active';

-- Allow admins to update and delete any question
create policy "Admins can update any question" on public.questions
  for update using (auth.jwt()->>'role' = 'admin')
  with check (auth.jwt()->>'role' = 'admin');

create policy "Admins can delete any question" on public.questions
  for delete using (auth.jwt()->>'role' = 'admin');
