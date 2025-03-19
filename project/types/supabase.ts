export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          age: number | null
          height_cm: number | null
          current_weight_kg: number | null
          target_weight_kg: number | null
          activity_level: 'sedentary' | 'very_low' | 'low' | 'moderate' | 'high' | null
          diet_preference: 'vegan' | 'vegetarian' | 'pescatarian' | 'eggetarian' | 'non_vegetarian' | null
          fitness_goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          age?: number | null
          height_cm?: number | null
          current_weight_kg?: number | null
          target_weight_kg?: number | null
          activity_level?: 'sedentary' | 'very_low' | 'low' | 'moderate' | 'high' | null
          diet_preference?: 'vegan' | 'vegetarian' | 'pescatarian' | 'eggetarian' | 'non_vegetarian' | null
          fitness_goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          age?: number | null
          height_cm?: number | null
          current_weight_kg?: number | null
          target_weight_kg?: number | null
          activity_level?: 'sedentary' | 'very_low' | 'low' | 'moderate' | 'high' | null
          diet_preference?: 'vegan' | 'vegetarian' | 'pescatarian' | 'eggetarian' | 'non_vegetarian' | null
          fitness_goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance' | null
          created_at?: string
          updated_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          name: string
          duration_minutes: number
          calories_burned: number | null
          notes: string | null
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          duration_minutes: number
          calories_burned?: number | null
          notes?: string | null
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          duration_minutes?: number
          calories_burned?: number | null
          notes?: string | null
          completed_at?: string
          created_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          sets: number
          reps: number
          weight_kg: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          sets: number
          reps: number
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_name?: string
          sets?: number
          reps?: number
          weight_kg?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      friend_connections: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      send_friend_request: {
        Args: {
          friend_email: string
        }
        Returns: string
      }
      respond_to_friend_request: {
        Args: {
          request_id: string
          response: string
        }
        Returns: void
      }
    }
  }
}