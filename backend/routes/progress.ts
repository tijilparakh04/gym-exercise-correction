import express from 'express';
import { supabase } from '../supabaseClient';

const router = express.Router();

// Middleware to handle common errors
const handleError = (res: express.Response, error: any) => {
  console.error('API Error:', error);
  return res.status(error.status || 400).json({
    error: error.message || 'An error occurred',
    code: error.code
  });
};

// Get all available badges
router.get('/badges', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('points', { ascending: false });

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get progress summary for a user
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get workout stats
    const { data: workoutStats, error: workoutError } = await supabase
      .from('workout_logs')
      .select('duration_minutes, calories_burned, total_weight_lifted_kg, completed_at')
      .eq('user_id', userId);

    if (workoutError) return handleError(res, workoutError);

    // Get weight progress
    const { data: weightLogs, error: weightError } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true });

    if (weightError) return handleError(res, weightError);

    // Get badge count
    const { count: badgeCount, error: badgeError } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (badgeError) return handleError(res, badgeError);

    // Calculate progress metrics
    const totalWorkouts = workoutStats.length;
    const totalDuration = workoutStats.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const totalCalories = workoutStats.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
    const totalWeightLifted = workoutStats.reduce((sum, log) => sum + (log.total_weight_lifted_kg || 0), 0);

    const workoutsThisWeek = workoutStats.filter(log => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(log.completed_at) >= weekAgo;
    }).length;

    const workoutsThisMonth = workoutStats.filter(log => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(log.completed_at) >= monthAgo;
    }).length;

    // Weight progress
    const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null;
    const startingWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : null;
    const weightChange = currentWeight && startingWeight ? currentWeight - startingWeight : 0;

    const summary = {
      workouts: {
        total: totalWorkouts,
        this_week: workoutsThisWeek,
        this_month: workoutsThisMonth,
        total_duration_minutes: totalDuration,
        total_calories_burned: totalCalories,
        total_weight_lifted_kg: totalWeightLifted
      },
      weight: {
        current_kg: currentWeight,
        starting_kg: startingWeight,
        change_kg: weightChange,
        logs_count: weightLogs.length
      },
      achievements: {
        badges_earned: badgeCount || 0
      }
    };

    res.json(summary);
  } catch (err) {
    handleError(res, err);
  }
});

// Get progress chart data for a user
router.get('/:userId/chart/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;
    const { period = 'month' } = req.query;

    let dateFilter = new Date();
    if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (period === 'year') {
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    }

    if (type === 'workouts') {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('completed_at, duration_minutes, calories_burned')
        .eq('user_id', userId)
        .gte('completed_at', dateFilter.toISOString())
        .order('completed_at', { ascending: true });

      if (error) return handleError(res, error);

      // Group by date
      const groupedData = data.reduce((acc, log) => {
        const date = new Date(log.completed_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, workouts: 0, duration: 0, calories: 0 };
        }
        acc[date].workouts += 1;
        acc[date].duration += log.duration_minutes || 0;
        acc[date].calories += log.calories_burned || 0;
        return acc;
      }, {});

      res.json(Object.values(groupedData));
    } else if (type === 'weight') {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('logged_at, weight_kg')
        .eq('user_id', userId)
        .gte('logged_at', dateFilter.toISOString())
        .order('logged_at', { ascending: true });

      if (error) return handleError(res, error);
      res.json(data);
    } else {
      return res.status(400).json({ error: 'Invalid chart type. Must be workouts or weight' });
    }
  } catch (err) {
    handleError(res, err);
  }
});

// Manually trigger badge check for a user (for testing/admin purposes)
router.post('/:userId/check-badges', async (req, res) => {
  try {
    const { userId } = req.params;

    // Call the badge checking function
    const { data, error } = await supabase.rpc('check_and_award_badges', {
      user_uuid: userId
    });

    if (error) return handleError(res, error);
    res.json({ message: 'Badge check completed', data });
  } catch (err) {
    handleError(res, err);
  }
});

// Manually update leaderboard (for testing/admin purposes)
router.post('/update-leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('update_leaderboard');

    if (error) return handleError(res, error);
    res.json({ message: 'Leaderboard updated successfully' });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
