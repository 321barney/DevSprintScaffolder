import { db } from "../db";
import { 
  platformFees, 
  providerSubscriptions, 
  providerEarnings,
  offers,
  jobs,
  providers,
  COMMISSION_CONFIG,
  SUBSCRIPTION_TIERS,
  type InsertPlatformFee,
  type InsertProviderEarning,
  type InsertProviderSubscription,
  type Job,
} from "../../shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { logAudit } from "../audit";

/**
 * Phase 1 Commission Service
 * Handles subscription tiers, free offer limits, and commission calculations
 */

// Get or create provider subscription (auto-creates on first call)
export async function getOrCreateSubscription(providerId: string) {
  const [existing] = await db
    .select()
    .from(providerSubscriptions)
    .where(eq(providerSubscriptions.providerId, providerId));

  if (existing) {
    return existing;
  }

  // Auto-create free tier subscription for new providers
  const [created] = await db
    .insert(providerSubscriptions)
    .values({
      providerId,
      tier: "free",
      freeOffersRemaining: 4,
      paidOffersSubmitted: 0,
    })
    .returning();

  await logAudit({
    userId: undefined,
    action: "subscription_created",
    resourceType: "provider_subscription",
    resourceId: created.id,
    changes: { tier: "free", providerId },
  });

  return created;
}

// Check if provider can submit an offer
export async function canProviderSubmitOffer(providerId: string) {
  const subscription = await getOrCreateSubscription(providerId);

  const result = {
    allowed: false,
    reason: "",
    subscriptionTier: subscription.tier,
    freeOffersRemaining: subscription.freeOffersRemaining,
  };

  // Free tier: Check remaining offers
  if (subscription.tier === "free") {
    if (subscription.freeOffersRemaining > 0) {
      result.allowed = true;
      result.reason = `Free tier: ${subscription.freeOffersRemaining} offers remaining`;
    } else {
      result.allowed = false;
      result.reason = "Free tier limit reached. Upgrade to Basic or Pro to continue.";
    }
    return result;
  }

  // Basic tier: Check monthly limit (50 offers)
  if (subscription.tier === "basic") {
    const maxOffers = SUBSCRIPTION_TIERS.basic.maxOffers || 50;
    if (subscription.paidOffersSubmitted >= maxOffers) {
      result.allowed = false;
      result.reason = `Basic tier monthly limit reached (${maxOffers} offers). Upgrade to Pro for unlimited.`;
    } else {
      result.allowed = true;
      result.reason = `Basic tier: ${maxOffers - subscription.paidOffersSubmitted} offers remaining this month`;
    }
    return result;
  }

  // Pro tier: Unlimited
  if (subscription.tier === "pro") {
    result.allowed = true;
    result.reason = "Pro tier: Unlimited offers";
    return result;
  }

  return result;
}

// Consume a free offer (decrement counter)
export async function consumeFreeOffer(providerId: string) {
  const subscription = await getOrCreateSubscription(providerId);

  if (subscription.tier !== "free" || subscription.freeOffersRemaining <= 0) {
    return; // Nothing to consume
  }

  await db
    .update(providerSubscriptions)
    .set({ 
      freeOffersRemaining: subscription.freeOffersRemaining - 1,
      updatedAt: new Date(),
    })
    .where(eq(providerSubscriptions.providerId, providerId));

  await logAudit({
    userId: undefined,
    action: "free_offer_consumed",
    resourceType: "provider_subscription",
    resourceId: subscription.id,
    changes: { 
      previousRemaining: subscription.freeOffersRemaining,
      newRemaining: subscription.freeOffersRemaining - 1,
    },
  });
}

// Increment paid offer counter (for Basic/Pro tiers)
export async function incrementPaidOfferCounter(providerId: string) {
  const subscription = await getOrCreateSubscription(providerId);

  if (subscription.tier === "free") {
    return; // Free tier doesn't track paid offers
  }

  await db
    .update(providerSubscriptions)
    .set({ 
      paidOffersSubmitted: subscription.paidOffersSubmitted + 1,
      updatedAt: new Date(),
    })
    .where(eq(providerSubscriptions.providerId, providerId));
}

// Calculate commission for an offer
export function calculateCommission(
  grossAmountMad: number,
  category: Job['category'],
  subscriptionTier: "free" | "basic" | "pro"
): {
  grossAmountMad: number;
  commissionRate: number;
  commissionAmountMad: number;
  providerNetMad: number;
} {
  let commissionRate: number;

  // Pro tier gets fixed 10% rate
  if (subscriptionTier === "pro") {
    commissionRate = SUBSCRIPTION_TIERS.pro.commissionRate!;
  }
  // Basic tier gets fixed 12% rate
  else if (subscriptionTier === "basic") {
    commissionRate = SUBSCRIPTION_TIERS.basic.commissionRate!;
  }
  // Free tier uses category-based rates
  else {
    commissionRate = COMMISSION_CONFIG[category] || COMMISSION_CONFIG.default;
  }

  const commissionAmountMad = Math.round(grossAmountMad * commissionRate);
  const providerNetMad = grossAmountMad - commissionAmountMad;

  return {
    grossAmountMad,
    commissionRate,
    commissionAmountMad,
    providerNetMad,
  };
}

// Process offer acceptance: Record commission and earnings
export async function processOfferAcceptance(offerId: string) {
  // Get offer with job and provider data
  const [offer] = await db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId));

  if (!offer) {
    throw new Error("Offer not found");
  }

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, offer.jobId));

  if (!job) {
    throw new Error("Job not found");
  }

  // Get provider subscription
  const subscription = await getOrCreateSubscription(offer.providerId);

  // Calculate commission
  const commission = calculateCommission(
    offer.priceMad || 0,
    job.category,
    subscription.tier
  );

  // Record platform fee
  const platformFee: InsertPlatformFee = {
    offerId: offer.id,
    jobId: job.id,
    providerId: offer.providerId,
    grossAmountMad: commission.grossAmountMad,
    commissionRate: commission.commissionRate.toString(),
    commissionAmountMad: commission.commissionAmountMad,
    providerNetMad: commission.providerNetMad,
  };

  const [createdFee] = await db
    .insert(platformFees)
    .values(platformFee)
    .returning();

  // Record provider earnings
  const earning: InsertProviderEarning = {
    providerId: offer.providerId,
    offerId: offer.id,
    jobId: job.id,
    grossAmountMad: commission.grossAmountMad,
    commissionAmountMad: commission.commissionAmountMad,
    netAmountMad: commission.providerNetMad,
  };

  const [createdEarning] = await db
    .insert(providerEarnings)
    .values(earning)
    .returning();

  // Audit log
  await logAudit({
    userId: undefined,
    action: "commission_calculated",
    resourceType: "platform_fee",
    resourceId: createdFee.id,
    changes: {
      offerId,
      providerId: offer.providerId,
      gross: commission.grossAmountMad,
      commission: commission.commissionAmountMad,
      net: commission.providerNetMad,
      rate: commission.commissionRate,
      tier: subscription.tier,
    },
  });

  return {
    platformFee: createdFee,
    providerEarning: createdEarning,
    commission,
  };
}

// Upgrade subscription
export async function upgradeSubscription(
  providerId: string,
  newTier: "basic" | "pro",
  transactionId?: string
) {
  const subscription = await getOrCreateSubscription(providerId);

  const tierConfig = SUBSCRIPTION_TIERS[newTier];
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

  await db
    .update(providerSubscriptions)
    .set({
      tier: newTier,
      commissionRate: tierConfig.commissionRate?.toString() || null,
      subscriptionStartedAt: now,
      subscriptionExpiresAt: expiresAt,
      paidOffersSubmitted: 0, // Reset monthly counter
      updatedAt: now,
    })
    .where(eq(providerSubscriptions.providerId, providerId));

  await logAudit({
    userId: undefined,
    action: "subscription_upgraded",
    resourceType: "provider_subscription",
    resourceId: subscription.id,
    changes: {
      previousTier: subscription.tier,
      newTier,
      transactionId,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    tier: newTier,
    expiresAt,
    commissionRate: tierConfig.commissionRate,
  };
}

// Get provider's earnings summary
export async function getProviderEarningsSummary(providerId: string) {
  const earnings = await db
    .select()
    .from(providerEarnings)
    .where(eq(providerEarnings.providerId, providerId));

  const totalGross = earnings.reduce((sum, e) => sum + e.grossAmountMad, 0);
  const totalCommission = earnings.reduce((sum, e) => sum + e.commissionAmountMad, 0);
  const totalNet = earnings.reduce((sum, e) => sum + e.netAmountMad, 0);

  const pending = earnings.filter(e => e.status === "pending");
  const available = earnings.filter(e => e.status === "available");
  const paidOut = earnings.filter(e => e.status === "paid_out");

  return {
    totalEarnings: totalNet,
    totalGross,
    totalCommission,
    totalNet,
    pending: {
      count: pending.length,
      amount: pending.reduce((sum, e) => sum + e.netAmountMad, 0),
    },
    available: {
      count: available.length,
      amount: available.reduce((sum, e) => sum + e.netAmountMad, 0),
    },
    paidOut: {
      count: paidOut.length,
      amount: paidOut.reduce((sum, e) => sum + e.netAmountMad, 0),
    },
  };
}
