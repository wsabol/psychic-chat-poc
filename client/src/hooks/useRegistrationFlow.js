import { createUserWithEmailAndPassword, sendEmailVerification, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthAPI } from './useAuthAPI';

/**
 * useRegistrationFlow Hook
 * Handles complete registration workflow:
 * 1. Create Firebase account
 * 2. Create database record
 * 3. Save T&C acceptance
 * 4. Send verification email
 * 5. Handle temp account migration
 */

export function useRegistrationFlow() {
  const api = useAuthAPI();

  const registerWithEmail = async (email, password, termsAccepted, privacyAccepted) => {
    try {
      // Retrieve onboarding data from sessionStorage (for temp account migration)
      let onboarding_first_message = null;
      let onboarding_horoscope = null;

      try {
        const storedMessage = sessionStorage.getItem('onboarding_first_message');
        const storedHoroscope = sessionStorage.getItem('onboarding_horoscope');

        if (storedMessage) {
          onboarding_first_message = JSON.parse(storedMessage);
        }

        if (storedHoroscope) {
          onboarding_horoscope = JSON.parse(storedHoroscope);
        }
      } catch (storageErr) {
      }

      // Check if user is upgrading from temp account
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email && currentUser.email.startsWith('temp_')) {
        const tempUid = currentUser.uid;

        try {
          const migrationResponse = await fetch('http://localhost:3000/auth/register-and-migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              temp_user_id: tempUid,
              onboarding_first_message,
              onboarding_horoscope
            })
          });

          if (!migrationResponse.ok) {
            const errorData = await migrationResponse.json();
            console.error('[AUTH-MIGRATION] ✗ Register-and-migrate failed:', errorData);
            throw new Error(errorData.error || 'Migration failed');
          }

          // Re-authenticate as new user
          try {
            await signOut(auth);
            const newUserCred = await signInWithEmailAndPassword(auth, email, password);

            // Send verification email
            await sendEmailVerification(newUserCred.user);
          } catch (reAuthErr) {
          }

          return { success: true, userId: null };
        } catch (migrationErr) {
          console.error('[AUTH-MIGRATION] Error:', migrationErr.message);
          throw new Error('Account upgrade failed: ' + migrationErr.message);
        }
      }

      // Step 1: Create Firebase account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      const idToken = await userCredential.user.getIdToken();

      // Step 2: Create database record
      await api.createDatabaseUser(userId, email, idToken);

      // Step 3: Save T&C acceptance
      await api.saveTermsAcceptance(userId, termsAccepted, privacyAccepted, idToken);

      // Step 4: Send verification email
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.error('[EMAIL-VERIFY] ✗ Failed to send verification email:', verifyErr.message);
      }

      return { success: true, userId };
    } catch (err) {
      console.error('[AUTH] Registration failed:', err.message);
      throw err;
    }
  };

  return {
    registerWithEmail
  };
}

export default useRegistrationFlow;

