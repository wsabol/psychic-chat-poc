import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ChatScreen from '../screens/ChatScreen';
import HoroscopeScreen from '../screens/HoroscopeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

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
  </Stack.Navigator>
);

// Root Navigator
export const AppNavigator = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};
