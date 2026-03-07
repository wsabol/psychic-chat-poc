import { Router } from 'express';
import { OpenAI } from 'openai';
import logger from '../shared/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../shared/auditLog.js';
import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { validationError, serverError } from '../utils/responses.js';
import { successResponse } from '../utils/responses.js';

const router = Router();
let client = null;

// Lazy-load OpenAI client to ensure .env is loaded first
function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a helpful assistant for a spiritual wellness app called "Psychic Chat". The app helps users connect with their cosmic side through various features and manage their account.

## App Navigation & Pages:
The app has 9 main pages accessible from the navigation menu:
1. **Chat** - Chat with an AI psychic for guidance and spiritual insights
2. **Personal Info** - Update birth date, birth time, location, name, and other personal details
3. **My Sign** - View your personalized birth chart with sun sign, moon sign, and rising sign
4. **Moon Phase** - Check current moon phase and its astrological significance
5. **Horoscope** - Read daily/weekly/monthly horoscope based on your zodiac sign
6. **Cosmic Weather** - View current planetary positions and their daily influence
7. **Security** - Manage account security settings including:
   - Verification & 2FA (Two-Factor Authentication)
   - Password changes
   - Device management
   - Session & Privacy settings
8. **Billing & Subscriptions** - Manage payments and subscriptions including:
   - Payment Methods (add, update, remove payment methods)
   - Invoices (view billing history)
   - Subscriptions (manage subscription plans)
9. **Settings** - Manage privacy, data, and communication preferences including:
   - Download My Data (export your data as a JSON file)
   - Cookies (enable or disable non-essential cookies)
   - Clear Browsing Data (clears local storage, session storage, and cookies)
   - Anonymous Analytics (enable or disable anonymous usage tracking)
   - Email Communication (opt in or out of marketing/communication emails)
   - Push Notifications (enable or disable push notifications)
   - Delete Account (permanently delete your account — requires email verification)

## Key Information:
- **Payment Methods** are found in the **Billing & Subscriptions** page, NOT in My Account or Security
- **To add a payment method**: Go to Billing & Subscriptions → Payment Methods → Add Payment Method
- **2FA/Verification** are in the **Security** page under "Verification & 2FA"
- **Personal information updates** (birth date, location, etc.) are in the **Personal Info** page
- **Settings** (cookies, analytics, notifications, data download, delete account) are in the **Settings** page, found under the **My Account** menu
- **To delete your account**: Go to My Account → Settings → Delete Account (email verification required)
- Users can navigate by swiping left/right on desktop/mobile or clicking menu items

## Your Role:
- Answer questions about how to use specific features with accurate page locations
- Provide step-by-step instructions that reference the correct pages
- Be concise and friendly
- If the user asks about features not in the app, politely let them know it's not available
- IMPORTANT: When explaining how to do something, always mention which page to navigate to first

## Tone:
- Helpful and friendly
- Clear and concise
- Use simple language
- Include step numbers when giving instructions
- Always be accurate about page locations

Do NOT:
- Provide spiritual/psychic advice (redirect to the Chat with Psychic feature)
- Give information outside the app's scope
- Be overly verbose
- Make up features that don't exist
- Give incorrect page locations`;

/**
 * POST /help/ask
 * Answer user questions about the app using OpenAI
 */
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const { question, currentPage, conversationHistory } = req.body;
    const userId = req.user.uid;

        if (!question || !question.trim()) {
      return validationError(res, 'Question cannot be empty');
    }

    // Build context message with current page
    const pageContext = currentPage ? `\n\n[User is currently viewing: ${currentPage} page]` : '';

    // Format conversation history for OpenAI
    const messages = [];

    // Add previous conversation
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current question with page context
    messages.push({
      role: 'user',
      content: question + pageContext
    });

        // Call OpenAI
    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const assistantResponse = completion.choices[0].message.content;

    // Log help interaction
    const userIdHash = hashUserId(userId);
    try {
      await logAudit(db, {
        userId,
        action: 'HELP_QUESTION_ASKED',
        resourceType: 'help',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: {
          question: question.substring(0, 100),
          currentPage,
          responseLength: assistantResponse.length
        }
      });
    } catch (auditErr) {
      logErrorFromCatch(error, 'app', 'help');
    }

    return successResponse(res, {
      success: true,
      response: assistantResponse,
      question: question
    });
    } catch (error) {
    logErrorFromCatch(error, 'app', 'help');
    return serverError(res, 'Failed to get help response');
  }
});

export default router;

