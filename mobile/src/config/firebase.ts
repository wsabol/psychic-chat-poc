import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import messaging from '@react-native-firebase/messaging';

// Firebase is configured via google-services.json (Android) and GoogleService-Info.plist (iOS)
// No need for initializeApp in React Native Firebase

export { auth, firestore, crashlytics, analytics, messaging };

// Initialize Firebase services
export const initializeFirebaseServices = async () => {
  try {
    // Enable Crashlytics collection
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Log app open event
    await analytics().logAppOpen();
  } catch (error) {
    console.error('Error initializing Firebase services:', error);
  }
};

// Request notification permissions (iOS requires explicit permission)
export const requestNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Get FCM token
      const token = await messaging().getToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Log custom events
export const logEvent = (eventName: string, params?: { [key: string]: any }) => {
  analytics().logEvent(eventName, params);
};

// Log errors to Crashlytics
export const logError = (error: Error, context?: string) => {
  if (context) {
    crashlytics().log(context);
  }
  crashlytics().recordError(error);
};

// Set user identifier for Crashlytics and Analytics
export const setUserId = (userId: string) => {
  crashlytics().setUserId(userId);
  analytics().setUserId(userId);
};

// Platform-specific Firebase configuration
export const getFirebaseConfig = () => {
  if (Platform.OS === 'ios') {
    return {
      // iOS config is in GoogleService-Info.plist
    };
  } else {
    return {
      // Android config is in google-services.json
    };
  }
};
