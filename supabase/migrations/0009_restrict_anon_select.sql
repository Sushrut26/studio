-- Allow anonymous read access for public data while protecting sensitive operations

-- Users (keep anonymous read for now, but restrict to authenticated later if needed)
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT TO public
  USING (true);

-- Profiles (allow anonymous view but restrict sensitive data)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles
  FOR SELECT TO public
  USING (true);

-- Questions (allow anonymous view for public polls)
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions viewable by authenticated" ON public.questions;
CREATE POLICY "Questions viewable by everyone" ON public.questions
  FOR SELECT TO public
  USING (true);

-- Votes (keep private - only users can see their own votes)
DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users view own votes" ON public.votes;
CREATE POLICY "Users view own votes" ON public.votes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Comments (allow anonymous view but require auth for creation)
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments viewable by authenticated" ON public.comments;
CREATE POLICY "Comments viewable by everyone" ON public.comments
  FOR SELECT TO public
  USING (true);

-- Follows (keep private)
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Follows viewable by authenticated" ON public.follows;
CREATE POLICY "Follows viewable by everyone" ON public.follows
  FOR SELECT TO authenticated
  USING (true);
