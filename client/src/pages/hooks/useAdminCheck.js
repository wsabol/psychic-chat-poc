/**
 * useAdminCheck - Verify if current user is an admin
 */

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';

const ADMIN_EMAIL = 'starshiptechnology1@gmail.com';

export function useAdminCheck() {
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
      setIsAdmin(currentUser.email === ADMIN_EMAIL);
    }
  }, []);

  return { userEmail, isAdmin };
}
