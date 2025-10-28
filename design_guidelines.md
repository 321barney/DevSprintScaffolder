# SoukMatch Design Guidelines

## Design Approach

**Reference-Based**: Drawing from Uber/Careem's transactional clarity, Airbnb's trust-building patterns, and Upwork's service provider comparison interfaces. This marketplace demands both emotional trust-building and efficient decision-making tools.

## Core Design Principles

1. **Trust Through Transparency**: Verification badges, ratings, and provider credentials prominently displayed
2. **Effortless Comparison**: Side-by-side offer views with clear value differentiation
3. **Cultural Sensitivity**: RTL-ready layouts, Morocco-centric imagery, trilingual hierarchy (FR/AR/EN)
4. **Progressive Disclosure**: Complex flows (KYC, financing) broken into digestible steps

---

## Typography System

**Primary Font**: Inter (Google Fonts) - excellent Arabic/Latin support, high legibility
**Secondary Font**: IBM Plex Sans Arabic (Google Fonts) - for enhanced Arabic typography

### Hierarchy
- **Hero/Display**: text-4xl to text-6xl, font-bold (48-60px)
- **Page Titles**: text-3xl, font-semibold (30-36px)
- **Section Headers**: text-2xl, font-semibold (24px)
- **Card Titles**: text-lg, font-medium (18px)
- **Body Text**: text-base, font-normal (16px)
- **Supporting Text**: text-sm, font-normal (14px)
- **Captions/Labels**: text-xs, font-medium (12px)

**Line Height**: Generous spacing - leading-relaxed (1.625) for body text, leading-tight (1.25) for headings

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-8, my-12)

### Mobile-First Grid
- **Mobile**: Single column, full-width cards with p-4 padding
- **Tablet** (md:): 2-column grids for offer cards, p-6 padding
- **Desktop** (lg:): 3-column for provider browse, 2-column for job detail + offers, p-8 padding

### Container Strategy
- **App Container**: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- **Content Sections**: max-w-4xl for forms, max-w-6xl for dashboards
- **Cards**: Consistent rounded-xl with shadow-md, hover:shadow-lg transitions

---

## Component Library

### Navigation
**Mobile App Header**
- Fixed top bar with back button (left/right based on RTL), centered title, action icon (right/left)
- Bottom navigation: 4 tabs (Home, Jobs, Messages, Profile) with icon + label
- Height: h-14 for top, h-16 for bottom nav

**Desktop Header** (if web interface)
- Sticky top navigation with logo, search bar, "Post Job" CTA, profile dropdown
- Height: h-20, two-row layout on mobile collapses to single row on desktop

### Cards & Lists

**Job Card** (Buyer's Posted Jobs)
- Prominent category badge (Transport/Tour/Service/Financing)
- Job title/description (2 lines max with truncation)
- Budget hint, city, timestamp
- Status indicator (Open/In Progress/Completed)
- Offer count badge: "5 offers" in corner
- Action: "View Offers" button

**Offer Card** (Provider Bids)
- Provider avatar (56x56px) with verification badge overlay
- Provider name, rating (stars + number), city
- Price (large, bold MAD amount), ETA estimate
- AI confidence score: Progress bar with percentage
- Compliance badges: Transport permit, insurance icons
- Expand/collapse for full notes
- Primary CTA: "Accept Offer" (full-width button)

**Provider Profile Card** (Browse/Search)
- Cover photo banner (aspect-ratio 16:9)
- Avatar overlay (bottom-left, -mt-12)
- Rating, review count, response time
- Service categories as compact chips
- "Request Quote" button
- Verification badges row

### Forms

**Job Posting Flow** (Multi-Step)
- Progress indicator: Stepped dots (1-2-3) at top
- Step 1: Category selection (large icon cards in 2x2 grid)
- Step 2: Free-text description textarea with AI assist hint
- Step 3: AI-structured confirmation with editable fields
- Floating bottom bar with "Back" and "Next/Post" buttons

**KYC Upload Form** (Providers)
- Document type cards with upload zones (drag-drop + click)
- Preview thumbnails with re-upload option
- Checklist sidebar showing completion status
- Inline validation with error states
- Submit flows to manual review screen

**Financing Calculator**
- Loan amount slider with MAD labels
- Term selector (chip group: 12/24/36/48 months)
- Down payment input
- Live-updating monthly payment display (large, emphasized)
- APR range disclosure (text-xs)
- "Check Pre-Qualification" CTA

### Data Display

**Offer Comparison Table** (Desktop)
- Sticky header row with sortable columns: Provider, Price, ETA, Rating, Score
- Highlight best value row with subtle background
- Inline action buttons per row
- Expand drawer for full offer details

**Offer Comparison Cards** (Mobile)
- Swipeable carousel of offer cards
- Sort dropdown: "Best Match / Lowest Price / Fastest ETA"
- Filter chips: Verified Only, Budget Range
- Each card shows all key metrics vertically

**Ratings Display**
- Star icons (filled/half/empty) with numeric average
- Count in parentheses: "4.8 (127 reviews)"
- Breakdown bars for 5/4/3/2/1 stars (horizontal progress bars)
- Recent reviews list: Avatar, name, rating, comment, timestamp

### Messaging

**Chat Interface**
- Job context card pinned at top (collapsible)
- Message bubbles: Sent (right-aligned), Received (left-aligned)
- Timestamps every 5 messages or time gap
- Input bar: Text field, attach button, send button
- System messages (offer accepted, payment held) centered with distinct styling

### Overlays & Modals

**Confirmation Dialogs**
- Centered modal with backdrop blur
- Icon at top (success/warning/info)
- Title, description, primary/secondary buttons
- Example: "Accept Offer?" with price, provider, terms summary

**Bottom Sheets** (Mobile)
- Slide-up from bottom with drag handle
- Filter options, sort menus, provider details
- Dismissible by swipe down or backdrop tap

---

## Images

### Hero Sections
**App Splash/Onboarding**: Full-screen imagery showcasing Morocco transport scenes (taxis in medina, tour buses in Atlas Mountains, modern city transport). Overlay gradient (top-to-bottom dark fade) with white text and blurred-background CTAs.

**Provider Profiles**: Optional banner images (600x200px) - providers upload their own (vehicle fleet, tour group, office). Fallback to category-specific patterns if not uploaded.

**Category Icons**: Not photos - use icon library (Heroicons) for Transport (truck), Tours (map), Services (briefcase), Financing (currency).

**Trust Signals**: Small verification badge icons, permit/insurance document icons, star rating icons.

---

## Animations

**Minimal & Purposeful Only**:
- Page transitions: Simple slide (100ms) for navigation stack
- Offer arrival: Subtle fade-in with scale (0.95 to 1.0) when new bid appears
- Pull-to-refresh: Standard mobile pattern
- No scroll-triggered animations, parallax, or decorative motion

---

## Accessibility & Localization

**RTL Support**: All layouts mirror for Arabic - flexbox with `dir="rtl"` attribute on root, navigation icons flip sides, text alignment inverts.

**Touch Targets**: Minimum 44x44px for all interactive elements (mobile), 48x48px preferred.

**Contrast**: Ensure text meets WCAG AA standards against all backgrounds (4.5:1 for body, 3:1 for large text).

**Form Inputs**: Consistent height (h-12), clear labels above fields, inline validation with icons, error text below in contrasting treatment.

**Language Switcher**: Flag icons + text labels in header, persists across sessions.

---

## Key Screens Structure

**Home (Buyer)**
- Search bar at top
- Quick category tiles (2x2 grid)
- Active jobs list (cards)
- Suggested providers carousel

**Job Detail (Buyer)**
- Job summary card
- Real-time offer feed (auto-updates)
- Sort/filter bar
- Comparison toggle (list ↔ table)

**Post Job Flow**
- Full-screen stepped form
- AI assist preview
- Confirmation screen with edit options

**Provider Dashboard**
- Stats cards (earnings, active jobs, rating)
- New job alerts feed
- "Submit Offer" quick action
- KYC status banner if incomplete

**Offer Submission (Provider)**
- Job requirements recap
- Price input with suggested range hint
- ETA estimate picker
- Notes textarea
- Terms acceptance checkbox
- "Submit Bid" CTA

This design system balances marketplace efficiency with trust-building warmth, optimized for Morocco's trilingual mobile-first market.