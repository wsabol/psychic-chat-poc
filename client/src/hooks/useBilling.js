/**
 * Main billing hook - Composes all billing sub-hooks
 * Maintains backward compatibility with all existing code
 */
import { usePaymentMethods } from './billing/usePaymentMethods';
import { useSubscriptions } from './billing/useSubscriptions';
import { useInvoices } from './billing/useInvoices';
import { usePayments } from './billing/usePayments';
import { usePrices } from './billing/usePrices';

export function useBilling(token) {
  // Combine all billing sub-hooks
  const paymentMethodsHook = usePaymentMethods(token);
  const subscriptionsHook = useSubscriptions(token);
  const invoicesHook = useInvoices(token);
  const paymentsHook = usePayments(token);
  const pricesHook = usePrices(token);

  // Merge all hooks into single object for backward compatibility
  return {
    // Payment Methods
    paymentMethods: paymentMethodsHook.paymentMethods,
    createSetupIntent: paymentMethodsHook.createSetupIntent,
    fetchPaymentMethods: paymentMethodsHook.fetchPaymentMethods,
    deletePaymentMethod: paymentMethodsHook.deletePaymentMethod,
    attachPaymentMethod: paymentMethodsHook.attachPaymentMethod,
    setDefaultPaymentMethod: paymentMethodsHook.setDefaultPaymentMethod,
    verifyBankSetupIntent: paymentMethodsHook.verifyBankSetupIntent,
    verifyPaymentMethod: paymentMethodsHook.verifyPaymentMethod,
    cleanupUnverifiedBanks: paymentMethodsHook.cleanupUnverifiedBanks,
    attachUnattachedMethods: paymentMethodsHook.attachUnattachedMethods,

    // Subscriptions
    subscriptions: subscriptionsHook.subscriptions,
    fetchSubscriptions: subscriptionsHook.fetchSubscriptions,
    createSubscription: subscriptionsHook.createSubscription,
    cancelSubscription: subscriptionsHook.cancelSubscription,

    // Invoices
    invoices: invoicesHook.invoices,
    fetchInvoices: invoicesHook.fetchInvoices,

    // Payments
    payments: paymentsHook.payments,
    fetchPayments: paymentsHook.fetchPayments,

    // Prices
    availablePrices: pricesHook.availablePrices,
    fetchAvailablePrices: pricesHook.fetchAvailablePrices,

    // Use first hook's loading/error (all share same loading state management)
    loading: paymentMethodsHook.loading,
    error: paymentMethodsHook.error,
  };
}
