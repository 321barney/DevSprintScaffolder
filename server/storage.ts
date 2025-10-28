// Storage interface and implementation using javascript_database blueprint
import {
  users, providers, jobs, offers, financingOffers, messages, ratings,
  platformFees, providerSubscriptions, transactions, providerEarnings,
  providerProfiles, vehicles, providerDocuments, trips, tripTracks,
  type User, type InsertUser,
  type Provider, type InsertProvider,
  type Job, type InsertJob,
  type Offer, type InsertOffer,
  type FinancingOffer, type InsertFinancingOffer,
  type Message, type InsertMessage,
  type Rating, type InsertRating,
  type PlatformFee, type InsertPlatformFee,
  type ProviderSubscription, type InsertProviderSubscription,
  type Transaction, type InsertTransaction,
  type ProviderEarning, type InsertProviderEarning,
  type ProviderProfile, type InsertProviderProfile,
  type Vehicle, type InsertVehicle,
  type ProviderDocument, type InsertProviderDocument,
  type Trip, type InsertTrip,
  type TripTrack, type InsertTripTrack,
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

  // Phase 1: Platform Fees
  createPlatformFee(fee: InsertPlatformFee): Promise<PlatformFee>;
  getPlatformFeeByOfferId(offerId: string): Promise<PlatformFee | undefined>;

  // Phase 1: Provider Subscriptions
  getProviderSubscription(providerId: string): Promise<ProviderSubscription | undefined>;
  createProviderSubscription(sub: InsertProviderSubscription): Promise<ProviderSubscription>;
  updateProviderSubscription(providerId: string, data: Partial<ProviderSubscription>): Promise<ProviderSubscription | undefined>;

  // Phase 1: Transactions
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByProviderId(providerId: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined>;

  // Phase 1: Provider Earnings
  createProviderEarning(earning: InsertProviderEarning): Promise<ProviderEarning>;
  getProviderEarningsByProviderId(providerId: string): Promise<ProviderEarning[]>;

  // Phase 2: Provider Profiles
  getProviderProfile(providerId: string): Promise<ProviderProfile | undefined>;
  createProviderProfile(profile: InsertProviderProfile): Promise<ProviderProfile>;
  updateProviderProfile(providerId: string, data: Partial<ProviderProfile>): Promise<ProviderProfile | undefined>;

  // Phase 2: Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehiclesByProviderId(providerId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | undefined>;

  // Phase 2: Provider Documents
  getProviderDocument(id: string): Promise<ProviderDocument | undefined>;
  getProviderDocumentsByProviderId(providerId: string): Promise<ProviderDocument[]>;
  createProviderDocument(doc: InsertProviderDocument): Promise<ProviderDocument>;
  updateProviderDocument(id: string, data: Partial<ProviderDocument>): Promise<ProviderDocument | undefined>;

  // Phase 2: Trips
  getTrip(id: string): Promise<Trip | undefined>;
  getTripsByProviderId(providerId: string): Promise<Trip[]>;
  getTripsByBuyerId(buyerId: string): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, data: Partial<Trip>): Promise<Trip | undefined>;

  // Phase 2: Trip Tracks
  getTripTracksByTripId(tripId: string): Promise<TripTrack[]>;
  createTripTrack(track: InsertTripTrack): Promise<TripTrack>;
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

  // Phase 1: Platform Fees
  async createPlatformFee(insertFee: InsertPlatformFee): Promise<PlatformFee> {
    const [fee] = await db
      .insert(platformFees)
      .values(insertFee)
      .returning();
    return fee;
  }

  async getPlatformFeeByOfferId(offerId: string): Promise<PlatformFee | undefined> {
    const [fee] = await db
      .select()
      .from(platformFees)
      .where(eq(platformFees.offerId, offerId));
    return fee || undefined;
  }

  // Phase 1: Provider Subscriptions
  async getProviderSubscription(providerId: string): Promise<ProviderSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(providerSubscriptions)
      .where(eq(providerSubscriptions.providerId, providerId));
    return subscription || undefined;
  }

  async createProviderSubscription(insertSub: InsertProviderSubscription): Promise<ProviderSubscription> {
    const [subscription] = await db
      .insert(providerSubscriptions)
      .values(insertSub as any)
      .returning();
    return subscription;
  }

  async updateProviderSubscription(
    providerId: string, 
    data: Partial<ProviderSubscription>
  ): Promise<ProviderSubscription | undefined> {
    const [subscription] = await db
      .update(providerSubscriptions)
      .set(data)
      .where(eq(providerSubscriptions.providerId, providerId))
      .returning();
    return subscription || undefined;
  }

  // Phase 1: Transactions
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByProviderId(providerId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.providerId, providerId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTx: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTx as any)
      .returning();
    return transaction;
  }

  async updateTransaction(
    id: string, 
    data: Partial<Transaction>
  ): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  // Phase 1: Provider Earnings
  async createProviderEarning(insertEarning: InsertProviderEarning): Promise<ProviderEarning> {
    const [earning] = await db
      .insert(providerEarnings)
      .values(insertEarning)
      .returning();
    return earning;
  }

  async getProviderEarningsByProviderId(providerId: string): Promise<ProviderEarning[]> {
    return await db
      .select()
      .from(providerEarnings)
      .where(eq(providerEarnings.providerId, providerId))
      .orderBy(desc(providerEarnings.createdAt));
  }

  // Phase 2: Provider Profiles
  async getProviderProfile(providerId: string): Promise<ProviderProfile | undefined> {
    const [profile] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.providerId, providerId));
    return profile || undefined;
  }

  async createProviderProfile(insertProfile: InsertProviderProfile): Promise<ProviderProfile> {
    const [profile] = await db
      .insert(providerProfiles)
      .values(insertProfile as any)
      .returning();
    return profile;
  }

  async updateProviderProfile(providerId: string, data: Partial<ProviderProfile>): Promise<ProviderProfile | undefined> {
    const [profile] = await db
      .update(providerProfiles)
      .set(data as any)
      .where(eq(providerProfiles.providerId, providerId))
      .returning();
    return profile || undefined;
  }

  // Phase 2: Vehicles
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async getVehiclesByProviderId(providerId: string): Promise<Vehicle[]> {
    return await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.providerId, providerId))
      .orderBy(desc(vehicles.createdAt));
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values(insertVehicle as any)
      .returning();
    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .update(vehicles)
      .set(data as any)
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle || undefined;
  }

  // Phase 2: Provider Documents
  async getProviderDocument(id: string): Promise<ProviderDocument | undefined> {
    const [doc] = await db
      .select()
      .from(providerDocuments)
      .where(eq(providerDocuments.id, id));
    return doc || undefined;
  }

  async getProviderDocumentsByProviderId(providerId: string): Promise<ProviderDocument[]> {
    return await db
      .select()
      .from(providerDocuments)
      .where(eq(providerDocuments.providerId, providerId))
      .orderBy(desc(providerDocuments.createdAt));
  }

  async createProviderDocument(insertDoc: InsertProviderDocument): Promise<ProviderDocument> {
    const [doc] = await db
      .insert(providerDocuments)
      .values(insertDoc as any)
      .returning();
    return doc;
  }

  async updateProviderDocument(id: string, data: Partial<ProviderDocument>): Promise<ProviderDocument | undefined> {
    const [doc] = await db
      .update(providerDocuments)
      .set(data as any)
      .where(eq(providerDocuments.id, id))
      .returning();
    return doc || undefined;
  }

  // Phase 2: Trips
  async getTrip(id: string): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id));
    return trip || undefined;
  }

  async getTripsByProviderId(providerId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.providerId, providerId))
      .orderBy(desc(trips.createdAt));
  }

  async getTripsByBuyerId(buyerId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.buyerId, buyerId))
      .orderBy(desc(trips.createdAt));
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(insertTrip as any)
      .returning();
    return trip;
  }

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set(data as any)
      .where(eq(trips.id, id))
      .returning();
    return trip || undefined;
  }

  // Phase 2: Trip Tracks
  async getTripTracksByTripId(tripId: string): Promise<TripTrack[]> {
    return await db
      .select()
      .from(tripTracks)
      .where(eq(tripTracks.tripId, tripId))
      .orderBy(desc(tripTracks.timestamp));
  }

  async createTripTrack(insertTrack: InsertTripTrack): Promise<TripTrack> {
    const [track] = await db
      .insert(tripTracks)
      .values(insertTrack as any)
      .returning();
    return track;
  }
}

export const storage = new DatabaseStorage();
