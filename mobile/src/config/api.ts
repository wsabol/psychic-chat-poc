import { API_URL } from '@env';

export const API_CONFIG = {
  baseURL: API_URL || 'https://app.starshippsychics.com',
  timeout: 30000,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth-firebase/login',
  REGISTER: '/auth-firebase/register',
  LOGOUT: '/auth-firebase/logout',
  
  // Chat
  CHAT: '/chat',
  CHAT_DIRECT: '/chat-direct',
  FREE_TRIAL_CHAT: '/free-trial-chat',
  
  // User
  USER_PROFILE: '/user-profile',
  USER_SETTINGS: '/user-settings',
  USER_DATA: '/user/download-data',
  
  // Billing
  SUBSCRIPTIONS: '/billing/subscriptions',
  PAYMENT_METHODS: '/billing/payment-methods',
  SETUP_INTENT: '/billing/setup-intent',
  INVOICES: '/billing/invoices',
  
  // Astrology
  HOROSCOPE: '/horoscope',
  MOON_PHASE: '/moon-phase',
  ASTROLOGY: '/astrology',
  COSMIC_WEATHER: '/astrology/cosmic-weather',
};
