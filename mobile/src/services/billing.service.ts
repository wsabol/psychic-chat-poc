import apiService from './api.service';

export interface SetupIntentResponse {
  setupIntentId: string;
  clientSecret: string;
  customerId: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

export interface OnboardingStatus {
  isOnboarding: boolean;
  currentStep: string;
  completedSteps: {
    payment_method?: boolean;
    subscription?: boolean;
    personal_info?: boolean;
    welcome?: boolean;
  };
}

class BillingService {
  /**
   * Create a Stripe Setup Intent for adding payment methods
   */
  async createSetupIntent(): Promise<SetupIntentResponse> {
    return await apiService.post<SetupIntentResponse>('/billing/setup-intent', {});
  }

  /**
   * Get user's subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiService.get<{ plans: SubscriptionPlan[] }>('/billing/subscriptions');
    return response.plans || [];
  }

  /**
   * Subscribe to a plan using Stripe
   */
  async subscribeToPlan(planId: string): Promise<any> {
    return await apiService.post<any>('/billing/subscriptions', { planId });
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return await apiService.get<OnboardingStatus>('/billing/onboarding-status');
  }

  /**
   * Update onboarding step
   */
  async updateOnboardingStep(step: string): Promise<void> {
    await apiService.post<void>(`/billing/onboarding-step/${step}`, {});
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(): Promise<any[]> {
    const response = await apiService.get<{ paymentMethods: any[] }>('/billing/payment-methods');
    return response.paymentMethods || [];
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(paymentMethodId: string): Promise<any> {
    return await apiService.post<any>('/billing/payment-methods', { paymentMethodId });
  }
}

export default new BillingService();
