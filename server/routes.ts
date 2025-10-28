import type { Express } from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { providers } from "@shared/schema";
import { generateDynamicPriceBand, scoreOffer as scoreOfferWithAI } from "./services/ai-pricing";
import { canProviderSubmitOffer, consumeFreeOffer, incrementPaidOfferCounter, processOfferAcceptance, getOrCreateSubscription } from "./services/commission";
import { logAudit, AUDIT_ACTIONS } from "./audit";
import { dispatchNotification } from "./services/notifications";
import { syncCardTransactions, reconcileExpenses, autoReconcileExpense } from "./services/expense-reconciliation";
import { 
  insertUserSchema, insertProviderSchema, insertJobSchema, insertOfferSchema, 
  insertMessageSchema, insertRatingSchema, insertVenueSchema, insertVenueRoomSchema,
  insertRfpSchema, insertQuoteSchema, insertCompanySchema, insertCostCenterSchema,
  insertTravelerProfileSchema, insertGroupBookingSchema, insertApprovalSchema,
  insertPartnerTierSchema, insertCorporateRateSchema, insertMilestonePaymentSchema,
  insertEventReportSchema, insertItinerarySchema, insertDisruptionAlertSchema, insertDmcPartnerSchema,
  insertNotificationPreferenceSchema, insertVirtualCardSchema, insertExpenseEntrySchema,
  insertSustainabilityMetricSchema, insertQualityAuditSchema, insertPostEventNpsSchema,
  insertFamTripSchema, insertFamTripRegistrationSchema,
  insertBleisurePackageSchema, insertCoworkingSpaceSchema, insertBleisureBookingSchema,
  insertSavingsAttributionSchema, insertCohortAnalysisSchema, insertHrisSyncConfigSchema,
  insertSsoConnectionSchema, insertEmployeeSyncLogSchema,
  insertServicePackageSchema, insertFavoriteSchema, insertPackageOrderSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function for error handling
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // Auth middleware - protect routes that require authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Role-based middleware
  const requireRole = (...roles: Array<'buyer' | 'provider' | 'admin'>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!roles.includes(req.session.role!)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    };
  };

  // ===== AUTH ROUTES =====
  app.post("/api/auth/signup", asyncHandler(async (req, res) => {
    const { email, password, role, locale } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // SECURITY: Whitelist roles - never trust client input for authorization
    const allowedRoles = ['buyer', 'provider'] as const;
    const validatedRole = allowedRoles.includes(role) ? role : 'buyer';

    // Check if user exists
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await storage.createUser({
      email,
      password: hashedPassword,
      role: validatedRole,
      locale: locale || 'fr-MA',
    });

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;

    // Audit log
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_SIGNUP,
      resourceType: 'user',
      resourceId: user.id,
      changes: { email: user.email, role: user.role },
      req,
    });

    res.json({ user: { ...user, password: undefined } });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;

    // Audit log
    await logAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      req,
    });

    res.json({ user: { ...user, password: undefined } });
  }));

  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    
    // Audit log before destroying session
    if (userId) {
      await logAudit({
        userId,
        action: AUDIT_ACTIONS.USER_LOGOUT,
        resourceType: 'user',
        resourceId: userId,
        req,
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  }));

  app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { ...user, password: undefined } });
  }));

  // ===== PROVIDER ROUTES =====
  app.post("/api/providers", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const { displayName, city, permits } = req.body;
    const userId = req.session.userId!;
    
    // Check if provider profile already exists
    const existing = await storage.getProviderByUserId(userId);
    if (existing) {
      return res.status(400).json({ error: "Provider profile already exists" });
    }

    const provider = await storage.createProvider({
      userId,
      displayName,
      city,
      permits,
      verified: false,
    });

    // Audit log
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.PROVIDER_CREATE,
      resourceType: 'provider',
      resourceId: provider.id,
      changes: { displayName, city, verified: false },
      req,
    });

    res.json(provider);
  }));

  app.get("/api/providers", asyncHandler(async (req, res) => {
    // Get all providers from database
    const providersList = await db.select().from(providers);
    
    // Enrich with profile data
    const providersWithProfiles = await Promise.all(
      providersList.map(async (provider) => {
        const profile = await storage.getProviderProfile(provider.id);
        return {
          ...provider,
          profile: profile || null,
        };
      })
    );

    res.json(providersWithProfiles);
  }));

  app.get("/api/providers/:id", asyncHandler(async (req, res) => {
    const provider = await storage.getProvider(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }
    
    // Include profile data
    const profile = await storage.getProviderProfile(provider.id);
    res.json({
      ...provider,
      profile: profile || null,
    });
  }));

  // ===== JOB ROUTES =====
  app.get("/api/jobs", asyncHandler(async (req, res) => {
    const buyerId = req.query.buyerId as string;
    
    let jobsList;
    if (buyerId) {
      jobsList = await storage.getJobsByBuyerId(buyerId);
    } else {
      jobsList = await storage.getOpenJobs();
    }

    // Add offer count to each job
    const jobsWithOfferCount = await Promise.all(
      jobsList.map(async (job) => {
        const offers = await storage.getOffersByJobId(job.id);
        return { ...job, offerCount: offers.length };
      })
    );

    res.json(jobsWithOfferCount);
  }));

  app.post("/api/jobs", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const { description, category, city, budgetHintMad, spec } = req.body;

    // Get buyer ID from authenticated session
    const buyerId = req.session.userId!;

    // Phase 1: Generate dynamic price band with AI
    const priceBand = await generateDynamicPriceBand({
      category,
      city: city || 'Casablanca',
      description: description || '',
      distanceKm: spec?.km || spec?.distance,
      pax: spec?.pax || spec?.passengers,
      timeISO: new Date().toISOString(),
    });

    // Merge spec with price band
    const jobSpec = {
      ...(spec || {}),
      description: description || '',
      priceBand: {
        minMAD: priceBand.minMAD,
        maxMAD: priceBand.maxMAD,
        recommendedMAD: priceBand.recommendedMAD,
        aiGenerated: priceBand.aiGenerated,
      },
    };

    const job = await storage.createJob({
      buyerId,
      category,
      city,
      spec: jobSpec,
      budgetHintMad: budgetHintMad || priceBand.recommendedMAD,
    });

    // Audit log
    await logAudit({
      userId: buyerId,
      action: AUDIT_ACTIONS.JOB_CREATE,
      resourceType: 'job',
      resourceId: job.id,
      changes: { category, city, budgetHintMad: job.budgetHintMad, aiPricing: priceBand.aiGenerated },
      req,
    });

    res.json(job);
  }));

  app.get("/api/jobs/:id", asyncHandler(async (req, res) => {
    const job = await storage.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  }));

  app.post("/api/jobs/:id/cancel", requireAuth, asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const userId = req.session.userId!;

    // Verify user owns this job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job.buyerId !== userId) {
      return res.status(403).json({ error: "Not authorized to cancel this job" });
    }

    const updatedJob = await storage.updateJob(jobId, { status: 'cancelled' });

    // Audit log
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.JOB_CANCEL,
      resourceType: 'job',
      resourceId: jobId,
      req,
    });

    res.json(updatedJob);
  }));

  // ===== OFFER ROUTES =====
  app.get("/api/jobs/:id/offers", asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const offers = await storage.getOffersByJobId(jobId);

    // Enrich offers with provider data
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        const provider = await storage.getProvider(offer.providerId);
        return { ...offer, provider };
      })
    );

    res.json(enrichedOffers);
  }));

  app.post("/api/jobs/:id/offers", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const { priceMad, etaMin, notes } = req.body;
    
    // Get provider ID from authenticated user
    const userId = req.session.userId!;
    const userProvider = await storage.getProviderByUserId(userId);
    if (!userProvider) {
      return res.status(400).json({ error: "Provider profile not found" });
    }
    const providerId = userProvider.id;

    // Phase 1: Check subscription tier and free offer limits
    const eligibility = await canProviderSubmitOffer(providerId);
    if (!eligibility.allowed) {
      return res.status(403).json({
        error: "Cannot submit offer",
        reason: eligibility.reason,
        tier: eligibility.subscriptionTier,
        freeOffersRemaining: eligibility.freeOffersRemaining,
        needsUpgrade: true,
      });
    }

    // Get job for AI scoring
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Phase 1: Calculate AI score using new scoring service
    const jobSpec = job.spec as any;
    const priceBand = jobSpec.priceBand || { minMAD: 0, maxMAD: 10000, recommendedMAD: 5000 };
    
    const aiScore = await scoreOfferWithAI({
      offer: {
        priceMad,
        etaMin,
        notes,
      },
      job: {
        category: job.category,
        city: job.city || 'Casablanca',
        description: jobSpec.description || '',
        budgetHintMad: job.budgetHintMad,
      },
      provider: {
        rating: userProvider.rating || '0',
        verified: userProvider.verified,
      },
      priceBand,
    });

    const offer = await storage.createOffer({
      jobId,
      providerId,
      priceMad,
      etaMin,
      notes,
      aiScore: aiScore.toString(),
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Phase 1: Consume free offer if applicable, or increment paid counter
    if (eligibility.subscriptionTier === 'free' && eligibility.freeOffersRemaining && eligibility.freeOffersRemaining > 0) {
      await consumeFreeOffer(providerId);
    } else if (eligibility.subscriptionTier !== 'free') {
      await incrementPaidOfferCounter(providerId);
    }

    // Audit log
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.OFFER_SUBMIT,
      resourceType: 'offer',
      resourceId: offer.id,
      changes: { 
        jobId, 
        providerId, 
        priceMad, 
        aiScore,
        tier: eligibility.subscriptionTier,
        freeOffersRemaining: eligibility.freeOffersRemaining,
      },
      req,
    });

    res.json({
      ...offer,
      eligibility: {
        tier: eligibility.subscriptionTier,
        freeOffersRemaining: eligibility.freeOffersRemaining,
      },
    });
  }));

  app.post("/api/offers/:id/accept", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const offerId = req.params.id;
    const userId = req.session.userId!;
    
    // Get offer and verify user owns the job
    const offer = await storage.getOffer(offerId);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const job = await storage.getJob(offer.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    if (job.buyerId !== userId) {
      return res.status(403).json({ error: "Not authorized to accept this offer" });
    }

    // Phase 1: Process commission and record earnings
    const { platformFee, providerEarning, commission } = await processOfferAcceptance(offerId);

    // Update offer status
    const updatedOffer = await storage.updateOffer(offerId, { status: 'accepted' });

    // Update job status
    await storage.updateJob(offer.jobId, { status: 'accepted' });

    // Decline other offers for this job
    const allOffers = await storage.getOffersByJobId(offer.jobId);
    await Promise.all(
      allOffers
        .filter(o => o.id !== offerId && o.status === 'pending')
        .map(o => storage.updateOffer(o.id, { status: 'declined' }))
    );

    // Audit log
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.OFFER_ACCEPT,
      resourceType: 'offer',
      resourceId: offerId,
      changes: { 
        jobId: offer.jobId, 
        status: 'accepted',
        platformCommission: commission.commissionAmountMad,
        providerNet: commission.providerNetMad,
        commissionRate: commission.commissionRate,
      },
      req,
    });

    res.json({
      ...updatedOffer,
      commission: {
        gross: commission.grossAmountMad,
        platformFee: commission.commissionAmountMad,
        providerNet: commission.providerNetMad,
        rate: commission.commissionRate,
        platformFeeId: platformFee.id,
        earningId: providerEarning.id,
      },
    });
  }));

  // ===== MESSAGE ROUTES =====
  app.get("/api/jobs/:id/messages", asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const messagesList = await storage.getMessagesByJobId(jobId);

    // Enrich with sender names
    const enrichedMessages = await Promise.all(
      messagesList.map(async (msg) => {
        const sender = await storage.getUser(msg.senderId);
        return { ...msg, senderName: sender?.email || 'Unknown' };
      })
    );

    res.json(enrichedMessages);
  }));

  app.post("/api/messages", asyncHandler(async (req, res) => {
    const data = insertMessageSchema.parse(req.body);
    const message = await storage.createMessage(data);
    res.json(message);
  }));

  app.get("/api/messages/conversations", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Get jobs for the user
    const jobsList = await storage.getJobsByBuyerId(userId);

    // Get last message and unread count for each
    const conversations = await Promise.all(
      jobsList.map(async (job) => {
        const messagesList = await storage.getMessagesByJobId(job.id);
        const lastMessage = messagesList[messagesList.length - 1];
        return {
          ...job,
          lastMessage,
          unreadCount: 0, // TODO: Implement read tracking
        };
      })
    );

    res.json(conversations);
  }));

  // ===== RATING ROUTES =====
  app.post("/api/ratings", asyncHandler(async (req, res) => {
    const data = insertRatingSchema.parse(req.body);
    const rating = await storage.createRating(data);

    // Update provider average rating
    const allRatings = await storage.getRatingsByRateeId(data.rateeId);
    const avgScore = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
    
    const provider = await storage.getProviderByUserId(data.rateeId);
    if (provider) {
      await storage.updateProvider(provider.id, { rating: avgScore.toFixed(2) });
    }

    res.json(rating);
  }));

  // ===== FINANCING ROUTES =====
  app.get("/api/financing/:jobId/offers", asyncHandler(async (req, res) => {
    const offers = await storage.getFinancingOffersByJobId(req.params.jobId);
    res.json(offers);
  }));

  app.post("/api/financing/prequal", asyncHandler(async (req, res) => {
    // Mock pre-qualification (in production, integrate with lenders)
    const { income, amount, term } = req.body;
    
    const dti = (amount / term) / income;
    const prequal = dti < 0.4; // Simple DTI check

    res.json({
      prequalified: prequal,
      maxAmount: prequal ? amount * 1.2 : amount * 0.8,
      estimatedApr: prequal ? 7.5 : 9.5,
    });
  }));

  // ===== PHASE 1: SUBSCRIPTION & PAYMENT ROUTES =====
  
  // Get provider's subscription status
  app.get("/api/subscription", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const subscription = await getOrCreateSubscription(provider.id);
    const eligibility = await canProviderSubmitOffer(provider.id);

    res.json({
      subscription,
      eligibility,
    });
  }));

  // Purchase subscription (Basic or Pro)
  app.post("/api/subscription/purchase", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const { tier } = req.body;
    const userId = req.session.userId!;
    
    if (tier !== 'basic' && tier !== 'pro') {
      return res.status(400).json({ error: "Invalid tier. Must be 'basic' or 'pro'" });
    }

    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    // Import payment service dynamically to avoid circular deps
    const { purchaseSubscription } = await import("./services/payment");
    
    // Initiate payment
    const paymentResult = await purchaseSubscription(provider.id, tier);

    if (!paymentResult.success) {
      return res.status(500).json({ 
        error: "Payment failed",
        details: paymentResult.error,
      });
    }

    res.json({
      success: true,
      transaction: paymentResult.transactionId,
      paymentUrl: paymentResult.paymentUrl, // For redirect-based payments
      status: paymentResult.status,
    });
  }));

  // Provider earnings summary
  app.get("/api/earnings", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const { getProviderEarningsSummary } = await import("./services/commission");
    const summary = await getProviderEarningsSummary(provider.id);

    res.json(summary);
  }));

  // Transaction history
  app.get("/api/transactions", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const txList = await storage.getTransactionsByProviderId(provider.id);
    res.json(txList);
  }));

  // Payment callback webhook (called by PSP after payment)
  app.post("/api/payment/callback", asyncHandler(async (req, res) => {
    const { transactionId, pspTransactionId, status, signature } = req.body;
    
    const { handlePaymentCallback } = await import("./services/payment");
    
    const result = await handlePaymentCallback({
      transactionId,
      pspTransactionId,
      status,
      signature,
      callbackData: req.body,
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  }));

  // ===== MICE/B2B ROUTES =====
  
  // Get all venues (with filters)
  app.get("/api/venues", asyncHandler(async (req, res) => {
    const { city, type, verified, invoiceReady } = req.query;
    
    const filters: any = {};
    if (city) filters.city = city as string;
    if (type) filters.type = type as string;
    if (verified !== undefined) filters.verified = verified === 'true';
    if (invoiceReady !== undefined) filters.invoiceReady = invoiceReady === 'true';
    
    const venues = await storage.getVenues(filters);
    res.json(venues);
  }));

  // Get single venue
  app.get("/api/venues/:id", asyncHandler(async (req, res) => {
    const venue = await storage.getVenue(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
    
    // Get venue rooms
    const rooms = await storage.getVenueRoomsByVenueId(venue.id);
    
    res.json({ ...venue, rooms });
  }));

  // Create venue (providers only)
  app.post("/api/venues", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const validatedData = insertVenueSchema.parse({
      ...req.body,
      providerId: provider.id,
    });

    const venue = await storage.createVenue(validatedData);
    
    await logAudit({
      userId,
      action: 'VENUE_CREATED',
      resourceType: 'venue',
      resourceId: venue.id,
      changes: validatedData,
      req,
    });

    res.json(venue);
  }));

  // Update venue
  app.patch("/api/venues/:id", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const existingVenue = await storage.getVenue(req.params.id);
    if (!existingVenue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (existingVenue.providerId !== provider.id) {
      return res.status(403).json({ error: "Not authorized to update this venue" });
    }

    const venue = await storage.updateVenue(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'VENUE_UPDATED',
      resourceType: 'venue',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(venue);
  }));

  // Add venue room
  app.post("/api/venues/:venueId/rooms", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const venue = await storage.getVenue(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (venue.providerId !== provider.id) {
      return res.status(403).json({ error: "Not authorized to add rooms to this venue" });
    }

    const validatedData = insertVenueRoomSchema.parse({
      ...req.body,
      venueId: req.params.venueId,
    });

    const room = await storage.createVenueRoom(validatedData);
    
    await logAudit({
      userId,
      action: 'VENUE_ROOM_CREATED',
      resourceType: 'venue_room',
      resourceId: room.id,
      changes: validatedData,
      req,
    });

    res.json(room);
  }));

  // Get venue rooms
  app.get("/api/venues/:venueId/rooms", asyncHandler(async (req, res) => {
    const rooms = await storage.getVenueRoomsByVenueId(req.params.venueId);
    res.json(rooms);
  }));

  // ===== RFP ROUTES =====
  
  // Get all open RFPs (for providers)
  app.get("/api/rfps", asyncHandler(async (req, res) => {
    const rfps = await storage.getOpenRfps();
    res.json(rfps);
  }));

  // Get RFP by ID
  app.get("/api/rfps/:id", requireAuth, asyncHandler(async (req, res) => {
    const rfp = await storage.getRfp(req.params.id);
    if (!rfp) {
      return res.status(404).json({ error: "RFP not found" });
    }
    
    // Get quotes for this RFP
    const quotes = await storage.getQuotesByRfpId(rfp.id);
    
    res.json({ ...rfp, quotes });
  }));

  // Create RFP (buyers with company only)
  app.post("/api/rfps", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertRfpSchema.parse({
      ...req.body,
      createdById: userId,
    });

    const rfp = await storage.createRfp(validatedData);
    
    await logAudit({
      userId,
      action: 'RFP_CREATED',
      resourceType: 'rfp',
      resourceId: rfp.id,
      changes: validatedData,
      req,
    });

    res.json(rfp);
  }));

  // Update RFP
  app.patch("/api/rfps/:id", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const existingRfp = await storage.getRfp(req.params.id);
    if (!existingRfp) {
      return res.status(404).json({ error: "RFP not found" });
    }

    if (existingRfp.createdById !== userId) {
      return res.status(403).json({ error: "Not authorized to update this RFP" });
    }

    const rfp = await storage.updateRfp(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'RFP_UPDATED',
      resourceType: 'rfp',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(rfp);
  }));

  // Get quotes for RFP
  app.get("/api/rfps/:id/quotes", requireAuth, asyncHandler(async (req, res) => {
    const quotes = await storage.getQuotesByRfpId(req.params.id);
    res.json(quotes);
  }));

  // Submit quote for RFP (providers only)
  app.post("/api/rfps/:id/quotes", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found" });
    }

    const validatedData = insertQuoteSchema.parse({
      ...req.body,
      rfpId: req.params.id,
      providerId: provider.id,
    });

    const quote = await storage.createQuote(validatedData);
    
    await logAudit({
      userId,
      action: 'QUOTE_SUBMITTED',
      resourceType: 'quote',
      resourceId: quote.id,
      changes: validatedData,
      req,
    });

    res.json(quote);
  }));

  // ===== COMPANY & CORPORATE ROUTES =====
  
  // Create company
  app.post("/api/companies", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertCompanySchema.parse({
      ...req.body,
      primaryContactId: userId,
    });

    const company = await storage.createCompany(validatedData);
    
    await logAudit({
      userId,
      action: 'COMPANY_CREATED',
      resourceType: 'company',
      resourceId: company.id,
      changes: validatedData,
      req,
    });

    res.json(company);
  }));

  // Get company
  app.get("/api/companies/:id", requireAuth, asyncHandler(async (req, res) => {
    const company = await storage.getCompany(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  }));

  // Get cost centers for company
  app.get("/api/companies/:id/cost-centers", requireAuth, asyncHandler(async (req, res) => {
    const costCenters = await storage.getCostCentersByCompanyId(req.params.id);
    res.json(costCenters);
  }));

  // Create cost center
  app.post("/api/cost-centers", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertCostCenterSchema.parse(req.body);
    const costCenter = await storage.createCostCenter(validatedData);
    
    await logAudit({
      userId,
      action: 'COST_CENTER_CREATED',
      resourceType: 'cost_center',
      resourceId: costCenter.id,
      changes: validatedData,
      req,
    });

    res.json(costCenter);
  }));

  // Get traveler profiles for company
  app.get("/api/companies/:id/travelers", requireAuth, asyncHandler(async (req, res) => {
    const travelers = await storage.getTravelerProfilesByCompanyId(req.params.id);
    res.json(travelers);
  }));

  // Create traveler profile
  app.post("/api/traveler-profiles", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertTravelerProfileSchema.parse({
      ...req.body,
      userId,
    });

    const profile = await storage.createTravelerProfile(validatedData);
    
    await logAudit({
      userId,
      action: 'TRAVELER_PROFILE_CREATED',
      resourceType: 'traveler_profile',
      resourceId: profile.id,
      changes: validatedData,
      req,
    });

    res.json(profile);
  }));

  // Get approvals for user
  app.get("/api/approvals/pending", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const approvals = await storage.getPendingApprovals(userId);
    res.json(approvals);
  }));

  // Create approval
  app.post("/api/approvals", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertApprovalSchema.parse({
      ...req.body,
      requestedById: userId,
    });

    const approval = await storage.createApproval(validatedData);
    
    await logAudit({
      userId,
      action: 'APPROVAL_REQUESTED',
      resourceType: 'approval',
      resourceId: approval.id,
      changes: validatedData,
      req,
    });

    res.json(approval);
  }));

  // Update approval status
  app.patch("/api/approvals/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const existingApproval = await storage.getApproval(req.params.id);
    if (!existingApproval) {
      return res.status(404).json({ error: "Approval not found" });
    }

    if (existingApproval.approverId !== userId) {
      return res.status(403).json({ error: "Not authorized to approve this request" });
    }

    const approval = await storage.updateApproval(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'APPROVAL_UPDATED',
      resourceType: 'approval',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(approval);
  }));

  // Get group bookings for company
  app.get("/api/companies/:id/bookings", requireAuth, asyncHandler(async (req, res) => {
    const bookings = await storage.getGroupBookingsByCompanyId(req.params.id);
    res.json(bookings);
  }));

  // Create group booking
  app.post("/api/group-bookings", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertGroupBookingSchema.parse(req.body);
    const booking = await storage.createGroupBooking(validatedData);
    
    await logAudit({
      userId,
      action: 'GROUP_BOOKING_CREATED',
      resourceType: 'group_booking',
      resourceId: booking.id,
      changes: validatedData,
      req,
    });

    res.json(booking);
  }));

  // ===== PHASE 4: ADVANCED MICE FEATURES =====
  
  // Partner Tiers Routes
  app.get("/api/partner-tiers", requireAuth, asyncHandler(async (req, res) => {
    const { providerId, category } = req.query;
    
    if (providerId) {
      const tiers = await storage.getPartnerTiersByProviderId(providerId as string);
      return res.json(tiers);
    }
    
    if (category) {
      const tiers = await storage.getPartnerTiersByCategory(category as string);
      return res.json(tiers);
    }
    
    res.json([]);
  }));

  app.get("/api/partner-tiers/:id", requireAuth, asyncHandler(async (req, res) => {
    const tier = await storage.getPartnerTier(req.params.id);
    if (!tier) {
      return res.status(404).json({ error: "Partner tier not found" });
    }
    res.json(tier);
  }));

  app.post("/api/partner-tiers", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertPartnerTierSchema.parse(req.body);
    const tier = await storage.createPartnerTier(validatedData);
    
    await logAudit({
      userId,
      action: 'PARTNER_TIER_CREATED',
      resourceType: 'partner_tier',
      resourceId: tier.id,
      changes: validatedData,
      req,
    });

    res.json(tier);
  }));

  app.patch("/api/partner-tiers/:id", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const tier = await storage.updatePartnerTier(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'PARTNER_TIER_UPDATED',
      resourceType: 'partner_tier',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(tier);
  }));

  // Corporate Rates Routes
  app.get("/api/corporate-rates", requireAuth, asyncHandler(async (req, res) => {
    const { companyId, providerId } = req.query;
    
    if (companyId && providerId) {
      const rates = await storage.getActiveCorporateRates(companyId as string, providerId as string);
      return res.json(rates);
    }
    
    if (companyId) {
      const rates = await storage.getCorporateRatesByCompanyId(companyId as string);
      return res.json(rates);
    }
    
    if (providerId) {
      const rates = await storage.getCorporateRatesByProviderId(providerId as string);
      return res.json(rates);
    }
    
    res.json([]);
  }));

  app.get("/api/corporate-rates/:id", requireAuth, asyncHandler(async (req, res) => {
    const rate = await storage.getCorporateRate(req.params.id);
    if (!rate) {
      return res.status(404).json({ error: "Corporate rate not found" });
    }
    res.json(rate);
  }));

  app.post("/api/corporate-rates", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertCorporateRateSchema.parse(req.body);
    const rate = await storage.createCorporateRate(validatedData);
    
    await logAudit({
      userId,
      action: 'CORPORATE_RATE_CREATED',
      resourceType: 'corporate_rate',
      resourceId: rate.id,
      changes: validatedData,
      req,
    });

    res.json(rate);
  }));

  app.patch("/api/corporate-rates/:id", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const rate = await storage.updateCorporateRate(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'CORPORATE_RATE_UPDATED',
      resourceType: 'corporate_rate',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(rate);
  }));

  // Milestone Payments Routes
  app.get("/api/milestone-payments", requireAuth, asyncHandler(async (req, res) => {
    const { groupBookingId, payerId } = req.query;
    
    if (groupBookingId) {
      const payments = await storage.getMilestonePaymentsByGroupBookingId(groupBookingId as string);
      return res.json(payments);
    }
    
    if (payerId) {
      const payments = await storage.getMilestonePaymentsByPayerId(payerId as string);
      return res.json(payments);
    }
    
    res.json([]);
  }));

  app.get("/api/milestone-payments/:id", requireAuth, asyncHandler(async (req, res) => {
    const payment = await storage.getMilestonePayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Milestone payment not found" });
    }
    res.json(payment);
  }));

  app.post("/api/milestone-payments", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertMilestonePaymentSchema.parse(req.body);
    const payment = await storage.createMilestonePayment(validatedData);
    
    await logAudit({
      userId,
      action: 'MILESTONE_PAYMENT_CREATED',
      resourceType: 'milestone_payment',
      resourceId: payment.id,
      changes: validatedData,
      req,
    });

    res.json(payment);
  }));

  app.patch("/api/milestone-payments/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const payment = await storage.updateMilestonePayment(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'MILESTONE_PAYMENT_UPDATED',
      resourceType: 'milestone_payment',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(payment);
  }));

  // Event Reports Routes
  app.get("/api/event-reports", requireAuth, asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    
    if (companyId) {
      const reports = await storage.getEventReportsByCompanyId(companyId as string);
      return res.json(reports);
    }
    
    res.json([]);
  }));

  app.get("/api/event-reports/:id", requireAuth, asyncHandler(async (req, res) => {
    const report = await storage.getEventReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Event report not found" });
    }
    res.json(report);
  }));

  app.post("/api/event-reports", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertEventReportSchema.parse(req.body);
    const report = await storage.createEventReport(validatedData);
    
    await logAudit({
      userId,
      action: 'EVENT_REPORT_CREATED',
      resourceType: 'event_report',
      resourceId: report.id,
      changes: validatedData,
      req,
    });

    res.json(report);
  }));

  // Itineraries Routes
  app.get("/api/itineraries", requireAuth, asyncHandler(async (req, res) => {
    const { groupBookingId, travelerProfileId } = req.query;
    
    if (groupBookingId) {
      const itineraries = await storage.getItinerariesByGroupBookingId(groupBookingId as string);
      return res.json(itineraries);
    }
    
    if (travelerProfileId) {
      const itineraries = await storage.getItinerariesByTravelerProfileId(travelerProfileId as string);
      return res.json(itineraries);
    }
    
    res.json([]);
  }));

  app.get("/api/itineraries/:id", requireAuth, asyncHandler(async (req, res) => {
    const itinerary = await storage.getItinerary(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary not found" });
    }
    res.json(itinerary);
  }));

  app.post("/api/itineraries", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertItinerarySchema.parse(req.body);
    const itinerary = await storage.createItinerary(validatedData);
    
    await logAudit({
      userId,
      action: 'ITINERARY_CREATED',
      resourceType: 'itinerary',
      resourceId: itinerary.id,
      changes: validatedData,
      req,
    });

    res.json(itinerary);
  }));

  app.patch("/api/itineraries/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const itinerary = await storage.updateItinerary(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'ITINERARY_UPDATED',
      resourceType: 'itinerary',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(itinerary);
  }));

  // Disruption Alerts Routes
  app.get("/api/disruption-alerts", requireAuth, asyncHandler(async (req, res) => {
    const { itineraryId, activeOnly } = req.query;
    
    if (itineraryId) {
      const alerts = activeOnly === 'true'
        ? await storage.getActiveDisruptionAlerts(itineraryId as string)
        : await storage.getDisruptionAlertsByItineraryId(itineraryId as string);
      return res.json(alerts);
    }
    
    res.json([]);
  }));

  app.get("/api/disruption-alerts/:id", requireAuth, asyncHandler(async (req, res) => {
    const alert = await storage.getDisruptionAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: "Disruption alert not found" });
    }
    res.json(alert);
  }));

  app.post("/api/disruption-alerts", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertDisruptionAlertSchema.parse(req.body);
    const alert = await storage.createDisruptionAlert(validatedData);
    
    await logAudit({
      userId,
      action: 'DISRUPTION_ALERT_CREATED',
      resourceType: 'disruption_alert',
      resourceId: alert.id,
      changes: validatedData,
      req,
    });

    res.json(alert);
  }));

  app.patch("/api/disruption-alerts/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const alert = await storage.updateDisruptionAlert(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'DISRUPTION_ALERT_UPDATED',
      resourceType: 'disruption_alert',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(alert);
  }));

  // DMC Partners Routes
  app.get("/api/dmc-partners", requireAuth, asyncHandler(async (req, res) => {
    const { providerId, destination, verifiedOnly } = req.query;
    
    if (verifiedOnly === 'true') {
      const partners = await storage.getVerifiedDmcPartners();
      return res.json(partners);
    }
    
    if (providerId) {
      const partners = await storage.getDmcPartnersByProviderId(providerId as string);
      return res.json(partners);
    }
    
    if (destination) {
      const partners = await storage.getDmcPartnersByDestination(destination as string);
      return res.json(partners);
    }
    
    res.json([]);
  }));

  app.get("/api/dmc-partners/:id", requireAuth, asyncHandler(async (req, res) => {
    const partner = await storage.getDmcPartner(req.params.id);
    if (!partner) {
      return res.status(404).json({ error: "DMC partner not found" });
    }
    res.json(partner);
  }));

  app.post("/api/dmc-partners", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertDmcPartnerSchema.parse(req.body);
    const partner = await storage.createDmcPartner(validatedData);
    
    await logAudit({
      userId,
      action: 'DMC_PARTNER_CREATED',
      resourceType: 'dmc_partner',
      resourceId: partner.id,
      changes: validatedData,
      req,
    });

    res.json(partner);
  }));

  app.patch("/api/dmc-partners/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const partner = await storage.updateDmcPartner(req.params.id, req.body);
    
    await logAudit({
      userId,
      action: 'DMC_PARTNER_UPDATED',
      resourceType: 'dmc_partner',
      resourceId: req.params.id,
      changes: req.body,
      req,
    });

    res.json(partner);
  }));

  // ===== PHASE 5: SEO, NOTIFICATIONS, EXPENSES, SUSTAINABILITY, QUALITY, SHOWCASES =====
  
  // Notification Preferences Routes
  app.get("/api/notification-preferences", requireAuth, asyncHandler(async (req, res) => {
    const { companyId, userId } = req.query;
    
    if (companyId) {
      const prefs = await storage.getNotificationPreferencesByCompanyId(companyId as string);
      return res.json(prefs);
    }
    
    if (userId) {
      const prefs = await storage.getNotificationPreferencesByUserId(userId as string);
      return res.json(prefs);
    }
    
    res.json([]);
  }));

  app.post("/api/notification-preferences", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertNotificationPreferenceSchema.parse(req.body);
    const pref = await storage.createNotificationPreference(validatedData);
    res.json(pref);
  }));

  app.patch("/api/notification-preferences/:id", requireAuth, asyncHandler(async (req, res) => {
    const pref = await storage.updateNotificationPreference(req.params.id, req.body);
    res.json(pref);
  }));

  // Virtual Cards Routes
  app.get("/api/virtual-cards", requireAuth, asyncHandler(async (req, res) => {
    const { companyId, costCenterId } = req.query;
    
    if (costCenterId) {
      const cards = await storage.getVirtualCardsByCostCenterId(costCenterId as string);
      return res.json(cards);
    }
    
    if (companyId) {
      const cards = await storage.getVirtualCardsByCompanyId(companyId as string);
      return res.json(cards);
    }
    
    res.json([]);
  }));

  app.post("/api/virtual-cards", requireAuth, requireRole('buyer', 'admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertVirtualCardSchema.parse(req.body);
    const card = await storage.createVirtualCard(validatedData);
    res.json(card);
  }));

  // Expense Entries Routes
  app.get("/api/expense-entries", requireAuth, asyncHandler(async (req, res) => {
    const { companyId, groupBookingId } = req.query;
    
    if (groupBookingId) {
      const entries = await storage.getExpenseEntriesByGroupBookingId(groupBookingId as string);
      return res.json(entries);
    }
    
    if (companyId) {
      const entries = await storage.getExpenseEntriesByCompanyId(companyId as string);
      return res.json(entries);
    }
    
    res.json([]);
  }));

  app.post("/api/expense-entries", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertExpenseEntrySchema.parse(req.body);
    const entry = await storage.createExpenseEntry(validatedData);
    res.json(entry);
  }));

  app.patch("/api/expense-entries/:id", requireAuth, asyncHandler(async (req, res) => {
    const entry = await storage.updateExpenseEntry(req.params.id, req.body);
    res.json(entry);
  }));

  // Sustainability Metrics Routes
  app.get("/api/sustainability-metrics", requireAuth, asyncHandler(async (req, res) => {
    const { groupBookingId } = req.query;
    
    if (groupBookingId) {
      const metrics = await storage.getSustainabilityMetricsByGroupBookingId(groupBookingId as string);
      return res.json(metrics);
    }
    
    res.json([]);
  }));

  app.post("/api/sustainability-metrics", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertSustainabilityMetricSchema.parse(req.body);
    const metric = await storage.createSustainabilityMetric(validatedData);
    res.json(metric);
  }));

  // Quality Audits Routes
  app.get("/api/quality-audits", requireAuth, asyncHandler(async (req, res) => {
    const { venueId, providerId } = req.query;
    
    if (venueId) {
      const audits = await storage.getQualityAuditsByVenueId(venueId as string);
      return res.json(audits);
    }
    
    if (providerId) {
      const audits = await storage.getQualityAuditsByProviderId(providerId as string);
      return res.json(audits);
    }
    
    res.json([]);
  }));

  app.post("/api/quality-audits", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertQualityAuditSchema.parse(req.body);
    const audit = await storage.createQualityAudit(validatedData);
    res.json(audit);
  }));

  // Post Event NPS Routes
  app.get("/api/post-event-nps", requireAuth, asyncHandler(async (req, res) => {
    const { groupBookingId } = req.query;
    
    if (groupBookingId) {
      const responses = await storage.getPostEventNpsByGroupBookingId(groupBookingId as string);
      return res.json(responses);
    }
    
    res.json([]);
  }));

  app.post("/api/post-event-nps", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertPostEventNpsSchema.parse(req.body);
    const nps = await storage.createPostEventNps(validatedData);
    res.json(nps);
  }));

  // FAM Trips Routes
  app.get("/api/fam-trips", requireAuth, asyncHandler(async (req, res) => {
    const { city, organizerId, openOnly } = req.query;
    
    if (openOnly === 'true') {
      const trips = await storage.getOpenFamTrips();
      return res.json(trips);
    }
    
    if (city) {
      const trips = await storage.getFamTripsByCity(city as string);
      return res.json(trips);
    }
    
    if (organizerId) {
      const trips = await storage.getFamTripsByOrganizerId(organizerId as string);
      return res.json(trips);
    }
    
    res.json([]);
  }));

  app.get("/api/fam-trips/:id", requireAuth, asyncHandler(async (req, res) => {
    const trip = await storage.getFamTrip(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: "FAM trip not found" });
    }
    res.json(trip);
  }));

  app.post("/api/fam-trips", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertFamTripSchema.parse(req.body);
    const trip = await storage.createFamTrip(validatedData);
    res.json(trip);
  }));

  app.patch("/api/fam-trips/:id", requireAuth, asyncHandler(async (req, res) => {
    const trip = await storage.updateFamTrip(req.params.id, req.body);
    res.json(trip);
  }));

  // FAM Trip Registrations Routes
  app.get("/api/fam-trip-registrations", requireAuth, asyncHandler(async (req, res) => {
    const { famTripId, userId } = req.query;
    
    if (famTripId) {
      const registrations = await storage.getFamTripRegistrationsByFamTripId(famTripId as string);
      return res.json(registrations);
    }
    
    if (userId) {
      const registrations = await storage.getFamTripRegistrationsByUserId(userId as string);
      return res.json(registrations);
    }
    
    res.json([]);
  }));

  app.post("/api/fam-trip-registrations", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertFamTripRegistrationSchema.parse(req.body);
    const registration = await storage.createFamTripRegistration(validatedData);
    res.json(registration);
  }));

  app.patch("/api/fam-trip-registrations/:id", requireAuth, asyncHandler(async (req, res) => {
    const registration = await storage.updateFamTripRegistration(req.params.id, req.body);
    res.json(registration);
  }));

  // Virtual Card Sync & Reconciliation
  app.post("/api/virtual-cards/:id/sync", requireAuth, asyncHandler(async (req, res) => {
    const card = await storage.getVirtualCard(req.params.id);
    if (!card) {
      return res.status(404).json({ error: "Virtual card not found" });
    }
    
    const syncedCount = await syncCardTransactions(card);
    res.json({ syncedCount, message: `Synced ${syncedCount} new transactions` });
  }));

  app.get("/api/expense-entries/reconciliation/:companyId", requireAuth, asyncHandler(async (req, res) => {
    const stats = await reconcileExpenses(req.params.companyId);
    res.json(stats);
  }));

  app.post("/api/expense-entries/:id/auto-reconcile", requireAuth, asyncHandler(async (req, res) => {
    const success = await autoReconcileExpense(req.params.id);
    res.json({ success, message: success ? 'Expense auto-reconciled' : 'Auto-reconciliation failed' });
  }));

  // SEO Landing Pages - Dynamic venue search by city (uses existing venues API with SEO-friendly params)
  app.get("/api/seo/meeting-rooms/:city", asyncHandler(async (req, res) => {
    const { city } = req.params;
    const { capacity, layout } = req.query;
    
    const venues = await storage.getVenues({ city, verified: true });
    
    res.json({
      city,
      totalVenues: venues.length,
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        capacity: v.capacity,
        city: v.city,
        verified: v.verified,
      })),
      seoMeta: {
        title: `Meeting Rooms in ${city} | Trip2work MICE`,
        description: `Find verified meeting rooms and event venues in ${city}. Compare capacities, layouts, and pricing for your next corporate event.`,
      },
    });
  }));

  // Calendar Export (.ics) for bookings
  app.get("/api/group-bookings/:id/calendar", requireAuth, asyncHandler(async (req, res) => {
    const booking = await storage.getGroupBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Trip2work//MICE Platform//EN
BEGIN:VEVENT
UID:${booking.id}@trip2work.ma
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${booking.startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${booking.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${booking.eventName}
DESCRIPTION:Group booking for ${booking.attendeeCount} attendees
STATUS:${booking.status.toUpperCase()}
END:VEVENT
END:VCALENDAR`;
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.id}.ics"`);
    res.send(icsContent);
  }));

  // === PHASE 6: Bleisure, Advanced Analytics, HRIS/SSO ===

  // Bleisure Packages Routes
  app.get("/api/bleisure-packages", asyncHandler(async (req, res) => {
    const { city, providerId, status } = req.query;
    
    if (city) {
      const packages = await storage.getBleisurePackagesByCity(city as string);
      return res.json(packages);
    }
    
    if (providerId) {
      const packages = await storage.getBleisurePackagesByProviderId(providerId as string);
      return res.json(packages);
    }
    
    if (status === 'active' || !status) {
      const packages = await storage.getActiveBleisurePackages();
      return res.json(packages);
    }
    
    res.json([]);
  }));

  app.get("/api/bleisure-packages/:id", asyncHandler(async (req, res) => {
    const pkg = await storage.getBleisurePackage(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: "Bleisure package not found" });
    }
    res.json(pkg);
  }));

  app.post("/api/bleisure-packages", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(403).json({ error: "Provider profile required" });
    }
    
    const validatedData = insertBleisurePackageSchema.parse({ ...req.body, providerId: provider.id });
    const pkg = await storage.createBleisurePackage(validatedData);
    res.json(pkg);
  }));

  app.patch("/api/bleisure-packages/:id", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const pkg = await storage.updateBleisurePackage(req.params.id, req.body);
    res.json(pkg);
  }));

  // Coworking Spaces Routes
  app.get("/api/coworking-spaces", asyncHandler(async (req, res) => {
    const { city, verified } = req.query;
    
    if (city) {
      const spaces = await storage.getCoworkingSpacesByCity(city as string);
      return res.json(spaces);
    }
    
    if (verified === 'true') {
      const spaces = await storage.getVerifiedCoworkingSpaces();
      return res.json(spaces);
    }
    
    res.json([]);
  }));

  app.get("/api/coworking-spaces/:id", asyncHandler(async (req, res) => {
    const space = await storage.getCoworkingSpace(req.params.id);
    if (!space) {
      return res.status(404).json({ error: "Coworking space not found" });
    }
    res.json(space);
  }));

  app.post("/api/coworking-spaces", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(403).json({ error: "Provider profile required" });
    }
    
    const validatedData = insertCoworkingSpaceSchema.parse({ ...req.body, providerId: provider.id });
    const space = await storage.createCoworkingSpace(validatedData);
    res.json(space);
  }));

  app.patch("/api/coworking-spaces/:id", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const space = await storage.updateCoworkingSpace(req.params.id, req.body);
    res.json(space);
  }));

  // Bleisure Bookings Routes
  app.get("/api/bleisure-bookings", requireAuth, asyncHandler(async (req, res) => {
    const { userId, companyId } = req.query;
    
    if (userId) {
      const bookings = await storage.getBleisureBookingsByUserId(userId as string);
      return res.json(bookings);
    }
    
    if (companyId) {
      const bookings = await storage.getBleisureBookingsByCompanyId(companyId as string);
      return res.json(bookings);
    }
    
    const myBookings = await storage.getBleisureBookingsByUserId(req.session.userId!);
    res.json(myBookings);
  }));

  app.get("/api/bleisure-bookings/:id", requireAuth, asyncHandler(async (req, res) => {
    const booking = await storage.getBleisureBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Bleisure booking not found" });
    }
    res.json(booking);
  }));

  app.post("/api/bleisure-bookings", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertBleisureBookingSchema.parse({ ...req.body, userId });
    const booking = await storage.createBleisureBooking(validatedData);
    res.json(booking);
  }));

  app.patch("/api/bleisure-bookings/:id", requireAuth, asyncHandler(async (req, res) => {
    const booking = await storage.updateBleisureBooking(req.params.id, req.body);
    res.json(booking);
  }));

  // Savings Attributions Routes
  app.get("/api/savings-attributions", requireAuth, asyncHandler(async (req, res) => {
    const { companyId, periodStart, periodEnd } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    
    if (periodStart && periodEnd) {
      const savings = await storage.getSavingsAttributionsByPeriod(
        companyId as string,
        new Date(periodStart as string),
        new Date(periodEnd as string)
      );
      return res.json(savings);
    }
    
    const savings = await storage.getSavingsAttributionsByCompanyId(companyId as string);
    res.json(savings);
  }));

  app.get("/api/savings-attributions/:id", requireAuth, asyncHandler(async (req, res) => {
    const saving = await storage.getSavingsAttribution(req.params.id);
    if (!saving) {
      return res.status(404).json({ error: "Savings attribution not found" });
    }
    res.json(saving);
  }));

  app.post("/api/savings-attributions", requireAuth, asyncHandler(async (req, res) => {
    const validatedData = insertSavingsAttributionSchema.parse(req.body);
    const saving = await storage.createSavingsAttribution(validatedData);
    res.json(saving);
  }));

  // Cohort Analyses Routes
  app.get("/api/cohort-analyses", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const { cohortType, cohortMonth } = req.query;
    
    if (cohortType) {
      const cohorts = await storage.getCohortAnalysesByType(cohortType as string);
      return res.json(cohorts);
    }
    
    if (cohortMonth) {
      const cohorts = await storage.getCohortAnalysesByMonth(cohortMonth as string);
      return res.json(cohorts);
    }
    
    res.json([]);
  }));

  app.get("/api/cohort-analyses/:id", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const cohort = await storage.getCohortAnalysis(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: "Cohort analysis not found" });
    }
    res.json(cohort);
  }));

  app.post("/api/cohort-analyses", requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const validatedData = insertCohortAnalysisSchema.parse(req.body);
    const cohort = await storage.createCohortAnalysis(validatedData);
    res.json(cohort);
  }));

  // HRIS Sync Configs Routes
  app.get("/api/hris-sync-configs", requireAuth, asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    
    const config = await storage.getHrisSyncConfigByCompanyId(companyId as string);
    res.json(config || null);
  }));

  app.get("/api/hris-sync-configs/:id", requireAuth, asyncHandler(async (req, res) => {
    const config = await storage.getHrisSyncConfig(req.params.id);
    if (!config) {
      return res.status(404).json({ error: "HRIS sync config not found" });
    }
    res.json(config);
  }));

  app.post("/api/hris-sync-configs", requireAuth, asyncHandler(async (req, res) => {
    const validatedData = insertHrisSyncConfigSchema.parse(req.body);
    const config = await storage.createHrisSyncConfig(validatedData);
    res.json(config);
  }));

  app.patch("/api/hris-sync-configs/:id", requireAuth, asyncHandler(async (req, res) => {
    const config = await storage.updateHrisSyncConfig(req.params.id, req.body);
    res.json(config);
  }));

  // SSO Connections Routes
  app.get("/api/sso-connections", requireAuth, asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    
    const connection = await storage.getSsoConnectionByCompanyId(companyId as string);
    res.json(connection || null);
  }));

  app.get("/api/sso-connections/:id", requireAuth, asyncHandler(async (req, res) => {
    const connection = await storage.getSsoConnection(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: "SSO connection not found" });
    }
    res.json(connection);
  }));

  app.post("/api/sso-connections", requireAuth, asyncHandler(async (req, res) => {
    const validatedData = insertSsoConnectionSchema.parse(req.body);
    const connection = await storage.createSsoConnection(validatedData);
    res.json(connection);
  }));

  app.patch("/api/sso-connections/:id", requireAuth, asyncHandler(async (req, res) => {
    const connection = await storage.updateSsoConnection(req.params.id, req.body);
    res.json(connection);
  }));

  // Employee Sync Logs Routes
  app.get("/api/employee-sync-logs", requireAuth, asyncHandler(async (req, res) => {
    const { syncConfigId } = req.query;
    
    if (!syncConfigId) {
      return res.status(400).json({ error: "syncConfigId is required" });
    }
    
    const logs = await storage.getEmployeeSyncLogsBySyncConfigId(syncConfigId as string);
    res.json(logs);
  }));

  app.get("/api/employee-sync-logs/:id", requireAuth, asyncHandler(async (req, res) => {
    const log = await storage.getEmployeeSyncLog(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Sync log not found" });
    }
    res.json(log);
  }));

  app.post("/api/employee-sync-logs", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const validatedData = insertEmployeeSyncLogSchema.parse({ ...req.body, initiatedBy: userId });
    const log = await storage.createEmployeeSyncLog(validatedData);
    res.json(log);
  }));

  app.patch("/api/employee-sync-logs/:id", requireAuth, asyncHandler(async (req, res) => {
    const log = await storage.updateEmployeeSyncLog(req.params.id, req.body);
    res.json(log);
  }));

  // ===== SERVICE PACKAGES ROUTES (Phase 1 Marketplace) =====
  app.get("/api/service-packages", asyncHandler(async (req, res) => {
    const { category, active, search } = req.query;
    
    const filters: { category?: string; active?: boolean; search?: string } = {};
    
    if (category) {
      filters.category = category as string;
    }
    
    if (active !== undefined) {
      filters.active = active === 'true';
    }
    
    if (search) {
      filters.search = search as string;
    }
    
    const packages = await storage.getServicePackages(filters);
    res.json(packages);
  }));

  app.get("/api/service-packages/:id", asyncHandler(async (req, res) => {
    const pkg = await storage.getServicePackage(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: "Service package not found" });
    }
    res.json(pkg);
  }));

  app.post("/api/service-packages", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Get provider record
    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(403).json({ error: "Provider profile required" });
    }
    
    const validatedData = insertServicePackageSchema.parse({
      ...req.body,
      providerId: provider.id,
    });
    
    const pkg = await storage.createServicePackage(validatedData);
    
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.PACKAGE_CREATE,
      resourceType: 'service_package',
      resourceId: pkg.id,
      changes: { name: pkg.name, category: pkg.category },
      req,
    });
    
    res.json(pkg);
  }));

  app.patch("/api/service-packages/:id", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Get provider record
    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(403).json({ error: "Provider profile required" });
    }
    
    // Check ownership
    const existingPkg = await storage.getServicePackage(req.params.id);
    if (!existingPkg) {
      return res.status(404).json({ error: "Service package not found" });
    }
    
    if (existingPkg.providerId !== provider.id) {
      return res.status(403).json({ error: "Not authorized to update this package" });
    }
    
    const validatedData = insertServicePackageSchema.partial().parse(req.body);
    const pkg = await storage.updateServicePackage(req.params.id, validatedData);
    
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.PACKAGE_UPDATE,
      resourceType: 'service_package',
      resourceId: req.params.id,
      changes: validatedData,
      req,
    });
    
    res.json(pkg);
  }));

  app.delete("/api/service-packages/:id", requireAuth, requireRole('provider'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Get provider record
    const provider = await storage.getProviderByUserId(userId);
    if (!provider) {
      return res.status(403).json({ error: "Provider profile required" });
    }
    
    // Check ownership
    const existingPkg = await storage.getServicePackage(req.params.id);
    if (!existingPkg) {
      return res.status(404).json({ error: "Service package not found" });
    }
    
    if (existingPkg.providerId !== provider.id) {
      return res.status(403).json({ error: "Not authorized to delete this package" });
    }
    
    await storage.deleteServicePackage(req.params.id);
    
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.PACKAGE_DELETE,
      resourceType: 'service_package',
      resourceId: req.params.id,
      req,
    });
    
    res.json({ success: true });
  }));

  app.get("/api/providers/:id/packages", asyncHandler(async (req, res) => {
    const packages = await storage.getServicePackagesByProvider(req.params.id);
    res.json(packages);
  }));

  app.post("/api/service-packages/:id/view", asyncHandler(async (req, res) => {
    await storage.incrementPackageViews(req.params.id);
    res.json({ success: true });
  }));

  // ===== FAVORITES ROUTES (Phase 1 Marketplace) =====
  app.get("/api/favorites", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const { itemType } = req.query;
    
    const favorites = await storage.getFavoritesByUser(userId, itemType as string);
    res.json(favorites);
  }));

  app.post("/api/favorites", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    const validatedData = insertFavoriteSchema.parse({
      ...req.body,
      userId,
    });
    
    // Check if already favorited
    const existing = await storage.checkFavorite(userId, validatedData.itemType, validatedData.itemId);
    if (existing) {
      return res.status(400).json({ error: "Item already favorited" });
    }
    
    const favorite = await storage.createFavorite(validatedData);
    res.json(favorite);
  }));

  app.delete("/api/favorites/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Note: In production, you should verify ownership before deletion
    await storage.deleteFavorite(req.params.id);
    res.json({ success: true });
  }));

  app.get("/api/favorites/check", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const { itemType, itemId } = req.query;
    
    if (!itemType || !itemId) {
      return res.status(400).json({ error: "itemType and itemId are required" });
    }
    
    const favorite = await storage.checkFavorite(userId, itemType as string, itemId as string);
    res.json({ favorited: !!favorite, favorite: favorite || null });
  }));

  // ===== PACKAGE ORDERS ROUTES (Phase 1 Marketplace) =====
  app.get("/api/orders", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const role = req.session.role!;
    
    let orders;
    if (role === 'buyer') {
      orders = await storage.getPackageOrdersByBuyer(userId);
    } else if (role === 'provider') {
      const provider = await storage.getProviderByUserId(userId);
      if (!provider) {
        return res.json([]);
      }
      orders = await storage.getPackageOrdersByProvider(provider.id);
    } else {
      return res.status(403).json({ error: "Invalid role for this operation" });
    }
    
    res.json(orders);
  }));

  app.post("/api/orders", requireAuth, requireRole('buyer'), asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    const { packageId, tier, selectedExtras, requirements } = req.body;
    
    // Get package to calculate price
    const pkg = await storage.getServicePackage(packageId);
    if (!pkg) {
      return res.status(404).json({ error: "Service package not found" });
    }
    
    // Calculate total price based on tier
    let totalPriceMad = 0;
    let deliveryDays = 0;
    
    if (tier === 'basic') {
      totalPriceMad = pkg.basicPriceMad;
      deliveryDays = pkg.basicDeliveryDays;
    } else if (tier === 'standard' && pkg.standardPriceMad) {
      totalPriceMad = pkg.standardPriceMad;
      deliveryDays = pkg.standardDeliveryDays || 0;
    } else if (tier === 'premium' && pkg.premiumPriceMad) {
      totalPriceMad = pkg.premiumPriceMad;
      deliveryDays = pkg.premiumDeliveryDays || 0;
    } else {
      return res.status(400).json({ error: "Invalid tier selected" });
    }
    
    // Add extras pricing if any
    // This is simplified - in production you'd validate extras against pkg.extras
    
    // Create a job first (linking to existing job system)
    const job = await storage.createJob({
      buyerId: userId,
      category: pkg.category as any,
      spec: { packageOrder: true, packageId, tier, requirements },
      budgetHintMad: totalPriceMad,
    });
    
    // Calculate delivery date
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    
    const validatedData = insertPackageOrderSchema.parse({
      jobId: job.id,
      packageId,
      tier,
      selectedExtras: selectedExtras || [],
      totalPriceMad,
      deliveryDate,
      requirements,
      revisions: 0,
      maxRevisions: tier === 'premium' ? 3 : tier === 'standard' ? 2 : 1,
    });
    
    const order = await storage.createPackageOrder(validatedData);
    
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.ORDER_CREATE,
      resourceType: 'package_order',
      resourceId: order.id,
      changes: { packageId, tier, totalPriceMad },
      req,
    });
    
    res.json(order);
  }));

  app.get("/api/orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const order = await storage.getPackageOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  }));

  app.patch("/api/orders/:id", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId!;
    
    // Note: In production, add ownership/role checks
    const validatedData = insertPackageOrderSchema.partial().parse(req.body);
    const order = await storage.updatePackageOrder(req.params.id, validatedData);
    
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.ORDER_UPDATE,
      resourceType: 'package_order',
      resourceId: req.params.id,
      changes: validatedData,
      req,
    });
    
    res.json(order);
  }));

  const httpServer = createServer(app);

  return httpServer;
}
