import { Platform } from 'react-native';
import applePaymentService from './apple';
import googlePaymentService from './google';
import { Product } from 'react-native-iap';

class PaymentService {
  private currentService: typeof applePaymentService | typeof googlePaymentService;

  constructor() {
    // Platform detection - use appropriate payment service
    this.currentService = Platform.OS === 'ios' 
      ? applePaymentService 
      : googlePaymentService;
  }

  async initialize(): Promise<void> {
    return this.currentService.initialize();
  }

  async getAvailableProducts(): Promise<Product[]> {
    return this.currentService.getAvailableProducts();
  }

  async purchaseSubscription(productId: string): Promise<void> {
    return this.currentService.purchaseSubscription(productId);
  }

  async restorePurchases(): Promise<void> {
    return this.currentService.restorePurchases();
  }

  async disconnect(): Promise<void> {
    return this.currentService.disconnect();
  }

  getPlatform(): 'ios' | 'android' {
    return Platform.OS as 'ios' | 'android';
  }

  // Map backend subscription plans to platform-specific product IDs
  getProductIdForPlan(plan: string): string {
    const planMap = {
      ios: {
        monthly: 'com.starshippsychics.monthly',
        annual: 'com.starshippsychics.annual',
      },
      android: {
        monthly: 'starship_psychics_monthly',
        annual: 'starship_psychics_annual',
      },
    };

    const platform = Platform.OS as 'ios' | 'android';
    return planMap[platform][plan as 'monthly' | 'annual'] || '';
  }
}

export default new PaymentService();
