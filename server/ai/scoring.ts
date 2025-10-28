// Offer scoring algorithm

export interface OfferScoringInput {
  fit: number; // How well the offer matches requirements (0-1)
  eta: number; // Estimated time to delivery (normalized 0-1)
  price: number; // Offered price in MAD
  fair: { low: number; high: number }; // Fair price range
  rating: number; // Provider rating (0-5, normalized to 0-1)
  reliability: number; // Provider reliability score (0-1)
  compliance: number; // KYC/permit compliance (0-1)
  distance: number; // Distance from job location (normalized 0-1)
}

/**
 * Score an offer based on multiple factors
 * Returns a score between 0 and 1
 */
export function scoreOffer(input: OfferScoringInput): number {
  // Normalize price to 0-1 scale
  let priceNorm: number;
  if (input.price < input.fair.low) {
    // Too low might indicate quality issues
    priceNorm = 0.7;
  } else if (input.price > input.fair.high) {
    // Too high
    priceNorm = 0.6;
  } else {
    // Within fair range - score based on how close to low end
    const range = input.fair.high - input.fair.low;
    const position = (input.price - input.fair.low) / range;
    priceNorm = 1.0 - (position * 0.3); // Best score at low end
  }

  // Normalize rating (0-5 → 0-1)
  const ratingNorm = input.rating / 5;

  // Weighted scoring formula
  const score =
    0.25 * input.fit +           // 25% - How well it matches requirements
    0.20 * (1 - input.eta) +     // 20% - Faster is better
    0.20 * priceNorm +           // 20% - Fair pricing
    0.15 * input.reliability +   // 15% - Provider reliability
    0.10 * ratingNorm +          // 10% - Provider rating
    0.07 * input.compliance +    // 7% - Compliance with requirements
    0.03 * (1 - input.distance); // 3% - Proximity

  return Number(score.toFixed(3));
}

/**
 * Calculate compliance score based on provider verification
 */
export function calculateCompliance(permits: Record<string, boolean>, verified: boolean): number {
  if (!verified) return 0;

  const requiredPermits = ['identity', 'permit', 'insurance'];
  const hasPermits = requiredPermits.filter(p => permits[p]).length;

  return hasPermits / requiredPermits.length;
}

/**
 * Calculate fit score based on job requirements and offer details
 */
export function calculateFit(jobSpec: any, offerDetails: any): number {
  let fitScore = 0.5; // Base score

  // Category-specific fit calculations
  if (jobSpec.pax && offerDetails.capacity) {
    if (offerDetails.capacity >= jobSpec.pax) {
      fitScore += 0.3;
    }
  }

  if (jobSpec.km && offerDetails.maxDistance) {
    if (offerDetails.maxDistance >= jobSpec.km) {
      fitScore += 0.2;
    }
  }

  return Math.min(1.0, fitScore);
}
