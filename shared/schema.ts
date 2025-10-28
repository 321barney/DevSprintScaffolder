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
