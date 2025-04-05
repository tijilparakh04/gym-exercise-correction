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

// Fetch user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id);

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Search for users by name or email
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, profile_image_url')
      .ilike('full_name', `%${query}%`);

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Fetch friend requests for a user
router.get('/:id/friend-requests', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('friend_connections')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${id},friend_id.eq.${id}`);

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Send a friend request
router.post('/:id/friend-requests', async (req, res) => {
  try {
    const { id } = req.params;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    const { data, error } = await supabase
      .from('friend_connections')
      .insert({ user_id: id, friend_id: friendId, status: 'pending' });

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Respond to a friend request
router.put('/friend-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (accepted/rejected) is required' });
    }

    const { data, error } = await supabase
      .from('friend_connections')
      .update({ status })
      .eq('id', requestId);

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
