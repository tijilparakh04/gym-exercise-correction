import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';

// Keep track of the last time audio was played to prevent spamming

const GOOGLE_TTS_LANGUAGE = 'en-US';
const GOOGLE_TTS_VOICE = 'en-US-Neural2-C'; // pick any available voice, e.g., 'en-US-Standard-C' if Neural2 not enabled
const GOOGLE_TTS_SPEAKING_RATE = 1.0;
const GOOGLE_TTS_PITCH = 0.0;

const getGoogleTTSApiKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_GOOGLE_TTS_API_KEY;
  const extra = (Constants as any)?.expoConfig?.extra;
  return envKey || extra?.EXPO_PUBLIC_GOOGLE_TTS_API_KEY || extra?.GOOGLE_TTS_API_KEY || '';
};
let lastAudioTime = 0;
const AUDIO_COOLDOWN = 5000; // 5 seconds cooldown

// Sound object for playing audio
let sound: Audio.Sound | null = null;

/**
 * Convert text to speech and play it
 * @param text The text to convert to speech
 * @param force Whether to force play even if within cooldown period
 */
const getElevenLabsApiKey = (): string => {
  const envKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  const extra = (Constants as any)?.expoConfig?.extra;
  return envKey || extra?.EXPO_PUBLIC_ELEVENLABS_API_KEY || extra?.ELEVENLABS_API_KEY || '';
};

export const speakText = async (text: string, force: boolean = false): Promise<void> => {
  try {
    const now = Date.now();

    // Check if we're within the cooldown period
    if (!force && now - lastAudioTime < AUDIO_COOLDOWN) {
      console.log('Audio on cooldown, skipping:', text);
      return;
    }

    // Resolve API key for Google Cloud TTS
    const apiKey = getGoogleTTSApiKey();
    if (!apiKey) {
      console.error('Google Cloud TTS API key is missing. Set EXPO_PUBLIC_GOOGLE_TTS_API_KEY or extra.GOOGLE_TTS_API_KEY.');
      return;
    }

    // Update last audio time
    lastAudioTime = now;

    console.log('Converting to speech (Google Cloud TTS):', text);

    // Call Google Cloud Text-to-Speech REST API
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: GOOGLE_TTS_LANGUAGE,
          name: GOOGLE_TTS_VOICE
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: GOOGLE_TTS_SPEAKING_RATE,
          pitch: GOOGLE_TTS_PITCH
        }
      }),
    });

    if (!response.ok) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch {}
      throw new Error(`Google TTS API error: ${response.status} ${response.statusText} ${bodyText}`);
    }

    // Parse base64 audio content from Google response
    const data = await response.json();
    const base64Audio = data?.audioContent;
    if (!base64Audio) {
      throw new Error('Google TTS API returned no audioContent.');
    }

    // Write the audio data to a file
    const fileUri = FileSystem.documentDirectory + 'temp_audio.mp3';
    await FileSystem.writeAsStringAsync(fileUri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });

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
