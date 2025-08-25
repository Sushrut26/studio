-- Insert sample users with profiles
insert into public.users (id, username, role)
values
  ('00000000-0000-0000-0000-000000000001', 'alice', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'bob', 'user');

-- Insert profiles for users
insert into public.profiles (id, name, avatar_url)
values
  ('00000000-0000-0000-0000-000000000001', 'Alice Admin', 'https://placehold.co/100x100.png?text=A'),
  ('00000000-0000-0000-0000-000000000002', 'Bob User', 'https://placehold.co/100x100.png?text=B');

-- Insert questions with proper schema
insert into public.questions (id, user_id, title, question_text, body, status, yes_votes, no_votes, comments_count, author_id)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'What is Supabase?', 'What is Supabase?', 'Can someone explain what Supabase is?', 'active', 5, 2, 3, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'How to use Next.js?', 'How to use Next.js?', 'Looking for resources about Next.js.', 'closed', 8, 1, 5, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Is pineapple on pizza acceptable?', 'Is pineapple on pizza acceptable?', 'The age-old debate about pineapple on pizza.', 'active', 12, 15, 8, '00000000-0000-0000-0000-000000000001');

-- Insert comments
insert into public.comments (id, question_id, user_id, content)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'Supabase is an open source Firebase alternative.'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Check the official documentation.');

-- Insert votes
insert into public.votes (question_id, user_id, value)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 1),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', -1);

-- Insert follows
insert into public.follows (follower_id, followee_id)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
