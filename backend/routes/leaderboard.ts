import { Router } from 'express';
import { supabase } from '../supabaseClient';

const router = Router();

// Get leaderboard for a specific period
router.get('/:period', async (req, res) => {
  try {
    const { period } = req.params;

    // Removed requirement for user-id header for public leaderboard
    // const userId = req.headers['user-id'] as string;
    // if (!userId) {
    //   return res.status(401).json({ error: 'User ID required' });
    // }

    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all_time':
        startDate = new Date('2020-01-01');
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    const { data: workoutData, error: workoutError } = await supabase
      .from('workout_logs')
      .select(`
        user_id,
        completed_at,
        profiles:user_id (
          id,
          full_name,
          profile_image_url
        )
      `)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString());

    if (workoutError) {
      console.error('Error fetching workout data:', workoutError);
      return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }

    const userWorkoutCounts: { [key: string]: { count: number; profile: any } } = {};

    workoutData?.forEach((workout: any) => {
      const uid = workout.user_id;
      if (!userWorkoutCounts[uid]) {
        userWorkoutCounts[uid] = {
          count: 0,
          profile: workout.profiles
        };
      }
      userWorkoutCounts[uid].count += 1;
    });

    const leaderboard = Object.entries(userWorkoutCounts)
      .map(([userId, data]) => ({
        user_id: userId,
        score: data.count,
        score_type: 'workouts',
        rank: 0,
        profiles: data.profile
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rank in leaderboard (unchanged)
router.get('/user/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const userId = req.headers['user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const leaderboardResponse = await fetch(`${req.protocol}://${req.get('host')}/api/leaderboard/${period}`, {
      headers: {
        'user-id': userId
      }
    });

    if (!leaderboardResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const leaderboard = await leaderboardResponse.json();
    const userEntry = leaderboard.find((entry: any) => entry.user_id === userId);

    if (!userEntry) {
      return res.json({
        rank: null,
        score: 0,
        total_participants: leaderboard.length
      });
    }

    res.json({
      rank: userEntry.rank,
      score: userEntry.score,
      total_participants: leaderboard.length
    });
  } catch (error) {
    console.error('Error in user rank endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
