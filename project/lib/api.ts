import axios from 'axios';
import Constants from 'expo-constants';

// Get the API URL from environment variables or use the local development server
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// For development on physical devices, detect if we need to use the dev machine IP
if (__DEV__) {
  // Check if we're running on a physical device
  const isPhysicalDevice = !Constants.isDevice || Constants.appOwnership !== 'expo';
  
  // If on a physical device, we need to use the dev machine's IP instead of localhost
  if (isPhysicalDevice) {
    console.log('Running on physical device, using IP address for API calls');
    // Using the specified IP address for testing on phone
    api.defaults.baseURL = process.env.EXPO_PUBLIC_API_URL || 'localhost://50000';
  }
  console.log('API base URL:', api.defaults.baseURL);
}

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error Setup:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;