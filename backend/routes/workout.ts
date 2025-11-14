
import express from 'express';
import { supabase } from '../supabaseClient';

const router = express.Router();

// Fetch workouts for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add a new workout
router.post('/', async (req, res) => {
  const workout = req.body;

  const { data, error } = await supabase.from('workouts').insert(workout);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Log a completed workout
router.post('/:userId/log', async (req, res) => {
  try {
    const { userId } = req.params;
    const { workout_id, name, duration_minutes, calories_burned, total_weight_lifted_kg, exercises_completed } = req.body;

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        workout_id,
        name,
        duration_minutes,
        calories_burned,
        total_weight_lifted_kg,
        exercises_completed
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('Error logging workout:', err);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Get workout logs for a user
router.get('/:userId/logs', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('Error fetching workout logs:', err);
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// Get workout statistics for a user
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'all' } = req.query;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = `completed_at >= '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
    } else if (period === 'month') {
      dateFilter = `completed_at >= '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .select('duration_minutes, calories_burned, total_weight_lifted_kg, exercises_completed, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', period === 'all' ? '2020-01-01' : new Date(Date.now() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString());

    if (error) return res.status(400).json({ error: error.message });

    const stats = {
      total_workouts: data.length,
      total_duration: data.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
      total_calories: data.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
      total_weight_lifted: data.reduce((sum, log) => sum + (log.total_weight_lifted_kg || 0), 0),
      average_duration: data.length > 0 ? data.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / data.length : 0,
      workouts_this_week: data.filter(log => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(log.completed_at) >= weekAgo;
      }).length
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching workout stats:', err);
    res.status(500).json({ error: 'Failed to fetch workout stats' });
  }
});

export default router;
