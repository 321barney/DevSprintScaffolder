// Storage interface and implementation using javascript_database blueprint
import {
  users, providers, jobs, offers, financingOffers, messages, ratings,
  type User, type InsertUser,
  type Provider, type InsertProvider,
  type Job, type InsertJob,
  type Offer, type InsertOffer,
  type FinancingOffer, type InsertFinancingOffer,
  type Message, type InsertMessage,
  type Rating, type InsertRating,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Storage interface for all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Providers
  getProvider(id: string): Promise<Provider | undefined>;
  getProviderByUserId(userId: string): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: string, data: Partial<Provider>): Promise<Provider | undefined>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobsByBuyerId(buyerId: string): Promise<Job[]>;
  getOpenJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<Job>): Promise<Job | undefined>;

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByJobId(jobId: string): Promise<Offer[]>;
  getOffersByProviderId(providerId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, data: Partial<Offer>): Promise<Offer | undefined>;

  // Financing Offers
  getFinancingOffersByJobId(jobId: string): Promise<FinancingOffer[]>;
  createFinancingOffer(offer: InsertFinancingOffer): Promise<FinancingOffer>;

  // Messages
  getMessagesByJobId(jobId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Ratings
  getRatingsByJobId(jobId: string): Promise<Rating[]>;
  getRatingsByRateeId(rateeId: string): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Providers
  async getProvider(id: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider || undefined;
  }

  async getProviderByUserId(userId: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.userId, userId));
    return provider || undefined;
  }

  async createProvider(insertProvider: InsertProvider): Promise<Provider> {
    const [provider] = await db
      .insert(providers)
      .values(insertProvider)
      .returning();
    return provider;
  }

  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider | undefined> {
    const [provider] = await db
      .update(providers)
      .set(data)
      .where(eq(providers.id, id))
      .returning();
    return provider || undefined;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getJobsByBuyerId(buyerId: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.buyerId, buyerId))
      .orderBy(desc(jobs.createdAt));
  }

  async getOpenJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'open'))
      .orderBy(desc(jobs.createdAt));
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set(data)
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer || undefined;
  }

  async getOffersByJobId(jobId: string): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(eq(offers.jobId, jobId))
      .orderBy(desc(offers.aiScore));
  }

  async getOffersByProviderId(providerId: string): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(eq(offers.providerId, providerId))
      .orderBy(desc(offers.createdAt));
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db
      .insert(offers)
      .values(insertOffer)
      .returning();
    return offer;
  }

  async updateOffer(id: string, data: Partial<Offer>): Promise<Offer | undefined> {
    const [offer] = await db
      .update(offers)
      .set(data)
      .where(eq(offers.id, id))
      .returning();
    return offer || undefined;
  }

  // Financing Offers
  async getFinancingOffersByJobId(jobId: string): Promise<FinancingOffer[]> {
    return await db
      .select()
      .from(financingOffers)
      .where(eq(financingOffers.jobId, jobId));
  }

  async createFinancingOffer(insertOffer: InsertFinancingOffer): Promise<FinancingOffer> {
    const [offer] = await db
      .insert(financingOffers)
      .values(insertOffer)
      .returning();
    return offer;
  }

  // Messages
  async getMessagesByJobId(jobId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.jobId, jobId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // Ratings
  async getRatingsByJobId(jobId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.jobId, jobId));
  }

  async getRatingsByRateeId(rateeId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.rateeId, rateeId))
      .orderBy(desc(ratings.createdAt));
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    const [rating] = await db
      .insert(ratings)
      .values(insertRating)
      .returning();
    return rating;
  }
}

export const storage = new DatabaseStorage();
