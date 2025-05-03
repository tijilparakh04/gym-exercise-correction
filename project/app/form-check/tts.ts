import { ElevenLabsClient } from "elevenlabs";
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Initialize the ElevenLabs client with the API key from env
const client = new ElevenLabsClient({
  apiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
});

// Voice IDs - you can choose different voices from your ElevenLabs dashboard
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // Default voice

// Keep track of the last time audio was played to prevent spamming
let lastAudioTime = 0;
const AUDIO_COOLDOWN = 5000; // 5 seconds cooldown

// Sound object for playing audio
let sound: Audio.Sound | null = null;

/**
 * Convert text to speech and play it
 * @param text The text to convert to speech
 * @param force Whether to force play even if within cooldown period
 */
export const speakText = async (text: string, force: boolean = false): Promise<void> => {
  try {
    const now = Date.now();
    
    // Check if we're within the cooldown period
    if (!force && now - lastAudioTime < AUDIO_COOLDOWN) {
      console.log('Audio on cooldown, skipping:', text);
      return;
    }
    
    // Update last audio time
    lastAudioTime = now;
    
    console.log('Converting to speech:', text);
    
    // Use the TTS API to get a URL for the audio
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
    
    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer();
    
    // Create a temporary file to store the audio
    const fileUri = FileSystem.documentDirectory + 'temp_audio.mp3';
    
    // Convert ArrayBuffer to Base64 string
    const base64Audio = arrayBufferToBase64(audioData);
    
    // Write the audio data to a file
    await FileSystem.writeAsStringAsync(
      fileUri,
      base64Audio,
      { encoding: FileSystem.EncodingType.Base64 }
    );
    
    // Unload any previous sound
    if (sound) {
      await sound.unloadAsync();
    }
    
    // Load and play the audio
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true }
    );
    
    sound = newSound;
    
    // Clean up after playing
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound?.unloadAsync();
        sound = null;
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    });
    
  } catch (error) {
    console.error('Error speaking text:', error);
  }
};

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get a random motivational message
 * @param exercise The current exercise
 * @returns A random motivational message
 */
export const getMotivationalMessage = (exercise: string): string => {
  const messages = [
    `Keep pushing through your ${exercise}! You're doing great!`,
    `Excellent form on that ${exercise}! Keep it up!`,
    `Stay focused on your ${exercise} technique. You've got this!`,
    `Your ${exercise} is looking strong! Keep that energy up!`,
    `Remember to breathe during your ${exercise}. You're making progress!`,
    `Great job maintaining proper form on your ${exercise}!`,
    `Every ${exercise} rep brings you closer to your goals!`,
    `You're crushing these ${exercise} reps! Keep going!`,
    `Maintain that core tension during your ${exercise}!`,
    `Your dedication to perfecting your ${exercise} form is impressive!`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get an exercise introduction message
 * @param exercise The exercise name
 * @returns An introduction message for the exercise
 */
export const getExerciseIntroMessage = (exercise: string): string => {
  const messages = {
    'Bench Press': "I see you're doing Bench Press. Remember to keep your feet planted, shoulders back, and maintain control throughout the movement.",
    'Squat': "I see you're doing Squats. Focus on keeping your chest up, back straight, and push through your heels.",
    'Deadlift': "I see you're doing Deadlifts. Remember to keep your back straight, hinge at the hips, and maintain a neutral spine throughout the movement."
  };
  
  return (exercise in messages ? messages[exercise as keyof typeof messages] : `I see you're doing ${exercise}. Let's work on maintaining proper form!`);
};

export default {
  speakText,
  getMotivationalMessage,
  getExerciseIntroMessage
};