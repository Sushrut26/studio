-- Enforce that user-owned rows are only insertable/updated by that user via RLS

-- Questions
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Users insert own questions" ON public.questions;
CREATE POLICY "Users insert own questions" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update their own questions" ON public.questions;
DROP POLICY IF EXISTS "Users update own questions" ON public.questions;
CREATE POLICY "Users update own questions" ON public.questions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Votes
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Users insert own votes" ON public.votes;
CREATE POLICY "Users insert own votes" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Profiles
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


