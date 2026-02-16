import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ChatScreen from '../screens/ChatScreen';
import HoroscopeScreen from '../screens/HoroscopeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import StripeSubscriptionScreen from '../screens/StripeSubscriptionScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';

// Context
import { useOnboarding } from '../context/OnboardingContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack for login/register
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main App Tabs after authentication
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: { backgroundColor: '#1a1a2e' },
      tabBarActiveTintColor: '#7c63d8',
      tabBarInactiveTintColor: '#666',
      headerStyle: { backgroundColor: '#1a1a2e' },
      headerTintColor: '#fff',
    }}
  >
    <Tab.Screen 
      name="Chat" 
      component={ChatScreen}
      options={{ title: '💬 Chat', headerShown: false }}
    />
    <Tab.Screen 
      name="Horoscope" 
      component={HoroscopeScreen}
      options={{ title: '⭐ Horoscope', headerShown: false }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: '👤 Profile' }}
    />
    <Tab.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ title: '⚙️ Settings' }}
    />
  </Tab.Navigator>
);

// Onboarding Stack for new users
const OnboardingStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#1a1a2e' },
      headerTintColor: '#fff',
    }}
  >
    <Stack.Screen 
      name="StripeSubscription" 
      component={StripeSubscriptionScreen}
      options={{ 
        title: 'Choose Your Plan',
        headerBackVisible: false,
      }}
    />
    <Stack.Screen 
      name="PersonalInfo" 
      component={PersonalInfoScreen}
      options={{ 
        title: 'Personal Information',
        headerBackVisible: false,
      }}
    />
  </Stack.Navigator>
);

// Main Stack with tabs and additional screens
const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="MainTabs" 
      component={MainTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Subscription" 
      component={SubscriptionScreen}
      options={{ 
        title: 'Subscription Plans',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
      }}
    />
    <Stack.Screen 
      name="PersonalInfo" 
      component={PersonalInfoScreen}
      options={{ 
        title: 'Personal Information',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
      }}
    />
  </Stack.Navigator>
);

// Root Navigator with onboarding logic
export const AppNavigator = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const { onboardingStatus, loading: onboardingLoading, isOnboarding } = useOnboarding();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || onboardingLoading) {
      return;
    }

    // Determine initial route based on onboarding status
    if (isOnboarding) {
      const currentStep = onboardingStatus?.currentStep;
      const completedSteps = onboardingStatus?.completedSteps || {};

      // Route based on completed steps
      if (!completedSteps.subscription) {
        setInitialRoute('Onboarding');
      } else if (!completedSteps.personal_info) {
        setInitialRoute('Onboarding');
      } else {
        // All required steps complete, go to main app
        setInitialRoute('Main');
      }
    } else {
      // Not onboarding, go to main app
      setInitialRoute('Main');
    }
  }, [isAuthenticated, onboardingLoading, isOnboarding, onboardingStatus]);

  // Show loading while determining route
  if (isAuthenticated && !initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f1e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9d4edd" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack />
      ) : initialRoute === 'Onboarding' ? (
        <OnboardingStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
};
