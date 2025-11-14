/*
  # Progress Tracking, Leaderboard, and Badge System

  1. New Tables
    - `weight_logs`
      - Track user's weight over time
    - `workout_logs`
      - Track completed workouts with metrics
    - `achievements`
      - User achievements and milestones
    - `badges`
      - Available badges in the system
    - `user_badges`
      - Badges earned by users
    - `leaderboard`
      - Weekly/monthly leaderboard data

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create weight_logs table
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  logged_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create workout_logs table
CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  workout_id uuid REFERENCES workouts(id),
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  calories_burned integer,
  total_weight_lifted_kg numeric(8,2),
  exercises_completed integer,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create badges table
CREATE TABLE badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon_url text,
  category text NOT NULL CHECK (category IN ('weight', 'workout', 'streak', 'social', 'achievement')),
  criteria jsonb NOT NULL, -- JSON object defining how to earn the badge
  points integer DEFAULT 0,
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

-- Create user_badges table
CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  badge_id uuid REFERENCES badges(id) NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create achievements table
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('weight_milestone', 'workout_streak', 'calories_burned', 'workouts_completed', 'social_goal')),
  title text NOT NULL,
  description text NOT NULL,
  value numeric(10,2), -- e.g., weight lost, streak days, calories burned
  achieved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  period text NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  score_type text NOT NULL CHECK (score_type IN ('workouts_completed', 'calories_burned', 'weight_lost', 'total_points')),
  score numeric(10,2) NOT NULL,
  rank integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period, period_start, score_type)
);

-- Enable Row Level Security
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own weight logs"
  ON weight_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own workout logs"
  ON workout_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workout logs"
  ON workout_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read friends' workout logs"
  ON workout_logs FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT friend_id FROM friend_connections
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friend_connections
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Everyone can read badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read friends' badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT friend_id FROM friend_connections
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friend_connections
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can read own achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read friends' achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT friend_id FROM friend_connections
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM friend_connections
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can read leaderboard"
  ON leaderboard FOR SELECT
  TO authenticated
  USING (true);

-- Insert default badges
INSERT INTO badges (name, description, icon_url, category, criteria, points, rarity) VALUES
('First Workout', 'Complete your first workout', '🏋️', 'workout', '{"workouts_completed": 1}', 10, 'common'),
('Week Warrior', 'Complete 7 workouts in a week', '⚔️', 'workout', '{"workouts_completed_weekly": 7}', 50, 'common'),
('Month Master', 'Complete 30 workouts in a month', '👑', 'workout', '{"workouts_completed_monthly": 30}', 200, 'rare'),
('Calorie Crusher', 'Burn 1000 calories in a single workout', '🔥', 'workout', '{"calories_burned_single": 1000}', 100, 'rare'),
('Weight Watcher', 'Log your weight for 7 consecutive days', '⚖️', 'weight', '{"weight_logs_streak": 7}', 25, 'common'),
('Transformation Titan', 'Lose 5kg', '💪', 'weight', '{"weight_lost": 5}', 150, 'epic'),
('Social Butterfly', 'Add 5 friends', '🦋', 'social', '{"friends_count": 5}', 30, 'common'),
('Consistency King', 'Maintain a 30-day workout streak', '👑', 'streak', '{"workout_streak": 30}', 300, 'legendary'),
('Early Bird', 'Complete 10 workouts before 8 AM', '🌅', 'achievement', '{"early_workouts": 10}', 75, 'rare'),
('Night Owl', 'Complete 10 workouts after 10 PM', '🦉', 'achievement', '{"late_workouts": 10}', 75, 'rare');

-- Create function to calculate and update leaderboard
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start date;
  current_week_end date;
  current_month_start date;
  current_month_end date;
BEGIN
  -- Calculate current week
  current_week_start := date_trunc('week', CURRENT_DATE)::date;
  current_week_end := (current_week_start + interval '6 days')::date;

  -- Calculate current month
  current_month_start := date_trunc('month', CURRENT_DATE)::date;
  current_month_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

  -- Clear existing leaderboard for current periods
  DELETE FROM leaderboard
  WHERE (period = 'weekly' AND period_start = current_week_start)
     OR (period = 'monthly' AND period_start = current_month_start);

  -- Insert weekly leaderboard
  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'weekly'::text,
    current_week_start,
    current_week_end,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC)
  FROM workout_logs wl
  WHERE wl.completed_at >= current_week_start
    AND wl.completed_at <= current_week_end + interval '1 day - 1 second'
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC;

  -- Insert monthly leaderboard
  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'monthly'::text,
    current_month_start,
    current_month_end,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC)
  FROM workout_logs wl
  WHERE wl.completed_at >= current_month_start
    AND wl.completed_at <= current_month_end + interval '1 day - 1 second'
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC;

  -- Insert all-time leaderboard
  DELETE FROM leaderboard WHERE period = 'all_time';

  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'all_time'::text,
    '2020-01-01'::date,
    CURRENT_DATE,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC)
  FROM workout_logs wl
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, SUM(wl.calories_burned) DESC;

END;
$$;

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record record;
  user_stats record;
  should_award boolean;
BEGIN
  -- Get user statistics
  SELECT
    COUNT(wl.*) as workouts_completed,
    COALESCE(SUM(wl.calories_burned), 0) as total_calories,
    COUNT(CASE WHEN wl.completed_at >= date_trunc('week', CURRENT_DATE) THEN 1 END) as weekly_workouts,
    COUNT(CASE WHEN wl.completed_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as monthly_workouts,
    COUNT(wl2.*) FILTER (WHERE wl2.calories_burned >= 1000) as high_calorie_workouts,
    COUNT(DISTINCT wl3.completed_at::date) as workout_days,
    COUNT(ub.*) as badges_earned
  INTO user_stats
  FROM workout_logs wl
  LEFT JOIN workout_logs wl2 ON wl2.user_id = user_uuid AND wl2.calories_burned >= 1000
  LEFT JOIN workout_logs wl3 ON wl3.user_id = user_uuid
  LEFT JOIN user_badges ub ON ub.user_id = user_uuid
  WHERE wl.user_id = user_uuid;

  -- Get weight statistics
  SELECT
    COUNT(*) as weight_logs_count,
    COUNT(DISTINCT DATE(logged_at)) as weight_log_days,
    COALESCE(MAX(weight_kg) - MIN(weight_kg), 0) as weight_lost
  INTO user_stats
  FROM weight_logs
  WHERE user_id = user_uuid;

  -- Get friend count
  SELECT COUNT(*) as friend_count
  INTO user_stats
  FROM friend_connections
  WHERE (user_id = user_uuid OR friend_id = user_uuid) AND status = 'accepted';

  -- Check each badge
  FOR badge_record IN SELECT * FROM badges LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = badge_record.id) THEN
      should_award := false;

      -- Evaluate badge criteria
      CASE badge_record.category
        WHEN 'workout' THEN
          CASE
            WHEN badge_record.criteria->>'workouts_completed' IS NOT NULL THEN
              should_award := user_stats.workouts_completed >= (badge_record.criteria->>'workouts_completed')::integer;
            WHEN badge_record.criteria->>'workouts_completed_weekly' IS NOT NULL THEN
              should_award := user_stats.weekly_workouts >= (badge_record.criteria->>'workouts_completed_weekly')::integer;
            WHEN badge_record.criteria->>'workouts_completed_monthly' IS NOT NULL THEN
              should_award := user_stats.monthly_workouts >= (badge_record.criteria->>'workouts_completed_monthly')::integer;
            WHEN badge_record.criteria->>'calories_burned_single' IS NOT NULL THEN
              should_award := user_stats.high_calorie_workouts >= (badge_record.criteria->>'calories_burned_single')::integer;
          END CASE;
        WHEN 'weight' THEN
          CASE
            WHEN badge_record.criteria->>'weight_logs_streak' IS NOT NULL THEN
              should_award := user_stats.weight_log_days >= (badge_record.criteria->>'weight_logs_streak')::integer;
            WHEN badge_record.criteria->>'weight_lost' IS NOT NULL THEN
              should_award := user_stats.weight_lost >= (badge_record.criteria->>'weight_lost')::numeric;
          END CASE;
        WHEN 'social' THEN
          CASE
            WHEN badge_record.criteria->>'friends_count' IS NOT NULL THEN
              should_award := user_stats.friend_count >= (badge_record.criteria->>'friends_count')::integer;
          END CASE;
        WHEN 'streak' THEN
          -- This would require more complex streak calculation
          should_award := false; -- Placeholder
        WHEN 'achievement' THEN
          -- This would require specific achievement tracking
          should_award := false; -- Placeholder
      END CASE;

      -- Award badge if criteria met
      IF should_award THEN
        INSERT INTO user_badges (user_id, badge_id) VALUES (user_uuid, badge_record.id);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to automatically check badges after workout completion
CREATE OR REPLACE FUNCTION trigger_badge_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER workout_log_badge_check
  AFTER INSERT ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

-- Create trigger to automatically check badges after weight logging
CREATE TRIGGER weight_log_badge_check
  AFTER INSERT ON weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();
