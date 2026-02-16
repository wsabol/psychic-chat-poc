import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from 'react-native-iap';
import paymentService from '../services/payments';

interface PaymentContextType {
  products: Product[];
  loading: boolean;
  initialized: boolean;
  purchaseSubscription: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  getProductIdForPlan: (plan: string) => string;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializePayments();

    return () => {
      // Cleanup on unmount
      paymentService.disconnect();
    };
  }, []);

  const initializePayments = async () => {
    try {
      setLoading(true);
      await paymentService.initialize();
      setInitialized(true);
      
      // Load available products
      const availableProducts = await paymentService.getAvailableProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Error initializing payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseSubscription = async (productId: string) => {
    try {
      setLoading(true);
      await paymentService.purchaseSubscription(productId);
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    try {
      setLoading(true);
      await paymentService.restorePurchases();
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getProductIdForPlan = (plan: string): string => {
    return paymentService.getProductIdForPlan(plan);
  };

  return (
    <PaymentContext.Provider
      value={{
        products,
        loading,
        initialized,
        purchaseSubscription,
        restorePurchases,
        getProductIdForPlan,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
