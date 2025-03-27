import express from 'express';
import { supabase } from '../supabaseClient';

const router = express.Router();

// Fetch user profile
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update user profile
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Search for users by name or email
router.get('/search', async (req, res) => {
  const { query } = req.query;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, profile_image_url')
    .ilike('full_name', `%${query}%`);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Fetch friend requests for a user
router.get('/:id/friend-requests', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('friend_connections')
    .select('id, user_id, friend_id, status, created_at')
    .or(`user_id.eq.${id},friend_id.eq.${id}`);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Send a friend request
router.post('/:id/friend-requests', async (req, res) => {
  const { id } = req.params;
  const { friendId } = req.body;

  const { data, error } = await supabase
    .from('friend_connections')
    .insert({ user_id: id, friend_id: friendId, status: 'pending' });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Respond to a friend request
router.put('/friend-requests/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  const { data, error } = await supabase
    .from('friend_connections')
    .update({ status })
    .eq('id', requestId);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
