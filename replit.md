# Trip2work - Morocco Tourism & Service Platform

## Overview
Trip2work is a Morocco-focused tourism and service platform connecting tourists and buyers with verified service providers (transport, tours, handymen, guides). It enables providers to build their brand through public profiles and portfolios. Key features include an interactive map-based marketplace, GPS tracking, AI-assisted pricing, photo uploads, and multi-language support (FR/AR/EN with RTL). The platform now supports B2B/MICE (Meetings, Incentives, Conferences & Events) with corporate workspaces, venue management, RFP workflows, group bookings, and enterprise invoicing. The platform monetizes through a commission system and subscription tiers for providers.

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
- **B2B/MICE Features**:
  - **Venue Marketplace**: Browse venues with filters (city, type, verified, invoice-ready), venue details with rooms, capacity, amenities.
  - **RFP Workflow**: Create RFPs, submit quotes, compare quotes side-by-side.
  - **Corporate Workspace**: Company accounts, cost centers, traveler profiles, approval workflows.
  - **Enterprise Features**: VAT-compliant invoicing, PO numbers, payment terms (Net-15/30), SLA response times.
  - **Group Bookings**: Room blocks, rooming lists, deposit schedules.
  - **Preferred Partner Tiers**: Four-tier system (Bronze, Silver, Gold, Platinum) with reliability scoring, margin settings, and benefits management for providers across five categories (transport, hotel, venue, av_equipment, dmc).
  - **Corporate Rate Negotiation**: Account-based pricing with percentage discounts, fixed rates, and tiered structures. Tracks usage counts and spending limits per company-provider relationship.
  - **Milestone Payment Tracking**: Multi-stage payment schedules (deposit, pre-event, post-event, final) with support for multiple payers (company, individual, cost center) and various payment methods (bank transfer, credit card, invoice).
  - **Event Reporting Dashboard**: Comprehensive analytics tracking total spend, savings, RFP conversion rates, booking counts, on-time delivery percentages, and custom metrics per company per period.
  - **Duty of Care & Travel Safety**: Itinerary management with traveler profiles, emergency contacts, risk assessments, and real-time disruption alerts (weather, flight delays, health, security) with severity levels and acknowledgment tracking.
  - **DMC Network**: Destination Management Company integration with service catalogs, destination coverage, group size limits, language offerings, certifications, insurance details, and verification status.
  - **SEO Landing Pages**: City-specific venue search pages ("meeting rooms in {city}") with capacity/layout filters for organic traffic acquisition.
  - **Slack/Teams Notifications**: Integration with collaboration platforms for real-time booking/approval notifications, plus .ics calendar export for seamless calendar integration.
  - **Virtual Cards & Expense Tracking**: Company virtual card management with spend limits, automated expense entry tracking, receipt management, and reconciliation workflows.
  - **Sustainability & ESG**: CO₂ emission estimates per booking (transport, accommodation, catering, energy), waste tracking, local sourcing percentages, ESG scoring, and carbon offset purchasing.
  - **Quality Assurance System**: Secret shopper audits, scheduled venue inspections, post-event NPS surveys with detailed feedback categories and improvement tracking.
  - **FAM Trips & Buyer Showcases**: Provider-organized familiarization trips for corporate buyers, event planners, and travel managers with registration management and post-trip feedback.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM.
    - **Core Tables**: `users`, `providers`, `jobs`, `offers`, `messages`, `ratings`, `financing_offers`.
    - **Monetization Tables**: `platform_fees`, `provider_subscriptions`, `transactions`, `provider_earnings`.
    - **Trip to Work Tables**: `provider_profiles`, `vehicles`, `provider_documents`, `trips`, `trip_tracks`.
    - **MICE/B2B Tables**: `companies`, `cost_centers`, `traveler_profiles`, `venues`, `venue_rooms`, `rfps`, `quotes`, `group_bookings`, `approvals`.
    - **Advanced MICE Tables**: `partner_tiers`, `corporate_rates`, `milestone_payments`, `event_reports`, `itineraries`, `disruption_alerts`, `dmc_partners`.
    - **Phase 5 Enhancement Tables**: `notification_preferences`, `notification_history`, `virtual_cards`, `expense_entries`, `sustainability_metrics`, `quality_audits`, `post_event_nps`, `fam_trips`, `fam_trip_registrations`.
- **API Endpoints**:
    - **Authentication**: `POST /api/auth/signup`, `POST /api/auth/login`.
    - **Jobs**: `POST /api/jobs`, `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel`.
    - **Offers**: `GET /api/jobs/:id/offers`, `POST /api/jobs/:id/offers`, `POST /api/offers/:id/accept`.
    - **Providers**: `POST /api/providers`, `GET /api/providers/:id`, `GET /api/providers`.
    - **Messaging**: `GET /api/jobs/:id/messages`, `POST /api/messages`, `GET /api/messages/conversations`.
    - **Ratings & Financing**: `POST /api/ratings`, `GET /api/financing/:jobId/offers`, `POST /api/financing/prequal`.
    - **MICE - Venues**: `GET /api/venues`, `POST /api/venues`, `GET /api/venues/:id`, `PATCH /api/venues/:id`, `POST /api/venues/:venueId/rooms`, `GET /api/venues/:venueId/rooms`.
    - **MICE - RFPs**: `GET /api/rfps`, `POST /api/rfps`, `GET /api/rfps/:id`, `PATCH /api/rfps/:id`, `GET /api/rfps/:id/quotes`, `POST /api/rfps/:id/quotes`.
    - **MICE - Corporate**: `POST /api/companies`, `GET /api/companies/:id`, `GET /api/companies/:id/cost-centers`, `POST /api/cost-centers`, `GET /api/companies/:id/travelers`, `POST /api/traveler-profiles`, `GET /api/approvals/pending`, `POST /api/approvals`, `PATCH /api/approvals/:id`, `GET /api/companies/:id/bookings`, `POST /api/group-bookings`.
    - **Advanced MICE - Partner Management**: `GET /api/partner-tiers`, `POST /api/partner-tiers`, `GET /api/partner-tiers/:id`, `PATCH /api/partner-tiers/:id`.
    - **Advanced MICE - Corporate Rates**: `GET /api/corporate-rates`, `POST /api/corporate-rates`, `GET /api/corporate-rates/:id`, `PATCH /api/corporate-rates/:id`.
    - **Advanced MICE - Payments**: `GET /api/milestone-payments`, `POST /api/milestone-payments`, `GET /api/milestone-payments/:id`, `PATCH /api/milestone-payments/:id`.
    - **Advanced MICE - Reporting**: `GET /api/event-reports`, `POST /api/event-reports`, `GET /api/event-reports/:id`.
    - **Advanced MICE - Duty of Care**: `GET /api/itineraries`, `POST /api/itineraries`, `GET /api/itineraries/:id`, `PATCH /api/itineraries/:id`, `GET /api/disruption-alerts`, `POST /api/disruption-alerts`, `GET /api/disruption-alerts/:id`, `PATCH /api/disruption-alerts/:id`.
    - **Advanced MICE - DMC Partners**: `GET /api/dmc-partners`, `POST /api/dmc-partners`, `GET /api/dmc-partners/:id`, `PATCH /api/dmc-partners/:id`.
    - **Phase 5 - Notifications**: `GET /api/notification-preferences`, `POST /api/notification-preferences`, `PATCH /api/notification-preferences/:id`.
    - **Phase 5 - Expenses**: `GET /api/virtual-cards`, `POST /api/virtual-cards`, `GET /api/expense-entries`, `POST /api/expense-entries`, `PATCH /api/expense-entries/:id`.
    - **Phase 5 - Sustainability**: `GET /api/sustainability-metrics`, `POST /api/sustainability-metrics`.
    - **Phase 5 - Quality**: `GET /api/quality-audits`, `POST /api/quality-audits`, `GET /api/post-event-nps`, `POST /api/post-event-nps`.
    - **Phase 5 - FAM Trips**: `GET /api/fam-trips`, `POST /api/fam-trips`, `GET /api/fam-trips/:id`, `PATCH /api/fam-trips/:id`, `GET /api/fam-trip-registrations`, `POST /api/fam-trip-registrations`, `PATCH /api/fam-trip-registrations/:id`.
    - **Phase 5 - SEO & Calendar**: `GET /api/seo/meeting-rooms/:city`, `GET /api/group-bookings/:id/calendar`.
- **AI Modules**:
    - **Pricing Band**: `server/ai/pricing.ts` calculates price ranges based on city, category, distance, passengers, and time.
    - **Offer Scoring**: `server/ai/scoring.ts` scores offers based on provider rating, price fairness, ETA, compliance, and job fit.
- **Frontend Framework**: Utilizes a React-based frontend structure.

## External Dependencies
- **Mapbox GL JS**: Integrated via `react-map-gl` for interactive maps.
- **Anthropic Claude**: Used for AI-powered dynamic pricing.
- **CMI/PayZone/MTC**: Payment gateway support (in test mode).
- **Replit App Storage**: For photo uploads and document storage.