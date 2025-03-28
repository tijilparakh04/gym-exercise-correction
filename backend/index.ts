import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import profileRoutes from './routes/profile';
import workoutRoutes from './routes/workout';
// Add import for diet plan routes
const dietPlanRoutes = require('./routes/dietPlan');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/workout', workoutRoutes);
// Add diet plan routes
app.use('/api/diet-plan', dietPlanRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
