import express from 'express';
import cors from 'cors';
import profileRoutes from './routes/profile';
import workoutRoutes from './routes/workout';
import progressRoutes from './routes/progress';
import leaderboardRoutes from './routes/leaderboard';
import { config } from './config';

// Add import for diet plan routes
const dietPlanRoutes = require('./routes/dietPlan');
const workoutPlanRoutes = require('./routes/workoutPlan');

const app = express();
const PORT = config.server.port;

// Enhanced CORS configuration
app.use(cors({
  origin: config.server.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Basic route for API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
// Add diet plan routes
app.use('/api/diet-plan', dietPlanRoutes);
app.use('/api/workout-plan', workoutPlanRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: config.server.nodeEnv === 'development' ? err.message : undefined 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
