import type { Express } from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { calculatePriceBand, structureJobDescription } from "./ai/pricing";
import { scoreOffer, calculateCompliance, calculateFit } from "./ai/scoring";
import { logAudit, AUDIT_ACTIONS } from "./audit";
import { insertUserSchema, insertProviderSchema, insertJobSchema, insertOfferSchema, insertMessageSchema, insertRatingSchema } from "@shared/schema";
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

  app.get("/api/providers/:id", asyncHandler(async (req, res) => {
    const provider = await storage.getProvider(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }
    res.json(provider);
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
    const { description, category, city, budgetHintMad } = req.body;

    // Get buyer ID from authenticated session
    const buyerId = req.session.userId!;

    // AI: Structure the description into spec
    let spec = structureJobDescription(description, category);
    
    // AI: Calculate price band
    const priceBand = calculatePriceBand({
      city: city || 'Casablanca',
      category,
      km: spec.km,
      pax: spec.pax,
      timeISO: new Date().toISOString(),
    });

    // Add price band to spec
    spec.priceBand = priceBand;

    const job = await storage.createJob({
      buyerId,
      category,
      city,
      spec,
      budgetHintMad: budgetHintMad || priceBand.high,
    });

    // Audit log
    await logAudit({
      userId: buyerId,
      action: AUDIT_ACTIONS.JOB_CREATE,
      resourceType: 'job',
      resourceId: job.id,
      changes: { category, city, budgetHintMad: job.budgetHintMad },
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

    // Get job and provider details for scoring
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Calculate AI score
    const jobSpec = job.spec as any;
    const priceBand = jobSpec.priceBand || { low: 0, high: 10000 };
    
    const compliance = calculateCompliance(
      userProvider.permits as Record<string, boolean>,
      userProvider.verified
    );
    
    const fit = calculateFit(jobSpec, { capacity: 4, maxDistance: 500 }); // TODO: Get from provider profile

    const aiScore = scoreOffer({
      fit,
      eta: etaMin / 120, // Normalize to 0-1 (assuming max 120 min)
      price: priceMad,
      fair: priceBand,
      rating: parseFloat(userProvider.rating || '0'),
      reliability: userProvider.verified ? 0.9 : 0.5,
      compliance,
      distance: 0.2, // TODO: Calculate actual distance
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

    // Audit log
    await logAudit({
      userId,
      action: AUDIT_ACTIONS.OFFER_SUBMIT,
      resourceType: 'offer',
      resourceId: offer.id,
      changes: { jobId, providerId, priceMad, aiScore },
      req,
    });

    res.json(offer);
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
      changes: { jobId: offer.jobId, status: 'accepted' },
      req,
    });

    res.json(updatedOffer);
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

  // ===== AI ENDPOINTS (internal/demo) =====
  app.post("/api/ai/structure-job", asyncHandler(async (req, res) => {
    const { text, category } = req.body;
    const spec = structureJobDescription(text, category);
    res.json(spec);
  }));

  app.post("/api/ai/price-band", asyncHandler(async (req, res) => {
    const priceBand = calculatePriceBand(req.body);
    res.json(priceBand);
  }));

  const httpServer = createServer(app);

  return httpServer;
}
