# Trip to Work - Morocco Tourism & Service Platform

## Overview
Trip to Work is a Morocco-focused tourism and service platform connecting tourists and buyers with verified service providers (transport, tours, handymen, guides). It enables providers to build their brand through public profiles and portfolios. Key features include an interactive map-based marketplace, GPS tracking, AI-assisted pricing, photo uploads, and multi-language support (FR/AR/EN with RTL). The platform aims to monetize through a commission system and subscription tiers for providers.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions
- **Interactive Map Marketplace**: The default homepage features a map showing providers and jobs, utilizing Mapbox GL JS via `react-map-gl`.
- **Design System**:
    - **Colors**: Primary Warm Orange (#D97706), Accent Teal (#14B8A6), adaptive light/dark mode background.
    - **Typography**: System font stack, RTL support for Arabic.
    - **Spacing**: Consistent use of 0.5rem (small), 1rem (medium), 2rem (large).
- **Responsiveness**: Designed for mobile, tablet, and desktop.
- **Multilingual Support**: French, Arabic (RTL), English.
- **Dark Mode**: Available throughout the application.

### Technical Implementations
- **Core Features**: Multi-step job posting, AI pricing bands, job listings with offer counts, provider signup with KYC placeholder, conversation-based messaging.
- **Monetization**: Commission system (10-15% based on category/tier), subscription tiers (Free, Basic, Pro), AI-powered dynamic pricing, payment gateway integration.
- **Map Integration**: Provider and job markers on the map, clickable info popups, live count legend.
- **Object Storage**: Replit App Storage for photo uploads and document storage.

### Feature Specifications
- **Job Posting**: Category selection, description, location/budget, AI-assisted pricing.
- **Provider Profiles**: Public profiles with photos, portfolios, and verified credentials.
- **Subscription Tiers**: Starter, Professional, Fleet with varying offer limits and commission rates.
- **Private Messaging**: Accessible via job details only.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
    - **Core Tables**: `users`, `providers`, `jobs`, `offers`, `messages`, `ratings`, `financing_offers`.
    - **Monetization Tables**: `platform_fees`, `provider_subscriptions`, `transactions`, `provider_earnings`.
    - **Trip to Work Tables**: `provider_profiles`, `vehicles`, `provider_documents`, `trips`, `trip_tracks`.
- **API Endpoints**:
    - **Authentication**: `POST /api/auth/signup`, `POST /api/auth/login`.
    - **Jobs**: `POST /api/jobs`, `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel`.
    - **Offers**: `GET /api/jobs/:id/offers`, `POST /api/jobs/:id/offers`, `POST /api/offers/:id/accept`.
    - **Providers**: `POST /api/providers`, `GET /api/providers/:id`, `GET /api/providers`.
    - **Messaging**: `GET /api/jobs/:id/messages`, `POST /api/messages`, `GET /api/messages/conversations`.
    - **Ratings & Financing**: `POST /api/ratings`, `GET /api/financing/:jobId/offers`, `POST /api/financing/prequal`.
- **AI Modules**:
    - **Pricing Band**: `server/ai/pricing.ts` calculates price ranges based on city, category, distance, passengers, and time.
    - **Offer Scoring**: `server/ai/scoring.ts` scores offers based on provider rating, price fairness, ETA, compliance, and job fit.
- **Frontend Framework**: Utilizes a React-based frontend structure.

## External Dependencies
- **Mapbox GL JS**: Integrated via `react-map-gl` for interactive maps.
- **Anthropic Claude**: Used for AI-powered dynamic pricing.
- **CMI/PayZone/MTC**: Payment gateway support (in test mode).
- **Replit App Storage**: For photo uploads and document storage.