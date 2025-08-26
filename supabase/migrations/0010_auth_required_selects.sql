-- Require authentication for SELECTs on all core tables

-- Users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- Profiles
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Questions
DROP POLICY IF EXISTS "Questions viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions viewable by authenticated" ON public.questions;
CREATE POLICY "Questions viewable by authenticated" ON public.questions
  FOR SELECT TO authenticated
  USING (true);

-- Comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments viewable by authenticated" ON public.comments;
CREATE POLICY "Comments viewable by authenticated" ON public.comments
  FOR SELECT TO authenticated
  USING (true);

-- Follows
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Follows viewable by authenticated" ON public.follows;
CREATE POLICY "Follows viewable by authenticated" ON public.follows
  FOR SELECT TO authenticated
  USING (true);


