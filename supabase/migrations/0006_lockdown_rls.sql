-- Lock down writes to service role only by denying anon clients via RLS.
-- Keep reads open where desired.

-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert any user" ON public.users;
DROP POLICY IF EXISTS "Users can update any user" ON public.users;
DROP POLICY IF EXISTS "Users can delete any user" ON public.users;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users deny inserts from anon" ON public.users FOR INSERT WITH CHECK (false);
CREATE POLICY "Users deny updates from anon" ON public.users FOR UPDATE USING (false);
CREATE POLICY "Users deny deletes from anon" ON public.users FOR DELETE USING (false);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles deny inserts from anon" ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "Profiles deny updates from anon" ON public.profiles FOR UPDATE USING (false);
CREATE POLICY "Profiles deny deletes from anon" ON public.profiles FOR DELETE USING (false);

-- Questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions can insert any question" ON public.questions;
DROP POLICY IF EXISTS "Questions can update any question" ON public.questions;
DROP POLICY IF EXISTS "Questions can delete any question" ON public.questions;
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Questions deny inserts from anon" ON public.questions FOR INSERT WITH CHECK (false);
CREATE POLICY "Questions deny updates from anon" ON public.questions FOR UPDATE USING (false);
CREATE POLICY "Questions deny deletes from anon" ON public.questions FOR DELETE USING (false);

-- Votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Votes can insert any vote" ON public.votes;
DROP POLICY IF EXISTS "Votes can update any vote" ON public.votes;
DROP POLICY IF EXISTS "Votes can delete any vote" ON public.votes;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Votes deny inserts from anon" ON public.votes FOR INSERT WITH CHECK (false);
CREATE POLICY "Votes deny updates from anon" ON public.votes FOR UPDATE USING (false);
CREATE POLICY "Votes deny deletes from anon" ON public.votes FOR DELETE USING (false);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments can insert any comment" ON public.comments;
DROP POLICY IF EXISTS "Comments can update any comment" ON public.comments;
DROP POLICY IF EXISTS "Comments can delete any comment" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments deny inserts from anon" ON public.comments FOR INSERT WITH CHECK (false);
CREATE POLICY "Comments deny updates from anon" ON public.comments FOR UPDATE USING (false);
CREATE POLICY "Comments deny deletes from anon" ON public.comments FOR DELETE USING (false);

-- Follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows can insert any follow" ON public.follows;
DROP POLICY IF EXISTS "Follows can update any follow" ON public.follows;
DROP POLICY IF EXISTS "Follows can delete any follow" ON public.follows;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Follows deny inserts from anon" ON public.follows FOR INSERT WITH CHECK (false);
CREATE POLICY "Follows deny updates from anon" ON public.follows FOR UPDATE USING (false);
CREATE POLICY "Follows deny deletes from anon" ON public.follows FOR DELETE USING (false);


