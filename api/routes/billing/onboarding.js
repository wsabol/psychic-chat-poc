import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { db } from '../../shared/db.js';
import { validationError, serverError } from '../../utils/responses.js';

const router = express.Router();

/**
 * GET /billing/onboarding-status
 * Get user's onboarding progress
 * 
 * Returns:
 * - currentStep: Current onboarding step
 * - isOnboarding: Whether user is still in onboarding (true if NULL or FALSE)
 * - completedSteps: Object showing which steps are complete
 * - subscriptionStatus: Current subscription status
 */
router.get('/onboarding-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await db.query(
      `SELECT 
        onboarding_step, 
        onboarding_completed, 
        subscription_status
       FROM user_personal_info 
       WHERE user_id = $1`,
      [userId]
    );
    
    // For new users (temp accounts, not yet in DB), return default onboarding state
    if (!result.rows[0]) {
      return res.json({
        currentStep: 'create_account',
        isOnboarding: true,
        completedSteps: {
          create_account: false,
          payment_method: false,
          subscription: false,
          personal_info: false
        },
        subscriptionStatus: null
      });
    }
    
    const { onboarding_step, onboarding_completed, subscription_status } = result.rows[0];
    
    // Determine which steps are complete based on onboarding_step progression
    // A step is complete if we've reached or passed it in the step order
    // Required steps: create_account, payment_method, subscription, personal_info
    // security_settings is OPTIONAL - removed from requirements
    const stepOrder = ['create_account', 'payment_method', 'subscription', 'personal_info'];
    const currentStepIndex = onboarding_step ? stepOrder.indexOf(onboarding_step) : -1;
    
    const steps = {
      create_account: true, // Always complete for users in the system
      payment_method: currentStepIndex >= stepOrder.indexOf('payment_method'),
      subscription: currentStepIndex >= stepOrder.indexOf('subscription'),
      personal_info: currentStepIndex >= stepOrder.indexOf('personal_info'),

    };
    
    // isOnboarding = true if onboarding_completed is NULL or FALSE (not finished)
    // Only FALSE if onboarding_completed = true
    const isOnboarding = onboarding_completed !== true;
    
    res.json({
      currentStep: onboarding_step,
      isOnboarding: isOnboarding,
      completedSteps: steps,
      subscriptionStatus: subscription_status
    });
  } catch (error) {
    return serverError(res, 'Failed to fetch onboarding status');
  }
});

/**
 * POST /billing/onboarding-step/:step
 * Update onboarding progress
 * 
 * Marks a step as complete and updates onboarding status
 * Onboarding is COMPLETE when personal_info step is saved (all required steps done)
 * security_settings is optional and doesn't affect completion
 */
router.post('/onboarding-step/:step', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { step } = req.params;
    
    const validSteps = ['create_account', 'payment_method', 'subscription', 'personal_info', 'security_settings'];
    // Note: security_settings is optional and doesn't affect onboarding completion
    if (!validSteps.includes(step)) {
      return validationError(res, 'Invalid onboarding step');
    }
    
    // Onboarding is COMPLETE when personal_info step is saved (all required steps done)
    // security_settings is optional and doesn't affect completion
    // Fetch current onboarding_completed status to preserve it
    const currentResult = await db.query(
      'SELECT onboarding_completed FROM user_personal_info WHERE user_id = $1',
      [userId]
    );
    
    const currentCompleted = currentResult.rows[0]?.onboarding_completed;
    const isOnboardingComplete = step === 'personal_info' ? true : currentCompleted;
    
    const query = `
      UPDATE user_personal_info SET 
        onboarding_step = $1,
        onboarding_completed = $2,
        onboarding_completed_at = ${isOnboardingComplete ? 'NOW()' : 'onboarding_completed_at'},
        updated_at = NOW()
      WHERE user_id = $3
    `;
    
    await db.query(query, [step, isOnboardingComplete, userId]);
    
    res.json({ 
      success: true, 
      step, 
      completed: isOnboardingComplete,
      message: isOnboardingComplete ? 'Required onboarding steps complete!' : `Step ${step} updated`
    });
  } catch (error) {
    return serverError(res, 'Failed to update onboarding step');
  }
});

export default router;
