import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import billingService from '../services/billing.service';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const StripeSubscriptionScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { updateOnboardingStep, onboardingStatus } = useOnboarding();
  
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');

  const plans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: '$29.99',
      period: 'per month',
      features: [
        'Unlimited psychic chat sessions',
        'Daily horoscope readings',
        'Weekly astrology insights',
        'Moon phase notifications',
        'Priority customer support',
      ],
    },
    {
      id: 'annual',
      name: 'Annual Plan',
      price: '$299.99',
      period: 'per year',
      popular: true,
      features: [
        'Everything in Monthly Plan',
        'Save $60 per year',
        'Exclusive birth chart analysis',
        'Monthly personalized readings',
        'Early access to new features',
        'Astrological compatibility reports',
      ],
    },
  ];

  const handlePurchase = async (planId: string) => {
    if (!user?.uid) return;

    try {
      setPurchasing(true);
      
      // Subscribe via Stripe
      await billingService.subscribeToPlan(planId);
      
      // Update onboarding step
      if (onboardingStatus?.isOnboarding) {
        await updateOnboardingStep('subscription');
      }

      Alert.alert(
        'Success!',
        'Your subscription has been activated. Please complete your profile to continue.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to Personal Info screen
              (navigation as any).navigate('PersonalInfo');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        error.message || 'Unable to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  const renderPlan = (plan: SubscriptionPlan) => (
    <View
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.planCardSelected,
        plan.popular && styles.planCardPopular,
      ]}
    >
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.planContent}
        onPress={() => setSelectedPlan(plan.id)}
      >
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.subscribeButton,
          selectedPlan === plan.id && styles.subscribeButtonSelected,
          purchasing && styles.subscribeButtonDisabled,
        ]}
        onPress={() => handlePurchase(plan.id)}
        disabled={purchasing}
      >
        <Text style={styles.subscribeButtonText}>
          {purchasing ? 'Processing...' : selectedPlan === plan.id ? 'Subscribe Now' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>
          Unlock unlimited access to psychic guidance and astrology insights
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {plans.map(renderPlan)}

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </Text>
          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  planCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#9d4edd',
  },
  planCardPopular: {
    borderColor: '#f72585',
  },
  popularBadge: {
    backgroundColor: '#f72585',
    padding: 8,
    alignItems: 'center',
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planContent: {
    padding: 20,
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: '#9d4edd',
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 8,
  },
  planPeriod: {
    color: '#999',
    fontSize: 16,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    color: '#9d4edd',
    fontSize: 18,
    marginRight: 10,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#ccc',
    fontSize: 15,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#2a2a3e',
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonSelected: {
    backgroundColor: '#9d4edd',
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default StripeSubscriptionScreen;
