/*
  # Initial Schema Setup for Fitness Tracker

  1. New Tables
    - `profiles`
      - User profile information including height, weight, age, etc.
    - `diet_preferences` 
      - Lookup table for diet types
    - `fitness_goals`
      - User fitness goals and targets
    - `workouts`
      - Workout tracking
    - `workout_exercises`
      - Exercises within workouts
    - `friend_connections`
      - Friend relationships between users
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create enum types for various categories
CREATE TYPE activity_level AS ENUM ('sedentary', 'very_low', 'low', 'moderate', 'high');
CREATE TYPE diet_type AS ENUM ('vegan', 'vegetarian', 'pescatarian', 'eggetarian', 'non_vegetarian');
CREATE TYPE goal_type AS ENUM ('weight_loss', 'muscle_gain', 'maintenance', 'endurance');

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  age integer,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  activity_level activity_level,
  diet_preference diet_type,
  fitness_goal goal_type,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workouts table
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  calories_burned integer,
  notes text,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create workout exercises table
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) NOT NULL,
  exercise_name text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight_kg numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create friend connections table
CREATE TABLE friend_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  friend_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read friends' profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT friend_id FROM friend_connections 
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friend_connections 
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can read own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workout exercises"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage friend connections"
  ON friend_connections FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Create functions for friend management
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friend_id uuid;
  v_request_id uuid;
BEGIN
  -- Get friend's user ID
  SELECT id INTO v_friend_id FROM profiles WHERE email = friend_email;
  
  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Create friend request
  INSERT INTO friend_connections (user_id, friend_id, status)
  VALUES (auth.uid(), v_friend_id, 'pending')
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Create function to accept/reject friend requests
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(request_id uuid, response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response status';
  END IF;

  UPDATE friend_connections
  SET status = response,
      updated_at = now()
  WHERE id = request_id
    AND friend_id = auth.uid()
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
END;
$$;