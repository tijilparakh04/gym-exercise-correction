import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Stack, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ChevronDown, X, Camera, RotateCcw } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Define proper interface for server response
interface AnalysisResult {
  class_name: string;
  form_feedback?: string;
  feedback_type?: 'info' | 'error' | 'success';
  stage?: string;
  count_rep?: boolean;
}

const EXERCISES = ['Bench Press', 'Squat', 'Deadlift'];
const FRAMES_PER_SECOND = 5; // Number of frames to capture per second
const SERVER_URL = 'http://192.168.1.25:5000'; // If testing on Android emulator
// const SERVER_URL = 'http://localhost:5000'; // If testing on iOS simulator
// const SERVER_URL = 'http://your-server-ip:5000'; // If testing on physical device

export default function FormDetectionScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [counter, setCounter] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'info' | 'error' | 'success'>('info');
  const [isReady, setIsReady] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuousProcessing, setIsContinuousProcessing] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const cameraRef = useRef<any>(null);
  const frameProcessorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setFeedback('Checking server connection...');
        setFeedbackType('info');
        
        // Check if server is online
        try {
          const response = await fetch(`${SERVER_URL}/status`);
          if (response.ok) {
            setServerStatus('online');
            setFeedback('Server connected! Ready to analyze your form.');
            setFeedbackType('success');
            setIsReady(true);
          } else {
            throw new Error('Server returned an error');
          }
        } catch (error) {
          console.error('Error connecting to server:', error);
          setServerStatus('offline');
          setFeedback('Could not connect to server. Please check your connection.');
          setFeedbackType('error');
          return;
        }
        
        // Clear feedback after 3 seconds
        setTimeout(() => {
          setFeedback('');
        }, 3000);
      } catch (error) {
        console.error('Error initializing:', error);
        setFeedback('Failed to initialize. Please try again.');
        setFeedbackType('error');
      }
    };
    
    checkServerStatus();
    
    return () => {
      // Clean up
      if (frameProcessorIntervalRef.current) {
        clearInterval(frameProcessorIntervalRef.current);
      }
    };
  }, []);
  
  // Check camera permissions
  useEffect(() => {
    const checkPermission = async () => {
      if (!permission) {
        await requestPermission();
      }
    };
    
    checkPermission();
  }, [permission, requestPermission]);
  
  // Toggle camera processing
  const toggleCameraProcessing = () => {
    if (isContinuousProcessing) {
      stopContinuousProcessing();
    } else {
      startContinuousProcessing();
    }
  };
  
  // Start continuous processing
  const startContinuousProcessing = () => {
    if (!isReady || serverStatus !== 'online') {
      Alert.alert('Not Ready', 'Please wait until the system is ready or check your connection to the server.');
      return;
    }
    
    setIsContinuousProcessing(true);
    
    frameProcessorIntervalRef.current = setInterval(async () => {
      if (cameraRef.current && !isProcessing) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.5,
            base64: true,
            skipProcessing: true
            
          });
          
          await processCameraFrame(photo);
        } catch (error) {
          console.error('Error taking picture:', error);
        }
      }
    }, 1000 / FRAMES_PER_SECOND);
  };
  
  // Stop continuous processing
  const stopContinuousProcessing = () => {
    if (frameProcessorIntervalRef.current) {
      clearInterval(frameProcessorIntervalRef.current);
    }
    
    setIsContinuousProcessing(false);
  };
  
  // Flip camera
  const flipCamera = () => {
    setFacing(current => (current === 'front' ? 'back' : 'front'));
  };
  
  // Process the captured camera frame
  const processCameraFrame = async (photo: { uri: string, base64?: string }) => {
    // Throttle processing to avoid overwhelming the device
    const now = Date.now();
    if (now - lastFrameTime < (1000 / FRAMES_PER_SECOND)) {
      return;
    }
    setLastFrameTime(now);
    
    if (isProcessing || serverStatus !== 'online') return;
    
    try {
      setIsProcessing(true);
      
      // Resize the image to reduce data size
      const manipResult = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 256, height: 256 } }],
        { format: SaveFormat.JPEG, base64: true }
      );
      
      // Send the image directly to the server
      await sendFrameToServer(manipResult.base64 || '');
      
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Send frame to Python server for analysis
  const sendFrameToServer = async (base64Image: string) => {
    try {
      const exerciseName = selectedExercise.toLowerCase().replace(' ', '');
      
      const response = await fetch(`${SERVER_URL}/analyze-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          exercise: exerciseName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const result = await response.json() as AnalysisResult;
      
      // Process the result from the server
      processAnalysisResult(result);
      
    } catch (error) {
      console.error('Error sending data to server:', error);
      setFeedback('Server communication error. Please try again.');
      setFeedbackType('error');
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
    }
  };
  
  // Process the analysis result from the server
  const processAnalysisResult = (result: AnalysisResult) => {
    if (!result) return;
    
    // Extract values from result
    const { class_name, form_feedback, feedback_type, stage, count_rep } = result;
    
    console.log(`Server prediction: ${class_name}`);
    
    // Update counter if needed
    if (count_rep) {
      setCounter(prev => prev + 1);
    }
    
    // Update current stage if needed
    if (stage && stage !== currentStage) {
      setCurrentStage(stage);
    }
    
    // Update feedback if provided
    if (form_feedback) {
      setFeedback(form_feedback);
      if (feedback_type) {
        setFeedbackType(feedback_type);
      } else {
        setFeedbackType('info');
      }
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
    }
  };
  
  // Select exercise from dropdown
  const selectExercise = (exercise: string) => {
    setSelectedExercise(exercise);
    setShowExerciseDropdown(false);
    setCounter(0); // Reset counter when changing exercise
  };
  
  // Reset counter
  const resetCounter = () => {
    setCounter(0);
  };
  
  // Render exercise dropdown
  const renderExerciseDropdown = () => {
    if (!showExerciseDropdown) return null;
    
    return (
      <View style={styles.dropdown}>
        {EXERCISES.map((exercise) => (
          <TouchableOpacity
            key={exercise}
            style={styles.dropdownItem}
            onPress={() => selectExercise(exercise)}
          >
            <Text 
              style={[
                styles.dropdownItemText,
                exercise === selectedExercise ? styles.selectedDropdownItemText : null
              ]}
            >
              {exercise}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // Get appropriate feedback style
  const getFeedbackStyle = () => {
    switch (feedbackType) {
      case 'error':
        return styles.errorFeedback;
      case 'success':
        return styles.successFeedback;
      default:
        return styles.infoFeedback;
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Form Detection',
          headerStyle: { backgroundColor: Colors.primary.blue },
          headerTintColor: '#fff',
        }} 
      />
      
      {/* Exercise selector */}
      <View style={styles.exerciseSelector}>
        <TouchableOpacity 
          style={styles.exerciseButton}
          onPress={() => setShowExerciseDropdown(!showExerciseDropdown)}
        >
          <Text style={styles.exerciseButtonText}>{selectedExercise}</Text>
          <ChevronDown size={20} color="#fff" />
        </TouchableOpacity>
        {renderExerciseDropdown()}
      </View>
      
      {/* Camera view */}
      <View style={styles.cameraContainer}>
        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            ref={cameraRef}
            facing={facing}
            onMountError={(error) => {
              console.error('Camera error:', error);
              Alert.alert('Camera Error', 'Failed to load camera. Please restart the app.');
            }}
          />
        ) : (
          <View style={styles.noCameraPermission}>
            <Text style={styles.noCameraText}>No camera permission</Text>
            <TouchableOpacity 
              style={styles.permissionButton} 
              onPress={() => requestPermission()}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Server status indicator */}
      <View style={[
        styles.statusIndicator,
        serverStatus === 'online' ? styles.statusOnline :
        serverStatus === 'offline' ? styles.statusOffline :
        styles.statusChecking
      ]}>
        <Text style={styles.statusText}>
          Server: {serverStatus === 'checking' ? 'Checking...' : 
                  serverStatus === 'online' ? 'Online' : 'Offline'}
        </Text>
      </View>
      
      {/* Counter display */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterLabel}>Reps:</Text>
        <Text style={styles.counterValue}>{counter}</Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetCounter}
        >
          <RotateCcw size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Feedback display */}
      {feedback ? (
        <View style={[styles.feedbackContainer, getFeedbackStyle()]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
      
      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <ActivityIndicator size="small" color={Colors.primary.green} />
        </View>
      )}
      
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={flipCamera}
        >
          <Camera size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.captureButton,
            isContinuousProcessing ? styles.stopButton : undefined
          ]}
          onPress={toggleCameraProcessing}
          disabled={serverStatus !== 'online'}
        >
          <View style={isContinuousProcessing ? styles.stopIcon : styles.captureIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Define interfaces for style types
interface StylesType {
  container: ViewStyle;
  exerciseSelector: ViewStyle;
  exerciseButton: ViewStyle;
  exerciseButtonText: TextStyle;
  dropdown: ViewStyle;
  dropdownItem: ViewStyle;
  dropdownItemText: TextStyle;
  selectedDropdownItemText: TextStyle;
  cameraContainer: ViewStyle;
  camera: ViewStyle;
  noCameraPermission: ViewStyle;
  noCameraText: TextStyle;
  permissionButton: ViewStyle;
  permissionButtonText: TextStyle;
  statusIndicator: ViewStyle;
  statusOnline: ViewStyle;
  statusOffline: ViewStyle;
  statusChecking: ViewStyle;
  statusText: TextStyle;
  counterContainer: ViewStyle;
  counterLabel: TextStyle;
  counterValue: TextStyle;
  resetButton: ViewStyle;
  feedbackContainer: ViewStyle;
  errorFeedback: ViewStyle;
  successFeedback: ViewStyle;
  infoFeedback: ViewStyle;
  feedbackText: TextStyle;
  processingIndicator: ViewStyle;
  controls: ViewStyle;
  controlButton: ViewStyle;
  captureButton: ViewStyle;
  stopButton: ViewStyle;
  captureIcon: ViewStyle;
  stopIcon: ViewStyle;
}

const styles = StyleSheet.create<StylesType>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  exerciseSelector: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  exerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exerciseButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.background.darkCharcoal || '#000',
  },
  selectedDropdownItemText: {
    fontWeight: 'bold',
    color: Colors.primary.blue,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  noCameraPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  noCameraText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusOnline: {
    backgroundColor: '#4caf50',
  },
  statusOffline: {
    backgroundColor: '#f44336',
  },
  statusChecking: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  counterContainer: {
    position: 'absolute',
    top: 60,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterLabel: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
  },
  counterValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 10,
  },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 5,
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFeedback: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  successFeedback: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  infoFeedback: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  feedbackText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  processingIndicator: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: [{ translateX: -10 }],
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 30,
    marginHorizontal: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  captureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  stopIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
});