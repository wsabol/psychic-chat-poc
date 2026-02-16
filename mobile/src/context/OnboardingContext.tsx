import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import billingService, { OnboardingStatus } from '../services/billing.service';
import { useAuth } from './AuthContext';

interface OnboardingContextType {
  onboardingStatus: OnboardingStatus | null;
  loading: boolean;
  error: string | null;
  refreshOnboardingStatus: () => Promise<void>;
  updateOnboardingStep: (step: string) => Promise<void>;
  isOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOnboardingStatus = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!user || !token) {
      setOnboardingStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const status = await billingService.getOnboardingStatus();
      setOnboardingStatus(status);
    } catch (err: any) {
      console.error('Failed to fetch onboarding status:', err);
      setError(err.message || 'Failed to fetch onboarding status');
    } finally {
      setLoading(false);
    }
  };

  const updateOnboardingStep = async (step: string) => {
    try {
      await billingService.updateOnboardingStep(step);
      await refreshOnboardingStatus();
    } catch (err: any) {
      console.error('Failed to update onboarding step:', err);
      throw err;
    }
  };

  // Load onboarding status when user logs in
  useEffect(() => {
    refreshOnboardingStatus();
  }, [user?.uid]);

  const isOnboarding = onboardingStatus?.isOnboarding ?? false;

  return (
    <OnboardingContext.Provider
      value={{
        onboardingStatus,
        loading,
        error,
        refreshOnboardingStatus,
        updateOnboardingStep,
        isOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
