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

class ApplePaymentService {
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;

  // Product IDs for Apple App Store
  private productIds = [
    'com.starshippsychics.monthly',
    'com.starshippsychics.annual',
  ];

  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Payment Service is only available on iOS');
    }

    try {
      await initConnection();
      
      // Set up purchase listeners
      this.setupPurchaseListeners();
    } catch (error) {
      console.error('Error initializing Apple IAP:', error);
      throw error;
    }
  }

  private setupPurchaseListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        
        try {
          // Validate receipt with backend
          await this.validatePurchase(purchase);
          
          // Acknowledge the purchase
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
      // Note: The actual API call will be configured when linking native modules
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
      // Send receipt to backend for validation
      await apiService.post('/billing/validate-receipt/apple', {
        receipt: (purchase as any).transactionReceipt || purchase.transactionId,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });
    } catch (error) {
      console.error('Error validating purchase with backend:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<void> {
    try {
      // iOS automatically restores purchases through the App Store
      // We just need to sync with our backend
      await apiService.post('/billing/restore-purchases/apple');
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
      console.error('Error disconnecting Apple IAP:', error);
    }
  }
}

export default new ApplePaymentService();
