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
import { 
  insertUserSchema, insertProviderSchema, insertJobSchema, insertOfferSchema, 
  insertMessageSchema, insertRatingSchema, insertVenueSchema, insertVenueRoomSchema,
  insertRfpSchema, insertQuoteSchema, insertCompanySchema, insertCostCenterSchema,
  insertTravelerProfileSchema, insertGroupBookingSchema, insertApprovalSchema 
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

  const httpServer = createServer(app);

  return httpServer;
}
