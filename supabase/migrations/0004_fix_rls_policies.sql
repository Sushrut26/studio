-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own user" ON public.users;
DROP POLICY IF EXISTS "Users can update own user" ON public.users;
DROP POLICY IF EXISTS "Users can delete own user" ON public.users;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Users can insert own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can update own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;

-- Create new, more permissive RLS policies

-- Users table policies
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert any user" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update any user" ON public.users
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete any user" ON public.users
    FOR DELETE USING (true);

-- Profiles table policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Profiles can insert any profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles can update any profile" ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "Profiles can delete any profile" ON public.profiles
    FOR DELETE USING (true);

-- Questions table policies
CREATE POLICY "Questions are viewable by everyone" ON public.questions
    FOR SELECT USING (true);

CREATE POLICY "Questions can insert any question" ON public.questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Questions can update any question" ON public.questions
    FOR UPDATE USING (true);

CREATE POLICY "Questions can delete any question" ON public.questions
    FOR DELETE USING (true);

-- Comments table policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Comments can insert any comment" ON public.comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Comments can update any comment" ON public.comments
    FOR UPDATE USING (true);

CREATE POLICY "Comments can delete any comment" ON public.comments
    FOR DELETE USING (true);

-- Votes table policies
CREATE POLICY "Votes are viewable by everyone" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Votes can insert any vote" ON public.votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Votes can update any vote" ON public.votes
    FOR UPDATE USING (true);

CREATE POLICY "Votes can delete any vote" ON public.votes
    FOR DELETE USING (true);

-- Follows table policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Follows can insert any follow" ON public.follows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Follows can update any follow" ON public.follows
    FOR UPDATE USING (true);

CREATE POLICY "Follows can delete any follow" ON public.follows
    FOR DELETE USING (true);
