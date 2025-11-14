-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create required tables (safe to run; use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  logged_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, logged_at);

CREATE TABLE IF NOT EXISTS workout_logs (
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

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, completed_at);

CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon_url text,
  category text NOT NULL CHECK (category IN ('weight', 'workout', 'streak', 'social', 'achievement')),
  criteria jsonb NOT NULL,
  points integer DEFAULT 0,
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  badge_id uuid REFERENCES badges(id) NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('weight_milestone', 'workout_streak', 'calories_burned', 'workouts_completed', 'social_goal')),
  title text NOT NULL,
  description text NOT NULL,
  value numeric(10,2),
  achieved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

CREATE TABLE IF NOT EXISTS leaderboard (
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

CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period, period_start);

-- 2) Enable Row Level Security (safe to re-run)
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- 3) Policies (created only if missing to avoid duplicate_object errors)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weight_logs' AND polname = 'Users can read own weight logs'
  ) THEN
    CREATE POLICY "Users can read own weight logs" ON weight_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weight_logs' AND polname = 'Users can insert own weight logs'
  ) THEN
    CREATE POLICY "Users can insert own weight logs" ON weight_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weight_logs' AND polname = 'Users can update own weight logs'
  ) THEN
    CREATE POLICY "Users can update own weight logs" ON weight_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_logs' AND polname = 'Users can read own workout logs'
  ) THEN
    CREATE POLICY "Users can read own workout logs" ON workout_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_logs' AND polname = 'Users can insert own workout logs'
  ) THEN
    CREATE POLICY "Users can insert own workout logs" ON workout_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Policies that depend on friend_connections might fail if table is missing; guard them
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_logs' AND polname = 'Users can read friends'' workout logs'
    ) THEN
      CREATE POLICY "Users can read friends' workout logs" ON workout_logs FOR SELECT TO authenticated
      USING (
        user_id IN (
          SELECT friend_id FROM friend_connections WHERE user_id = auth.uid() AND status = 'accepted'
          UNION
          SELECT user_id FROM friend_connections WHERE friend_id = auth.uid() AND status = 'accepted'
        )
      );
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'friend_connections table not found, skipping friends policy for workout_logs';
  END;

  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_badges' AND polname = 'Users can read friends'' badges'
    ) THEN
      CREATE POLICY "Users can read friends' badges" ON user_badges FOR SELECT TO authenticated
      USING (
        user_id IN (
          SELECT friend_id FROM friend_connections WHERE user_id = auth.uid() AND status = 'accepted'
          UNION
          SELECT user_id FROM friend_connections WHERE friend_id = auth.uid() AND status = 'accepted'
        )
      );
    END IF;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'friend_connections table not found, skipping friends policy for user_badges';
  END;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'badges' AND polname = 'Everyone can read badges'
  ) THEN
    CREATE POLICY "Everyone can read badges" ON badges FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_badges' AND polname = 'Users can read own badges'
  ) THEN
    CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'achievements' AND polname = 'Users can read own achievements'
  ) THEN
    CREATE POLICY "Users can read own achievements" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'achievements' AND polname = 'Users can read friends'' achievements'
  ) THEN
    CREATE POLICY "Users can read friends' achievements" ON achievements FOR SELECT TO authenticated
    USING (
      user_id IN (
        SELECT friend_id FROM friend_connections WHERE user_id = auth.uid() AND status = 'accepted'
        UNION
        SELECT user_id FROM friend_connections WHERE friend_id = auth.uid() AND status = 'accepted'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leaderboard' AND polname = 'Users can read leaderboard'
  ) THEN
    CREATE POLICY "Users can read leaderboard" ON leaderboard FOR SELECT TO authenticated USING (true);
  END IF;
END$$;

-- 4) Default badges (idempotent)
INSERT INTO badges (name, description, icon_url, category, criteria, points, rarity)
VALUES
('First Workout', 'Complete your first workout', '🏋️', 'workout', '{"workouts_completed": 1}', 10, 'common'),
('Week Warrior', 'Complete 7 workouts in a week', '⚔️', 'workout', '{"workouts_completed_weekly": 7}', 50, 'common'),
('Month Master', 'Complete 30 workouts in a month', '👑', 'workout', '{"workouts_completed_monthly": 30}', 200, 'rare'),
('Calorie Crusher', 'Burn 1000 calories in a single workout', '🔥', 'workout', '{"calories_burned_single": 1000}', 100, 'rare'),
('Weight Watcher', 'Log your weight for 7 consecutive days', '⚖️', 'weight', '{"weight_logs_streak": 7}', 25, 'common'),
('Transformation Titan', 'Lose 5kg', '💪', 'weight', '{"weight_lost": 5}', 150, 'epic'),
('Social Butterfly', 'Add 5 friends', '🦋', 'social', '{"friends_count": 5}', 30, 'common'),
('Consistency King', 'Maintain a 30-day workout streak', '👑', 'streak', '{"workout_streak": 30}', 300, 'legendary'),
('Early Bird', 'Complete 10 workouts before 8 AM', '🌅', 'achievement', '{"early_workouts": 10}', 75, 'rare'),
('Night Owl', 'Complete 10 workouts after 10 PM', '🦉', 'achievement', '{"late_workouts": 10}', 75, 'rare')
ON CONFLICT (name) DO NOTHING;

-- 5) Functions and triggers (CREATE OR REPLACE to be safe)

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
  current_week_start := date_trunc('week', CURRENT_DATE)::date;
  current_week_end := (current_week_start + interval '6 days')::date;

  current_month_start := date_trunc('month', CURRENT_DATE)::date;
  current_month_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

  DELETE FROM leaderboard
  WHERE (period = 'weekly' AND period_start = current_week_start)
     OR (period = 'monthly' AND period_start = current_month_start);

  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'weekly'::text,
    current_week_start,
    current_week_end,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC)
  FROM workout_logs wl
  WHERE wl.completed_at >= current_week_start
    AND wl.completed_at < (current_week_end + interval '1 day')
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC;

  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'monthly'::text,
    current_month_start,
    current_month_end,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC)
  FROM workout_logs wl
  WHERE wl.completed_at >= current_month_start
    AND wl.completed_at < (current_month_end + interval '1 day')
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC;

  DELETE FROM leaderboard WHERE period = 'all_time';

  INSERT INTO leaderboard (user_id, period, period_start, period_end, score_type, score, rank)
  SELECT
    wl.user_id,
    'all_time'::text,
    '2020-01-01'::date,
    CURRENT_DATE,
    'workouts_completed'::text,
    COUNT(*)::numeric,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC)
  FROM workout_logs wl
  GROUP BY wl.user_id
  ORDER BY COUNT(*) DESC, COALESCE(SUM(wl.calories_burned), 0) DESC;
END;
$$;

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
  -- NOTE: This function mirrors your migration. It may be conservative in awarding due to overwriting user_stats.
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

  SELECT
    COUNT(*) as weight_logs_count,
    COUNT(DISTINCT DATE(logged_at)) as weight_log_days,
    COALESCE(MAX(weight_kg) - MIN(weight_kg), 0) as weight_lost
  INTO user_stats
  FROM weight_logs
  WHERE user_id = user_uuid;

  SELECT COUNT(*) as friend_count
  INTO user_stats
  FROM friend_connections
  WHERE (user_id = user_uuid OR friend_id = user_uuid) AND status = 'accepted';

  FOR badge_record IN SELECT * FROM badges LOOP
    IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = user_uuid AND badge_id = badge_record.id) THEN
      should_award := false;

      CASE badge_record.category
        WHEN 'workout' THEN
          CASE
            WHEN badge_record.criteria->>'workouts_completed' IS NOT NULL THEN
              should_award := COALESCE(user_stats.workouts_completed, 0) >= (badge_record.criteria->>'workouts_completed')::integer;
            WHEN badge_record.criteria->>'workouts_completed_weekly' IS NOT NULL THEN
              should_award := COALESCE(user_stats.weekly_workouts, 0) >= (badge_record.criteria->>'workouts_completed_weekly')::integer;
            WHEN badge_record.criteria->>'workouts_completed_monthly' IS NOT NULL THEN
              should_award := COALESCE(user_stats.monthly_workouts, 0) >= (badge_record.criteria->>'workouts_completed_monthly')::integer;
            WHEN badge_record.criteria->>'calories_burned_single' IS NOT NULL THEN
              should_award := COALESCE(user_stats.high_calorie_workouts, 0) >= (badge_record.criteria->>'calories_burned_single')::integer;
          END CASE;
        WHEN 'weight' THEN
          CASE
            WHEN badge_record.criteria->>'weight_logs_streak' IS NOT NULL THEN
              should_award := COALESCE(user_stats.weight_log_days, 0) >= (badge_record.criteria->>'weight_logs_streak')::integer;
            WHEN badge_record.criteria->>'weight_lost' IS NOT NULL THEN
              should_award := COALESCE(user_stats.weight_lost, 0) >= (badge_record.criteria->>'weight_lost')::numeric;
          END CASE;
        WHEN 'social' THEN
          CASE
            WHEN badge_record.criteria->>'friends_count' IS NOT NULL THEN
              should_award := COALESCE(user_stats.friend_count, 0) >= (badge_record.criteria->>'friends_count')::integer;
          END CASE;
        WHEN 'streak' THEN
          should_award := false;
        WHEN 'achievement' THEN
          should_award := false;
      END CASE;

      IF should_award THEN
        INSERT INTO user_badges (user_id, badge_id) VALUES (user_uuid, badge_record.id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_badge_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workout_log_badge_check ON workout_logs;
CREATE TRIGGER workout_log_badge_check
  AFTER INSERT ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

DROP TRIGGER IF EXISTS weight_log_badge_check ON weight_logs;
CREATE TRIGGER weight_log_badge_check
  AFTER INSERT ON weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();

-- 6) Seed profiles for reference (uses your provided IDs and current weights)
-- Create a temporary mapping table of profiles we want to seed
DROP TABLE IF EXISTS tmp_seed_profiles;
CREATE TEMP TABLE tmp_seed_profiles (
  id uuid PRIMARY KEY,
  full_name text,
  current_weight_kg numeric(6,2)
);

INSERT INTO tmp_seed_profiles (id, full_name, current_weight_kg) VALUES
('faa6a368-8e7d-42c1-8090-065acdb51ad6', 'Halla Palla', 84.00),
('b7d5d996-7377-445a-b3c6-dac281c7d568', 'Testing', 70.00),
('faf7bffc-1993-41ea-9945-db715228df30', 'TestAccount', 65.00),
('b8d9274b-bc5a-4978-8702-77df85b889f7', 'Tijil Parakh', 65.00),
('69dcefd2-bed5-419f-9871-99a7dce1ee93', 'Annie Solanki', 47.00),
('28c78516-294f-4cb2-a143-6506a0883746', 'Vrushant', 85.00),
('f81b254d-31c0-4175-9a40-0a7eb9c45d50', 'Swarnima Singh', 58.00),
('befe8a32-e052-4cfc-9489-955bb828e07d', 'Test', 65.00);

-- 7) Seed weight_logs: 14 days of logs per user with slight variation
INSERT INTO weight_logs (id, user_id, weight_kg, logged_at, notes)
SELECT
  gen_random_uuid(),
  p.id,
  ROUND((p.current_weight_kg + (random() - 0.5) * 2)::numeric, 2), -- +/- 1 kg variation
  (date_trunc('day', now()) - (gs.day || ' days')::interval)::timestamptz,
  CASE WHEN (random() < 0.15) THEN 'Morning weigh-in' ELSE NULL END
FROM tmp_seed_profiles p
CROSS JOIN LATERAL generate_series(0, 13) AS gs(day);

-- 8) Seed workout_logs: workouts every 3 days over last 30 days
WITH workout_templates AS (
  SELECT unnest(ARRAY['Chest & Triceps', 'Back & Biceps', 'Leg Day', 'Shoulders & Traps', 'Cardio', 'Full Body']) AS name
)
INSERT INTO workout_logs (id, user_id, workout_id, name, duration_minutes, calories_burned, total_weight_lifted_kg, exercises_completed, completed_at, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  NULL::uuid,
  wt.name || ' Workout',
  30 + (floor(random() * 4) * 15)::int, -- 30, 45, 60, 75
  200 + (floor(random() * 10) * 50)::int, -- 200..650
  CASE WHEN wt.name IN ('Chest & Triceps', 'Back & Biceps', 'Leg Day', 'Shoulders & Traps', 'Full Body')
    THEN ROUND((500 + random() * 2000)::numeric, 2)
    ELSE NULL END,
  6 + (floor(random() * 5))::int, -- 6..10 exercises
  (
    date_trunc('day', now()) - (gs.day || ' days')::interval
    + make_interval(hours => floor(random() * 12)::int, minutes => floor(random() * 60)::int)
  )::timestamptz,
  now()
FROM tmp_seed_profiles p
CROSS JOIN workout_templates wt
CROSS JOIN LATERAL generate_series(0, 27, 3) AS gs(day) -- every ~3 days over ~4 weeks
WHERE random() > 0.35; -- some days skipped for realism

-- Recompute leaderboard with seeded data
SELECT update_leaderboard();

-- Award badges for all seeded users (guarded for missing social tables)
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM tmp_seed_profiles LOOP
    BEGIN
      PERFORM check_and_award_badges(u.id);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'friend_connections table missing; skipped social badge checks for user %', u.id;
    END;
  END LOOP;
END $$;

-- Quick verification: counts per table
SELECT 'weight_logs' AS table, COUNT(*) AS rows FROM weight_logs
UNION ALL
SELECT 'workout_logs' AS table, COUNT(*) AS rows FROM workout_logs
UNION ALL
SELECT 'leaderboard' AS table, COUNT(*) AS rows FROM leaderboard
UNION ALL
SELECT 'user_badges' AS table, COUNT(*) AS rows FROM user_badges
ORDER BY table;

-- Sample leaderboard (top 10 weekly)
SELECT l.period, l.rank, l.user_id, p.full_name, l.score
FROM leaderboard l
JOIN profiles p ON p.id = l.user_id
WHERE l.period = 'weekly'
ORDER BY l.rank ASC
LIMIT 10;