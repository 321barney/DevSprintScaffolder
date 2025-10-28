# Phase 1 Implementation Guide
## SoukMatch - Commission, Payment, AI & Security

**Implementation Time:** ~12-16 hours  
**Prerequisites:** Current MVP running, PostgreSQL database, Node.js environment

---

## 📋 Checklist Overview

- [ ] **Step 1:** Database migration (new tables)
- [ ] **Step 2:** Install dependencies
- [ ] **Step 3:** Update storage layer
- [ ] **Step 4:** Integrate commission service
- [ ] **Step 5:** Add dynamic AI pricing
- [ ] **Step 6:** Implement security (bcrypt + JWT)
- [ ] **Step 7:** Add PSP payment flow
- [ ] **Step 8:** Update API routes
- [ ] **Step 9:** Test end-to-end
- [ ] **Step 10:** Deploy with environment variables

---

## Step 1: Database Migration (30 min)

### 1.1 Add New Tables to Schema

Open `shared/schema.ts` and add the payment tables from `shared-schema-payment.ts`:

```bash
# Copy the new schema definitions
cat /home/claude/shared-schema-payment.ts >> shared/schema.ts
```

### 1.2 Generate Migration

```bash
npm run db:push
# or
npx drizzle-kit push
```

### 1.3 Verify Tables Created

```sql
-- Connect to PostgreSQL and verify
\dt

-- Should see new tables:
-- platform_fees
-- provider_subscriptions
-- transactions
-- provider_earnings
```

---

## Step 2: Install Dependencies (5 min)

```bash
# Install new packages
npm install bcrypt jsonwebtoken @anthropic-ai/sdk
npm install --save-dev @types/bcrypt @types/jsonwebtoken

# Verify installation
npm list bcrypt jsonwebtoken @anthropic-ai/sdk
```

---

## Step 3: Update Storage Layer (45 min)

### 3.1 Add New Storage Methods

Open `server/storage.ts` and add these interface methods:

```typescript
export interface IStorage {
  // ... existing methods ...

  // Platform Fees
  createPlatformFee(fee: InsertPlatformFee): Promise<PlatformFee>;
  getPlatformFeeByOfferId(offerId: string): Promise<PlatformFee | undefined>;
  updatePlatformFee(id: string, data: Partial<PlatformFee>): Promise<PlatformFee | undefined>;

  // Provider Subscriptions
  createProviderSubscription(sub: InsertProviderSubscription): Promise<ProviderSubscription>;
  getProviderSubscription(providerId: string): Promise<ProviderSubscription | undefined>;
  updateProviderSubscription(providerId: string, data: Partial<ProviderSubscription>): Promise<ProviderSubscription | undefined>;

  // Transactions
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByProviderId(providerId: string): Promise<Transaction[]>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined>;

  // Provider Earnings
  createProviderEarning(earning: InsertProviderEarning): Promise<ProviderEarning>;
  getProviderEarningsByProviderId(providerId: string): Promise<ProviderEarning[]>;
  updateProviderEarning(id: string, data: Partial<ProviderEarning>): Promise<ProviderEarning | undefined>;
}
```

### 3.2 Implement Storage Methods

Add implementations for each method using Drizzle ORM patterns:

```typescript
// Example for platform fees
async createPlatformFee(fee: InsertPlatformFee): Promise<PlatformFee> {
  const [created] = await db.insert(platformFees).values(fee).returning();
  return created;
}

async getPlatformFeeByOfferId(offerId: string): Promise<PlatformFee | undefined> {
  const [fee] = await db.select().from(platformFees).where(eq(platformFees.offerId, offerId));
  return fee;
}

// ... implement remaining methods
```

---

## Step 4: Integrate Commission Service (1 hour)

### 4.1 Copy Commission Service

```bash
cp /home/claude/server-commission-service.ts server/services/commission.ts
```

### 4.2 Update Offer Acceptance Flow

Modify `server/routes.ts` - find the `POST /api/offers/:id/accept` endpoint:

```typescript
import { 
  processOfferAcceptance, 
  canProviderSubmitOffer,
  consumeFreeOffer 
} from "./services/commission";

// In the accept offer route:
app.post("/api/offers/:id/accept", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
  const offerId = req.params.id;
  
  // Existing validation...

  // NEW: Process commission
  const { commission } = await processOfferAcceptance(offerId);

  // Update offer and job status (existing code)
  await storage.updateOffer(offerId, { status: 'accepted' });
  await storage.updateJob(offer.jobId, { status: 'accepted' });

  // Return with commission info
  res.json({
    offer: updatedOffer,
    commission: {
      platform: commission.commissionAmount,
      provider: commission.providerNet,
      rate: commission.commissionRate
    }
  });
}));
```

### 4.3 Add Free Tier Check to Offer Submission

Modify the `POST /api/offers` endpoint:

```typescript
app.post("/api/offers", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
  const providerId = (req as any).auth.providerId;

  // NEW: Check if provider can submit offer
  const eligibility = await canProviderSubmitOffer(providerId);
  
  if (!eligibility.allowed) {
    return res.status(403).json({
      error: "Cannot submit offer",
      reason: eligibility.reason,
      freeOffersRemaining: eligibility.freeOffersRemaining,
      needsSubscription: true
    });
  }

  // Create offer (existing code)
  const offer = await storage.createOffer(offerData);

  // NEW: Consume free offer if applicable
  if (eligibility.subscriptionTier === 'free' && eligibility.freeOffersRemaining && eligibility.freeOffersRemaining > 0) {
    await consumeFreeOffer(providerId);
  }

  res.json(offer);
}));
```

---

## Step 5: Add Dynamic AI Pricing (1 hour)

### 5.1 Copy AI Service

```bash
cp /home/claude/server-ai-dynamic-pricing.ts server/services/ai-pricing.ts
```

### 5.2 Update Job Creation to Use AI

Modify `POST /api/jobs` endpoint:

```typescript
import { generateDynamicPriceBand } from "./services/ai-pricing";

app.post("/api/jobs", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
  const { category, city, description, timeISO, ...rest } = req.body;

  // NEW: Generate dynamic price band with AI
  const priceBand = await generateDynamicPriceBand({
    category,
    city,
    description,
    timeISO: timeISO || new Date().toISOString(),
    pax: rest.pax,
    km: rest.km,
  });

  // Create job with AI-generated pricing
  const job = await storage.createJob({
    buyerId: (req as any).auth.userId,
    category,
    city,
    spec: {
      description,
      priceBand, // AI-generated
      ...rest
    },
    budgetHintMad: priceBand.recommended,
    status: 'open'
  });

  res.json({
    job,
    pricingSuggestion: {
      range: `${priceBand.low}-${priceBand.high} MAD`,
      recommended: `${priceBand.recommended} MAD`,
      reasoning: priceBand.reasoning
    }
  });
}));
```

### 5.3 Update Offer Scoring

Modify offer creation to use AI scoring:

```typescript
import { scoreOfferWithAI } from "./services/ai-pricing";

// When creating offer:
const aiScoring = await scoreOfferWithAI({
  job: {
    category: job.category,
    description: job.spec.description,
    budgetHintMad: job.budgetHintMad,
  },
  offer: {
    priceMad: offerData.priceMad,
    etaMin: offerData.etaMin,
    notes: offerData.notes,
  },
  provider: {
    rating: provider.rating,
    verified: provider.verified,
  },
  competingOffers: existingOffers,
  fairPriceRange: job.spec.priceBand
});

// Store AI score
offerData.aiScore = aiScoring.score.toString();
```

---

## Step 6: Implement Security (2 hours)

### 6.1 Copy Security Service

```bash
cp /home/claude/server-security.ts server/services/security.ts
```

### 6.2 Update Auth Routes

Replace existing auth in `server/routes.ts`:

```typescript
import { 
  hashPassword, 
  verifyPassword, 
  generateTokens, 
  requireAuth, 
  requireRole,
  rateLimit 
} from "./services/security";

// Signup with bcrypt
app.post("/api/auth/signup", 
  rateLimit(10, 60000), // 10 requests per minute
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await storage.createUser({
      email,
      password: hashedPassword, // Store hashed password
      role,
      locale: req.body.locale || 'fr-MA'
    });

    // Generate JWT tokens
    const tokens = generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email || undefined
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  })
);

// Login with bcrypt verification
app.post("/api/auth/login",
  rateLimit(5, 60000), // 5 attempts per minute
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password with bcrypt
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email || undefined
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  })
);
```

### 6.3 Update All Protected Routes

Replace `requireAuth` middleware calls with the new JWT-based version:

```typescript
// Before:
app.get("/api/jobs", requireAuth, async (req, res) => { ... });

// After (same syntax, but now uses JWT):
app.get("/api/jobs", requireAuth, async (req, res) => {
  const userId = (req as any).auth.userId; // From JWT payload
  ...
});
```

---

## Step 7: Add PSP Payment Flow (2 hours)

### 7.1 Copy PSP Service

```bash
cp /home/claude/server-payment-psp.ts server/services/payment.ts
```

### 7.2 Add Payment Routes

Add new routes in `server/routes.ts`:

```typescript
import { 
  initiateSubscriptionPayment, 
  processPaymentCallback 
} from "./services/payment";

// Initiate subscription payment
app.post("/api/payment/subscription", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
  const { tier, durationMonths } = req.body;
  const providerId = (req as any).auth.providerId;

  const payment = await initiateSubscriptionPayment({
    providerId,
    tier,
    durationMonths
  });

  res.json(payment);
}));

// PSP callback webhook
app.post("/api/payment/callback", asyncHandler(async (req, res) => {
  const result = await processPaymentCallback(req.body);

  if (result.success) {
    // Update provider subscription in database
    // TODO: Implement subscription activation
  }

  res.json({ received: true });
}));

// Payment success page
app.get("/payment/success", (req, res) => {
  res.send("<h1>Payment Successful!</h1><p>Redirecting...</p>");
});

// Payment failed page
app.get("/payment/failed", (req, res) => {
  res.send("<h1>Payment Failed</h1><p>Please try again.</p>");
});
```

---

## Step 8: Environment Setup (15 min)

### 8.1 Copy Environment Template

```bash
cp /home/claude/.env.phase1.example .env.phase1
```

### 8.2 Configure Critical Variables

Edit `.env.phase1` and set:

```bash
# CRITICAL: Generate secure random strings
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Get Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-... # From https://console.anthropic.com/

# PSP settings (use 'test' mode initially)
PSP_PROVIDER=test
```

### 8.3 Load Environment

```bash
# Add to your app startup
cp .env.phase1 .env
# or
export $(cat .env.phase1 | xargs)
```

---

## Step 9: Testing (2 hours)

### 9.1 Test Commission System

```bash
# Create test script: test-commission.ts
import { canProviderSubmitOffer, processOfferAcceptance } from "./server/services/commission";

// Test free tier
const result = await canProviderSubmitOffer("provider-id-123");
console.log("Can submit?", result.allowed);
console.log("Free offers remaining:", result.freeOffersRemaining);

// Test commission calculation
const commission = await processOfferAcceptance("offer-id-456");
console.log("Commission:", commission);
```

### 9.2 Test AI Pricing

```bash
# Test AI pricing endpoint
curl -X POST http://localhost:5000/api/test/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "category": "transport",
    "city": "Marrakech",
    "description": "Airport to hotel transfer for 4 people",
    "timeISO": "2025-11-01T10:00:00Z",
    "pax": 4
  }'
```

### 9.3 Test Security

```bash
# Test signup with password hashing
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "role": "buyer"
  }'

# Should return JWT tokens
# {
#   "user": {...},
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "expiresIn": 900
# }
```

### 9.4 Test Payment Flow

```bash
# Test subscription payment initiation
curl -X POST http://localhost:5000/api/payment/subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tier": "basic",
    "durationMonths": 1
  }'

# Should return payment URL
```

---

## Step 10: Deploy (1 hour)

### 10.1 Pre-deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured in production
- [ ] Database migrations applied
- [ ] JWT_SECRET is secure random string (not default)
- [ ] PSP credentials configured (or test mode enabled)
- [ ] ANTHROPIC_API_KEY set
- [ ] Rate limiting enabled

### 10.2 Deploy Steps

```bash
# 1. Run database migrations on production
npm run db:push

# 2. Deploy application
# (depends on your hosting: Replit, Heroku, AWS, etc.)

# 3. Verify environment variables
env | grep -E "(JWT_SECRET|PSP_|ANTHROPIC)"

# 4. Test critical endpoints
curl https://your-domain.com/api/health
```

---

## 🎯 Success Criteria

After completing Phase 1, you should have:

✅ **Commission System**
- [ ] Platform fee recorded on every accepted offer
- [ ] Provider free tier tracked (4 free offers)
- [ ] Commission rates configurable by category
- [ ] Provider earnings calculated correctly

✅ **Dynamic AI**
- [ ] Job pricing uses Claude API (with fallback)
- [ ] Offers scored with AI recommendations
- [ ] Pricing adapts to Morocco context (seasons, cities, time)

✅ **Security**
- [ ] Passwords hashed with bcrypt (no plaintext)
- [ ] JWT authentication on all protected routes
- [ ] Rate limiting on auth endpoints
- [ ] Role-based access control working

✅ **Payment Integration**
- [ ] PSP configured (test mode working)
- [ ] Subscription payment flow functional
- [ ] Webhook handler processing callbacks
- [ ] Transaction ledger recording payments

---

## 🚨 Common Issues & Solutions

### Issue: AI pricing returns fallback

**Solution:** Check ANTHROPIC_API_KEY is set correctly:
```bash
echo $ANTHROPIC_API_KEY
# Should start with sk-ant-api03-
```

### Issue: JWT verification fails

**Solution:** Ensure JWT_SECRET is consistent across restarts:
```bash
# Don't use default! Generate secure secret:
openssl rand -hex 32 > .jwt_secret
export JWT_SECRET=$(cat .jwt_secret)
```

### Issue: Commission not calculated

**Solution:** Verify platform_fees table exists:
```sql
SELECT * FROM platform_fees LIMIT 1;
```

### Issue: PSP payment fails

**Solution:** Check PSP configuration:
```bash
# For initial testing, use test mode:
export PSP_PROVIDER=test
```

---

## 📚 Next Steps (Phase 2)

After Phase 1 is stable:
1. Add WebSocket for real-time offers
2. Implement KYC file uploads
3. Build admin panel for commission management
4. Add analytics dashboard
5. Mobile app development

---

## 🆘 Need Help?

- Check logs: `tail -f logs/app.log`
- Review error responses: They include helpful context
- Test in isolation: Use Postman/curl to test each endpoint
- Verify database state: Connect to PostgreSQL and inspect tables

**Estimated Total Time:** 12-16 hours for full Phase 1 implementation

Good luck! 🚀
