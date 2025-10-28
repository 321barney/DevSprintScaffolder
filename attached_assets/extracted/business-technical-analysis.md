# SoukMatch: Business & Technical Gap Analysis
## Moroccan Tourism Marketplace Platform

**Date:** October 28, 2025  
**Status:** MVP Complete → Production Readiness Assessment

---

## 🎯 Business Model Clarification

### Current Understanding vs. Your Requirements

| Aspect | Current Implementation | Your Actual Requirement |
|--------|----------------------|------------------------|
| **Target Users** | Generic buyers/providers | **Tourists & Investors in Morocco** |
| **Payment Model** | Not implemented | **Commission-based** (% from service providers) |
| **Freemium Model** | None | **4 free offers, then paid** |
| **Maps** | Planned but not built | **NOT needed** - using device location only |
| **Provider Rating** | Schema exists, UI not implemented | **NOT needed initially** |
| **AI Usage** | Static heuristics | **Dynamic AI needed** for request management |
| **Payment Processor** | None | **Moroccan local PSP** (after free tier) |

### ✅ What This Means

**You're building:** A tourism concierge platform where:
1. **Tourists/Investors** post service requests (transport, tours, etc.)
2. **Service providers** submit competitive offers
3. **Platform takes commission** from accepted offers
4. **First 4 offers free** per provider, then subscription/per-offer fees
5. **No maps** - location from device GPS
6. **AI manages** the matching and pricing dynamically

---

## 🚨 Critical Gaps to Address

### 1. **MISSING: Commission & Payment Architecture**

**Current State:** No payment flow at all

**Required Implementation:**

```typescript
// New database tables needed:

// Commission tracking
CREATE TABLE platform_fees (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id),
  offer_amount_mad DECIMAL(10,2),
  commission_rate DECIMAL(5,4),  -- e.g., 0.15 for 15%
  commission_mad DECIMAL(10,2),
  provider_net_mad DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending','collected','failed')),
  collected_at TIMESTAMPTZ
);

// Provider subscription/credits
CREATE TABLE provider_subscriptions (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers(id),
  free_offers_remaining INT DEFAULT 4,
  subscription_tier TEXT CHECK (tier IN ('free','basic','premium')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Transaction ledger
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers(id),
  type TEXT CHECK (type IN ('offer_charge','subscription','refund')),
  amount_mad DECIMAL(10,2),
  psp_reference TEXT,  -- Moroccan PSP transaction ID
  status TEXT CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Business Logic Needed:**

```typescript
// server/payment/commission.ts

export interface CommissionConfig {
  defaultRate: number;  // e.g., 0.15 = 15%
  categoryRates: {
    transport: number;
    tour: number;
    service: number;
    financing: number;
  };
}

export async function calculateCommission(
  offerId: string,
  config: CommissionConfig
): Promise<{
  offerAmount: number;
  commissionRate: number;
  commissionAmount: number;
  providerNet: number;
}> {
  // Get offer details
  const offer = await storage.getOffer(offerId);
  const job = await storage.getJob(offer.jobId);
  
  // Get rate by category
  const rate = config.categoryRates[job.category] || config.defaultRate;
  
  // Calculate
  const commission = Math.round(offer.priceMad * rate);
  const providerNet = offer.priceMad - commission;
  
  return {
    offerAmount: offer.priceMad,
    commissionRate: rate,
    commissionAmount: commission,
    providerNet
  };
}

export async function canProviderSubmitOffer(
  providerId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await storage.getProviderSubscription(providerId);
  
  // Check free offers
  if (sub.free_offers_remaining > 0) {
    return { allowed: true };
  }
  
  // Check paid subscription
  if (sub.subscription_tier !== 'free' && 
      new Date() < sub.subscription_expires_at) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'No free offers remaining. Please upgrade subscription.' 
  };
}
```

---

### 2. **MISSING: Moroccan Payment Service Provider Integration**

**Popular Moroccan PSPs:**
- **CMI (Centre Monétique Interbancaire)** - Most common
- **PayZone** - Wafa, Attijariwafa Bank
- **Maroc Telecommerce (MTC)** - Multi-bank
- **Stripe Morocco** (if available)

**Integration Pattern Needed:**

```typescript
// server/payment/psp-morocco.ts

import axios from 'axios';

export interface MoroccanPSPConfig {
  merchantId: string;
  terminalId: string;
  secretKey: string;
  apiUrl: string;  // e.g., CMI payment gateway
}

export async function initiatePSPPayment(
  transaction: {
    amount: number;
    currency: 'MAD';
    providerId: string;
    description: string;
  },
  config: MoroccanPSPConfig
): Promise<{
  paymentUrl: string;
  transactionId: string;
}> {
  // CMI/PayZone integration
  const payload = {
    amount: transaction.amount,
    currency: transaction.currency,
    merchantId: config.merchantId,
    terminalId: config.terminalId,
    orderId: `PRV-${transaction.providerId}-${Date.now()}`,
    okUrl: `${process.env.APP_URL}/payment/success`,
    failUrl: `${process.env.APP_URL}/payment/failed`,
    // ... other PSP-specific fields
  };
  
  // Sign request
  const signature = generateHMAC(payload, config.secretKey);
  
  const response = await axios.post(config.apiUrl, {
    ...payload,
    signature
  });
  
  return {
    paymentUrl: response.data.redirectUrl,
    transactionId: response.data.transactionId
  };
}

// Webhook handler for PSP callbacks
export async function handlePSPWebhook(
  req: Request
): Promise<void> {
  const { transactionId, status, amount, signature } = req.body;
  
  // Verify signature
  if (!verifyPSPSignature(req.body, signature)) {
    throw new Error('Invalid PSP signature');
  }
  
  // Update transaction status
  await storage.updateTransaction(transactionId, {
    status: status === 'success' ? 'completed' : 'failed',
    psp_reference: transactionId
  });
  
  // If subscription payment, update provider credits
  if (status === 'success') {
    await creditProviderAccount(transactionId);
  }
}
```

---

### 3. **MISSING: Dynamic AI System**

**Current:** Static heuristics (hardcoded pricing formulas)

**Required:** Dynamic AI that learns from:
- Historical accepted offers
- Seasonal patterns
- Provider performance
- Tourist demand patterns

**Implementation Approach:**

```typescript
// server/ai/dynamic-pricing.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateDynamicPriceBand(input: {
  category: string;
  city: string;
  description: string;
  timeISO: string;
  historicalData?: any[];
}): Promise<{
  low: number;
  high: number;
  reasoning: string;
}> {
  const prompt = `You are a pricing expert for Morocco's tourism marketplace.

Current Request:
- Category: ${input.category}
- City: ${input.city}
- Description: ${input.description}
- Date/Time: ${input.timeISO}

${input.historicalData ? `Historical Data: ${JSON.stringify(input.historicalData)}` : ''}

Moroccan Context:
- Peak tourist season: March-May, September-November
- Ramadan affects service availability
- Weekend = Friday/Saturday
- Major cities: Casablanca (business), Marrakech (tourism), Rabat (government)

Provide a fair price range in MAD with brief reasoning.

Return JSON:
{
  "low": <number>,
  "high": <number>,
  "reasoning": "<1-2 sentences>"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const response = JSON.parse(message.content[0].text);
  return response;
}

export async function scoreOfferWithAI(input: {
  job: any;
  offer: any;
  provider: any;
  competingOffers: any[];
}): Promise<{
  score: number;
  reasoning: string;
  recommendation: 'strong' | 'moderate' | 'weak';
}> {
  const prompt = `Score this service offer for a tourist in Morocco.

Job Request:
${JSON.stringify(input.job.spec, null, 2)}

This Offer:
- Price: ${input.offer.priceMad} MAD
- ETA: ${input.offer.etaMin} minutes
- Provider Rating: ${input.provider.rating}/5
- Verified: ${input.provider.verified}

Competing Offers: ${input.competingOffers.length} others ranging ${Math.min(...input.competingOffers.map(o => o.priceMad))}-${Math.max(...input.competingOffers.map(o => o.priceMad))} MAD

Score 0-1, with reasoning. Return JSON:
{
  "score": <0.0-1.0>,
  "reasoning": "<1 sentence>",
  "recommendation": "strong|moderate|weak"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return JSON.parse(message.content[0].text);
}
```

---

### 4. **MISSING: Geolocation Without Maps**

**Current:** City selection dropdown

**Required:** Device GPS coordinates only

```typescript
// client/src/hooks/useGeolocation.ts

export function useGeolocation() {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    city?: string;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Reverse geocode to get city (no map display)
          const city = await reverseGeocode(lat, lng);
          
          setLocation({
            lat,
            lng,
            city,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fall back to city selection
        }
      );
    }
  }, []);

  return location;
}

// Reverse geocoding using Morocco-specific service
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Use Nominatim or similar (no Google Maps needed)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  );
  const data = await response.json();
  return data.address.city || data.address.town || data.address.village;
}
```

**Update Job Posting Flow:**

```typescript
// client/src/pages/PostJob.tsx

export default function PostJob() {
  const location = useGeolocation();
  
  // Auto-fill city from GPS
  useEffect(() => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        city: location.city,
        coordinates: { lat: location.lat, lng: location.lng }
      }));
    }
  }, [location]);
  
  // Store coordinates in job spec
  const handleSubmit = async () => {
    await createJob({
      ...formData,
      spec: {
        ...formData.spec,
        location: {
          city: location.city,
          coordinates: [location.lat, location.lng],
          accuracy: location.accuracy
        }
      }
    });
  };
}
```

---

### 5. **Remove/Simplify Provider Rating System**

**Current:** Full rating schema exists

**Your Requirement:** Not needed initially

**Action:** Hide from UI, keep schema for future

```typescript
// client/src/pages/JobDetail.tsx

// REMOVE rating display from provider offers
// KEEP backend schema for future phase

// Instead, show:
// - Verification badge only
// - Number of completed jobs
// - Response time average
```

---

## 📊 Revised Architecture Diagram

```
┌─────────────┐
│   Tourist   │
│  (Buyer)    │
└──────┬──────┘
       │
       │ 1. Post Request (GPS location)
       │
       ▼
┌─────────────────────────────────┐
│      SoukMatch Platform         │
│  ┌──────────────────────────┐   │
│  │  AI Job Processor        │   │
│  │  - Parse request         │   │
│  │  - Dynamic pricing       │   │
│  │  - Match providers       │   │
│  └──────────────────────────┘   │
└───────────┬─────────────────────┘
            │
            │ 2. Notify eligible providers
            │
            ▼
┌────────────────────────────────┐
│   Service Providers            │
│   (Transport, Tours, etc.)     │
│                                │
│   Free Tier: 4 offers/month    │
│   Then: Subscription required  │
└───────────┬────────────────────┘
            │
            │ 3. Submit offers
            │
            ▼
┌─────────────────────────────────┐
│      AI Offer Scoring           │
│   - Compare all offers          │
│   - Rank by value/quality       │
│   - Present to tourist          │
└───────────┬─────────────────────┘
            │
            │ 4. Tourist accepts
            │
            ▼
┌─────────────────────────────────┐
│    Commission Processing        │
│                                 │
│  Offer Price: 500 MAD           │
│  Commission (15%): 75 MAD       │
│  Provider Gets: 425 MAD         │
│                                 │
│  Payment via Moroccan PSP:      │
│  - CMI / PayZone / MTC          │
└─────────────────────────────────┘
```

---

## 🛠 Implementation Priority Queue

### Phase 1: Critical (Week 1-2) - **Blocking Launch**

1. **Payment & Commission System**
   - [ ] Database schema for fees, subscriptions, transactions
   - [ ] Free tier tracking (4 offers per provider)
   - [ ] Commission calculation logic
   - [ ] Provider subscription UI

2. **Moroccan PSP Integration**
   - [ ] Research & select PSP (CMI recommended)
   - [ ] Implement payment gateway
   - [ ] Webhook handlers for payment callbacks
   - [ ] Test with sandbox credentials

3. **Dynamic AI Pricing**
   - [ ] Replace static heuristics with Claude API
   - [ ] Implement context-aware pricing
   - [ ] Add historical data learning

### Phase 2: High Priority (Week 3-4)

4. **Geolocation**
   - [ ] Device GPS integration
   - [ ] Reverse geocoding (no maps)
   - [ ] Store coordinates in job spec
   - [ ] Remove city dropdown, use GPS city

5. **Provider Dashboard**
   - [ ] Free offer counter
   - [ ] Subscription upgrade flow
   - [ ] Earnings/commission breakdown
   - [ ] Payment history

6. **Security Hardening**
   - [ ] Implement bcrypt password hashing
   - [ ] JWT authentication
   - [ ] Rate limiting
   - [ ] Input validation

### Phase 3: Medium Priority (Week 5-6)

7. **Admin Panel**
   - [ ] Monitor transactions
   - [ ] Adjust commission rates by category
   - [ ] Provider verification workflow
   - [ ] Dispute resolution

8. **Analytics**
   - [ ] Track conversion rates
   - [ ] Provider earnings reports
   - [ ] Platform revenue dashboard
   - [ ] Tourist satisfaction metrics

### Phase 4: Lower Priority (Future)

9. **Rating System** *(If needed later)*
   - Currently: Hidden, schema exists
   - Future: Enable when enough transaction volume

10. **Maps** *(Explicitly NOT doing)*
    - Decision: Device GPS only, no map UI

---

## 💰 Revenue Model Implementation

### Commission Structure (Recommended)

```typescript
// config/commission-rates.ts

export const COMMISSION_CONFIG = {
  default: 0.15,  // 15% default
  
  byCategory: {
    transport: 0.12,    // Lower for high-volume
    tour: 0.18,         // Higher for premium experiences
    service: 0.15,      // Standard
    financing: 0.20     // Broker model, higher fee
  },
  
  dynamicAdjustments: {
    newProvider: 0.10,  // Discount for first 10 jobs
    highVolume: 0.10,   // <10% if provider completes 50+ jobs/month
    premium: 0.15       // Standard for verified providers
  }
};
```

### Subscription Tiers

```typescript
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free Trial',
    monthlyPrice: 0,
    offersPerMonth: 4,
    commission: 0.15
  },
  
  basic: {
    name: 'Basic',
    monthlyPrice: 299,  // 299 MAD ~= $30 USD
    offersPerMonth: 50,
    commission: 0.12    // Reduced commission
  },
  
  pro: {
    name: 'Professional',
    monthlyPrice: 799,  // 799 MAD ~= $80 USD
    offersPerMonth: -1, // Unlimited
    commission: 0.10,   // Lowest commission
    features: [
      'Priority placement',
      'Analytics dashboard',
      'Custom branding'
    ]
  }
};
```

---

## 🎯 Success Metrics

### Key Performance Indicators

1. **Provider Monetization**
   - Free tier conversion rate: Target >20%
   - Average revenue per provider: Target 500 MAD/month
   - Subscription retention: Target >80%

2. **Platform Revenue**
   - Commission per transaction: 15% average
   - Monthly recurring revenue (MRR)
   - Transaction volume growth

3. **Tourist Satisfaction**
   - Offers received per job: Target >3
   - Time to first offer: Target <5 minutes
   - Acceptance rate: Target >60%

4. **Provider Performance**
   - Offer acceptance rate by provider
   - Average earnings per offer
   - Response time to new jobs

---

## 🚀 Immediate Action Items

### This Week (Critical)

1. **Design commission database schema** (2 hours)
2. **Research Moroccan PSPs** - recommend CMI or PayZone (4 hours)
3. **Implement free tier counter** on offer submission (3 hours)
4. **Add Claude API** for dynamic pricing (4 hours)
5. **GPS location capture** on job posting (2 hours)

### Next Week

6. **PSP sandbox integration** (8 hours)
7. **Commission calculation** on offer acceptance (4 hours)
8. **Provider subscription UI** (6 hours)
9. **Payment webhook handlers** (4 hours)
10. **Security fixes** (bcrypt, JWT) (4 hours)

---

## 📝 Configuration Checklist

### Environment Variables to Add

```bash
# Payment Processing
MOROCCAN_PSP_MERCHANT_ID=your_merchant_id
MOROCCAN_PSP_TERMINAL_ID=your_terminal_id
MOROCCAN_PSP_SECRET_KEY=your_secret_key
MOROCCAN_PSP_API_URL=https://payment.cmi.co.ma/gateway

# AI Services
ANTHROPIC_API_KEY=sk-ant-...

# Commission Settings
DEFAULT_COMMISSION_RATE=0.15
FREE_OFFERS_PER_PROVIDER=4

# App URLs
APP_URL=https://soukmatch.ma
PAYMENT_SUCCESS_URL=https://soukmatch.ma/payment/success
PAYMENT_FAILURE_URL=https://soukmatch.ma/payment/failed
```

---

## 🎓 Summary

**You have a solid MVP foundation**, but you're missing the core monetization engine. The immediate priorities are:

1. ✅ **Keep:** Job posting, offer system, messaging, multilingual support
2. ❌ **Remove/Hide:** Rating system (for now), map UI (never needed)
3. 🚨 **Add Urgently:** Commission system, Moroccan PSP, free tier limits, dynamic AI
4. 🔧 **Fix:** Security (bcrypt, JWT), GPS location instead of dropdown

**Bottom Line:** You're ~60% complete. The missing 40% is all monetization and payment infrastructure - which is blocking launch. Focus Phase 1 (payment/commission) before adding any new features.

---

## Questions for You

1. **PSP Selection:** Do you have a preference? CMI, PayZone, or MTC?
2. **Commission Rate:** Is 15% standard rate acceptable? Should it vary by category?
3. **Subscription Pricing:** Are 299 MAD (Basic) / 799 MAD (Pro) reasonable for Moroccan market?
4. **Launch Timeline:** When do you need to go live? This affects tech choices.
5. **AI Budget:** How much can you spend on Claude API calls per month?

Let me know your answers and I'll create detailed implementation guides for the high-priority items!