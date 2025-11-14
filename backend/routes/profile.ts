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

// Log weight for a user
router.post('/:id/weight', async (req, res) => {
  try {
    const { id } = req.params;
    const { weight_kg, notes } = req.body;

    if (!weight_kg || weight_kg <= 0) {
      return res.status(400).json({ error: 'Valid weight is required' });
    }

    const { data, error } = await supabase
      .from('weight_logs')
      .insert({
        user_id: id,
        weight_kg,
        notes
      })
      .select()
      .single();

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get weight logs for a user
router.get('/:id/weight', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', id)
      .order('logged_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get user badges
router.get('/:id/badges', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        earned_at,
        badges (
          id,
          name,
          description,
          icon_url,
          category,
          points,
          rarity
        )
      `)
      .eq('user_id', id)
      .order('earned_at', { ascending: false });

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get user achievements
router.get('/:id/achievements', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', id)
      .order('achieved_at', { ascending: false });

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get leaderboard
router.get('/leaderboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { limit = 50 } = req.query;

    if (!['weekly', 'monthly', 'all_time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be weekly, monthly, or all_time' });
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .select(`
        id,
        user_id,
        period,
        period_start,
        period_end,
        score_type,
        score,
        rank,
        profiles (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('period', period)
      .eq('score_type', 'workouts_completed')
      .order('rank', { ascending: true })
      .limit(parseInt(limit as string));

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get friends leaderboard
router.get('/:id/friends-leaderboard/:period', async (req, res) => {
  try {
    const { id, period } = req.params;

    if (!['weekly', 'monthly', 'all_time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be weekly, monthly, or all_time' });
    }

    // First get the user's friends
    const { data: friendsData, error: friendsError } = await supabase
      .from('friend_connections')
      .select('friend_id')
      .eq('user_id', id)
      .eq('status', 'accepted');

    if (friendsError) return handleError(res, friendsError);

    const friendIds = friendsData.map(f => f.friend_id);

    // Also get users who have the current user as a friend
    const { data: reverseFriendsData, error: reverseFriendsError } = await supabase
      .from('friend_connections')
      .select('user_id')
      .eq('friend_id', id)
      .eq('status', 'accepted');

    if (reverseFriendsError) return handleError(res, reverseFriendsError);

    const reverseFriendIds = reverseFriendsData.map(f => f.user_id);

    const allFriendIds = [...friendIds, ...reverseFriendIds, id]; // Include self

    const { data, error } = await supabase
      .from('leaderboard')
      .select(`
        id,
        user_id,
        period,
        period_start,
        period_end,
        score_type,
        score,
        rank,
        profiles (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('period', period)
      .eq('score_type', 'workouts_completed')
      .in('user_id', allFriendIds)
      .order('rank', { ascending: true });

    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
