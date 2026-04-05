-- Fix handle_new_user trigger: extract first_name/last_name from Google OAuth metadata
-- Backfill existing profiles with display_name but empty first_name

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    ''
  );

  IF v_full_name <> '' THEN
    v_last_name  := split_part(v_full_name, ' ', array_length(string_to_array(v_full_name, ' '), 1));
    v_first_name := trim(substring(v_full_name from 1 for length(v_full_name) - length(v_last_name)));
    IF v_first_name = '' THEN
      v_first_name := v_last_name;
      v_last_name  := '';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    v_full_name,
    v_first_name,
    v_last_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing profiles
UPDATE public.profiles
SET
  first_name = CASE
    WHEN array_length(string_to_array(trim(display_name), ' '), 1) = 1
      THEN trim(display_name)
    ELSE trim(substring(display_name from 1 for length(display_name) - length(split_part(display_name, ' ', array_length(string_to_array(display_name, ' '), 1)))))
  END,
  last_name = CASE
    WHEN array_length(string_to_array(trim(display_name), ' '), 1) = 1
      THEN ''
    ELSE split_part(display_name, ' ', array_length(string_to_array(display_name, ' '), 1))
  END
WHERE (first_name IS NULL OR first_name = '')
  AND display_name IS NOT NULL
  AND display_name <> '';
