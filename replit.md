# Trip to Work - Morocco Tourism & Service Platform

**Last Updated:** October 28, 2025

## Overview
Trip to Work is a Morocco-focused tourism and service platform where tourists and buyers can discover and book services from verified providers (transport, tours, handymen, guides). Providers build their brand with public profiles, photo portfolios, and verified credentials. The platform features maps integration, GPS tracking, AI-assisted pricing, photo uploads, and multi-language support (FR/AR/EN with RTL).

## Current Status: Phase 1 Monetization Complete ✅

### Core MVP Features (Pre-Phase 1)
- ✅ Multi-step job posting flow (category → description → location/budget)
- ✅ AI pricing bands and offer scoring (Morocco-specific heuristics)
- ✅ Job listings with real-time offer counts
- ✅ Provider signup with KYC placeholder (file upload UI ready)
- ✅ Messaging interface (conversation-based)
- ✅ Multilingual support (French, Arabic RTL, English)
- ✅ Dark mode throughout
- ✅ Responsive design for mobile/tablet/desktop
- ✅ PostgreSQL database with complete schema

### Phase 1 Monetization Features ✅
- ✅ **Commission System**: 10-15% based on category/tier, atomic recording of platform fees and provider earnings
- ✅ **Subscription Tiers**: Free (4 offers) → Basic (299 MAD/month, 50 offers, 12% commission) → Pro (799 MAD/month, unlimited, 10% commission)
- ✅ **AI-Powered Dynamic Pricing**: Anthropic Claude integration with automatic fallback to Morocco-specific heuristics
- ✅ **Free Tier Management**: Automatic tracking and enforcement of offer limits
- ✅ **Payment Gateway Integration**: CMI/PayZone/MTC support with test mode
- ✅ **Financial Tables**: platform_fees, provider_subscriptions, transactions, provider_earnings

### Test Results
- **Core MVP Test:** ✅ PASSED (Job posting, navigation, UI interactions)
- **Phase 1 Integration Test:** ✅ PASSED
  - AI pricing generates price bands with aiGenerated flag
  - Free tier limits enforced (2→1→0 offers tracked correctly)
  - Commission calculation accurate (10% for Pro tier: 500 MAD → 50 MAD fee)
  - Free tier exhaustion blocks new offers with 403 + needsUpgrade flag
  - Subscription status API returns correct tier/eligibility data

## Architecture

### Database Schema (PostgreSQL + Drizzle ORM)
- **users**: id (uuid), email, password, role (buyer/provider/admin), locale
- **providers**: id (uuid), userId, displayName, city, rating, permits (jsonb), verified
- **jobs**: id (uuid), buyerId, category, city, spec (jsonb), budgetHintMad, status
- **offers**: id (uuid), jobId, providerId, priceMad, etaMin, aiScore, status, compliance
- **messages**: id (uuid), jobId, senderId, body, createdAt
- **ratings**: id (uuid), jobId, raterId, rateeId, score, comment
- **financing_offers**: id (uuid), jobId, lenderId, apr, termMonths, monthlyPaymentMad

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Create user account
- `POST /api/auth/login` - Authenticate user
- ⚠️ **Security Warning:** Uses plaintext passwords for MVP demo. Production requires bcrypt hashing.

#### Jobs
- `POST /api/jobs` - Create new job (with AI price band calculation)
- `GET /api/jobs` - List open jobs
- `GET /api/jobs?buyerId={id}` - Get jobs for specific buyer
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/cancel` - Cancel a job

#### Offers
- `GET /api/jobs/:id/offers` - List offers for a job (enriched with provider data)
- `POST /api/jobs/:id/offers` - Submit offer (with AI scoring)
- `POST /api/offers/:id/accept` - Accept offer (declines other offers automatically)

#### Providers
- `POST /api/providers` - Create provider profile
- `GET /api/providers/:id` - Get provider details

#### Messaging
- `GET /api/jobs/:id/messages` - Get messages for a job
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - List conversations for user

#### Ratings & Financing
- `POST /api/ratings` - Submit rating
- `GET /api/financing/:jobId/offers` - Get financing offers
- `POST /api/financing/prequal` - Pre-qualify for financing

### AI Modules

#### Pricing Band (`server/ai/pricing.ts`)
Calculates fair price ranges based on:
- City (Casablanca, Marrakech, Rabat, etc.)
- Category (transport, tour, service, financing)
- Distance (km)
- Passenger count (pax)
- Time of day/week

#### Offer Scoring (`server/ai/scoring.ts`)
Scores offers 0-1 based on:
- Provider rating & verification status
- Price fairness vs. band
- ETA competitiveness
- Compliance (permits, insurance)
- Distance/fit for job requirements

## Frontend Structure

### Pages
- `/` - Homepage with hero and CTA
- `/post-job` - 3-step job posting wizard
- `/jobs` - Job listings with filters
- `/jobs/:id` - Job detail with offers
- `/provider/signup` - Provider onboarding with KYC
- `/messages` - Messaging interface

### Key Components
- `JobCard` - Job summary card with category icon, city, offer count
- `OfferCard` - Provider offer with AI score visualization, price, ETA
- `CategoryIcon` - Visual icons for transport/tour/service/financing
- `Header` - Navigation with language switcher and theme toggle
- `ProviderBadge` - Verification status display

### Design System
**Colors:**
- Primary: Warm Orange (#D97706) - Moroccan warmth, trust
- Accent: Teal (#14B8A6) - Modernity, reliability
- Background: Adaptive light/dark mode
- Text: 3-level hierarchy (default/secondary/tertiary)

**Typography:**
- System font stack for optimal performance
- RTL support for Arabic

**Spacing:**
- Small: 0.5rem
- Medium: 1rem
- Large: 2rem

## Known Limitations & TODOs

### Security (CRITICAL for Production)
```javascript
// ⚠️ Current: Plaintext passwords
password: 'unsafe_plaintext'

// ✅ Production Required:
npm install bcrypt @types/bcrypt
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

### Authentication
- **Current:** Hard-coded buyer UUID (`80bc66ef-1602-4a00-9272-0aef66d83d3c`) for demo
- **Required:** Implement JWT or session-based auth with `AppContext`
- **Impact:** All users share same identity in current MVP

### File Uploads
- **Current:** KYC file upload UI exists but doesn't persist files
- **Required:** Implement file storage (S3, Cloudinary, or Replit Object Storage)
- **Impact:** Provider verification cannot be completed

### Real-time Features
- **Current:** REST API only
- **Required:** WebSocket for live offer notifications
- **Impact:** Buyers must refresh to see new offers

### Production Readiness Gaps (from gap analysis)

#### Non-functional Requirements
- [ ] Performance SLOs: p95 latency < 300ms, uptime 99.5%
- [ ] Rate limiting: 60 req/min per user, idempotency keys
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Offline support: retry/backoff, offline banners

#### Security & Compliance
- [ ] Threat model: fake KYC, collusion detection
- [ ] RBAC & audit logging (immutable audit trail)
- [ ] Data retention policy (chats 18mo, KYC 5yrs)
- [ ] Legal packs: Terms, Privacy, Bank Al-Maghrib disclosure

#### Trust & Safety
- [ ] Disputes runbook with SLAs
- [ ] Content moderation filters
- [ ] Off-platform steering detection

#### Payments & Escrow
- [ ] PSP integration (pre-auth → capture → refund flow)
- [ ] Idempotent webhooks
- [ ] Chargeback handling

#### AI/LLM Engineering
- [ ] Prompt versioning + RAG
- [ ] Fallback to heuristics when LLM unavailable
- [ ] Bias checks for provider fairness
- [ ] PII redaction in prompts

#### Observability
- [ ] Dashboards: latency, error rate, TTF-offer, win rate
- [ ] Alerts: 5xx>1%, LLM fail>10%, payout failures
- [ ] Cost guardrails and anomaly detection

#### Data Model Hardening
- [ ] Database indexes (composite on city+created_at)
- [ ] PostGIS for proximity calculations
- [ ] Audit tables for KYC/payout/role changes

## Seed Data

Test users and data available:
- **Buyer:** ahmed@example.ma (ID: 80bc66ef-1602-4a00-9272-0aef66d83d3c)
- **Buyer:** fatima@example.ma
- **Provider:** transport@casablanca.ma (verified, 4.8★)
- **Provider:** tours@marrakech.ma (verified, 4.9★)
- **Provider:** service@rabat.ma (unverified, 4.5★)
- **3 Jobs** with varying offers
- **Sample messages** for conversation testing

## Development Workflow

### Running Locally
```bash
npm run dev  # Starts Express + Vite on port 5000
```

### Database Management
```bash
npm run db:push        # Push schema changes to PostgreSQL
npx tsx server/seed.ts # Seed test data
```

### Accessing the App
- **Frontend:** http://localhost:5000
- **API:** http://localhost:5000/api/*
- **Database:** PostgreSQL via DATABASE_URL env var

## Recent Changes
- **2025-10-28 (Phase 1):** ✅ Completed Phase 1 monetization integration - all tests passing
- **2025-10-28 (Phase 1):** Fixed subscription seed data (Pro/Basic tiers now correctly assigned)
- **2025-10-28 (Phase 1):** Created commission service with tier-based rate calculation
- **2025-10-28 (Phase 1):** Integrated Anthropic Claude API for dynamic pricing with fallback
- **2025-10-28 (Phase 1):** Added payment gateway service (CMI/PayZone/MTC in test mode)
- **2025-10-28 (Phase 1):** Extended database schema with 4 financial tables
- **2025-10-28:** Fixed job creation redirect bug (JSON parsing)
- **2025-10-28:** Fixed UUID validation errors (replaced 'demo-buyer' string)
- **2025-10-28:** Added end-to-end test coverage - all tests passing
- **2025-10-28:** Implemented complete API backend with AI modules
- **2025-10-28:** Built full frontend with 6 pages and i18n support

## Next Steps

### Immediate (P0)
1. Implement proper authentication (JWT/session)
2. Add password hashing with bcrypt
3. Wire auth context throughout app
4. Implement file upload for KYC documents

### Short-term (P1)
5. Add WebSocket for real-time offer notifications
6. Implement rate limiting and idempotency
7. Add database indexes for performance
8. Create admin panel for KYC verification

### Medium-term (P2)
9. Integrate payment provider (Stripe/local PSP)
10. Add comprehensive logging and monitoring
11. Implement dispute resolution workflow
12. Content moderation system

### Long-term (P3)
13. Mobile app (React Native)
14. Advanced AI features (actual LLM integration)
15. Multi-city expansion tools
16. Analytics dashboard

## Contact & Support
For questions or issues with this MVP, refer to:
- API endpoints in `server/routes.ts`
- Database schema in `shared/schema.ts`
- Design guidelines in `design_guidelines.md`