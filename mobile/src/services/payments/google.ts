import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  PurchaseError,
  Product,
  Purchase,
} from 'react-native-iap';
import { Platform } from 'react-native';
import apiService from '../api.service';

class GooglePaymentService {
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;

  // Product IDs for Google Play Store
  private productIds = [
    'starship_psychics_monthly',
    'starship_psychics_annual',
  ];

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Google Payment Service is only available on Android');
    }

    try {
      await initConnection();
      
      // Set up purchase listeners
      this.setupPurchaseListeners();
    } catch (error) {
      console.error('Error initializing Google Play Billing:', error);
      throw error;
    }
  }

  private setupPurchaseListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        
        try {
          // Validate purchase with backend
          await this.validatePurchase(purchase);
          
          // Finish transaction (includes acknowledgment for Android)
          await finishTransaction({ purchase, isConsumable: false });
        } catch (error) {
          console.error('Error validating purchase:', error);
        }
      }
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Purchase error:', error);
      }
    );
  }

  async getAvailableProducts(): Promise<Product[]> {
    try {
      // Use getProducts from react-native-iap
      const { getProducts } = require('react-native-iap');
      const products = await getProducts({ skus: this.productIds });
      return products as Product[];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async purchaseSubscription(productId: string): Promise<void> {
    try {
      // Use requestPurchase from react-native-iap
      const { requestPurchase } = require('react-native-iap');
      await requestPurchase({ skus: [productId] });
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      throw error;
    }
  }

  async validatePurchase(purchase: Purchase): Promise<void> {
    try {
      // Send purchase token to backend for validation
      await apiService.post('/billing/validate-receipt/google', {
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productId,
        orderId: purchase.transactionId,
      });
    } catch (error) {
      console.error('Error validating purchase with backend:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<void> {
    try {
      // Sync with backend to restore purchases
      await apiService.post('/billing/restore-purchases/google');
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
      }
      await endConnection();
    } catch (error) {
      console.error('Error disconnecting Google Play Billing:', error);
    }
  }
}

export default new GooglePaymentService();
