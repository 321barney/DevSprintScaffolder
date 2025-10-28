// Storage interface and implementation using javascript_database blueprint
import {
  users, providers, jobs, offers, financingOffers, messages, ratings,
  platformFees, providerSubscriptions, transactions, providerEarnings,
  providerProfiles, vehicles, providerDocuments, trips, tripTracks,
  companies, costCenters, travelerProfiles, venues, venueRooms, rfps, quotes, groupBookings, approvals,
  partnerTiers, corporateRates, milestonePayments, eventReports, itineraries, disruptionAlerts, dmcPartners,
  notificationPreferences, notificationHistory, virtualCards, expenseEntries, sustainabilityMetrics,
  qualityAudits, postEventNps, famTrips, famTripRegistrations,
  bleisurePackages, coworkingSpaces, bleisureBookings, savingsAttributions, cohortAnalyses,
  hrisSyncConfigs, ssoConnections, employeeSyncLogs,
  servicePackages, favorites, packageOrders,
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
  type Company, type InsertCompany,
  type CostCenter, type InsertCostCenter,
  type TravelerProfile, type InsertTravelerProfile,
  type Venue, type InsertVenue,
  type VenueRoom, type InsertVenueRoom,
  type Rfp, type InsertRfp,
  type Quote, type InsertQuote,
  type GroupBooking, type InsertGroupBooking,
  type Approval, type InsertApproval,
  type PartnerTier, type InsertPartnerTier,
  type CorporateRate, type InsertCorporateRate,
  type MilestonePayment, type InsertMilestonePayment,
  type EventReport, type InsertEventReport,
  type Itinerary, type InsertItinerary,
  type DisruptionAlert, type InsertDisruptionAlert,
  type DmcPartner, type InsertDmcPartner,
  type NotificationPreference, type InsertNotificationPreference,
  type NotificationHistory, type InsertNotificationHistory,
  type VirtualCard, type InsertVirtualCard,
  type ExpenseEntry, type InsertExpenseEntry,
  type SustainabilityMetric, type InsertSustainabilityMetric,
  type QualityAudit, type InsertQualityAudit,
  type PostEventNps, type InsertPostEventNps,
  type FamTrip, type InsertFamTrip,
  type FamTripRegistration, type InsertFamTripRegistration,
  type BleisurePackage, type InsertBleisurePackage,
  type CoworkingSpace, type InsertCoworkingSpace,
  type BleisureBooking, type InsertBleisureBooking,
  type SavingsAttribution, type InsertSavingsAttribution,
  type CohortAnalysis, type InsertCohortAnalysis,
  type HrisSyncConfig, type InsertHrisSyncConfig,
  type SsoConnection, type InsertSsoConnection,
  type EmployeeSyncLog, type InsertEmployeeSyncLog,
  type ServicePackage, type InsertServicePackage,
  type Favorite, type InsertFavorite,
  type PackageOrder, type InsertPackageOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, or, sql } from "drizzle-orm";

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

  // Phase 3: Companies
  getCompany(id: string): Promise<Company | undefined>;
  getCompaniesByIndustry(industry: string): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined>;

  // Phase 3: Cost Centers
  getCostCenter(id: string): Promise<CostCenter | undefined>;
  getCostCentersByCompanyId(companyId: string): Promise<CostCenter[]>;
  createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter>;
  updateCostCenter(id: string, data: Partial<CostCenter>): Promise<CostCenter | undefined>;

  // Phase 3: Traveler Profiles
  getTravelerProfile(id: string): Promise<TravelerProfile | undefined>;
  getTravelerProfilesByCompanyId(companyId: string): Promise<TravelerProfile[]>;
  getTravelerProfileByUserId(userId: string): Promise<TravelerProfile | undefined>;
  createTravelerProfile(profile: InsertTravelerProfile): Promise<TravelerProfile>;
  updateTravelerProfile(id: string, data: Partial<TravelerProfile>): Promise<TravelerProfile | undefined>;

  // Phase 3: Venues
  getVenue(id: string): Promise<Venue | undefined>;
  getVenues(filters?: { city?: string; type?: string; verified?: boolean; invoiceReady?: boolean }): Promise<Venue[]>;
  getVenuesByProviderId(providerId: string): Promise<Venue[]>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: string, data: Partial<Venue>): Promise<Venue | undefined>;

  // Phase 3: Venue Rooms
  getVenueRoom(id: string): Promise<VenueRoom | undefined>;
  getVenueRoomsByVenueId(venueId: string): Promise<VenueRoom[]>;
  createVenueRoom(room: InsertVenueRoom): Promise<VenueRoom>;
  updateVenueRoom(id: string, data: Partial<VenueRoom>): Promise<VenueRoom | undefined>;

  // Phase 3: RFPs
  getRfp(id: string): Promise<Rfp | undefined>;
  getRfpsByCompanyId(companyId: string): Promise<Rfp[]>;
  getOpenRfps(): Promise<Rfp[]>;
  createRfp(rfp: InsertRfp): Promise<Rfp>;
  updateRfp(id: string, data: Partial<Rfp>): Promise<Rfp | undefined>;

  // Phase 3: Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByRfpId(rfpId: string): Promise<Quote[]>;
  getQuotesByProviderId(providerId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, data: Partial<Quote>): Promise<Quote | undefined>;

  // Phase 3: Group Bookings
  getGroupBooking(id: string): Promise<GroupBooking | undefined>;
  getGroupBookingsByCompanyId(companyId: string): Promise<GroupBooking[]>;
  getGroupBookingsByVenueId(venueId: string): Promise<GroupBooking[]>;
  createGroupBooking(booking: InsertGroupBooking): Promise<GroupBooking>;
  updateGroupBooking(id: string, data: Partial<GroupBooking>): Promise<GroupBooking | undefined>;

  // Phase 3: Approvals
  getApproval(id: string): Promise<Approval | undefined>;
  getApprovalsByCompanyId(companyId: string): Promise<Approval[]>;
  getApprovalsByApproverId(approverId: string): Promise<Approval[]>;
  getPendingApprovals(approverId: string): Promise<Approval[]>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: string, data: Partial<Approval>): Promise<Approval | undefined>;

  // Phase 4: Partner Tiers
  getPartnerTier(id: string): Promise<PartnerTier | undefined>;
  getPartnerTiersByProviderId(providerId: string): Promise<PartnerTier[]>;
  getPartnerTiersByCategory(category: string): Promise<PartnerTier[]>;
  createPartnerTier(tier: InsertPartnerTier): Promise<PartnerTier>;
  updatePartnerTier(id: string, data: Partial<PartnerTier>): Promise<PartnerTier | undefined>;

  // Phase 4: Corporate Rates
  getCorporateRate(id: string): Promise<CorporateRate | undefined>;
  getCorporateRatesByCompanyId(companyId: string): Promise<CorporateRate[]>;
  getCorporateRatesByProviderId(providerId: string): Promise<CorporateRate[]>;
  getActiveCorporateRates(companyId: string, providerId: string): Promise<CorporateRate[]>;
  createCorporateRate(rate: InsertCorporateRate): Promise<CorporateRate>;
  updateCorporateRate(id: string, data: Partial<CorporateRate>): Promise<CorporateRate | undefined>;

  // Phase 4: Milestone Payments
  getMilestonePayment(id: string): Promise<MilestonePayment | undefined>;
  getMilestonePaymentsByGroupBookingId(groupBookingId: string): Promise<MilestonePayment[]>;
  getMilestonePaymentsByPayerId(payerId: string): Promise<MilestonePayment[]>;
  createMilestonePayment(payment: InsertMilestonePayment): Promise<MilestonePayment>;
  updateMilestonePayment(id: string, data: Partial<MilestonePayment>): Promise<MilestonePayment | undefined>;

  // Phase 4: Event Reports
  getEventReport(id: string): Promise<EventReport | undefined>;
  getEventReportsByCompanyId(companyId: string): Promise<EventReport[]>;
  createEventReport(report: InsertEventReport): Promise<EventReport>;

  // Phase 4: Itineraries
  getItinerary(id: string): Promise<Itinerary | undefined>;
  getItinerariesByGroupBookingId(groupBookingId: string): Promise<Itinerary[]>;
  getItinerariesByTravelerProfileId(travelerProfileId: string): Promise<Itinerary[]>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  updateItinerary(id: string, data: Partial<Itinerary>): Promise<Itinerary | undefined>;

  // Phase 4: Disruption Alerts
  getDisruptionAlert(id: string): Promise<DisruptionAlert | undefined>;
  getDisruptionAlertsByItineraryId(itineraryId: string): Promise<DisruptionAlert[]>;
  getActiveDisruptionAlerts(itineraryId: string): Promise<DisruptionAlert[]>;
  createDisruptionAlert(alert: InsertDisruptionAlert): Promise<DisruptionAlert>;
  updateDisruptionAlert(id: string, data: Partial<DisruptionAlert>): Promise<DisruptionAlert | undefined>;

  // Phase 4: DMC Partners
  getDmcPartner(id: string): Promise<DmcPartner | undefined>;
  getDmcPartnersByProviderId(providerId: string): Promise<DmcPartner[]>;
  getDmcPartnersByDestination(destination: string): Promise<DmcPartner[]>;
  getVerifiedDmcPartners(): Promise<DmcPartner[]>;
  createDmcPartner(partner: InsertDmcPartner): Promise<DmcPartner>;
  updateDmcPartner(id: string, data: Partial<DmcPartner>): Promise<DmcPartner | undefined>;

  // Phase 5: Notification Management
  getNotificationPreference(id: string): Promise<NotificationPreference | undefined>;
  getNotificationPreferencesByCompanyId(companyId: string): Promise<NotificationPreference[]>;
  getNotificationPreferencesByUserId(userId: string): Promise<NotificationPreference[]>;
  createNotificationPreference(pref: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreference(id: string, data: Partial<NotificationPreference>): Promise<NotificationPreference | undefined>;
  createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory>;
  getNotificationHistoryByRecipientId(recipientId: string): Promise<NotificationHistory[]>;

  // Phase 5: Virtual Cards & Expenses
  getVirtualCard(id: string): Promise<VirtualCard | undefined>;
  getVirtualCardsByCompanyId(companyId: string): Promise<VirtualCard[]>;
  getVirtualCardsByCostCenterId(costCenterId: string): Promise<VirtualCard[]>;
  createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard>;
  updateVirtualCard(id: string, data: Partial<VirtualCard>): Promise<VirtualCard | undefined>;
  getExpenseEntry(id: string): Promise<ExpenseEntry | undefined>;
  getExpenseEntriesByCompanyId(companyId: string): Promise<ExpenseEntry[]>;
  getExpenseEntriesByGroupBookingId(groupBookingId: string): Promise<ExpenseEntry[]>;
  createExpenseEntry(entry: InsertExpenseEntry): Promise<ExpenseEntry>;
  updateExpenseEntry(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry | undefined>;

  // Phase 5: Sustainability
  getSustainabilityMetric(id: string): Promise<SustainabilityMetric | undefined>;
  getSustainabilityMetricsByGroupBookingId(groupBookingId: string): Promise<SustainabilityMetric[]>;
  createSustainabilityMetric(metric: InsertSustainabilityMetric): Promise<SustainabilityMetric>;

  // Phase 5: Quality Assurance
  getQualityAudit(id: string): Promise<QualityAudit | undefined>;
  getQualityAuditsByVenueId(venueId: string): Promise<QualityAudit[]>;
  getQualityAuditsByProviderId(providerId: string): Promise<QualityAudit[]>;
  createQualityAudit(audit: InsertQualityAudit): Promise<QualityAudit>;
  getPostEventNpsByGroupBookingId(groupBookingId: string): Promise<PostEventNps[]>;
  createPostEventNps(nps: InsertPostEventNps): Promise<PostEventNps>;

  // Phase 5: FAM Trips & Showcases
  getFamTrip(id: string): Promise<FamTrip | undefined>;
  getFamTripsByCity(city: string): Promise<FamTrip[]>;
  getFamTripsByOrganizerId(organizerId: string): Promise<FamTrip[]>;
  getOpenFamTrips(): Promise<FamTrip[]>;
  createFamTrip(trip: InsertFamTrip): Promise<FamTrip>;
  updateFamTrip(id: string, data: Partial<FamTrip>): Promise<FamTrip | undefined>;
  getFamTripRegistration(id: string): Promise<FamTripRegistration | undefined>;
  getFamTripRegistrationsByFamTripId(famTripId: string): Promise<FamTripRegistration[]>;
  getFamTripRegistrationsByUserId(userId: string): Promise<FamTripRegistration[]>;
  createFamTripRegistration(registration: InsertFamTripRegistration): Promise<FamTripRegistration>;
  updateFamTripRegistration(id: string, data: Partial<FamTripRegistration>): Promise<FamTripRegistration | undefined>;

  // Phase 1 Marketplace: Service Packages
  createServicePackage(data: InsertServicePackage): Promise<ServicePackage>;
  getServicePackage(id: string): Promise<ServicePackage | undefined>;
  getServicePackagesByProvider(providerId: string): Promise<ServicePackage[]>;
  getServicePackages(filters?: { category?: string; active?: boolean; search?: string }): Promise<ServicePackage[]>;
  updateServicePackage(id: string, data: Partial<InsertServicePackage>): Promise<ServicePackage | undefined>;
  deleteServicePackage(id: string): Promise<void>;
  incrementPackageViews(id: string): Promise<void>;

  // Phase 1 Marketplace: Favorites
  createFavorite(data: InsertFavorite): Promise<Favorite>;
  deleteFavorite(id: string): Promise<void>;
  getFavoritesByUser(userId: string, itemType?: string): Promise<Favorite[]>;
  checkFavorite(userId: string, itemType: string, itemId: string): Promise<Favorite | undefined>;

  // Phase 1 Marketplace: Package Orders
  createPackageOrder(data: InsertPackageOrder): Promise<PackageOrder>;
  getPackageOrder(id: string): Promise<PackageOrder | undefined>;
  getPackageOrdersByBuyer(buyerId: string): Promise<PackageOrder[]>;
  getPackageOrdersByProvider(providerId: string): Promise<PackageOrder[]>;
  updatePackageOrder(id: string, data: Partial<InsertPackageOrder>): Promise<PackageOrder | undefined>;
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

  // Phase 3: Companies
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getCompaniesByIndustry(industry: string): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.industry, industry));
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany as any).returning();
    return company;
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(data as any).where(eq(companies.id, id)).returning();
    return company || undefined;
  }

  // Phase 3: Cost Centers
  async getCostCenter(id: string): Promise<CostCenter | undefined> {
    const [center] = await db.select().from(costCenters).where(eq(costCenters.id, id));
    return center || undefined;
  }

  async getCostCentersByCompanyId(companyId: string): Promise<CostCenter[]> {
    return await db.select().from(costCenters).where(eq(costCenters.companyId, companyId));
  }

  async createCostCenter(insertCenter: InsertCostCenter): Promise<CostCenter> {
    const [center] = await db.insert(costCenters).values(insertCenter as any).returning();
    return center;
  }

  async updateCostCenter(id: string, data: Partial<CostCenter>): Promise<CostCenter | undefined> {
    const [center] = await db.update(costCenters).set(data as any).where(eq(costCenters.id, id)).returning();
    return center || undefined;
  }

  // Phase 3: Traveler Profiles
  async getTravelerProfile(id: string): Promise<TravelerProfile | undefined> {
    const [profile] = await db.select().from(travelerProfiles).where(eq(travelerProfiles.id, id));
    return profile || undefined;
  }

  async getTravelerProfilesByCompanyId(companyId: string): Promise<TravelerProfile[]> {
    return await db.select().from(travelerProfiles).where(eq(travelerProfiles.companyId, companyId));
  }

  async getTravelerProfileByUserId(userId: string): Promise<TravelerProfile | undefined> {
    const [profile] = await db.select().from(travelerProfiles).where(eq(travelerProfiles.userId, userId));
    return profile || undefined;
  }

  async createTravelerProfile(insertProfile: InsertTravelerProfile): Promise<TravelerProfile> {
    const [profile] = await db.insert(travelerProfiles).values(insertProfile as any).returning();
    return profile;
  }

  async updateTravelerProfile(id: string, data: Partial<TravelerProfile>): Promise<TravelerProfile | undefined> {
    const [profile] = await db.update(travelerProfiles).set(data as any).where(eq(travelerProfiles.id, id)).returning();
    return profile || undefined;
  }

  // Phase 3: Venues
  async getVenue(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue || undefined;
  }

  async getVenues(filters?: { city?: string; type?: string; verified?: boolean; invoiceReady?: boolean }): Promise<Venue[]> {
    if (!filters) {
      return await db.select().from(venues).orderBy(desc(venues.createdAt));
    }

    const conditions = [];
    
    if (filters.city) {
      conditions.push(eq(venues.city, filters.city));
    }
    if (filters.type) {
      conditions.push(eq(venues.type, filters.type as any));
    }
    if (filters.verified !== undefined) {
      conditions.push(eq(venues.verified, filters.verified));
    }
    if (filters.invoiceReady !== undefined) {
      conditions.push(eq(venues.invoiceReady, filters.invoiceReady));
    }

    if (conditions.length === 0) {
      return await db.select().from(venues).orderBy(desc(venues.createdAt));
    }

    return await db.select().from(venues).where(and(...conditions) as any).orderBy(desc(venues.createdAt));
  }

  async getVenuesByProviderId(providerId: string): Promise<Venue[]> {
    return await db.select().from(venues).where(eq(venues.providerId, providerId)).orderBy(desc(venues.createdAt));
  }

  async createVenue(insertVenue: InsertVenue): Promise<Venue> {
    const [venue] = await db.insert(venues).values(insertVenue as any).returning();
    return venue;
  }

  async updateVenue(id: string, data: Partial<Venue>): Promise<Venue | undefined> {
    const [venue] = await db.update(venues).set(data as any).where(eq(venues.id, id)).returning();
    return venue || undefined;
  }

  // Phase 3: Venue Rooms
  async getVenueRoom(id: string): Promise<VenueRoom | undefined> {
    const [room] = await db.select().from(venueRooms).where(eq(venueRooms.id, id));
    return room || undefined;
  }

  async getVenueRoomsByVenueId(venueId: string): Promise<VenueRoom[]> {
    return await db.select().from(venueRooms).where(eq(venueRooms.venueId, venueId));
  }

  async createVenueRoom(insertRoom: InsertVenueRoom): Promise<VenueRoom> {
    const [room] = await db.insert(venueRooms).values(insertRoom as any).returning();
    return room;
  }

  async updateVenueRoom(id: string, data: Partial<VenueRoom>): Promise<VenueRoom | undefined> {
    const [room] = await db.update(venueRooms).set(data as any).where(eq(venueRooms.id, id)).returning();
    return room || undefined;
  }

  // Phase 3: RFPs
  async getRfp(id: string): Promise<Rfp | undefined> {
    const [rfp] = await db.select().from(rfps).where(eq(rfps.id, id));
    return rfp || undefined;
  }

  async getRfpsByCompanyId(companyId: string): Promise<Rfp[]> {
    return await db.select().from(rfps).where(eq(rfps.companyId, companyId)).orderBy(desc(rfps.createdAt));
  }

  async getOpenRfps(): Promise<Rfp[]> {
    return await db.select().from(rfps).where(eq(rfps.status, "published")).orderBy(desc(rfps.publishedAt));
  }

  async createRfp(insertRfp: InsertRfp): Promise<Rfp> {
    const [rfp] = await db.insert(rfps).values(insertRfp as any).returning();
    return rfp;
  }

  async updateRfp(id: string, data: Partial<Rfp>): Promise<Rfp | undefined> {
    const [rfp] = await db.update(rfps).set(data as any).where(eq(rfps.id, id)).returning();
    return rfp || undefined;
  }

  // Phase 3: Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByRfpId(rfpId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.rfpId, rfpId)).orderBy(desc(quotes.submittedAt));
  }

  async getQuotesByProviderId(providerId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.providerId, providerId)).orderBy(desc(quotes.submittedAt));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(insertQuote as any).returning();
    return quote;
  }

  async updateQuote(id: string, data: Partial<Quote>): Promise<Quote | undefined> {
    const [quote] = await db.update(quotes).set(data as any).where(eq(quotes.id, id)).returning();
    return quote || undefined;
  }

  // Phase 3: Group Bookings
  async getGroupBooking(id: string): Promise<GroupBooking | undefined> {
    const [booking] = await db.select().from(groupBookings).where(eq(groupBookings.id, id));
    return booking || undefined;
  }

  async getGroupBookingsByCompanyId(companyId: string): Promise<GroupBooking[]> {
    return await db.select().from(groupBookings).where(eq(groupBookings.companyId, companyId)).orderBy(desc(groupBookings.createdAt));
  }

  async getGroupBookingsByVenueId(venueId: string): Promise<GroupBooking[]> {
    return await db.select().from(groupBookings).where(eq(groupBookings.venueId, venueId)).orderBy(desc(groupBookings.createdAt));
  }

  async createGroupBooking(insertBooking: InsertGroupBooking): Promise<GroupBooking> {
    const [booking] = await db.insert(groupBookings).values(insertBooking as any).returning();
    return booking;
  }

  async updateGroupBooking(id: string, data: Partial<GroupBooking>): Promise<GroupBooking | undefined> {
    const [booking] = await db.update(groupBookings).set(data as any).where(eq(groupBookings.id, id)).returning();
    return booking || undefined;
  }

  // Phase 3: Approvals
  async getApproval(id: string): Promise<Approval | undefined> {
    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));
    return approval || undefined;
  }

  async getApprovalsByCompanyId(companyId: string): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.companyId, companyId)).orderBy(desc(approvals.createdAt));
  }

  async getApprovalsByApproverId(approverId: string): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.approverId, approverId)).orderBy(desc(approvals.createdAt));
  }

  async getPendingApprovals(approverId: string): Promise<Approval[]> {
    return await db.select().from(approvals).where(and(eq(approvals.approverId, approverId), eq(approvals.status, "pending"))).orderBy(desc(approvals.createdAt));
  }

  async createApproval(insertApproval: InsertApproval): Promise<Approval> {
    const [approval] = await db.insert(approvals).values(insertApproval as any).returning();
    return approval;
  }

  async updateApproval(id: string, data: Partial<Approval>): Promise<Approval | undefined> {
    const [approval] = await db.update(approvals).set(data as any).where(eq(approvals.id, id)).returning();
    return approval || undefined;
  }

  // Partner Tiers
  async getPartnerTier(id: string): Promise<PartnerTier | undefined> {
    const [tier] = await db.select().from(partnerTiers).where(eq(partnerTiers.id, id));
    return tier || undefined;
  }

  async getPartnerTiersByProviderId(providerId: string): Promise<PartnerTier[]> {
    return await db.select().from(partnerTiers).where(eq(partnerTiers.providerId, providerId)).orderBy(desc(partnerTiers.createdAt));
  }

  async getPartnerTiersByCategory(category: string): Promise<PartnerTier[]> {
    return await db.select().from(partnerTiers).where(eq(partnerTiers.category, category as any)).orderBy(desc(partnerTiers.reliabilityScore));
  }

  async createPartnerTier(insertTier: InsertPartnerTier): Promise<PartnerTier> {
    const [tier] = await db.insert(partnerTiers).values(insertTier as any).returning();
    return tier;
  }

  async updatePartnerTier(id: string, data: Partial<PartnerTier>): Promise<PartnerTier | undefined> {
    const [tier] = await db.update(partnerTiers).set(data as any).where(eq(partnerTiers.id, id)).returning();
    return tier || undefined;
  }

  // Corporate Rates
  async getCorporateRate(id: string): Promise<CorporateRate | undefined> {
    const [rate] = await db.select().from(corporateRates).where(eq(corporateRates.id, id));
    return rate || undefined;
  }

  async getCorporateRatesByCompanyId(companyId: string): Promise<CorporateRate[]> {
    return await db.select().from(corporateRates).where(eq(corporateRates.companyId, companyId)).orderBy(desc(corporateRates.createdAt));
  }

  async getCorporateRatesByProviderId(providerId: string): Promise<CorporateRate[]> {
    return await db.select().from(corporateRates).where(eq(corporateRates.providerId, providerId)).orderBy(desc(corporateRates.createdAt));
  }

  async getActiveCorporateRates(companyId: string, providerId: string): Promise<CorporateRate[]> {
    const now = new Date();
    return await db.select().from(corporateRates).where(
      and(
        eq(corporateRates.companyId, companyId),
        eq(corporateRates.providerId, providerId)
      )
    );
  }

  async createCorporateRate(insertRate: InsertCorporateRate): Promise<CorporateRate> {
    const [rate] = await db.insert(corporateRates).values(insertRate as any).returning();
    return rate;
  }

  async updateCorporateRate(id: string, data: Partial<CorporateRate>): Promise<CorporateRate | undefined> {
    const [rate] = await db.update(corporateRates).set(data as any).where(eq(corporateRates.id, id)).returning();
    return rate || undefined;
  }

  // Milestone Payments
  async getMilestonePayment(id: string): Promise<MilestonePayment | undefined> {
    const [payment] = await db.select().from(milestonePayments).where(eq(milestonePayments.id, id));
    return payment || undefined;
  }

  async getMilestonePaymentsByGroupBookingId(groupBookingId: string): Promise<MilestonePayment[]> {
    return await db.select().from(milestonePayments).where(eq(milestonePayments.groupBookingId, groupBookingId)).orderBy(milestonePayments.dueDate);
  }

  async getMilestonePaymentsByPayerId(payerId: string): Promise<MilestonePayment[]> {
    return await db.select().from(milestonePayments).where(eq(milestonePayments.payerId, payerId)).orderBy(desc(milestonePayments.createdAt));
  }

  async createMilestonePayment(insertPayment: InsertMilestonePayment): Promise<MilestonePayment> {
    const [payment] = await db.insert(milestonePayments).values(insertPayment as any).returning();
    return payment;
  }

  async updateMilestonePayment(id: string, data: Partial<MilestonePayment>): Promise<MilestonePayment | undefined> {
    const [payment] = await db.update(milestonePayments).set(data as any).where(eq(milestonePayments.id, id)).returning();
    return payment || undefined;
  }

  // Event Reports
  async getEventReport(id: string): Promise<EventReport | undefined> {
    const [report] = await db.select().from(eventReports).where(eq(eventReports.id, id));
    return report || undefined;
  }

  async getEventReportsByCompanyId(companyId: string): Promise<EventReport[]> {
    return await db.select().from(eventReports).where(eq(eventReports.companyId, companyId)).orderBy(desc(eventReports.reportPeriodEnd));
  }

  async createEventReport(insertReport: InsertEventReport): Promise<EventReport> {
    const [report] = await db.insert(eventReports).values(insertReport as any).returning();
    return report;
  }

  // Itineraries
  async getItinerary(id: string): Promise<Itinerary | undefined> {
    const [itinerary] = await db.select().from(itineraries).where(eq(itineraries.id, id));
    return itinerary || undefined;
  }

  async getItinerariesByGroupBookingId(groupBookingId: string): Promise<Itinerary[]> {
    return await db.select().from(itineraries).where(eq(itineraries.groupBookingId, groupBookingId)).orderBy(itineraries.startDate);
  }

  async getItinerariesByTravelerProfileId(travelerProfileId: string): Promise<Itinerary[]> {
    return await db.select().from(itineraries).where(eq(itineraries.travelerProfileId, travelerProfileId)).orderBy(desc(itineraries.startDate));
  }

  async createItinerary(insertItinerary: InsertItinerary): Promise<Itinerary> {
    const [itinerary] = await db.insert(itineraries).values(insertItinerary as any).returning();
    return itinerary;
  }

  async updateItinerary(id: string, data: Partial<Itinerary>): Promise<Itinerary | undefined> {
    const [itinerary] = await db.update(itineraries).set(data as any).where(eq(itineraries.id, id)).returning();
    return itinerary || undefined;
  }

  // Disruption Alerts
  async getDisruptionAlert(id: string): Promise<DisruptionAlert | undefined> {
    const [alert] = await db.select().from(disruptionAlerts).where(eq(disruptionAlerts.id, id));
    return alert || undefined;
  }

  async getDisruptionAlertsByItineraryId(itineraryId: string): Promise<DisruptionAlert[]> {
    return await db.select().from(disruptionAlerts).where(eq(disruptionAlerts.itineraryId, itineraryId)).orderBy(desc(disruptionAlerts.createdAt));
  }

  async getActiveDisruptionAlerts(itineraryId: string): Promise<DisruptionAlert[]> {
    return await db.select().from(disruptionAlerts).where(
      and(
        eq(disruptionAlerts.itineraryId, itineraryId),
        eq(disruptionAlerts.resolvedAt, null as any)
      )
    ).orderBy(desc(disruptionAlerts.severity), desc(disruptionAlerts.createdAt));
  }

  async createDisruptionAlert(insertAlert: InsertDisruptionAlert): Promise<DisruptionAlert> {
    const [alert] = await db.insert(disruptionAlerts).values(insertAlert as any).returning();
    return alert;
  }

  async updateDisruptionAlert(id: string, data: Partial<DisruptionAlert>): Promise<DisruptionAlert | undefined> {
    const [alert] = await db.update(disruptionAlerts).set(data as any).where(eq(disruptionAlerts.id, id)).returning();
    return alert || undefined;
  }

  // DMC Partners
  async getDmcPartner(id: string): Promise<DmcPartner | undefined> {
    const [partner] = await db.select().from(dmcPartners).where(eq(dmcPartners.id, id));
    return partner || undefined;
  }

  async getDmcPartnersByProviderId(providerId: string): Promise<DmcPartner[]> {
    return await db.select().from(dmcPartners).where(eq(dmcPartners.providerId, providerId)).orderBy(desc(dmcPartners.createdAt));
  }

  async getDmcPartnersByDestination(destination: string): Promise<DmcPartner[]> {
    return await db.select().from(dmcPartners).where(eq(dmcPartners.status, "active")).orderBy(desc(dmcPartners.rating));
  }

  async getVerifiedDmcPartners(): Promise<DmcPartner[]> {
    return await db.select().from(dmcPartners).where(
      and(
        eq(dmcPartners.verified, true),
        eq(dmcPartners.status, "active")
      )
    ).orderBy(desc(dmcPartners.rating));
  }

  async createDmcPartner(insertPartner: InsertDmcPartner): Promise<DmcPartner> {
    const [partner] = await db.insert(dmcPartners).values(insertPartner as any).returning();
    return partner;
  }

  async updateDmcPartner(id: string, data: Partial<DmcPartner>): Promise<DmcPartner | undefined> {
    const [partner] = await db.update(dmcPartners).set(data as any).where(eq(dmcPartners.id, id)).returning();
    return partner || undefined;
  }

  // Notification Management
  async getNotificationPreference(id: string): Promise<NotificationPreference | undefined> {
    const [pref] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.id, id));
    return pref || undefined;
  }

  async getNotificationPreferencesByCompanyId(companyId: string): Promise<NotificationPreference[]> {
    return await db.select().from(notificationPreferences).where(eq(notificationPreferences.companyId, companyId)).orderBy(desc(notificationPreferences.createdAt));
  }

  async getNotificationPreferencesByUserId(userId: string): Promise<NotificationPreference[]> {
    return await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).orderBy(desc(notificationPreferences.createdAt));
  }

  async createNotificationPreference(insertPref: InsertNotificationPreference): Promise<NotificationPreference> {
    const [pref] = await db.insert(notificationPreferences).values(insertPref as any).returning();
    return pref;
  }

  async updateNotificationPreference(id: string, data: Partial<NotificationPreference>): Promise<NotificationPreference | undefined> {
    const [pref] = await db.update(notificationPreferences).set(data as any).where(eq(notificationPreferences.id, id)).returning();
    return pref || undefined;
  }

  async createNotificationHistory(insertHistory: InsertNotificationHistory): Promise<NotificationHistory> {
    const [history] = await db.insert(notificationHistory).values(insertHistory as any).returning();
    return history;
  }

  async getNotificationHistoryByRecipientId(recipientId: string): Promise<NotificationHistory[]> {
    return await db.select().from(notificationHistory).where(eq(notificationHistory.recipientId, recipientId)).orderBy(desc(notificationHistory.sentAt));
  }

  // Virtual Cards & Expenses
  async getVirtualCard(id: string): Promise<VirtualCard | undefined> {
    const [card] = await db.select().from(virtualCards).where(eq(virtualCards.id, id));
    return card || undefined;
  }

  async getVirtualCardsByCompanyId(companyId: string): Promise<VirtualCard[]> {
    return await db.select().from(virtualCards).where(eq(virtualCards.companyId, companyId)).orderBy(desc(virtualCards.createdAt));
  }

  async getVirtualCardsByCostCenterId(costCenterId: string): Promise<VirtualCard[]> {
    return await db.select().from(virtualCards).where(eq(virtualCards.costCenterId, costCenterId)).orderBy(desc(virtualCards.createdAt));
  }

  async createVirtualCard(insertCard: InsertVirtualCard): Promise<VirtualCard> {
    const [card] = await db.insert(virtualCards).values(insertCard as any).returning();
    return card;
  }

  async updateVirtualCard(id: string, data: Partial<VirtualCard>): Promise<VirtualCard | undefined> {
    const [card] = await db.update(virtualCards).set(data as any).where(eq(virtualCards.id, id)).returning();
    return card || undefined;
  }

  async getExpenseEntry(id: string): Promise<ExpenseEntry | undefined> {
    const [entry] = await db.select().from(expenseEntries).where(eq(expenseEntries.id, id));
    return entry || undefined;
  }

  async getExpenseEntriesByCompanyId(companyId: string): Promise<ExpenseEntry[]> {
    return await db.select().from(expenseEntries).where(eq(expenseEntries.companyId, companyId)).orderBy(desc(expenseEntries.createdAt));
  }

  async getExpenseEntriesByGroupBookingId(groupBookingId: string): Promise<ExpenseEntry[]> {
    return await db.select().from(expenseEntries).where(eq(expenseEntries.groupBookingId, groupBookingId)).orderBy(desc(expenseEntries.createdAt));
  }

  async createExpenseEntry(insertEntry: InsertExpenseEntry): Promise<ExpenseEntry> {
    const [entry] = await db.insert(expenseEntries).values(insertEntry as any).returning();
    return entry;
  }

  async updateExpenseEntry(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry | undefined> {
    const [entry] = await db.update(expenseEntries).set(data as any).where(eq(expenseEntries.id, id)).returning();
    return entry || undefined;
  }

  // Sustainability
  async getSustainabilityMetric(id: string): Promise<SustainabilityMetric | undefined> {
    const [metric] = await db.select().from(sustainabilityMetrics).where(eq(sustainabilityMetrics.id, id));
    return metric || undefined;
  }

  async getSustainabilityMetricsByGroupBookingId(groupBookingId: string): Promise<SustainabilityMetric[]> {
    return await db.select().from(sustainabilityMetrics).where(eq(sustainabilityMetrics.groupBookingId, groupBookingId)).orderBy(desc(sustainabilityMetrics.createdAt));
  }

  async createSustainabilityMetric(insertMetric: InsertSustainabilityMetric): Promise<SustainabilityMetric> {
    const [metric] = await db.insert(sustainabilityMetrics).values(insertMetric as any).returning();
    return metric;
  }

  // Quality Assurance
  async getQualityAudit(id: string): Promise<QualityAudit | undefined> {
    const [audit] = await db.select().from(qualityAudits).where(eq(qualityAudits.id, id));
    return audit || undefined;
  }

  async getQualityAuditsByVenueId(venueId: string): Promise<QualityAudit[]> {
    return await db.select().from(qualityAudits).where(eq(qualityAudits.venueId, venueId)).orderBy(desc(qualityAudits.visitDate));
  }

  async getQualityAuditsByProviderId(providerId: string): Promise<QualityAudit[]> {
    return await db.select().from(qualityAudits).where(eq(qualityAudits.providerId, providerId)).orderBy(desc(qualityAudits.visitDate));
  }

  async createQualityAudit(insertAudit: InsertQualityAudit): Promise<QualityAudit> {
    const [audit] = await db.insert(qualityAudits).values(insertAudit as any).returning();
    return audit;
  }

  async getPostEventNpsByGroupBookingId(groupBookingId: string): Promise<PostEventNps[]> {
    return await db.select().from(postEventNps).where(eq(postEventNps.groupBookingId, groupBookingId)).orderBy(desc(postEventNps.responseDate));
  }

  async createPostEventNps(insertNps: InsertPostEventNps): Promise<PostEventNps> {
    const [nps] = await db.insert(postEventNps).values(insertNps as any).returning();
    return nps;
  }

  // FAM Trips & Showcases
  async getFamTrip(id: string): Promise<FamTrip | undefined> {
    const [trip] = await db.select().from(famTrips).where(eq(famTrips.id, id));
    return trip || undefined;
  }

  async getFamTripsByCity(city: string): Promise<FamTrip[]> {
    return await db.select().from(famTrips).where(eq(famTrips.city, city)).orderBy(famTrips.startDate);
  }

  async getFamTripsByOrganizerId(organizerId: string): Promise<FamTrip[]> {
    return await db.select().from(famTrips).where(eq(famTrips.organizerId, organizerId)).orderBy(desc(famTrips.createdAt));
  }

  async getOpenFamTrips(): Promise<FamTrip[]> {
    return await db.select().from(famTrips).where(eq(famTrips.status, "open")).orderBy(famTrips.startDate);
  }

  async createFamTrip(insertTrip: InsertFamTrip): Promise<FamTrip> {
    const [trip] = await db.insert(famTrips).values(insertTrip as any).returning();
    return trip;
  }

  async updateFamTrip(id: string, data: Partial<FamTrip>): Promise<FamTrip | undefined> {
    const [trip] = await db.update(famTrips).set(data as any).where(eq(famTrips.id, id)).returning();
    return trip || undefined;
  }

  async getFamTripRegistration(id: string): Promise<FamTripRegistration | undefined> {
    const [registration] = await db.select().from(famTripRegistrations).where(eq(famTripRegistrations.id, id));
    return registration || undefined;
  }

  async getFamTripRegistrationsByFamTripId(famTripId: string): Promise<FamTripRegistration[]> {
    return await db.select().from(famTripRegistrations).where(eq(famTripRegistrations.famTripId, famTripId)).orderBy(desc(famTripRegistrations.createdAt));
  }

  async getFamTripRegistrationsByUserId(userId: string): Promise<FamTripRegistration[]> {
    return await db.select().from(famTripRegistrations).where(eq(famTripRegistrations.userId, userId)).orderBy(desc(famTripRegistrations.createdAt));
  }

  async createFamTripRegistration(insertRegistration: InsertFamTripRegistration): Promise<FamTripRegistration> {
    const [registration] = await db.insert(famTripRegistrations).values(insertRegistration as any).returning();
    return registration;
  }

  async updateFamTripRegistration(id: string, data: Partial<FamTripRegistration>): Promise<FamTripRegistration | undefined> {
    const [registration] = await db.update(famTripRegistrations).set(data as any).where(eq(famTripRegistrations.id, id)).returning();
    return registration || undefined;
  }

  // === PHASE 6: Bleisure, Analytics, HRIS/SSO ===

  // Bleisure Packages
  async getBleisurePackage(id: string): Promise<BleisurePackage | undefined> {
    const [pkg] = await db.select().from(bleisurePackages).where(eq(bleisurePackages.id, id));
    return pkg || undefined;
  }

  async getBleisurePackagesByCity(city: string): Promise<BleisurePackage[]> {
    return await db.select().from(bleisurePackages).where(eq(bleisurePackages.city, city)).orderBy(bleisurePackages.pricePerPersonMad);
  }

  async getBleisurePackagesByProviderId(providerId: string): Promise<BleisurePackage[]> {
    return await db.select().from(bleisurePackages).where(eq(bleisurePackages.providerId, providerId)).orderBy(desc(bleisurePackages.createdAt));
  }

  async getActiveBleisurePackages(): Promise<BleisurePackage[]> {
    return await db.select().from(bleisurePackages).where(eq(bleisurePackages.status, "active")).orderBy(bleisurePackages.pricePerPersonMad);
  }

  async createBleisurePackage(insertPkg: InsertBleisurePackage): Promise<BleisurePackage> {
    const [pkg] = await db.insert(bleisurePackages).values(insertPkg as any).returning();
    return pkg;
  }

  async updateBleisurePackage(id: string, data: Partial<BleisurePackage>): Promise<BleisurePackage | undefined> {
    const [pkg] = await db.update(bleisurePackages).set(data as any).where(eq(bleisurePackages.id, id)).returning();
    return pkg || undefined;
  }

  // Coworking Spaces
  async getCoworkingSpace(id: string): Promise<CoworkingSpace | undefined> {
    const [space] = await db.select().from(coworkingSpaces).where(eq(coworkingSpaces.id, id));
    return space || undefined;
  }

  async getCoworkingSpacesByCity(city: string): Promise<CoworkingSpace[]> {
    return await db.select().from(coworkingSpaces).where(eq(coworkingSpaces.city, city)).orderBy(desc(coworkingSpaces.rating));
  }

  async getVerifiedCoworkingSpaces(): Promise<CoworkingSpace[]> {
    return await db.select().from(coworkingSpaces).where(eq(coworkingSpaces.verified, true)).orderBy(desc(coworkingSpaces.rating));
  }

  async createCoworkingSpace(insertSpace: InsertCoworkingSpace): Promise<CoworkingSpace> {
    const [space] = await db.insert(coworkingSpaces).values(insertSpace as any).returning();
    return space;
  }

  async updateCoworkingSpace(id: string, data: Partial<CoworkingSpace>): Promise<CoworkingSpace | undefined> {
    const [space] = await db.update(coworkingSpaces).set(data as any).where(eq(coworkingSpaces.id, id)).returning();
    return space || undefined;
  }

  // Bleisure Bookings
  async getBleisureBooking(id: string): Promise<BleisureBooking | undefined> {
    const [booking] = await db.select().from(bleisureBookings).where(eq(bleisureBookings.id, id));
    return booking || undefined;
  }

  async getBleisureBookingsByUserId(userId: string): Promise<BleisureBooking[]> {
    return await db.select().from(bleisureBookings).where(eq(bleisureBookings.userId, userId)).orderBy(desc(bleisureBookings.createdAt));
  }

  async getBleisureBookingsByCompanyId(companyId: string): Promise<BleisureBooking[]> {
    return await db.select().from(bleisureBookings).where(eq(bleisureBookings.companyId, companyId)).orderBy(desc(bleisureBookings.createdAt));
  }

  async createBleisureBooking(insertBooking: InsertBleisureBooking): Promise<BleisureBooking> {
    const [booking] = await db.insert(bleisureBookings).values(insertBooking as any).returning();
    return booking;
  }

  async updateBleisureBooking(id: string, data: Partial<BleisureBooking>): Promise<BleisureBooking | undefined> {
    const [booking] = await db.update(bleisureBookings).set(data as any).where(eq(bleisureBookings.id, id)).returning();
    return booking || undefined;
  }

  // Savings Attributions
  async getSavingsAttribution(id: string): Promise<SavingsAttribution | undefined> {
    const [saving] = await db.select().from(savingsAttributions).where(eq(savingsAttributions.id, id));
    return saving || undefined;
  }

  async getSavingsAttributionsByCompanyId(companyId: string): Promise<SavingsAttribution[]> {
    return await db.select().from(savingsAttributions).where(eq(savingsAttributions.companyId, companyId)).orderBy(desc(savingsAttributions.periodEnd));
  }

  async getSavingsAttributionsByPeriod(companyId: string, start: Date, end: Date): Promise<SavingsAttribution[]> {
    return await db.select().from(savingsAttributions)
      .where(and(
        eq(savingsAttributions.companyId, companyId),
        gte(savingsAttributions.periodStart, start),
        lte(savingsAttributions.periodEnd, end)
      ))
      .orderBy(desc(savingsAttributions.periodEnd));
  }

  async createSavingsAttribution(insertSaving: InsertSavingsAttribution): Promise<SavingsAttribution> {
    const [saving] = await db.insert(savingsAttributions).values(insertSaving as any).returning();
    return saving;
  }

  // Cohort Analyses
  async getCohortAnalysis(id: string): Promise<CohortAnalysis | undefined> {
    const [cohort] = await db.select().from(cohortAnalyses).where(eq(cohortAnalyses.id, id));
    return cohort || undefined;
  }

  async getCohortAnalysesByType(cohortType: string): Promise<CohortAnalysis[]> {
    return await db.select().from(cohortAnalyses).where(eq(cohortAnalyses.cohortType, cohortType as any)).orderBy(cohortAnalyses.cohortMonth);
  }

  async getCohortAnalysesByMonth(cohortMonth: string): Promise<CohortAnalysis[]> {
    return await db.select().from(cohortAnalyses).where(eq(cohortAnalyses.cohortMonth, cohortMonth)).orderBy(cohortAnalyses.cohortType);
  }

  async createCohortAnalysis(insertCohort: InsertCohortAnalysis): Promise<CohortAnalysis> {
    const [cohort] = await db.insert(cohortAnalyses).values(insertCohort as any).returning();
    return cohort;
  }

  // HRIS Sync Configs
  async getHrisSyncConfig(id: string): Promise<HrisSyncConfig | undefined> {
    const [config] = await db.select().from(hrisSyncConfigs).where(eq(hrisSyncConfigs.id, id));
    return config || undefined;
  }

  async getHrisSyncConfigByCompanyId(companyId: string): Promise<HrisSyncConfig | undefined> {
    const [config] = await db.select().from(hrisSyncConfigs).where(eq(hrisSyncConfigs.companyId, companyId));
    return config || undefined;
  }

  async createHrisSyncConfig(insertConfig: InsertHrisSyncConfig): Promise<HrisSyncConfig> {
    const [config] = await db.insert(hrisSyncConfigs).values(insertConfig as any).returning();
    return config;
  }

  async updateHrisSyncConfig(id: string, data: Partial<HrisSyncConfig>): Promise<HrisSyncConfig | undefined> {
    const [config] = await db.update(hrisSyncConfigs).set(data as any).where(eq(hrisSyncConfigs.id, id)).returning();
    return config || undefined;
  }

  // SSO Connections
  async getSsoConnection(id: string): Promise<SsoConnection | undefined> {
    const [connection] = await db.select().from(ssoConnections).where(eq(ssoConnections.id, id));
    return connection || undefined;
  }

  async getSsoConnectionByCompanyId(companyId: string): Promise<SsoConnection | undefined> {
    const [connection] = await db.select().from(ssoConnections).where(eq(ssoConnections.companyId, companyId));
    return connection || undefined;
  }

  async createSsoConnection(insertConnection: InsertSsoConnection): Promise<SsoConnection> {
    const [connection] = await db.insert(ssoConnections).values(insertConnection as any).returning();
    return connection;
  }

  async updateSsoConnection(id: string, data: Partial<SsoConnection>): Promise<SsoConnection | undefined> {
    const [connection] = await db.update(ssoConnections).set(data as any).where(eq(ssoConnections.id, id)).returning();
    return connection || undefined;
  }

  // Employee Sync Logs
  async getEmployeeSyncLog(id: string): Promise<EmployeeSyncLog | undefined> {
    const [log] = await db.select().from(employeeSyncLogs).where(eq(employeeSyncLogs.id, id));
    return log || undefined;
  }

  async getEmployeeSyncLogsBySyncConfigId(syncConfigId: string): Promise<EmployeeSyncLog[]> {
    return await db.select().from(employeeSyncLogs).where(eq(employeeSyncLogs.syncConfigId, syncConfigId)).orderBy(desc(employeeSyncLogs.createdAt));
  }

  async createEmployeeSyncLog(insertLog: InsertEmployeeSyncLog): Promise<EmployeeSyncLog> {
    const [log] = await db.insert(employeeSyncLogs).values(insertLog as any).returning();
    return log;
  }

  async updateEmployeeSyncLog(id: string, data: Partial<EmployeeSyncLog>): Promise<EmployeeSyncLog | undefined> {
    const [log] = await db.update(employeeSyncLogs).set(data as any).where(eq(employeeSyncLogs.id, id)).returning();
    return log || undefined;
  }

  // Phase 1 Marketplace: Service Packages
  async createServicePackage(data: InsertServicePackage): Promise<ServicePackage> {
    const [pkg] = await db.insert(servicePackages).values(data as any).returning();
    return pkg;
  }

  async getServicePackage(id: string): Promise<ServicePackage | undefined> {
    const [pkg] = await db.select().from(servicePackages).where(eq(servicePackages.id, id));
    return pkg || undefined;
  }

  async getServicePackagesByProvider(providerId: string): Promise<ServicePackage[]> {
    return await db
      .select()
      .from(servicePackages)
      .where(eq(servicePackages.providerId, providerId))
      .orderBy(desc(servicePackages.createdAt));
  }

  async getServicePackages(filters?: { category?: string; active?: boolean; search?: string }): Promise<ServicePackage[]> {
    let query = db.select().from(servicePackages);
    
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(servicePackages.category, filters.category as any));
    }
    
    if (filters?.active !== undefined) {
      conditions.push(eq(servicePackages.active, filters.active));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          like(servicePackages.name, `%${filters.search}%`),
          like(servicePackages.description, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(servicePackages.createdAt));
  }

  async updateServicePackage(id: string, data: Partial<InsertServicePackage>): Promise<ServicePackage | undefined> {
    const [pkg] = await db
      .update(servicePackages)
      .set(data as any)
      .where(eq(servicePackages.id, id))
      .returning();
    return pkg || undefined;
  }

  async deleteServicePackage(id: string): Promise<void> {
    await db.delete(servicePackages).where(eq(servicePackages.id, id));
  }

  async incrementPackageViews(id: string): Promise<void> {
    await db
      .update(servicePackages)
      .set({ views: sql`${servicePackages.views} + 1` })
      .where(eq(servicePackages.id, id));
  }

  // Phase 1 Marketplace: Favorites
  async createFavorite(data: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(data as any).returning();
    return favorite;
  }

  async deleteFavorite(id: string): Promise<void> {
    await db.delete(favorites).where(eq(favorites.id, id));
  }

  async getFavoritesByUser(userId: string, itemType?: string): Promise<Favorite[]> {
    const conditions = [eq(favorites.userId, userId)];
    
    if (itemType) {
      conditions.push(eq(favorites.itemType, itemType as any));
    }
    
    return await db
      .select()
      .from(favorites)
      .where(and(...conditions))
      .orderBy(desc(favorites.createdAt));
  }

  async checkFavorite(userId: string, itemType: string, itemId: string): Promise<Favorite | undefined> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.itemType, itemType as any),
          eq(favorites.itemId, itemId)
        )
      );
    return favorite || undefined;
  }

  // Phase 1 Marketplace: Package Orders
  async createPackageOrder(data: InsertPackageOrder): Promise<PackageOrder> {
    const [order] = await db.insert(packageOrders).values(data as any).returning();
    return order;
  }

  async getPackageOrder(id: string): Promise<PackageOrder | undefined> {
    const [order] = await db.select().from(packageOrders).where(eq(packageOrders.id, id));
    return order || undefined;
  }

  async getPackageOrdersByBuyer(buyerId: string): Promise<PackageOrder[]> {
    return await db
      .select()
      .from(packageOrders)
      .innerJoin(jobs, eq(packageOrders.jobId, jobs.id))
      .where(eq(jobs.buyerId, buyerId))
      .orderBy(desc(packageOrders.createdAt))
      .then(rows => rows.map(row => row.package_orders));
  }

  async getPackageOrdersByProvider(providerId: string): Promise<PackageOrder[]> {
    return await db
      .select()
      .from(packageOrders)
      .innerJoin(servicePackages, eq(packageOrders.packageId, servicePackages.id))
      .where(eq(servicePackages.providerId, providerId))
      .orderBy(desc(packageOrders.createdAt))
      .then(rows => rows.map(row => row.package_orders));
  }

  async updatePackageOrder(id: string, data: Partial<InsertPackageOrder>): Promise<PackageOrder | undefined> {
    const [order] = await db
      .update(packageOrders)
      .set(data as any)
      .where(eq(packageOrders.id, id))
      .returning();
    return order || undefined;
  }
}

export const storage = new DatabaseStorage();
