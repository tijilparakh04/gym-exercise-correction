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

export default router;
