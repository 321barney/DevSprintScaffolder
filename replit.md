# SoukMatch - Morocco Marketplace Platform

## Overview
SoukMatch is a Morocco-first bid/offer marketplace where buyers post jobs (transport, tours, B2B services, car financing) and providers submit competitive bids. The platform uses AI-assisted features for pricing guidance, offer scoring, and job structuring.

## Current Status
**Task 1: Schema & Frontend (In Progress)**
- ✅ Complete PostgreSQL database schema with all entities
- ✅ Design system configured with Morocco-themed colors (warm orange/terracotta primary, teal accent)
- ✅ Comprehensive i18n support (FR/AR/EN) with RTL handling for Arabic
- ✅ Context providers for app state, theme, and locale
- ✅ Beautiful component library built with Shadcn UI
- ✅ Complete user flows implemented:
  - Home page with hero and category selection
  - Multi-step job posting flow with AI structure preview
  - Jobs listing with search and filtering
  - Job detail page with real-time offer feed
  - Offer cards with AI scoring visualization
  - Provider signup with KYC document upload
  - Messaging interface for buyer-provider communication
- ✅ Responsive design with mobile-first approach
- ✅ Dark mode support across all pages
- ✅ Accessibility features (proper contrast, touch targets, ARIA labels)

**Next: Task 2 - Backend Implementation**
**Then: Task 3 - Integration & Testing**

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI + Tailwind CSS
- date-fns for date formatting

### Backend (To Be Implemented)
- Express.js API server
- PostgreSQL with Drizzle ORM
- AI pricing and scoring modules (heuristic-based)
- WebSocket support for real-time offers

### Database Schema
- `users` - Buyers, providers, and admins with role-based access
- `providers` - Provider profiles with KYC verification status
- `jobs` - Transport, tour, service, and financing requests
- `offers` - Provider bids with AI scoring
- `financing_offers` - Car loan/lease broker flows
- `messages` - In-job communication
- `ratings` - Post-completion reviews

## Key Features
1. **Multi-language Support**: French (default), Arabic (RTL), English
2. **Category System**: Transport, Tours, Services, Financing
3. **AI Assistance**: Job structuring, price bands, offer scoring
4. **KYC Verification**: Provider verification with document upload
5. **Real-time Offers**: Live offer streaming to buyers
6. **Secure Messaging**: In-app communication
7. **Rating System**: Post-job reviews for trust building
8. **Morocco-Specific**: MAD currency, Moroccan cities, local compliance

## Design Principles
- **Trust Through Transparency**: Verification badges, ratings prominently displayed
- **Effortless Comparison**: Clear offer cards with AI scores
- **Cultural Sensitivity**: RTL support, trilingual UI, Morocco-centric imagery
- **Progressive Disclosure**: Complex flows broken into digestible steps

## User Roles
- **Buyers**: Post jobs, receive offers, accept bids, rate providers
- **Providers**: Submit offers, manage KYC, communicate with buyers
- **Admin**: Review KYC, moderate content, manage platform (future)

## Development Guidelines
- All text must be internationalized through i18n system
- Use formatCurrency() for MAD amounts
- Follow design guidelines in design_guidelines.md religiously
- Maintain RTL compatibility for all layouts
- Use existing Shadcn components (no custom recreations)
- Implement proper loading and error states everywhere

## API Endpoints (To Be Built)
- `POST /api/auth/signup`, `POST /api/auth/login`
- `POST /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs`
- `POST /api/jobs/:id/offers`, `GET /api/jobs/:id/offers`
- `POST /api/offers/:id/accept`
- `POST /api/providers`, `GET /api/providers/:id`
- `POST /api/messages`, `GET /api/jobs/:id/messages`
- `POST /api/ratings`

## Environment Setup
- DATABASE_URL: PostgreSQL connection string (already configured)
- SESSION_SECRET: Session encryption key (already configured)
- PORT: Server port (default 5000)

## Recent Changes
- Created comprehensive database schema with all marketplace entities
- Built complete frontend component library with i18n support
- Implemented job posting, browsing, and offer viewing flows
- Added provider KYC signup flow with document uploads
- Created messaging interface for buyer-provider communication
- Configured Morocco-themed design system with warm colors
- Added dark mode support across entire application

## Next Steps
1. Complete Task 1 with architect review
2. Implement backend API endpoints and business logic
3. Connect frontend to backend with proper state management
4. Add WebSocket support for real-time offer updates
5. Implement AI pricing and scoring algorithms
6. Test complete user journeys end-to-end
