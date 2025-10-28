import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull().$type<"buyer" | "provider" | "admin">(),
  email: text("email").unique(),
  phone: text("phone"),
  locale: text("locale").default("fr-MA").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  provider: one(providers, {
    fields: [users.id],
    references: [providers.userId],
  }),
  jobs: many(jobs),
  sentMessages: many(messages),
  ratingsGiven: many(ratings, { relationName: "rater" }),
  ratingsReceived: many(ratings, { relationName: "ratee" }),
}));

// Providers
export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  displayName: text("display_name").notNull(),
  city: text("city"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0").notNull(),
  permits: jsonb("permits").default({}).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, {
    fields: [providers.userId],
    references: [users.id],
  }),
  offers: many(offers),
}));

// Jobs
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  category: text("category").notNull().$type<"transport" | "tour" | "service" | "financing">(),
  city: text("city"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  spec: jsonb("spec").notNull(),
  budgetHintMad: integer("budget_hint_mad"),
  status: text("status").default("open").notNull().$type<"open" | "accepted" | "completed" | "cancelled">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  buyer: one(users, {
    fields: [jobs.buyerId],
    references: [users.id],
  }),
  offers: many(offers),
  messages: many(messages),
  ratings: many(ratings),
  financingOffers: many(financingOffers),
}));

// Offers
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  priceMad: integer("price_mad"),
  etaMin: integer("eta_min"),
  notes: text("notes"),
  aiScore: decimal("ai_score", { precision: 5, scale: 3 }),
  compliance: jsonb("compliance"),
  expiresAt: timestamp("expires_at"),
  status: text("status").default("pending").notNull().$type<"pending" | "accepted" | "declined" | "expired">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const offersRelations = relations(offers, ({ one }) => ({
  job: one(jobs, {
    fields: [offers.jobId],
    references: [jobs.id],
  }),
  provider: one(providers, {
    fields: [offers.providerId],
    references: [providers.id],
  }),
}));

// Financing Offers
export const financingOffers = pgTable("financing_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  lenderCode: text("lender_code").notNull(),
  type: text("type").notNull().$type<"loan" | "lease">(),
  apr: decimal("apr", { precision: 5, scale: 2 }),
  termMonths: integer("term_months"),
  downPaymentMad: integer("down_payment_mad"),
  monthlyMad: integer("monthly_mad"),
  conditions: jsonb("conditions"),
  prequal: boolean("prequal").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financingOffersRelations = relations(financingOffers, ({ one }) => ({
  job: one(jobs, {
    fields: [financingOffers.jobId],
    references: [jobs.id],
  }),
}));

// Messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  job: one(jobs, {
    fields: [messages.jobId],
    references: [jobs.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Ratings
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  raterId: uuid("rater_id").references(() => users.id).notNull(),
  rateeId: uuid("ratee_id").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  tags: text("tags").array(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ratingsRelations = relations(ratings, ({ one }) => ({
  job: one(jobs, {
    fields: [ratings.jobId],
    references: [jobs.id],
  }),
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
    relationName: "rater",
  }),
  ratee: one(users, {
    fields: [ratings.rateeId],
    references: [users.id],
    relationName: "ratee",
  }),
}));

// Audit Logs - Immutable log of critical operations
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().optional(),
  role: z.enum(["buyer", "provider", "admin"]),
  locale: z.string().default("fr-MA"),
}).omit({ id: true, createdAt: true });

export const insertProviderSchema = createInsertSchema(providers).omit({ 
  id: true, 
  createdAt: true,
  rating: true,
  verified: true,
});

export const insertJobSchema = createInsertSchema(jobs, {
  category: z.enum(["transport", "tour", "service", "financing"]),
  spec: z.record(z.any()),
}).omit({ id: true, createdAt: true, status: true });

export const insertOfferSchema = createInsertSchema(offers).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  aiScore: true,
});

export const insertFinancingOfferSchema = createInsertSchema(financingOffers, {
  type: z.enum(["loan", "lease"]),
}).omit({ id: true, createdAt: true });

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings, {
  score: z.number().int().min(1).max(5),
  tags: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true });

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ 
  id: true, 
  createdAt: true,
});

// Select Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;

export type FinancingOffer = typeof financingOffers.$inferSelect;
export type InsertFinancingOffer = z.infer<typeof insertFinancingOfferSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ========================================
// PHASE 1: Payment & Commission Tables
// ========================================

// Platform Fees - Commission on accepted offers
export const platformFees = pgTable("platform_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").references(() => offers.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  grossAmountMad: integer("gross_amount_mad").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  commissionAmountMad: integer("commission_amount_mad").notNull(),
  providerNetMad: integer("provider_net_mad").notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "collected" | "failed">(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformFeesRelations = relations(platformFees, ({ one }) => ({
  offer: one(offers, {
    fields: [platformFees.offerId],
    references: [offers.id],
  }),
  job: one(jobs, {
    fields: [platformFees.jobId],
    references: [jobs.id],
  }),
  provider: one(providers, {
    fields: [platformFees.providerId],
    references: [providers.id],
  }),
}));

// Provider Subscriptions - Free, Basic, Pro tiers
export const providerSubscriptions = pgTable("provider_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).unique().notNull(),
  tier: text("tier").default("free").notNull().$type<"free" | "basic" | "pro">(),
  freeOffersRemaining: integer("free_offers_remaining").default(4).notNull(),
  paidOffersSubmitted: integer("paid_offers_submitted").default(0).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  autoRenew: boolean("auto_renew").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerSubscriptionsRelations = relations(providerSubscriptions, ({ one }) => ({
  provider: one(providers, {
    fields: [providerSubscriptions.providerId],
    references: [providers.id],
  }),
}));

// Transactions - Payments for subscriptions and payouts
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  type: text("type").notNull().$type<"subscription_payment" | "provider_payout" | "refund">(),
  amountMad: integer("amount_mad").notNull(),
  currency: text("currency").default("MAD").notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "processing" | "completed" | "failed" | "refunded">(),
  pspProvider: text("psp_provider"),
  pspTransactionId: text("psp_transaction_id"),
  pspResponse: jsonb("psp_response"),
  metadata: jsonb("metadata"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  provider: one(providers, {
    fields: [transactions.providerId],
    references: [providers.id],
  }),
}));

// Provider Earnings - Track net income after commissions
export const providerEarnings = pgTable("provider_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  offerId: uuid("offer_id").references(() => offers.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  grossAmountMad: integer("gross_amount_mad").notNull(),
  commissionAmountMad: integer("commission_amount_mad").notNull(),
  netAmountMad: integer("net_amount_mad").notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "available" | "paid_out">(),
  paidOutAt: timestamp("paid_out_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerEarningsRelations = relations(providerEarnings, ({ one }) => ({
  provider: one(providers, {
    fields: [providerEarnings.providerId],
    references: [providers.id],
  }),
  offer: one(offers, {
    fields: [providerEarnings.offerId],
    references: [offers.id],
  }),
  job: one(jobs, {
    fields: [providerEarnings.jobId],
    references: [jobs.id],
  }),
}));

// Phase 1 Insert Schemas
export const insertPlatformFeeSchema = createInsertSchema(platformFees).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  paidAt: true,
});

export const insertProviderSubscriptionSchema = createInsertSchema(providerSubscriptions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true,
  status: true,
});

export const insertProviderEarningSchema = createInsertSchema(providerEarnings).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  paidOutAt: true,
});

// Phase 1 Select Types
export type PlatformFee = typeof platformFees.$inferSelect;
export type InsertPlatformFee = z.infer<typeof insertPlatformFeeSchema>;

export type ProviderSubscription = typeof providerSubscriptions.$inferSelect;
export type InsertProviderSubscription = z.infer<typeof insertProviderSubscriptionSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type ProviderEarning = typeof providerEarnings.$inferSelect;
export type InsertProviderEarning = z.infer<typeof insertProviderEarningSchema>;

// Commission Configuration Constants
export const COMMISSION_CONFIG = {
  transport: 0.12,  // 12%
  tour: 0.18,       // 18%
  service: 0.15,    // 15%
  financing: 0.20,  // 20%
  default: 0.15,    // 15%
} as const;

export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Starter",  // Renamed from "Free"
    priceMAD: 0,
    offersIncluded: 4,
    commissionRate: null, // Uses category default
    maxOffers: 4,
  },
  basic: {
    name: "Professional",  // Renamed from "Basic"
    priceMAD: 299,
    offersIncluded: 50,
    commissionRate: 0.12, // 12%
    maxOffers: 50,
  },
  pro: {
    name: "Fleet",  // Renamed from "Pro"
    priceMAD: 799,
    offersIncluded: null, // Unlimited
    commissionRate: 0.10, // 10%
    maxOffers: null,
  },
} as const;

// ========================================
// PHASE 2: Trip to Work Features
// ========================================

// Provider Profiles - Extended branding and portfolio
export const providerProfiles = pgTable("provider_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).unique().notNull(),
  brandName: text("brand_name"),
  bio: text("bio"),
  profilePhotoUrl: text("profile_photo_url"),
  heroImageUrl: text("hero_image_url"),
  portfolioPhotos: text("portfolio_photos").array().default([]),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  serviceAreaRadius: integer("service_area_radius"), // in kilometers
  website: text("website"),
  socialMedia: jsonb("social_media"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerProfilesRelations = relations(providerProfiles, ({ one }) => ({
  provider: one(providers, {
    fields: [providerProfiles.providerId],
    references: [providers.id],
  }),
}));

// Vehicles - Provider vehicle information
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  licensePlate: text("license_plate").notNull(),
  type: text("type").notNull().$type<"sedan" | "suv" | "van" | "bus" | "truck" | "motorcycle" | "other">(),
  capacity: integer("capacity"), // passenger capacity
  photoUrls: text("photo_urls").array().default([]),
  status: text("status").default("active").notNull().$type<"active" | "inactive" | "maintenance">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  provider: one(providers, {
    fields: [vehicles.providerId],
    references: [providers.id],
  }),
}));

// Provider Documents - Licensing and verification documents
export const providerDocuments = pgTable("provider_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  type: text("type").notNull().$type<"drivers_license" | "vehicle_registration" | "insurance" | "transport_permit" | "trade_license" | "certification" | "other">(),
  documentUrl: text("document_url").notNull(),
  documentNumber: text("document_number"),
  expiresAt: timestamp("expires_at"),
  status: text("status").default("pending").notNull().$type<"pending" | "verified" | "rejected" | "expired">(),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerDocumentsRelations = relations(providerDocuments, ({ one }) => ({
  provider: one(providers, {
    fields: [providerDocuments.providerId],
    references: [providers.id],
  }),
  verifier: one(users, {
    fields: [providerDocuments.verifiedBy],
    references: [users.id],
  }),
}));

// Trips - Completed service records with GPS tracking
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  offerId: uuid("offer_id").references(() => offers.id).notNull(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // in minutes
  distance: integer("distance"), // in meters
  startLocation: jsonb("start_location"), // {lat, lng, address}
  endLocation: jsonb("end_location"), // {lat, lng, address}
  status: text("status").default("scheduled").notNull().$type<"scheduled" | "in_progress" | "completed" | "cancelled">(),
  rating: integer("rating"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tripsRelations = relations(trips, ({ one, many }) => ({
  job: one(jobs, {
    fields: [trips.jobId],
    references: [jobs.id],
  }),
  offer: one(offers, {
    fields: [trips.offerId],
    references: [offers.id],
  }),
  provider: one(providers, {
    fields: [trips.providerId],
    references: [providers.id],
  }),
  buyer: one(users, {
    fields: [trips.buyerId],
    references: [users.id],
  }),
  trackPoints: many(tripTracks),
}));

// Trip Tracks - GPS coordinate history for trips
export const tripTracks = pgTable("trip_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trips.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // in km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // in degrees
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tripTracksRelations = relations(tripTracks, ({ one }) => ({
  trip: one(trips, {
    fields: [tripTracks.tripId],
    references: [trips.id],
  }),
}));

// Phase 2 Insert Schemas
export const insertProviderProfileSchema = createInsertSchema(providerProfiles, {
  portfolioPhotos: z.array(z.string().url()).optional(),
  socialMedia: z.record(z.string()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles, {
  type: z.enum(["sedan", "suv", "van", "bus", "truck", "motorcycle", "other"]),
  photoUrls: z.array(z.string().url()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertProviderDocumentSchema = createInsertSchema(providerDocuments, {
  type: z.enum(["drivers_license", "vehicle_registration", "insurance", "transport_permit", "trade_license", "certification", "other"]),
  documentUrl: z.string().url(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  verifiedAt: true,
  verifiedBy: true,
});

export const insertTripSchema = createInsertSchema(trips, {
  startLocation: z.record(z.any()).optional(),
  endLocation: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertTripTrackSchema = createInsertSchema(tripTracks).omit({ 
  id: true, 
  createdAt: true,
});

// Phase 2 Select Types
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type ProviderDocument = typeof providerDocuments.$inferSelect;
export type InsertProviderDocument = z.infer<typeof insertProviderDocumentSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type TripTrack = typeof tripTracks.$inferSelect;
export type InsertTripTrack = z.infer<typeof insertTripTrackSchema>;

// ========================================
// PHASE 3: MICE & B2B Features
// ========================================

// Companies - Corporate accounts
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  taxId: text("tax_id"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  billingAddress: jsonb("billing_address"),
  primaryContactId: uuid("primary_contact_id").references(() => users.id),
  paymentTerms: text("payment_terms").default("net-30").$type<"net-15" | "net-30" | "net-60" | "prepaid">(),
  creditLimit: integer("credit_limit"),
  status: text("status").default("active").notNull().$type<"active" | "suspended" | "closed">(),
  ssoProvider: text("sso_provider").$type<"google" | "microsoft" | "none">(),
  ssoConfig: jsonb("sso_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companiesRelations = relations(companies, ({ one, many }) => ({
  primaryContact: one(users, {
    fields: [companies.primaryContactId],
    references: [users.id],
  }),
  costCenters: many(costCenters),
  travelerProfiles: many(travelerProfiles),
  rfps: many(rfps),
}));

// Cost Centers - Budget tracking for corporate spending
export const costCenters = pgTable("cost_centers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  budgetMad: integer("budget_mad"),
  spentMad: integer("spent_mad").default(0).notNull(),
  managerId: uuid("manager_id").references(() => users.id),
  status: text("status").default("active").notNull().$type<"active" | "inactive">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const costCentersRelations = relations(costCenters, ({ one }) => ({
  company: one(companies, {
    fields: [costCenters.companyId],
    references: [companies.id],
  }),
  manager: one(users, {
    fields: [costCenters.managerId],
    references: [users.id],
  }),
}));

// Traveler Profiles - Corporate traveler information
export const travelerProfiles = pgTable("traveler_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  employeeId: text("employee_id"),
  department: text("department"),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  preferences: jsonb("preferences"), // dietary, room type, accessibility
  emergencyContact: jsonb("emergency_contact"),
  passportNumber: text("passport_number"),
  passportExpiry: timestamp("passport_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const travelerProfilesRelations = relations(travelerProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [travelerProfiles.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [travelerProfiles.userId],
    references: [users.id],
  }),
  costCenter: one(costCenters, {
    fields: [travelerProfiles.costCenterId],
    references: [costCenters.id],
  }),
}));

// Venues - Convention-ready inventory
export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<"hotel" | "convention_center" | "coworking" | "event_space" | "other">(),
  city: text("city").notNull(),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  totalCapacity: integer("total_capacity"),
  photoUrls: text("photo_urls").array().default([]),
  floorPlanUrl: text("floor_plan_url"),
  amenities: jsonb("amenities"), // WiFi, AV, catering, parking, accessibility
  pricing: jsonb("pricing"), // day rates, half-day, hourly
  verified: boolean("verified").default(false).notNull(),
  invoiceReady: boolean("invoice_ready").default(false).notNull(),
  slaResponseHours: integer("sla_response_hours").default(24),
  cancellationPolicy: text("cancellation_policy"),
  status: text("status").default("active").notNull().$type<"active" | "inactive" | "pending">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const venuesRelations = relations(venues, ({ one, many }) => ({
  provider: one(providers, {
    fields: [venues.providerId],
    references: [providers.id],
  }),
  rooms: many(venueRooms),
}));

// Venue Rooms - Meeting rooms with detailed specs
export const venueRooms = pgTable("venue_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").references(() => venues.id).notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  layout: text("layout").array().default([]), // theater, classroom, u-shape, boardroom, banquet, cocktail
  squareMeters: decimal("square_meters", { precision: 8, scale: 2 }),
  features: jsonb("features"), // projector, screen, whiteboard, video conferencing, sound system
  catering: boolean("catering").default(false),
  breakoutRooms: integer("breakout_rooms").default(0),
  naturalLight: boolean("natural_light").default(false),
  accessibility: boolean("accessibility").default(false),
  photoUrls: text("photo_urls").array().default([]),
  pricePerDayMad: integer("price_per_day_mad"),
  pricePerHalfDayMad: integer("price_per_half_day_mad"),
  status: text("status").default("available").notNull().$type<"available" | "unavailable">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const venueRoomsRelations = relations(venueRooms, ({ one }) => ({
  venue: one(venues, {
    fields: [venueRooms.venueId],
    references: [venues.id],
  }),
}));

// RFPs - Request for Proposals
export const rfps = pgTable("rfps", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull().$type<"conference" | "meeting" | "training" | "exhibition" | "gala" | "other">(),
  city: text("city").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  attendeeCount: integer("attendee_count").notNull(),
  requirements: jsonb("requirements"), // venue, rooms, catering, AV, transport
  budgetMad: integer("budget_mad"),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  slaHours: integer("sla_hours").default(24).notNull(),
  status: text("status").default("draft").notNull().$type<"draft" | "published" | "closed" | "awarded" | "cancelled">(),
  awardedQuoteId: uuid("awarded_quote_id"),
  publishedAt: timestamp("published_at"),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rfpsRelations = relations(rfps, ({ one, many }) => ({
  company: one(companies, {
    fields: [rfps.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [rfps.createdById],
    references: [users.id],
  }),
  costCenter: one(costCenters, {
    fields: [rfps.costCenterId],
    references: [costCenters.id],
  }),
  quotes: many(quotes),
}));

// Quotes - Supplier quotes for RFPs
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  rfpId: uuid("rfp_id").references(() => rfps.id).notNull(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  totalPriceMad: integer("total_price_mad").notNull(),
  breakdown: jsonb("breakdown").notNull(), // venue, catering, AV, transport itemized
  notes: text("notes"),
  validUntil: timestamp("valid_until").notNull(),
  responseTimeSla: boolean("response_time_sla").default(false),
  status: text("status").default("pending").notNull().$type<"pending" | "accepted" | "declined" | "expired">(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotesRelations = relations(quotes, ({ one }) => ({
  rfp: one(rfps, {
    fields: [quotes.rfpId],
    references: [rfps.id],
  }),
  provider: one(providers, {
    fields: [quotes.providerId],
    references: [providers.id],
  }),
  venue: one(venues, {
    fields: [quotes.venueId],
    references: [venues.id],
  }),
}));

// Group Bookings - Room blocks for events
export const groupBookings = pgTable("group_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  rfpId: uuid("rfp_id").references(() => rfps.id),
  quoteId: uuid("quote_id").references(() => quotes.id),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  venueId: uuid("venue_id").references(() => venues.id).notNull(),
  eventName: text("event_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  roomsBlocked: integer("rooms_blocked").notNull(),
  roomsBooked: integer("rooms_booked").default(0).notNull(),
  roomingList: jsonb("rooming_list"), // [{name, email, room, dates}]
  depositSchedule: jsonb("deposit_schedule"), // [{amount, dueDate, status}]
  totalPriceMad: integer("total_price_mad").notNull(),
  paidMad: integer("paid_mad").default(0).notNull(),
  poNumber: text("po_number"),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  status: text("status").default("pending").notNull().$type<"pending" | "confirmed" | "in_progress" | "completed" | "cancelled">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupBookingsRelations = relations(groupBookings, ({ one }) => ({
  rfp: one(rfps, {
    fields: [groupBookings.rfpId],
    references: [rfps.id],
  }),
  quote: one(quotes, {
    fields: [groupBookings.quoteId],
    references: [quotes.id],
  }),
  company: one(companies, {
    fields: [groupBookings.companyId],
    references: [companies.id],
  }),
  venue: one(venues, {
    fields: [groupBookings.venueId],
    references: [venues.id],
  }),
  costCenter: one(costCenters, {
    fields: [groupBookings.costCenterId],
    references: [costCenters.id],
  }),
}));

// Approvals - Approval workflow for corporate bookings
export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  resourceType: text("resource_type").notNull().$type<"rfp" | "group_booking" | "expense">(),
  resourceId: text("resource_id").notNull(),
  requestedById: uuid("requested_by_id").references(() => users.id).notNull(),
  approverId: uuid("approver_id").references(() => users.id).notNull(),
  amountMad: integer("amount_mad"),
  status: text("status").default("pending").notNull().$type<"pending" | "approved" | "rejected">(),
  notes: text("notes"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const approvalsRelations = relations(approvals, ({ one }) => ({
  company: one(companies, {
    fields: [approvals.companyId],
    references: [companies.id],
  }),
  requestedBy: one(users, {
    fields: [approvals.requestedById],
    references: [users.id],
    relationName: "requester",
  }),
  approver: one(users, {
    fields: [approvals.approverId],
    references: [users.id],
    relationName: "approver",
  }),
}));

// Partner Tiers - Preferred partner tier levels
export const partnerTiers = pgTable("partner_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  tier: text("tier").notNull().$type<"bronze" | "silver" | "gold" | "platinum">(),
  category: text("category").notNull().$type<"hotel" | "venue" | "av_equipment" | "transport" | "dmc">(),
  margin: decimal("margin", { precision: 5, scale: 2 }).notNull(),
  reliabilityScore: decimal("reliability_score", { precision: 5, scale: 2 }).default("0").notNull(),
  benefits: jsonb("benefits").default({}).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnerTiersRelations = relations(partnerTiers, ({ one }) => ({
  provider: one(providers, {
    fields: [partnerTiers.providerId],
    references: [providers.id],
  }),
}));

// Corporate Rates - Negotiated pricing between companies and partners
export const corporateRates = pgTable("corporate_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  category: text("category").notNull().$type<"hotel" | "venue" | "av_equipment" | "transport" | "dmc">(),
  rateType: text("rate_type").notNull().$type<"percentage_discount" | "fixed_price" | "tiered">(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  fixedPriceMad: integer("fixed_price_mad"),
  tiers: jsonb("tiers").default([]).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  minSpendMad: integer("min_spend_mad"),
  maxUsageCount: integer("max_usage_count"),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const corporateRatesRelations = relations(corporateRates, ({ one }) => ({
  company: one(companies, {
    fields: [corporateRates.companyId],
    references: [companies.id],
  }),
  provider: one(providers, {
    fields: [corporateRates.providerId],
    references: [providers.id],
  }),
  venue: one(venues, {
    fields: [corporateRates.venueId],
    references: [venues.id],
  }),
}));

// Milestone Payments - Deposits and payment tracking for bookings
export const milestonePayments = pgTable("milestone_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupBookingId: uuid("group_booking_id").references(() => groupBookings.id).notNull(),
  milestoneType: text("milestone_type").notNull().$type<"deposit" | "pre_event" | "post_event" | "final">(),
  amountMad: integer("amount_mad").notNull(),
  dueDate: timestamp("due_date").notNull(),
  payerId: uuid("payer_id").references(() => users.id),
  payerType: text("payer_type").$type<"company" | "individual" | "cost_center">(),
  payerReference: text("payer_reference"),
  paymentMethod: text("payment_method").$type<"bank_transfer" | "credit_card" | "invoice">(),
  status: text("status").default("pending").notNull().$type<"pending" | "paid" | "overdue" | "cancelled">(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestonePaymentsRelations = relations(milestonePayments, ({ one }) => ({
  groupBooking: one(groupBookings, {
    fields: [milestonePayments.groupBookingId],
    references: [groupBookings.id],
  }),
  payer: one(users, {
    fields: [milestonePayments.payerId],
    references: [users.id],
  }),
}));

// Event Reports - Spend, savings, RFP conversion metrics
export const eventReports = pgTable("event_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  totalSpendMad: integer("total_spend_mad").default(0).notNull(),
  totalSavingsMad: integer("total_savings_mad").default(0).notNull(),
  rfpCount: integer("rfp_count").default(0).notNull(),
  bookingCount: integer("booking_count").default(0).notNull(),
  rfpToBookingRate: decimal("rfp_to_booking_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  metrics: jsonb("metrics").default({}).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventReportsRelations = relations(eventReports, ({ one }) => ({
  company: one(companies, {
    fields: [eventReports.companyId],
    references: [companies.id],
  }),
}));

// Itineraries - Duty of care baseline tracking
export const itineraries = pgTable("itineraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupBookingId: uuid("group_booking_id").references(() => groupBookings.id).notNull(),
  travelerProfileId: uuid("traveler_profile_id").references(() => travelerProfiles.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  schedule: jsonb("schedule").default([]).notNull(),
  emergencyContacts: jsonb("emergency_contacts").default([]).notNull(),
  riskAssessment: jsonb("risk_assessment").default({}).notNull(),
  status: text("status").default("draft").notNull().$type<"draft" | "active" | "completed" | "disrupted">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itinerariesRelations = relations(itineraries, ({ one, many }) => ({
  groupBooking: one(groupBookings, {
    fields: [itineraries.groupBookingId],
    references: [groupBookings.id],
  }),
  travelerProfile: one(travelerProfiles, {
    fields: [itineraries.travelerProfileId],
    references: [travelerProfiles.id],
  }),
  disruptionAlerts: many(disruptionAlerts),
}));

// Disruption Alerts - Risk/compliance notifications
export const disruptionAlerts = pgTable("disruption_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  itineraryId: uuid("itinerary_id").references(() => itineraries.id).notNull(),
  alertType: text("alert_type").notNull().$type<"weather" | "flight_delay" | "health" | "security" | "other">(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high" | "critical">(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionRequired: boolean("action_required").default(false).notNull(),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const disruptionAlertsRelations = relations(disruptionAlerts, ({ one }) => ({
  itinerary: one(itineraries, {
    fields: [disruptionAlerts.itineraryId],
    references: [itineraries.id],
  }),
  acknowledger: one(users, {
    fields: [disruptionAlerts.acknowledgedBy],
    references: [users.id],
  }),
}));

// DMC Partners - Destination Management Companies
export const dmcPartners = pgTable("dmc_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  destinations: jsonb("destinations").default([]).notNull(),
  services: jsonb("services").default([]).notNull(),
  minGroupSize: integer("min_group_size"),
  maxGroupSize: integer("max_group_size"),
  languagesOffered: jsonb("languages_offered").default([]).notNull(),
  certifications: jsonb("certifications").default([]).notNull(),
  insuranceProvider: text("insurance_provider"),
  emergencyContact: jsonb("emergency_contact").default({}).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0").notNull(),
  verified: boolean("verified").default(false).notNull(),
  status: text("status").default("active").notNull().$type<"active" | "inactive" | "pending">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dmcPartnersRelations = relations(dmcPartners, ({ one }) => ({
  provider: one(providers, {
    fields: [dmcPartners.providerId],
    references: [providers.id],
  }),
}));

// Phase 3 Insert Schemas
export const insertCompanySchema = createInsertSchema(companies, {
  paymentTerms: z.enum(["net-15", "net-30", "net-60", "prepaid"]).optional(),
  ssoProvider: z.enum(["google", "microsoft", "none"]).optional(),
  billingAddress: z.record(z.any()).optional(),
  ssoConfig: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  spentMad: true,
});

export const insertTravelerProfileSchema = createInsertSchema(travelerProfiles, {
  preferences: z.record(z.any()).optional(),
  emergencyContact: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertVenueSchema = createInsertSchema(venues, {
  type: z.enum(["hotel", "convention_center", "coworking", "event_space", "other"]),
  photoUrls: z.array(z.string().url()).optional(),
  amenities: z.record(z.any()).optional(),
  pricing: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  verified: true,
});

export const insertVenueRoomSchema = createInsertSchema(venueRooms, {
  layout: z.array(z.string()).optional(),
  features: z.record(z.any()).optional(),
  photoUrls: z.array(z.string().url()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  status: true,
});

export const insertRfpSchema = createInsertSchema(rfps, {
  eventType: z.enum(["conference", "meeting", "training", "exhibition", "gala", "other"]),
  requirements: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  publishedAt: true,
  awardedQuoteId: true,
});

export const insertQuoteSchema = createInsertSchema(quotes, {
  breakdown: z.record(z.any()),
}).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  submittedAt: true,
  responseTimeSla: true,
});

export const insertGroupBookingSchema = createInsertSchema(groupBookings, {
  roomingList: z.array(z.record(z.any())).optional(),
  depositSchedule: z.array(z.record(z.any())).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  roomsBooked: true,
  paidMad: true,
});

export const insertApprovalSchema = createInsertSchema(approvals, {
  resourceType: z.enum(["rfp", "group_booking", "expense"]),
}).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  approvedAt: true,
});

export const insertPartnerTierSchema = createInsertSchema(partnerTiers, {
  tier: z.enum(["bronze", "silver", "gold", "platinum"]),
  category: z.enum(["hotel", "venue", "av_equipment", "transport", "dmc"]),
  benefits: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
});

export const insertCorporateRateSchema = createInsertSchema(corporateRates, {
  category: z.enum(["hotel", "venue", "av_equipment", "transport", "dmc"]),
  rateType: z.enum(["percentage_discount", "fixed_price", "tiered"]),
  tiers: z.array(z.record(z.any())).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  usageCount: true,
});

export const insertMilestonePaymentSchema = createInsertSchema(milestonePayments, {
  milestoneType: z.enum(["deposit", "pre_event", "post_event", "final"]),
  payerType: z.enum(["company", "individual", "cost_center"]).optional(),
  paymentMethod: z.enum(["bank_transfer", "credit_card", "invoice"]).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  paidAt: true,
});

export const insertEventReportSchema = createInsertSchema(eventReports, {
  metrics: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  generatedAt: true,
});

export const insertItinerarySchema = createInsertSchema(itineraries, {
  schedule: z.array(z.record(z.any())).optional(),
  emergencyContacts: z.array(z.record(z.any())).optional(),
  riskAssessment: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertDisruptionAlertSchema = createInsertSchema(disruptionAlerts, {
  alertType: z.enum(["weather", "flight_delay", "health", "security", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  metadata: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  acknowledgedBy: true,
  acknowledgedAt: true,
  resolvedAt: true,
});

export const insertDmcPartnerSchema = createInsertSchema(dmcPartners, {
  destinations: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  languagesOffered: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  emergencyContact: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  status: true,
  verified: true,
  rating: true,
});

// Phase 3 Select Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;

export type TravelerProfile = typeof travelerProfiles.$inferSelect;
export type InsertTravelerProfile = z.infer<typeof insertTravelerProfileSchema>;

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

export type VenueRoom = typeof venueRooms.$inferSelect;
export type InsertVenueRoom = z.infer<typeof insertVenueRoomSchema>;

export type Rfp = typeof rfps.$inferSelect;
export type InsertRfp = z.infer<typeof insertRfpSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type GroupBooking = typeof groupBookings.$inferSelect;
export type InsertGroupBooking = z.infer<typeof insertGroupBookingSchema>;

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;

export type PartnerTier = typeof partnerTiers.$inferSelect;
export type InsertPartnerTier = z.infer<typeof insertPartnerTierSchema>;

export type CorporateRate = typeof corporateRates.$inferSelect;
export type InsertCorporateRate = z.infer<typeof insertCorporateRateSchema>;

export type MilestonePayment = typeof milestonePayments.$inferSelect;
export type InsertMilestonePayment = z.infer<typeof insertMilestonePaymentSchema>;

export type EventReport = typeof eventReports.$inferSelect;
export type InsertEventReport = z.infer<typeof insertEventReportSchema>;

export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;

export type DisruptionAlert = typeof disruptionAlerts.$inferSelect;
export type InsertDisruptionAlert = z.infer<typeof insertDisruptionAlertSchema>;

export type DmcPartner = typeof dmcPartners.$inferSelect;
export type InsertDmcPartner = z.infer<typeof insertDmcPartnerSchema>;

// Notification Preferences - Slack/Teams integration settings
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  channel: text("channel").notNull().$type<"email" | "slack" | "teams" | "sms">(),
  slackWebhookUrl: text("slack_webhook_url"),
  slackChannelId: text("slack_channel_id"),
  teamsWebhookUrl: text("teams_webhook_url"),
  eventTypes: jsonb("event_types").default([]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  company: one(companies, {
    fields: [notificationPreferences.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });

// Notification History - Record of sent notifications
export const notificationHistory = pgTable("notification_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  preferenceId: uuid("preference_id").references(() => notificationPreferences.id),
  recipientId: uuid("recipient_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull().$type<"email" | "slack" | "teams" | "sms">(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  status: text("status").default("sent").notNull().$type<"sent" | "failed" | "pending">(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  preference: one(notificationPreferences, {
    fields: [notificationHistory.preferenceId],
    references: [notificationPreferences.id],
  }),
  recipient: one(users, {
    fields: [notificationHistory.recipientId],
    references: [users.id],
  }),
}));

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({ id: true, sentAt: true });

// Virtual Cards - Company virtual cards for expenses
export const virtualCards = pgTable("virtual_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  cardNumber: text("card_number").notNull(),
  cardholderName: text("cardholder_name").notNull(),
  expiryDate: text("expiry_date").notNull(),
  spendLimit: integer("spend_limit_mad"),
  currentSpend: integer("current_spend_mad").default(0).notNull(),
  provider: text("provider").notNull().$type<"stripe" | "brex" | "ramp" | "divvy">(),
  status: text("status").default("active").notNull().$type<"active" | "frozen" | "cancelled">(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const virtualCardsRelations = relations(virtualCards, ({ one }) => ({
  company: one(companies, {
    fields: [virtualCards.companyId],
    references: [companies.id],
  }),
  costCenter: one(costCenters, {
    fields: [virtualCards.costCenterId],
    references: [costCenters.id],
  }),
}));

export const insertVirtualCardSchema = createInsertSchema(virtualCards).omit({ id: true, createdAt: true });

// Expense Entries - Tracked expenses for reconciliation
export const expenseEntries = pgTable("expense_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  groupBookingId: uuid("group_booking_id").references(() => groupBookings.id),
  virtualCardId: uuid("virtual_card_id").references(() => virtualCards.id),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amountMad: integer("amount_mad").notNull(),
  category: text("category").notNull().$type<"accommodation" | "transport" | "catering" | "av_rental" | "other">(),
  description: text("description").notNull(),
  receiptUrl: text("receipt_url"),
  transactionDate: timestamp("transaction_date").notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "approved" | "rejected" | "reconciled">(),
  reconciliationNotes: text("reconciliation_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseEntriesRelations = relations(expenseEntries, ({ one }) => ({
  company: one(companies, {
    fields: [expenseEntries.companyId],
    references: [companies.id],
  }),
  groupBooking: one(groupBookings, {
    fields: [expenseEntries.groupBookingId],
    references: [groupBookings.id],
  }),
  virtualCard: one(virtualCards, {
    fields: [expenseEntries.virtualCardId],
    references: [virtualCards.id],
  }),
  costCenter: one(costCenters, {
    fields: [expenseEntries.costCenterId],
    references: [costCenters.id],
  }),
  user: one(users, {
    fields: [expenseEntries.userId],
    references: [users.id],
  }),
}));

export const insertExpenseEntrySchema = createInsertSchema(expenseEntries).omit({ id: true, createdAt: true });

// Sustainability Metrics - CO2 estimates and ESG tracking
export const sustainabilityMetrics = pgTable("sustainability_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupBookingId: uuid("group_booking_id").references(() => groupBookings.id).notNull(),
  totalCo2Kg: decimal("total_co2_kg", { precision: 10, scale: 2 }).notNull(),
  transportCo2Kg: decimal("transport_co2_kg", { precision: 10, scale: 2 }).default("0").notNull(),
  accommodationCo2Kg: decimal("accommodation_co2_kg", { precision: 10, scale: 2 }).default("0").notNull(),
  cateringCo2Kg: decimal("catering_co2_kg", { precision: 10, scale: 2 }).default("0").notNull(),
  energyCo2Kg: decimal("energy_co2_kg", { precision: 10, scale: 2 }).default("0").notNull(),
  wasteKg: decimal("waste_kg", { precision: 10, scale: 2 }).default("0").notNull(),
  recyclablePercentage: decimal("recyclable_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  localSourcingPercentage: decimal("local_sourcing_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  esgScore: decimal("esg_score", { precision: 5, scale: 2 }).default("0").notNull(),
  certifications: jsonb("certifications").default([]).notNull(),
  offsetPurchased: boolean("offset_purchased").default(false).notNull(),
  offsetProvider: text("offset_provider"),
  calculationMethod: text("calculation_method").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sustainabilityMetricsRelations = relations(sustainabilityMetrics, ({ one }) => ({
  groupBooking: one(groupBookings, {
    fields: [sustainabilityMetrics.groupBookingId],
    references: [groupBookings.id],
  }),
}));

export const insertSustainabilityMetricSchema = createInsertSchema(sustainabilityMetrics).omit({ id: true, createdAt: true });

// Quality Audits - Secret shopper and quality assessments
export const qualityAudits = pgTable("quality_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id").references(() => venues.id),
  providerId: uuid("provider_id").references(() => providers.id),
  auditorId: uuid("auditor_id").references(() => users.id).notNull(),
  auditType: text("audit_type").notNull().$type<"secret_shopper" | "scheduled" | "complaint_followup">(),
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }).notNull(),
  criteriaScores: jsonb("criteria_scores").default({}).notNull(),
  findings: text("findings").notNull(),
  photos: jsonb("photos").default([]).notNull(),
  actionItems: jsonb("action_items").default([]).notNull(),
  status: text("status").default("completed").notNull().$type<"scheduled" | "in_progress" | "completed" | "cancelled">(),
  visitDate: timestamp("visit_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qualityAuditsRelations = relations(qualityAudits, ({ one }) => ({
  venue: one(venues, {
    fields: [qualityAudits.venueId],
    references: [venues.id],
  }),
  provider: one(providers, {
    fields: [qualityAudits.providerId],
    references: [providers.id],
  }),
  auditor: one(users, {
    fields: [qualityAudits.auditorId],
    references: [users.id],
  }),
}));

export const insertQualityAuditSchema = createInsertSchema(qualityAudits).omit({ id: true, createdAt: true });

// Post Event NPS - Net Promoter Score surveys
export const postEventNps = pgTable("post_event_nps", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupBookingId: uuid("group_booking_id").references(() => groupBookings.id).notNull(),
  respondentId: uuid("respondent_id").references(() => users.id).notNull(),
  npsScore: integer("nps_score").notNull(),
  feedback: text("feedback"),
  categories: jsonb("categories").default({}).notNull(),
  wouldRecommend: boolean("would_recommend").notNull(),
  improvementAreas: jsonb("improvement_areas").default([]).notNull(),
  highlights: jsonb("highlights").default([]).notNull(),
  responseDate: timestamp("response_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postEventNpsRelations = relations(postEventNps, ({ one }) => ({
  groupBooking: one(groupBookings, {
    fields: [postEventNps.groupBookingId],
    references: [groupBookings.id],
  }),
  respondent: one(users, {
    fields: [postEventNps.respondentId],
    references: [users.id],
  }),
}));

export const insertPostEventNpsSchema = createInsertSchema(postEventNps).omit({ id: true, createdAt: true, responseDate: true });

// FAM Trips - Familiarization trips and buyer-supplier showcases
export const famTrips = pgTable("fam_trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: uuid("organizer_id").references(() => providers.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxAttendees: integer("max_attendees").notNull(),
  currentAttendees: integer("current_attendees").default(0).notNull(),
  targetAudience: text("target_audience").notNull().$type<"corporate_buyers" | "event_planners" | "travel_managers" | "all">(),
  venuesIncluded: jsonb("venues_included").default([]).notNull(),
  agenda: jsonb("agenda").default([]).notNull(),
  costPerPerson: integer("cost_per_person_mad"),
  status: text("status").default("planning").notNull().$type<"planning" | "open" | "full" | "completed" | "cancelled">(),
  registrationDeadline: timestamp("registration_deadline").notNull(),
  photos: jsonb("photos").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const famTripsRelations = relations(famTrips, ({ one }) => ({
  organizer: one(providers, {
    fields: [famTrips.organizerId],
    references: [providers.id],
  }),
}));

export const insertFamTripSchema = createInsertSchema(famTrips).omit({ id: true, createdAt: true, updatedAt: true });

// FAM Trip Registrations - Track attendee registrations
export const famTripRegistrations = pgTable("fam_trip_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  famTripId: uuid("fam_trip_id").references(() => famTrips.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  status: text("status").default("pending").notNull().$type<"pending" | "confirmed" | "waitlist" | "cancelled">(),
  specialRequests: text("special_requests"),
  attendedAt: timestamp("attended_at"),
  feedback: text("feedback"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const famTripRegistrationsRelations = relations(famTripRegistrations, ({ one }) => ({
  famTrip: one(famTrips, {
    fields: [famTripRegistrations.famTripId],
    references: [famTrips.id],
  }),
  user: one(users, {
    fields: [famTripRegistrations.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [famTripRegistrations.companyId],
    references: [companies.id],
  }),
}));

export const insertFamTripRegistrationSchema = createInsertSchema(famTripRegistrations).omit({ id: true, createdAt: true });

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

export type VirtualCard = typeof virtualCards.$inferSelect;
export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;

export type ExpenseEntry = typeof expenseEntries.$inferSelect;
export type InsertExpenseEntry = z.infer<typeof insertExpenseEntrySchema>;

export type SustainabilityMetric = typeof sustainabilityMetrics.$inferSelect;
export type InsertSustainabilityMetric = z.infer<typeof insertSustainabilityMetricSchema>;

export type QualityAudit = typeof qualityAudits.$inferSelect;
export type InsertQualityAudit = z.infer<typeof insertQualityAuditSchema>;

export type PostEventNps = typeof postEventNps.$inferSelect;
export type InsertPostEventNps = z.infer<typeof insertPostEventNpsSchema>;

export type FamTrip = typeof famTrips.$inferSelect;
export type InsertFamTrip = z.infer<typeof insertFamTripSchema>;

export type FamTripRegistration = typeof famTripRegistrations.$inferSelect;
export type InsertFamTripRegistration = z.infer<typeof insertFamTripRegistrationSchema>;

// === PHASE 6: Bleisure, Advanced Analytics, HRIS/SSO ===

// Bleisure Packages - Business + leisure combined packages
export const bleisurePackages = pgTable("bleisure_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  businessDays: integer("business_days").notNull(),
  leisureDays: integer("leisure_days").notNull(),
  businessInclusions: jsonb("business_inclusions").default([]).notNull(),
  leisureInclusions: jsonb("leisure_inclusions").default([]).notNull(),
  pricePerPersonMad: integer("price_per_person_mad").notNull(),
  minParticipants: integer("min_participants").default(1).notNull(),
  maxParticipants: integer("max_participants").notNull(),
  availableFrom: timestamp("available_from").notNull(),
  availableTo: timestamp("available_to").notNull(),
  coworkingIncluded: boolean("coworking_included").default(false).notNull(),
  coworkingSpaceId: uuid("coworking_space_id").references((): any => coworkingSpaces.id),
  photos: jsonb("photos").default([]).notNull(),
  status: text("status").default("active").notNull().$type<"active" | "inactive" | "soldout">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bleisurePackagesRelations = relations(bleisurePackages, ({ one }) => ({
  provider: one(providers, {
    fields: [bleisurePackages.providerId],
    references: [providers.id],
  }),
  coworkingSpace: one(coworkingSpaces, {
    fields: [bleisurePackages.coworkingSpaceId],
    references: [coworkingSpaces.id],
  }),
}));

export const insertBleisurePackageSchema = createInsertSchema(bleisurePackages).omit({ id: true, createdAt: true, updatedAt: true });

// Coworking Spaces - Available coworking/workspace options
export const coworkingSpaces = pgTable("coworking_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").references(() => providers.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  capacity: integer("capacity").notNull(),
  amenities: jsonb("amenities").default([]).notNull(),
  hourlyRateMad: integer("hourly_rate_mad"),
  dailyRateMad: integer("daily_rate_mad"),
  monthlyRateMad: integer("monthly_rate_mad"),
  meetingRoomsAvailable: integer("meeting_rooms_available").default(0).notNull(),
  highSpeedInternet: boolean("high_speed_internet").default(true).notNull(),
  prayerRoom: boolean("prayer_room").default(false).notNull(),
  photos: jsonb("photos").default([]).notNull(),
  verified: boolean("verified").default(false).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0").notNull(),
  openingHours: jsonb("opening_hours").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coworkingSpacesRelations = relations(coworkingSpaces, ({ one }) => ({
  provider: one(providers, {
    fields: [coworkingSpaces.providerId],
    references: [providers.id],
  }),
}));

export const insertCoworkingSpaceSchema = createInsertSchema(coworkingSpaces).omit({ id: true, createdAt: true });

// Bleisure Bookings - Track bleisure package bookings
export const bleisureBookings = pgTable("bleisure_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").references(() => bleisurePackages.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id").references(() => users.id).notNull(),
  participants: integer("participants").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalCostMad: integer("total_cost_mad").notNull(),
  specialRequests: text("special_requests"),
  coworkingDaysBooked: integer("coworking_days_booked").default(0).notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "confirmed" | "cancelled" | "completed">(),
  paymentStatus: text("payment_status").default("pending").notNull().$type<"pending" | "partial" | "paid" | "refunded">(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bleisureBookingsRelations = relations(bleisureBookings, ({ one }) => ({
  package: one(bleisurePackages, {
    fields: [bleisureBookings.packageId],
    references: [bleisurePackages.id],
  }),
  company: one(companies, {
    fields: [bleisureBookings.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [bleisureBookings.userId],
    references: [users.id],
  }),
}));

export const insertBleisureBookingSchema = createInsertSchema(bleisureBookings).omit({ id: true, createdAt: true });

// Savings Attributions - Track cost savings for companies
export const savingsAttributions = pgTable("savings_attributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  category: text("category").notNull().$type<"negotiated_rates" | "early_booking" | "volume_discount" | "bleisure" | "consolidation" | "other">(),
  baselineCostMad: integer("baseline_cost_mad").notNull(),
  actualCostMad: integer("actual_cost_mad").notNull(),
  savingsMad: integer("savings_mad").notNull(),
  savingsPercentage: decimal("savings_percentage", { precision: 5, scale: 2 }).notNull(),
  bookingCount: integer("booking_count").default(0).notNull(),
  description: text("description").notNull(),
  relatedBookingIds: jsonb("related_booking_ids").default([]).notNull(),
  calculationMethod: text("calculation_method").notNull(),
  verifiedBy: uuid("verified_by").references(() => users.id),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savingsAttributionsRelations = relations(savingsAttributions, ({ one }) => ({
  company: one(companies, {
    fields: [savingsAttributions.companyId],
    references: [companies.id],
  }),
  verifier: one(users, {
    fields: [savingsAttributions.verifiedBy],
    references: [users.id],
  }),
}));

export const insertSavingsAttributionSchema = createInsertSchema(savingsAttributions).omit({ id: true, createdAt: true });

// Cohort Analyses - Customer lifetime value by cohort
export const cohortAnalyses = pgTable("cohort_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  cohortMonth: text("cohort_month").notNull(),
  cohortType: text("cohort_type").notNull().$type<"company_size" | "industry" | "geography" | "acquisition_channel">(),
  cohortSegment: text("cohort_segment").notNull(),
  companyCount: integer("company_count").notNull(),
  monthsActive: integer("months_active").notNull(),
  totalBookings: integer("total_bookings").notNull(),
  totalRevenueMad: integer("total_revenue_mad").notNull(),
  avgBookingValueMad: integer("avg_booking_value_mad").notNull(),
  avgLifetimeValueMad: integer("avg_lifetime_value_mad").notNull(),
  churnRate: decimal("churn_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  retentionRate: decimal("retention_rate", { precision: 5, scale: 2 }).default("100").notNull(),
  monthlyData: jsonb("monthly_data").default([]).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCohortAnalysisSchema = createInsertSchema(cohortAnalyses).omit({ id: true, calculatedAt: true, createdAt: true });

// HRIS Sync Configs - HR system integration configurations
export const hrisSyncConfigs = pgTable("hris_sync_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  provider: text("provider").notNull().$type<"workday" | "bamboohr" | "adp" | "gusto" | "rippling" | "personio" | "other">(),
  apiKey: text("api_key").notNull(),
  apiEndpoint: text("api_endpoint"),
  syncFrequency: text("sync_frequency").default("daily").notNull().$type<"hourly" | "daily" | "weekly" | "manual">(),
  fieldMappings: jsonb("field_mappings").default({}).notNull(),
  syncEmployees: boolean("sync_employees").default(true).notNull(),
  syncDepartments: boolean("sync_departments").default(true).notNull(),
  syncCostCenters: boolean("sync_cost_centers").default(true).notNull(),
  autoCreateTravelerProfiles: boolean("auto_create_traveler_profiles").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status").$type<"success" | "failed" | "partial">(),
  lastSyncErrors: jsonb("last_sync_errors").default([]).notNull(),
  status: text("status").default("active").notNull().$type<"active" | "paused" | "error">(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hrisSyncConfigsRelations = relations(hrisSyncConfigs, ({ one }) => ({
  company: one(companies, {
    fields: [hrisSyncConfigs.companyId],
    references: [companies.id],
  }),
}));

export const insertHrisSyncConfigSchema = createInsertSchema(hrisSyncConfigs).omit({ id: true, createdAt: true, updatedAt: true });

// SSO Connections - Single Sign-On configurations
export const ssoConnections = pgTable("sso_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  protocol: text("protocol").notNull().$type<"saml" | "oauth2" | "oidc">(),
  provider: text("provider").notNull().$type<"okta" | "azure_ad" | "google_workspace" | "onelogin" | "auth0" | "other">(),
  entityId: text("entity_id"),
  ssoUrl: text("sso_url").notNull(),
  certificate: text("certificate"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  issuer: text("issuer"),
  allowedDomains: jsonb("allowed_domains").default([]).notNull(),
  autoProvision: boolean("auto_provision").default(true).notNull(),
  defaultRole: text("default_role").default("buyer").notNull().$type<"buyer" | "provider" | "admin">(),
  attributeMappings: jsonb("attribute_mappings").default({}).notNull(),
  status: text("status").default("active").notNull().$type<"active" | "inactive" | "testing">(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ssoConnectionsRelations = relations(ssoConnections, ({ one }) => ({
  company: one(companies, {
    fields: [ssoConnections.companyId],
    references: [companies.id],
  }),
}));

export const insertSsoConnectionSchema = createInsertSchema(ssoConnections).omit({ id: true, createdAt: true, updatedAt: true });

// Employee Sync Logs - Track HRIS sync operations
export const employeeSyncLogs = pgTable("employee_sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  syncConfigId: uuid("sync_config_id").references(() => hrisSyncConfigs.id).notNull(),
  syncStartedAt: timestamp("sync_started_at").defaultNow().notNull(),
  syncCompletedAt: timestamp("sync_completed_at"),
  totalRecords: integer("total_records").default(0).notNull(),
  successfulRecords: integer("successful_records").default(0).notNull(),
  failedRecords: integer("failed_records").default(0).notNull(),
  skippedRecords: integer("skipped_records").default(0).notNull(),
  newProfiles: integer("new_profiles").default(0).notNull(),
  updatedProfiles: integer("updated_profiles").default(0).notNull(),
  deactivatedProfiles: integer("deactivated_profiles").default(0).notNull(),
  errors: jsonb("errors").default([]).notNull(),
  warnings: jsonb("warnings").default([]).notNull(),
  status: text("status").default("in_progress").notNull().$type<"in_progress" | "completed" | "failed" | "cancelled">(),
  triggerType: text("trigger_type").notNull().$type<"scheduled" | "manual" | "webhook">(),
  initiatedBy: uuid("initiated_by").references(() => users.id),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeSyncLogsRelations = relations(employeeSyncLogs, ({ one }) => ({
  syncConfig: one(hrisSyncConfigs, {
    fields: [employeeSyncLogs.syncConfigId],
    references: [hrisSyncConfigs.id],
  }),
  initiator: one(users, {
    fields: [employeeSyncLogs.initiatedBy],
    references: [users.id],
  }),
}));

export const insertEmployeeSyncLogSchema = createInsertSchema(employeeSyncLogs).omit({ id: true, createdAt: true });

export type BleisurePackage = typeof bleisurePackages.$inferSelect;
export type InsertBleisurePackage = z.infer<typeof insertBleisurePackageSchema>;

export type CoworkingSpace = typeof coworkingSpaces.$inferSelect;
export type InsertCoworkingSpace = z.infer<typeof insertCoworkingSpaceSchema>;

export type BleisureBooking = typeof bleisureBookings.$inferSelect;
export type InsertBleisureBooking = z.infer<typeof insertBleisureBookingSchema>;

export type SavingsAttribution = typeof savingsAttributions.$inferSelect;
export type InsertSavingsAttribution = z.infer<typeof insertSavingsAttributionSchema>;

export type CohortAnalysis = typeof cohortAnalyses.$inferSelect;
export type InsertCohortAnalysis = z.infer<typeof insertCohortAnalysisSchema>;

export type HrisSyncConfig = typeof hrisSyncConfigs.$inferSelect;
export type InsertHrisSyncConfig = z.infer<typeof insertHrisSyncConfigSchema>;

export type SsoConnection = typeof ssoConnections.$inferSelect;
export type InsertSsoConnection = z.infer<typeof insertSsoConnectionSchema>;

export type EmployeeSyncLog = typeof employeeSyncLogs.$inferSelect;
export type InsertEmployeeSyncLog = z.infer<typeof insertEmployeeSyncLogSchema>;
