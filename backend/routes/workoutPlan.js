const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add debugging middleware
router.use((req, res, next) => {
  console.log('Workout Plan API Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Function to generate mock workout exercises based on focus area and preferences
function generateMockWorkout(focusArea, preferences, profileData) {
  console.log('Generating mock workout due to API limitations');
  
  // Check for fitness level
  const fitnessLevel = profileData?.fitness_level || 'intermediate';
  const isBeginnerLevel = fitnessLevel.toLowerCase() === 'beginner';
  const isAdvancedLevel = fitnessLevel.toLowerCase() === 'advanced';
  
  // Check for quick workout preference
  const isQuickWorkout = preferences && 
    (preferences.toLowerCase().includes('quick') || preferences.toLowerCase().includes('short'));
  
  // Check for equipment limitations
  const hasLimitedEquipment = preferences && 
    (preferences.toLowerCase().includes('home') || preferences.toLowerCase().includes('no equipment'));
  
  // Default exercise structure
  const defaultSets = isBeginnerLevel ? 3 : (isAdvancedLevel ? 5 : 4);
  const defaultReps = isBeginnerLevel ? '10-12' : (isAdvancedLevel ? '6-8' : '8-10');
  
  // Exercise templates based on focus area
  const exercisesByFocusArea = {
    'chest': [
      { name: 'Bench Press', sets: defaultSets, reps: defaultReps, weight: '', notes: 'Keep back flat on bench' },
      { name: 'Incline Dumbbell Press', sets: defaultSets, reps: defaultReps, weight: '', notes: '' },
      { name: 'Chest Flyes', sets: 3, reps: '12-15', weight: '', notes: 'Focus on the stretch' },
      { name: 'Push-ups', sets: 3, reps: isBeginnerLevel ? '8-10' : 'To failure', weight: '', notes: '' },
      { name: 'Cable Crossovers', sets: 3, reps: '15-20', weight: '', notes: 'Squeeze at the center' }
    ],
    'back': [
      { name: 'Pull-ups', sets: isBeginnerLevel ? 3 : 4, reps: isBeginnerLevel ? '5-8' : '8-12', weight: '', notes: hasLimitedEquipment ? 'Use a door frame pull-up bar' : '' },
      { name: 'Bent Over Rows', sets: defaultSets, reps: defaultReps, weight: '', notes: 'Keep back straight' },
      { name: 'Lat Pulldowns', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Seated Cable Rows', sets: 3, reps: '10-12', weight: '', notes: 'Pull to lower chest' },
      { name: 'Face Pulls', sets: 3, reps: '15-20', weight: '', notes: 'Great for shoulder health' }
    ],
    'legs': [
      { name: 'Squats', sets: defaultSets, reps: defaultReps, weight: '', notes: 'Keep weight on heels' },
      { name: 'Romanian Deadlifts', sets: defaultSets, reps: '10-12', weight: '', notes: 'Focus on hamstring stretch' },
      { name: 'Leg Press', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Walking Lunges', sets: 3, reps: '10 each leg', weight: '', notes: '' },
      { name: 'Calf Raises', sets: 4, reps: '15-20', weight: '', notes: 'Full range of motion' }
    ],
    'shoulders': [
      { name: 'Overhead Press', sets: defaultSets, reps: defaultReps, weight: '', notes: '' },
      { name: 'Lateral Raises', sets: 3, reps: '12-15', weight: '', notes: 'Keep slight bend in elbows' },
      { name: 'Front Raises', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Reverse Flyes', sets: 3, reps: '15-20', weight: '', notes: 'Focus on rear delts' },
      { name: 'Shrugs', sets: 4, reps: '12-15', weight: '', notes: 'Hold at the top' }
    ],
    'arms': [
      { name: 'Bicep Curls', sets: 4, reps: '10-12', weight: '', notes: '' },
      { name: 'Tricep Pushdowns', sets: 4, reps: '10-12', weight: '', notes: '' },
      { name: 'Hammer Curls', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Skull Crushers', sets: 3, reps: '12-15', weight: '', notes: 'Keep elbows in' },
      { name: 'Concentration Curls', sets: 3, reps: '12-15', weight: '', notes: 'Slow and controlled' }
    ],
    'core': [
      { name: 'Plank', sets: 3, reps: '30-60 sec', weight: '', notes: 'Keep body straight' },
      { name: 'Russian Twists', sets: 3, reps: '20 total', weight: '', notes: '' },
      { name: 'Leg Raises', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20 total', weight: '', notes: 'Slow and controlled' },
      { name: 'Mountain Climbers', sets: 3, reps: '30 sec', weight: '', notes: 'Keep core tight' }
    ],
    'full body': [
      { name: 'Burpees', sets: 3, reps: '10-15', weight: '', notes: '' },
      { name: 'Kettlebell Swings', sets: 3, reps: '15-20', weight: '', notes: 'Hip hinge movement' },
      { name: 'Dumbbell Thrusters', sets: 3, reps: '12-15', weight: '', notes: '' },
      { name: 'Renegade Rows', sets: 3, reps: '10 each arm', weight: '', notes: '' },
      { name: 'Jump Squats', sets: 3, reps: '15-20', weight: '', notes: 'Land softly' }
    ],
    'cardio': [
      { name: 'Running', sets: 1, reps: '20-30 min', weight: '', notes: 'Steady pace' },
      { name: 'Jumping Jacks', sets: 3, reps: '60 sec', weight: '', notes: '' },
      { name: 'Jump Rope', sets: 3, reps: '2 min', weight: '', notes: '' },
      { name: 'Cycling', sets: 1, reps: '20-30 min', weight: '', notes: 'Moderate resistance' },
      { name: 'Stair Climber', sets: 1, reps: '15-20 min', weight: '', notes: '' }
    ],
    'hiit': [
      { name: 'Sprints', sets: 8, reps: '30 sec on, 30 sec off', weight: '', notes: '' },
      { name: 'Burpees', sets: 4, reps: '45 sec on, 15 sec off', weight: '', notes: '' },
      { name: 'Mountain Climbers', sets: 4, reps: '45 sec on, 15 sec off', weight: '', notes: '' },
      { name: 'Jump Squats', sets: 4, reps: '45 sec on, 15 sec off', weight: '', notes: '' },
      { name: 'Battle Ropes', sets: 4, reps: '30 sec on, 30 sec off', weight: '', notes: '' }
    ],
    'rest day': [
      { name: 'Light Walking', sets: 1, reps: '20-30 min', weight: '', notes: 'Recovery activity' },
      { name: 'Stretching', sets: 1, reps: '15-20 min', weight: '', notes: 'Full body' },
      { name: 'Foam Rolling', sets: 1, reps: '10-15 min', weight: '', notes: 'Focus on tight areas' },
      { name: 'Yoga', sets: 1, reps: '20-30 min', weight: '', notes: 'Gentle flow' },
      { name: 'Meditation', sets: 1, reps: '10 min', weight: '', notes: 'For mental recovery' }
    ]
  };
  
  // Normalize focus area to match our keys
  const normalizedFocusArea = focusArea.toLowerCase();
  let exercises = exercisesByFocusArea[normalizedFocusArea] || exercisesByFocusArea['full body'];
  
  // If it's a quick workout, limit to 3 exercises
  if (isQuickWorkout) {
    exercises = exercises.slice(0, 3);
  }
  
  // If limited equipment, filter or modify exercises
  if (hasLimitedEquipment) {
    // Replace gym-specific exercises with home-friendly alternatives
    exercises = exercises.map(ex => {
      // Examples of modifications for home workouts
      if (ex.name === 'Bench Press') return { ...ex, name: 'Push-ups', notes: 'Elevate feet for more difficulty' };
      if (ex.name === 'Lat Pulldowns') return { ...ex, name: 'Resistance Band Pulldowns', notes: 'Use a door anchor' };
      if (ex.name === 'Leg Press') return { ...ex, name: 'Bodyweight Squats', notes: 'Slow tempo for more difficulty' };
      return ex;
    });
  }
  
  return exercises;
}

// Add this new route to your existing workoutPlan.js file

router.post('/generate-plan', async (req, res) => {
  try {
    console.log('Received workout plan generation request');
    const { prompt, profileData, workoutStructure } = req.body;
    
    if (!prompt) {
      console.error('Missing prompt in request');
      return res.status(400).json({ error: 'Missing prompt' });
    }
    
    console.log('Request details:');
    console.log('- Prompt:', prompt);
    console.log('- Days per week:', workoutStructure?.daysPerWeek || 'Not specified');
    console.log('- Current workout days:', workoutStructure?.workoutDays?.length || 0);
    
    // Try to use Gemini API first
    try {
      console.log('Attempting to use Gemini API for plan generation');
      
      // Use the workout structure provided by the frontend
      const daysPerWeek = workoutStructure?.daysPerWeek || 3;
      const workoutDays = workoutStructure?.workoutDays || [];
      
      // Construct a prompt that includes the current workout structure
      let workoutDaysText = '';
      if (workoutDays.length > 0) {
        workoutDaysText = 'Current workout structure:\n';
        workoutDays.forEach(day => {
          workoutDaysText += `Day ${day.day}: ${day.focusArea}\n`;
        });
      }
      
      const aiPrompt = `Generate a workout plan based on the following request:
"${prompt}"

User profile:
- Age: ${profileData?.age || 'Not specified'}
- Height: ${profileData?.height_cm || 'Not specified'} cm
- Weight: ${profileData?.weight_kg || 'Not specified'} kg
- Fitness level: ${profileData?.fitness_level || 'intermediate'}

${workoutDaysText}

Please provide a workout plan with the following information:
1. A name for the workout plan
2. A brief description of the plan
3. Number of days per week: ${daysPerWeek}
4. For each day, specify the focus area (e.g., Chest, Back, Legs, etc.)

Format the response as a JSON object with the following structure:
{
  "name": "Plan Name",
  "description": "Plan description",
  "daysPerWeek": ${daysPerWeek},
  "workoutDays": [
    {
      "day": 1,
      "focusArea": "Chest"
    },
    {
      "day": 2,
      "focusArea": "Back"
    }
    // ... and so on for all ${daysPerWeek} days
  ]
}

Only respond with the JSON object, no additional text.`;

      console.log('Sending prompt to Gemini:', aiPrompt);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Generate content with safety settings to ensure we get a response
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      });
      
      const response = await result.response;
      const responseText = response.text();
      
      console.log('Gemini response received');
      
      let plan;
      
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed plan from Gemini response');
          
          // Ensure the plan has the correct number of days
          if (plan.workoutDays.length !== daysPerWeek) {
            console.log('Adjusting number of workout days to match requested days per week');
            
            // If we have too few days, add more with default focus areas
            if (plan.workoutDays.length < daysPerWeek) {
              const defaultFocusAreas = ['Full Body', 'Cardio', 'Rest Day'];
              for (let i = plan.workoutDays.length; i < daysPerWeek; i++) {
                plan.workoutDays.push({
                  day: i + 1,
                  focusArea: defaultFocusAreas[i % defaultFocusAreas.length]
                });
              }
            } 
            // If we have too many days, trim the list
            else if (plan.workoutDays.length > daysPerWeek) {
              plan.workoutDays = plan.workoutDays.slice(0, daysPerWeek);
            }
            
            // Ensure day numbers are sequential
            plan.workoutDays = plan.workoutDays.map((day, index) => ({
              ...day,
              day: index + 1
            }));
          }
          
          // Ensure daysPerWeek matches the frontend request
          plan.daysPerWeek = daysPerWeek;
        } else {
          console.error('No JSON found in Gemini response');
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Failed to parse AI response');
      }
      
      return res.json({ plan });
      
    } catch (aiError) {
      console.error('Error with Gemini API, falling back to mock data:', aiError);
      
      // Fall back to using the existing workout structure with enhanced descriptions
      const plan = enhanceExistingWorkoutPlan(prompt, profileData, workoutStructure);
      console.log('Generated enhanced workout plan based on existing structure');
      
      return res.json({ plan });
    }
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan', details: error.message });
  }
});

// Function to enhance the existing workout plan with better descriptions
function enhanceExistingWorkoutPlan(prompt, profileData, workoutStructure) {
  console.log('Enhancing existing workout plan with better descriptions');
  
  const promptLower = prompt.toLowerCase();
  const daysPerWeek = workoutStructure?.daysPerWeek || 3;
  const workoutDays = workoutStructure?.workoutDays || [];
  
  // Determine plan type based on prompt and existing focus areas
  let planType = 'balanced';
  
  // Check prompt for keywords
  if (promptLower.includes('strength') || promptLower.includes('muscle') || promptLower.includes('build')) {
    planType = 'strength';
  } else if (promptLower.includes('cardio') || promptLower.includes('endurance') || promptLower.includes('stamina')) {
    planType = 'cardio';
  } else if (promptLower.includes('weight loss') || promptLower.includes('fat loss') || promptLower.includes('slim')) {
    planType = 'weight loss';
  } 
  // If no keywords in prompt, analyze the focus areas
  else {
    const focusAreaCounts = {
      strength: 0,
      cardio: 0,
      weightLoss: 0
    };
    
    workoutDays.forEach(day => {
      const area = day.focusArea.toLowerCase();
      if (['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].includes(area)) {
        focusAreaCounts.strength++;
      } else if (['cardio', 'hiit'].includes(area)) {
        focusAreaCounts.cardio++;
        focusAreaCounts.weightLoss++;
      } else if (['full body'].includes(area)) {
        focusAreaCounts.strength++;
        focusAreaCounts.weightLoss++;
      }
    });
    
    // Determine the dominant focus
    if (focusAreaCounts.strength > focusAreaCounts.cardio && focusAreaCounts.strength > focusAreaCounts.weightLoss) {
      planType = 'strength';
    } else if (focusAreaCounts.cardio > focusAreaCounts.strength && focusAreaCounts.cardio >= focusAreaCounts.weightLoss) {
      planType = 'cardio';
    } else if (focusAreaCounts.weightLoss > focusAreaCounts.strength && focusAreaCounts.weightLoss > focusAreaCounts.cardio) {
      planType = 'weight loss';
    }
  }
  
  console.log('Determined plan type:', planType);
  
  // Generate plan name
  let name = '';
  if (planType === 'strength') {
    name = `${daysPerWeek}-Day Strength Building Plan`;
  } else if (planType === 'cardio') {
    name = `${daysPerWeek}-Day Cardio & Endurance Plan`;
  } else if (planType === 'weight loss') {
    name = `${daysPerWeek}-Day Weight Loss Program`;
  } else {
    name = `${daysPerWeek}-Day Balanced Fitness Plan`;
  }
  
  // Generate description
  let description = '';
  if (planType === 'strength') {
    description = `A ${daysPerWeek}-day workout plan focused on building strength and muscle mass. This plan incorporates progressive overload principles with compound movements for maximum muscle growth.`;
  } else if (planType === 'cardio') {
    description = `A ${daysPerWeek}-day cardio and endurance plan designed to improve your stamina and cardiovascular health. This plan includes a mix of steady-state cardio and high-intensity interval training.`;
  } else if (planType === 'weight loss') {
    description = `A ${daysPerWeek}-day weight loss program combining resistance training and cardio to maximize calorie burn and preserve lean muscle mass. This plan is designed to create a caloric deficit while keeping your metabolism high.`;
  } else {
    description = `A balanced ${daysPerWeek}-day workout plan targeting all major muscle groups for overall fitness improvement. This plan provides a good mix of strength, cardio, and flexibility training.`;
  }
  
  // Add personalization based on the prompt
  if (promptLower.includes('beginner') || promptLower.includes('new') || promptLower.includes('start')) {
    description += ' Perfect for beginners who are just starting their fitness journey.';
  } else if (promptLower.includes('intermediate')) {
    description += ' Designed for intermediate fitness enthusiasts looking to take their training to the next level.';
  } else if (promptLower.includes('advanced') || promptLower.includes('experienced')) {
    description += ' Crafted for advanced athletes who want to push their limits and maximize results.';
  }
  
  if (promptLower.includes('home') || promptLower.includes('no equipment') || promptLower.includes('minimal equipment')) {
    description += ' All exercises can be performed at home with minimal equipment.';
  } else if (promptLower.includes('gym') || promptLower.includes('equipment')) {
    description += ' Optimized for gym environments with access to a variety of equipment.';
  }
  
  // Use the existing workout days structure or create a new one if needed
  let enhancedWorkoutDays = [];
  
  if (workoutDays.length > 0) {
    enhancedWorkoutDays = workoutDays;
  } else {
    // This is a fallback in case the frontend somehow didn't provide workout days
    if (planType === 'strength') {
      // Strength-focused plan
      if (daysPerWeek <= 3) {
        enhancedWorkoutDays = [
          { day: 1, focusArea: 'Full Body' },
          { day: 2, focusArea: 'Rest Day' },
          { day: 3, focusArea: 'Full Body' },
        ];
      } else if (daysPerWeek <= 4) {
        enhancedWorkoutDays = [
          { day: 1, focusArea: 'Chest' },
          { day: 2, focusArea: 'Back' },
          { day: 3, focusArea: 'Legs' },
          { day: 4, focusArea: 'Shoulders' },
        ];
      } else {
        enhancedWorkoutDays = [
          { day: 1, focusArea: 'Chest' },
          { day: 2, focusArea: 'Back' },
          { day: 3, focusArea: 'Legs' },
          { day: 4, focusArea: 'Shoulders' },
          { day: 5, focusArea: 'Arms' },
        ];
        if (daysPerWeek >= 6) {
          enhancedWorkoutDays.push({ day: 6, focusArea: 'Core' });
        }
        if (daysPerWeek >= 7) {
          enhancedWorkoutDays.push({ day: 7, focusArea: 'Rest Day' });
        }
      }
    } else if (planType === 'cardio') {
      // Similar structure for other plan types...
      enhancedWorkoutDays = Array.from({ length: daysPerWeek }, (_, i) => ({
        day: i + 1,
        focusArea: i % 2 === 0 ? 'HIIT' : 'Cardio'
      }));
    } else if (planType === 'weight loss') {
      enhancedWorkoutDays = Array.from({ length: daysPerWeek }, (_, i) => ({
        day: i + 1,
        focusArea: ['Full Body', 'HIIT', 'Cardio'][i % 3]
      }));
    } else {
      enhancedWorkoutDays = Array.from({ length: daysPerWeek }, (_, i) => ({
        day: i + 1,
        focusArea: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'][i % 7]
      }));
    }
    
    // Trim to the requested number of days
    enhancedWorkoutDays = enhancedWorkoutDays.slice(0, daysPerWeek);
  }
  
  return {
    name,
    description,
    daysPerWeek,
    workoutDays: enhancedWorkoutDays
  };
}

module.exports = router;