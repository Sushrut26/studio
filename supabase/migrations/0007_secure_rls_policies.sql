-- Drop existing policies
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users deny inserts from anon" ON public.users;
DROP POLICY IF EXISTS "Users deny updates from anon" ON public.users;
DROP POLICY IF EXISTS "Users deny deletes from anon" ON public.users;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles deny inserts from anon" ON public.profiles;
DROP POLICY IF EXISTS "Profiles deny updates from anon" ON public.profiles;
DROP POLICY IF EXISTS "Profiles deny deletes from anon" ON public.profiles;

DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions deny inserts from anon" ON public.questions;
DROP POLICY IF EXISTS "Questions deny updates from anon" ON public.questions;
DROP POLICY IF EXISTS "Questions deny deletes from anon" ON public.questions;

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
DROP POLICY IF EXISTS "Votes deny inserts from anon" ON public.votes;
DROP POLICY IF EXISTS "Votes deny updates from anon" ON public.votes;
DROP POLICY IF EXISTS "Votes deny deletes from anon" ON public.votes;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments deny inserts from anon" ON public.comments;
DROP POLICY IF EXISTS "Comments deny updates from anon" ON public.comments;
DROP POLICY IF EXISTS "Comments deny deletes from anon" ON public.comments;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Follows deny inserts from anon" ON public.follows;
DROP POLICY IF EXISTS "Follows deny updates from anon" ON public.follows;
DROP POLICY IF EXISTS "Follows deny deletes from anon" ON public.follows;

-- Create new, secure RLS policies

-- Users table policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can only insert their own user record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can only update their own user record" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can only delete their own user record" ON public.users FOR DELETE USING (auth.uid() = id);

-- Profiles table policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can only insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can only update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can only delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Questions table policies
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert questions" ON public.questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can only update their own questions" ON public.questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own questions" ON public.questions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any question" ON public.questions FOR UPDATE USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admins can delete any question" ON public.questions FOR DELETE USING (auth.jwt()->>'role' = 'admin');

-- Votes table policies
CREATE POLICY "Users can view their own votes" ON public.votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert votes" ON public.votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Do not allow updating or deleting votes

-- Comments table policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can only update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Follows table policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert follows" ON public.follows FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can only delete their own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
