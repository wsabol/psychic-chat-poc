# Architecture Consolidation Plan
## From Queue-Based Worker to Synchronous API

**Created:** February 11, 2026  
**Status:** Planning Complete - Ready for Implementation  
**Goal:** Consolidate worker service into API, eliminate Redis queue, reduce costs by 50-60%

---

## 📊 Current Architecture (Problems)

```
Client → API (enqueue to Redis) → Redis Queue → Worker Service → Database
                ↓                                      ↓
            Returns immediately              Publishes to Redis Pub/Sub
                ↓                                      ↓
         Client polls every 1s ← ← ← ← ← ← ← ← ← SSE notification
```

**Issues:**
- ❌ 2 services to maintain (API + Worker)
- ❌ Redis queue + pub/sub complexity
- ❌ High latency (enqueue → poll → process → notify → fetch)
- ❌ Polling wastes resources (5K users = 5K requests/sec)
- ❌ Higher AWS costs (~$75-90/month)
- ❌ Complex debugging across services

---

## ✅ Target Architecture (Simple & Scalable)

```
Client → Single API Service → OpenAI → Database → Return Response
         (5-7 second wait acceptable)
```

**Benefits:**
- ✅ Single service to maintain
- ✅ No Redis queue needed (keep only for caching)
- ✅ Lower latency (direct response)
- ✅ No polling overhead
- ✅ 50-60% cost reduction (~$30-45/month)
- ✅ Simpler debugging

**Scalability:** 
- Handles 3K users easily with 1 Fargate task
- Auto-scales to 2-3 tasks at 5K users
- Can handle 10K+ users with 5-10 tasks

---

## 📋 Implementation Plan

### **Phase 1: Copy Worker Logic to API** ✅ PRIORITY

**Objective:** Move worker processing into API without breaking existing functionality

**Tasks:**
1. Create `api/services/chat/` directory structure
2. Copy worker modules to API:
   - `worker/modules/` → `api/services/chat/modules/`
   - `worker/shared/` → `api/services/chat/shared/` (where not duplicate)
3. Update import paths in copied files
4. Create new synchronous chat processor
5. Test locally

**Files to Create:**
- `api/services/chat/processor.js` (main orchestrator)
- `api/services/chat/modules/oracle.js`
- `api/services/chat/modules/handlers/` (all handlers)
- `api/services/chat/modules/utils/` (utilities)

**Estimated Time:** 2-3 hours

---

### **Phase 2: Create Synchronous Chat Endpoint** 

**Objective:** New endpoint that processes chat directly without queue

**Tasks:**
1. Create `api/routes/chat-direct.js`
2. Implement synchronous processing flow:
   - Validate request
   - Fetch user data
   - Process oracle request
   - Store message
   - Return response
3. Add error handling
4. Test with Postman/curl

**New Endpoint:**
```
POST /chat-direct
Body: { message: "..." }
Response: { role: "assistant", content: "...", cards: [...] }
```

**Estimated Time:** 1-2 hours

---

### **Phase 3: Update Client to Use Direct Endpoint**

**Objective:** Switch client from queue+polling to synchronous requests

**Tasks:**
1. Update `client/src/hooks/useChat.js`:
   - Change endpoint from `/chat` to `/chat-direct`
   - Remove SSE polling logic
   - Add loading state during request
   - Handle response directly
2. Update UI to show loading spinner
3. Test in browser

**Files to Modify:**
- `client/src/hooks/useChat.js`
- `client/src/screens/AppChat.jsx` (loading states)

**Estimated Time:** 2-3 hours

---

### **Phase 4: Test Consolidated System Locally**

**Objective:** Verify everything works before deploying

**Tasks:**
1. Start local Redis (for caching only)
2. Start API service
3. Start client
4. Test complete chat flow:
   - Send message
   - Verify oracle response
   - Check database storage
   - Verify horoscope/moon phase generation
5. Test error scenarios

**Test Checklist:**
- [ ] Regular chat message
- [ ] Special requests (horoscope, moon phase)
- [ ] Free trial users
- [ ] Established users
- [ ] Error handling
- [ ] Message history retrieval

**Estimated Time:** 2-3 hours

---

### **Phase 5: Deploy to AWS**

**Objective:** Deploy consolidated API service to production

**Tasks:**
1. Update `api/Dockerfile` (if needed)
2. Build and push new API image to ECR
3. Update API task definition
4. Deploy API service to ECS Fargate
5. Keep worker at 0 tasks (don't delete yet)
6. Monitor logs and metrics

**Commands:**
```bash
# Build and push API
docker build -t psychic-chat-api ./api
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 586337033065.dkr.ecr.us-east-1.amazonaws.com
docker tag psychic-chat-api:latest 586337033065.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-api-production:latest
docker push 586337033065.dkr.ecr.us-east-1.amazonaws.com/psychic-chat-api-production:latest

# Update ECS service
aws ecs update-service --cluster psychic-chat-production --service psychic-chat-api-production --force-new-deployment
```

**Estimated Time:** 1-2 hours

---

### **Phase 6: Deploy Client Updates**

**Objective:** Deploy client changes to use new endpoint

**Tasks:**
1. Update environment variables if needed
2. Build client
3. Deploy to S3/CloudFront
4. Invalidate CloudFront cache
5. Monitor for errors

**Estimated Time:** 30 minutes

---

### **Phase 7: Monitor & Cleanup**

**Objective:** Verify production stability and remove old infrastructure

**Tasks:**
1. Monitor production for 24-48 hours:
   - Check CloudWatch logs
   - Monitor API latency
   - Check error rates
   - Verify user reports
2. If stable, deprecate old endpoints:
   - Mark `/chat` (queue-based) as deprecated
   - Add sunset timeline (30 days)
3. After sunset period:
   - Delete worker service
   - Remove Redis queue (keep Redis for caching)
   - Update documentation
4. Celebrate cost savings! 🎉

**Estimated Time:** 1 week monitoring + 1 hour cleanup

---

## 📁 File Structure Changes

### **New Files (API)**
```
api/
├── services/
│   └── chat/
│       ├── processor.js              [NEW] Main chat orchestrator
│       ├── modules/
│       │   ├── oracle.js             [COPIED from worker]
│       │   ├── handlers/
│       │   │   ├── chat-handler.js   [COPIED from worker]
│       │   │   ├── horoscope-handler.js
│       │   │   ├── moon-phase-handler.js
│       │   │   └── ...
│       │   ├── utils/
│       │   │   ├── oracleProcessor.js
│       │   │   ├── accountStatusCheck.js
│       │   │   └── ...
│       │   └── helpers/
│       │       └── userDataQueries-optimized.js
│       └── shared/
│           └── openaiClient.js       [COPIED if not shared]
└── routes/
    └── chat-direct.js                [NEW] Synchronous endpoint
```

### **Modified Files (Client)**
```
client/
└── src/
    ├── hooks/
    │   └── useChat.js                [MODIFIED] Remove SSE polling
    └── screens/
        └── AppChat.jsx               [MODIFIED] Update loading states
```

---

## 🔧 Key Code Changes

### **1. New Synchronous Processor (api/services/chat/processor.js)**

```javascript
import { handleChatMessage } from './modules/handlers/chat-handler.js';
import { db } from '../../shared/db.js';
import { insertMessage } from '../../shared/user.js';

export async function processChatMessageSync(userId, message) {
    // Store user message
    await insertMessage(userId, 'user', { text: message });
    
    // Process synchronously (was worker's job)
    await handleChatMessage(userId, message);
    
    // Fetch and return the assistant's response
    const { rows } = await db.query(
        `SELECT * FROM messages 
         WHERE user_id_hash = $1 
         AND role = 'assistant' 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [hashUserId(userId)]
    );
    
    return rows[0];
}
```

### **2. New Synchronous Endpoint (api/routes/chat-direct.js)**

```javascript
import { Router } from "express";
import { verify2FA } from "../middleware/auth.js";
import { processChatMessageSync } from "../services/chat/processor.js";

const router = Router();

router.post("/", verify2FA, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    try {
        const response = await processChatMessageSync(userId, message);
        
        return res.json({
            success: true,
            role: 'assistant',
            content: response.content_full,
            cards: response.cards
        });
    } catch (err) {
        console.error('Chat processing error:', err);
        return res.status(500).json({
            error: 'Failed to process message'
        });
    }
});

export default router;
```

### **3. Updated Client Hook (client/src/hooks/useChat.js)**

```javascript
// BEFORE (Queue + Polling)
const sendMessage = async (message) => {
    await api.post('/chat', { message });
    // Wait for SSE notification, then poll for response
};

// AFTER (Synchronous)
const sendMessage = async (message) => {
    setLoading(true);
    try {
        const response = await api.post('/chat-direct', { message });
        setMessages(prev => [...prev, response.data]);
    } finally {
        setLoading(false);
    }
};
```

---

## 🎯 Success Criteria

- [ ] All chat functionality works without queue/worker
- [ ] Response time < 10 seconds for 95% of requests
- [ ] No increase in error rates
- [ ] Client doesn't poll server
- [ ] AWS costs reduced by 40%+ 
- [ ] Single API service handles all traffic
- [ ] Can scale to 5K+ users

---

## 🚨 Rollback Plan

If issues arise in production:

1. **Immediate:** Revert client to use old `/chat` endpoint
2. **Scale up worker:** `aws ecs update-service --desired-count 1`
3. **Investigate:** Check CloudWatch logs for errors
4. **Fix & Retry:** Address issues in staging first

---

## 💰 Expected Cost Savings

**Current Monthly Costs:**
- API Fargate: $30/month
- Worker Fargate: $30/month
- Redis ElastiCache: $15-30/month
- **Total: $75-90/month**

**New Monthly Costs:**
- API Fargate (single): $30-40/month
- Redis (optional, caching only): $15/month
- **Total: $30-55/month**

**Savings: $35-50/month (40-60%)**

---

## 📝 Notes & Decisions

- **Redis:** Keeping for caching horoscopes/moon phases (optional)
- **Old Endpoints:** Deprecate but don't delete immediately (30-day sunset)
- **Worker Service:** Scale to 0 but keep definition for rollback
- **Streaming:** Not implementing in v1 (can add later for better UX)
- **Monitoring:** Watch for latency spikes under load

---

## 🔗 Related Documents

- `START-HERE.md` - Original project setup
- `PHASE-2-MIGRATION.md` - Previous migration notes
- `infrastructure/ecs-template.yaml` - Current AWS infrastructure
- `api/routes/chat.js` - Current queue-based endpoint
- `worker/processor.js` - Current worker logic

---

## ✅ Next Steps

1. **Toggle to ACT MODE** to begin implementation
2. Start with Phase 1 (Copy worker logic)
3. Test each phase locally before moving to next
4. Deploy carefully with monitoring

**Ready to begin? Toggle to Act mode!**
