import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { calculatePriceBand, structureJobDescription } from "./ai/pricing";
import { scoreOffer, calculateCompliance, calculateFit } from "./ai/scoring";
import { insertUserSchema, insertProviderSchema, insertJobSchema, insertOfferSchema, insertMessageSchema, insertRatingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function for error handling
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

  // ===== AUTH ROUTES =====
  // ⚠️ SECURITY WARNING: These auth endpoints use plaintext passwords for MVP demo purposes.
  // ⚠️ PRODUCTION REQUIREMENTS:
  // 1. Install bcrypt: npm install bcrypt @types/bcrypt
  // 2. Hash passwords on signup: const hashedPassword = await bcrypt.hash(password, 10);
  // 3. Verify on login: await bcrypt.compare(password, user.password)
  // 4. Implement JWT or session-based authentication
  // 5. Add HTTPS enforcement and rate limiting
  
  app.post("/api/auth/signup", asyncHandler(async (req, res) => {
    const { email, password, role, locale } = req.body;
    
    // Check if user exists
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // ⚠️ TODO: Hash password with bcrypt before storing
    const user = await storage.createUser({
      email,
      password, // UNSAFE: Storing plaintext for demo only
      role: role || 'buyer',
      locale: locale || 'fr-MA',
    });

    res.json({ user: { ...user, password: undefined } });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const user = await storage.getUserByEmail(email);
    // ⚠️ TODO: Use bcrypt.compare() for password verification
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ user: { ...user, password: undefined } });
  }));

  // ===== PROVIDER ROUTES =====
  app.post("/api/providers", asyncHandler(async (req, res) => {
    const data = insertProviderSchema.parse(req.body);
    const provider = await storage.createProvider(data);
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

  app.post("/api/jobs", asyncHandler(async (req, res) => {
    const { description, category, city, budgetHintMad, buyerId } = req.body;

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
      buyerId: buyerId || 'demo-buyer', // TODO: Get from session
      category,
      city,
      spec,
      budgetHintMad: budgetHintMad || priceBand.high,
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

  app.post("/api/jobs/:id/cancel", asyncHandler(async (req, res) => {
    const job = await storage.updateJob(req.params.id, { status: 'cancelled' });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
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

  app.post("/api/jobs/:id/offers", asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const { providerId, priceMad, etaMin, notes } = req.body;

    // Get job and provider for scoring
    const job = await storage.getJob(jobId);
    const provider = await storage.getProvider(providerId);

    if (!job || !provider) {
      return res.status(404).json({ error: "Job or provider not found" });
    }

    // Calculate AI score
    const jobSpec = job.spec as any;
    const priceBand = jobSpec.priceBand || { low: 0, high: 10000 };
    
    const compliance = calculateCompliance(
      provider.permits as Record<string, boolean>,
      provider.verified
    );
    
    const fit = calculateFit(jobSpec, { capacity: 4, maxDistance: 500 }); // TODO: Get from provider profile

    const aiScore = scoreOffer({
      fit,
      eta: etaMin / 120, // Normalize to 0-1 (assuming max 120 min)
      price: priceMad,
      fair: priceBand,
      rating: parseFloat(provider.rating || '0'),
      reliability: provider.verified ? 0.9 : 0.5,
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

    res.json(offer);
  }));

  app.post("/api/offers/:id/accept", asyncHandler(async (req, res) => {
    const offerId = req.params.id;
    
    // Update offer status
    const offer = await storage.updateOffer(offerId, { status: 'accepted' });
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Update job status
    await storage.updateJob(offer.jobId, { status: 'accepted' });

    // Decline other offers for this job
    const allOffers = await storage.getOffersByJobId(offer.jobId);
    await Promise.all(
      allOffers
        .filter(o => o.id !== offerId && o.status === 'pending')
        .map(o => storage.updateOffer(o.id, { status: 'declined' }))
    );

    res.json(offer);
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

  app.get("/api/messages/conversations", asyncHandler(async (req, res) => {
    const userId = req.query.userId as string || 'demo-buyer';
    
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
