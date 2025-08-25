-- Fix questions table to use user_id consistently

-- First, let's see what columns exist
-- Drop the author_id column if it exists and ensure user_id is properly set up
ALTER TABLE public.questions DROP COLUMN IF EXISTS author_id;

-- Ensure user_id column exists and is properly configured
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL if it isn't already
ALTER TABLE public.questions ALTER COLUMN user_id SET NOT NULL;

-- Update any existing questions to have a default user_id if they don't have one
UPDATE public.questions 
SET user_id = (SELECT id FROM public.users LIMIT 1)
WHERE user_id IS NULL;

-- Update the vote count trigger to work with the correct column names
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.value = 1 THEN
      UPDATE questions SET yes_votes = yes_votes + 1 WHERE id = NEW.question_id;
    ELSE
      UPDATE questions SET no_votes = no_votes + 1 WHERE id = NEW.question_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value = 1 THEN
      UPDATE questions SET yes_votes = yes_votes - 1 WHERE id = OLD.question_id;
    ELSE
      UPDATE questions SET no_votes = no_votes - 1 WHERE id = OLD.question_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.value = 1 AND NEW.value = -1 THEN
      UPDATE questions SET yes_votes = yes_votes - 1, no_votes = no_votes + 1 WHERE id = NEW.question_id;
    ELSIF OLD.value = -1 AND NEW.value = 1 THEN
      UPDATE questions SET yes_votes = yes_votes + 1, no_votes = no_votes - 1 WHERE id = NEW.question_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
