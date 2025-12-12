import { Router } from 'express';
import registerRoutes from './auth-endpoints/register.js';
import loginRoutes from './auth-endpoints/login.js';
import twoFARoutes from './auth-endpoints/2fa.js';
import accountRoutes from './auth-endpoints/account.js';

const router = Router();

// Mount auth sub-routers
router.use(registerRoutes);
router.use(loginRoutes);
router.use(twoFARoutes);
router.use(accountRoutes);

export default router;
