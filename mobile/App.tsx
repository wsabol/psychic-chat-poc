import React, { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeFirebaseServices, requestNotificationPermission, messaging } from './src/config/firebase';

function AppContent(): React.JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Initialize Firebase services
    initializeFirebaseServices();

    // Request notification permissions
    requestNotificationPermission();

    // Set up foreground notification handler
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      // Handle foreground notifications here
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1e' }}>
        <ActivityIndicator size="large" color="#7c63d8" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1e" />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <PaymentProvider>
          <AppContent />
        </PaymentProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default App;
