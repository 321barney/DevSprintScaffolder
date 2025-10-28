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
    name: "Free",
    priceMAD: 0,
    offersIncluded: 4,
    commissionRate: null, // Uses category default
    maxOffers: 4,
  },
  basic: {
    name: "Basic",
    priceMAD: 299,
    offersIncluded: 50,
    commissionRate: 0.12, // 12%
    maxOffers: 50,
  },
  pro: {
    name: "Pro",
    priceMAD: 799,
    offersIncluded: null, // Unlimited
    commissionRate: 0.10, // 10%
    maxOffers: null,
  },
} as const;
