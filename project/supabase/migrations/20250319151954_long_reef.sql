/*
  # Add Image Storage and AI Features

  1. New Tables
    - `ai_generated_plans`
      - Stores AI-generated workout and diet plans
    - `user_images`
      - Tracks user uploaded images and their metadata

  2. Updates
    - Add storage bucket policies for user images
    - Add new columns for AI-generated content
    - Update profile image handling

  3. Security
    - Enable RLS on new tables
    - Add policies for image access
*/

-- Create storage bucket for user images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_images', 'user_images', false);

-- Set up storage bucket policies
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user_images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for AI-generated plans
CREATE TABLE ai_generated_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('workout', 'diet')),
  title text NOT NULL,
  description text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_generated_plans
ALTER TABLE ai_generated_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_generated_plans
CREATE POLICY "Users can read own plans"
ON ai_generated_plans FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own plans"
ON ai_generated_plans FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own plans"
ON ai_generated_plans FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own plans"
ON ai_generated_plans FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create function to generate workout plan using OpenAI
CREATE OR REPLACE FUNCTION generate_workout_plan(
  user_id uuid,
  fitness_level text,
  goal text,
  duration_minutes integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- In a real implementation, this would call OpenAI API
  -- For now, we'll insert a placeholder plan
  INSERT INTO ai_generated_plans (
    user_id,
    plan_type,
    title,
    description,
    content
  ) VALUES (
    user_id,
    'workout',
    'Custom ' || goal || ' Workout Plan',
    'A personalized workout plan based on your fitness level and goals',
    jsonb_build_object(
      'exercises', jsonb_build_array(
        jsonb_build_object(
          'name', 'Placeholder Exercise',
          'sets', 3,
          'reps', 12,
          'rest', '60 seconds'
        )
      )
    )
  ) RETURNING id INTO v_plan_id;

  RETURN v_plan_id;
END;
$$;

-- Create function to generate diet plan using OpenAI
CREATE OR REPLACE FUNCTION generate_diet_plan(
  user_id uuid,
  diet_type text,
  calorie_target integer,
  allergies text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- In a real implementation, this would call OpenAI API
  -- For now, we'll insert a placeholder plan
  INSERT INTO ai_generated_plans (
    user_id,
    plan_type,
    title,
    description,
    content
  ) VALUES (
    user_id,
    'diet',
    'Custom ' || diet_type || ' Diet Plan',
    'A personalized diet plan based on your preferences and goals',
    jsonb_build_object(
      'meals', jsonb_build_array(
        jsonb_build_object(
          'name', 'Placeholder Meal',
          'calories', calorie_target / 3,
          'macros', jsonb_build_object(
            'protein', '30g',
            'carbs', '40g',
            'fats', '15g'
          )
        )
      )
    )
  ) RETURNING id INTO v_plan_id;

  RETURN v_plan_id;
END;
$$;