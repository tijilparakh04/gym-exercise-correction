const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add debugging middleware
router.use((req, res, next) => {
  console.log('Diet Plan API Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Function to generate mock diet plan based on user preferences
function generateMockDietPlan(preferences, profileData) {
  console.log('Generating mock diet plan due to API limitations');
  
  // Check for vegetarian preference
  const isVegetarian = profileData?.diet_preference === 'vegetarian' || 
                      (preferences && preferences.toLowerCase().includes('vegetarian'));
  
  // Check for high protein preference
  const isHighProtein = profileData?.fitness_goal === 'muscle_gain' || 
                       (preferences && preferences.toLowerCase().includes('protein'));
  
  // Check for weight loss goal
  const isWeightLoss = profileData?.fitness_goal === 'weight_loss';
  
  return {
    breakfast: {
      food: isVegetarian 
        ? "Greek yogurt parfait with granola, mixed berries, and a drizzle of honey. Served with a slice of whole grain toast and almond butter."
        : "Three egg omelet with spinach, bell peppers, and turkey. Served with a slice of whole grain toast.",
      calories: isWeightLoss ? 350 : 450,
      macros: {
        protein: isHighProtein ? 30 : 20,
        carbs: 45,
        fat: 15
      }
    },
    lunch: {
      food: isVegetarian
        ? "Quinoa bowl with roasted vegetables (sweet potatoes, broccoli, bell peppers), chickpeas, avocado, and tahini dressing."
        : "Grilled chicken breast with quinoa, roasted vegetables, and olive oil dressing.",
      calories: isWeightLoss ? 450 : 550,
      macros: {
        protein: isHighProtein ? 35 : 25,
        carbs: 60,
        fat: 20
      }
    },
    dinner: {
      food: isVegetarian
        ? "Lentil and vegetable curry with brown rice. Side of steamed broccoli and a small mixed green salad with olive oil and lemon dressing."
        : "Baked salmon with sweet potato, steamed asparagus, and a small mixed green salad.",
      calories: isWeightLoss ? 550 : 650,
      macros: {
        protein: isHighProtein ? 40 : 30,
        carbs: 70,
        fat: 25
      }
    },
    snacks: [
      {
        food: isVegetarian 
          ? "Apple slices with 2 tablespoons of almond butter"
          : "Protein shake with 1 scoop whey protein and 1 cup almond milk",
        calories: 200,
        macros: {
          protein: isHighProtein ? 15 : 10,
          carbs: 20,
          fat: 10
        }
      },
      {
        food: "Greek yogurt with a handful of mixed nuts and berries",
        calories: 250,
        macros: {
          protein: 15,
          carbs: 15,
          fat: 15
        }
      }
    ]
  };
}

router.post('/generate', async (req, res) => {
  try {
    console.log('Received request with body:', JSON.stringify(req.body, null, 2));
    const { preferences, profileData } = req.body;
    
    if (!profileData) {
      console.error('Missing profileData in request');
      return res.status(400).json({ error: 'Missing profile data' });
    }
    
    // Try to use Gemini API first
    try {
      // Construct a prompt based on user preferences and profile data
      const prompt = `Generate a healthy diet plan for a person with the following characteristics:
- Age: ${profileData?.age || 'Not specified'}
- Height: ${profileData?.height_cm || 'Not specified'} cm
- Current weight: ${profileData?.current_weight_kg || 'Not specified'} kg
- Target weight: ${profileData?.target_weight_kg || 'Not specified'} kg
- Activity level: ${profileData?.activity_level || 'Not specified'}
- Diet preference: ${profileData?.diet_preference || 'Not specified'}
- Fitness goal: ${profileData?.fitness_goal || 'Not specified'}
- Additional preferences: ${preferences || 'None'}

Please provide a diet plan with breakfast, lunch, dinner, and 1-2 snacks. For each meal and snack, include:
1. A detailed description of the food
2. Total calories
3. Macronutrients (protein, carbs, fat) in grams

Format the response as a JSON object with the following structure:
{
  "breakfast": {
    "food": "Description of breakfast",
    "calories": 350,
    "macros": {
      "protein": 20,
      "carbs": 45,
      "fat": 10
    }
  },
  "lunch": {
    "food": "Description of lunch",
    "calories": 450,
    "macros": {
      "protein": 35,
      "carbs": 20,
      "fat": 25
    }
  },
  "dinner": {
    "food": "Description of dinner",
    "calories": 550,
    "macros": {
      "protein": 40,
      "carbs": 45,
      "fat": 20
    }
  },
  "snacks": [
    {
      "food": "Description of snack 1",
      "calories": 200,
      "macros": {
        "protein": 15,
        "carbs": 20,
        "fat": 5
      }
    }
  ]
}

IMPORTANT: Only respond with the JSON object exactly as shown above. Do not include any additional fields like "totals" or any text outside the JSON. The snacks field must be an array even if there's only one snack.`;

      console.log('Sending prompt to Gemini:', prompt);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Generate content with safety settings to ensure we get a response
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      
      console.log('Gemini response received:', responseText);
      
      let dietPlan;
      
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('JSON match found:', jsonMatch[0]);
          dietPlan = JSON.parse(jsonMatch[0]);
          
          // Ensure snacks is always an array
          if (dietPlan.snacks && !Array.isArray(dietPlan.snacks)) {
            dietPlan.snacks = [dietPlan.snacks];
          }
          
          // Remove any totals field if present
          if (dietPlan.totals) {
            delete dietPlan.totals;
          }
        } else {
          console.error('No valid JSON found in response');
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        // Fall back to mock data if parsing fails
        dietPlan = generateMockDietPlan(preferences, profileData);
      }

      console.log('Sending diet plan to client:', dietPlan);
      res.json(dietPlan);
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      // Fall back to mock data if Gemini API fails
      const mockDietPlan = generateMockDietPlan(preferences, profileData);
      console.log('Sending mock diet plan to client:', mockDietPlan);
      res.json(mockDietPlan);
    }
  } catch (error) {
    console.error('Error generating diet plan:', error);
    // Even if everything else fails, still try to return mock data
    try {
      const mockDietPlan = generateMockDietPlan(preferences || '', req.body?.profileData || {});
      console.log('Sending emergency mock diet plan to client:', mockDietPlan);
      res.json(mockDietPlan);
    } catch (mockError) {
      console.error('Failed to generate even mock data:', mockError);
      res.status(500).json({ 
        error: 'Failed to generate diet plan',
        message: error.message,
        stack: error.stack
      });
    }
  }
});

module.exports = router;