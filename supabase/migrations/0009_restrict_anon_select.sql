-- Restrict read and delete access to authenticated users to prevent anonymous abuse

-- Users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Questions
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "Questions viewable by authenticated" ON public.questions
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Users can only delete their own questions" ON public.questions;
CREATE POLICY "Users delete own questions" ON public.questions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can delete any question" ON public.questions;
CREATE POLICY "Admins delete any question" ON public.questions
  FOR DELETE TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- Votes
DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
CREATE POLICY "Users view own votes" ON public.votes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by authenticated" ON public.comments
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Users can only delete their own comments" ON public.comments;
CREATE POLICY "Users delete own comments" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Follows
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by authenticated" ON public.follows
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Users can only delete their own follows" ON public.follows;
CREATE POLICY "Users delete own follows" ON public.follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);
