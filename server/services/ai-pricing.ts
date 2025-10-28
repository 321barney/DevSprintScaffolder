import Anthropic from "@anthropic-ai/sdk";
import type { Job } from "../../shared/schema";

/**
 * Phase 1 AI Pricing Service
 * Uses Anthropic Claude for dynamic price bands and offer scoring
 * Falls back to heuristics if AI is unavailable or disabled
 */

const ENABLE_AI = process.env.ENABLE_AI_PRICING !== "false"; // Default to enabled
const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Fallback heuristic pricing (Morocco-specific)
function getFallbackPriceBand(params: {
  category: Job['category'];
  city: string;
  description: string;
  distanceKm?: number;
  pax?: number;
  timeISO?: string;
}): { minMAD: number; maxMAD: number; recommendedMAD: number } {
  const { category, city, distanceKm = 10, pax = 2 } = params;

  // Base rates by category (in MAD)
  const baseRates: Record<Job['category'], { min: number; max: number }> = {
    transport: { min: 50, max: 500 },
    tour: { min: 300, max: 2000 },
    service: { min: 100, max: 1500 },
    financing: { min: 0, max: 0 }, // Financing is APR-based, not price-based
  };

  // City multipliers (Casablanca is baseline 1.0)
  const cityMultipliers: Record<string, number> = {
    casablanca: 1.0,
    rabat: 0.95,
    marrakech: 1.1,
    tangier: 0.9,
    fes: 0.85,
    agadir: 1.05,
  };

  const cityKey = city.toLowerCase();
  const cityMultiplier = cityMultipliers[cityKey] || 1.0;

  const baseMin = baseRates[category].min;
  const baseMax = baseRates[category].max;

  // Transport: Add distance-based pricing
  if (category === "transport") {
    const perKmRate = 8; // 8 MAD per km
    const distanceCost = distanceKm * perKmRate;
    const minMAD = Math.round((baseMin + distanceCost * 0.7) * cityMultiplier);
    const maxMAD = Math.round((baseMin + distanceCost * 1.3) * cityMultiplier);
    const recommendedMAD = Math.round((baseMin + distanceCost) * cityMultiplier);
    
    return { minMAD, maxMAD, recommendedMAD };
  }

  // Tour: Factor in passenger count
  if (category === "tour") {
    const perPaxRate = 150; // 150 MAD per person base
    const totalCost = perPaxRate * pax;
    const minMAD = Math.round(totalCost * 0.8 * cityMultiplier);
    const maxMAD = Math.round(totalCost * 1.5 * cityMultiplier);
    const recommendedMAD = Math.round(totalCost * cityMultiplier);
    
    return { minMAD, maxMAD, recommendedMAD };
  }

  // Service: Use base rates with city adjustment
  const minMAD = Math.round(baseMin * cityMultiplier);
  const maxMAD = Math.round(baseMax * cityMultiplier);
  const recommendedMAD = Math.round((baseMin + baseMax) / 2 * cityMultiplier);

  return { minMAD, maxMAD, recommendedMAD };
}

// Generate dynamic price band using AI
export async function generateDynamicPriceBand(params: {
  category: Job['category'];
  city: string;
  description: string;
  distanceKm?: number;
  pax?: number;
  timeISO?: string;
}): Promise<{
  minMAD: number;
  maxMAD: number;
  recommendedMAD: number;
  aiGenerated: boolean;
  reasoning?: string;
}> {
  // Use fallback if AI disabled or no API key
  if (!ENABLE_AI || !anthropic) {
    const fallback = getFallbackPriceBand(params);
    return { ...fallback, aiGenerated: false };
  }

  try {
    const { category, city, description, distanceKm, pax, timeISO } = params;

    const prompt = `You are a Morocco marketplace pricing expert. Analyze this service request and provide a fair price range in Moroccan Dirhams (MAD).

**Request Details:**
- Category: ${category}
- City: ${city}
- Description: ${description}
${distanceKm ? `- Distance: ${distanceKm} km` : ''}
${pax ? `- Passengers: ${pax}` : ''}
${timeISO ? `- Time: ${timeISO}` : ''}

**Context:**
- Morocco's economy uses MAD (Dirham) currency
- Casablanca is the economic center (higher prices)
- Tourism cities like Marrakech command premium rates
- Transport: typically 6-10 MAD/km + base fee
- Tours: typically 100-300 MAD per person depending on length
- Services: typically 50-500 MAD per hour depending on skill

**Task:**
Provide a realistic price range for this service in Morocco. Consider:
1. Local market rates
2. City cost of living
3. Service complexity
4. Current demand patterns

**Response Format (JSON only):**
{
  "minMAD": <number>,
  "maxMAD": <number>,
  "recommendedMAD": <number>,
  "reasoning": "<brief explanation>"
}`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for consistent pricing
      messages: [{
        role: "user",
        content: prompt,
      }],
    });

    // Extract JSON from Claude's response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      minMAD: Math.round(parsed.minMAD),
      maxMAD: Math.round(parsed.maxMAD),
      recommendedMAD: Math.round(parsed.recommendedMAD),
      aiGenerated: true,
      reasoning: parsed.reasoning,
    };

  } catch (error) {
    console.error("AI pricing failed, using fallback:", error);
    const fallback = getFallbackPriceBand(params);
    return { ...fallback, aiGenerated: false };
  }
}

// Score an offer using AI
export async function scoreOfferWithAI(params: {
  offer: {
    priceMad: number;
    etaMin: number;
    notes?: string;
  };
  job: {
    category: Job['category'];
    city: string;
    description: string;
    budgetHintMad?: number;
  };
  provider: {
    rating: string; // decimal stored as string
    verified: boolean;
  };
  priceBand: {
    minMAD: number;
    maxMAD: number;
    recommendedMAD: number;
  };
}): Promise<{
  score: number; // 0.0 to 1.0
  aiGenerated: boolean;
  reasoning?: string;
}> {
  // Use heuristic fallback if AI disabled
  if (!ENABLE_AI || !anthropic) {
    return scoreOfferHeuristic(params);
  }

  try {
    const { offer, job, provider, priceBand } = params;

    const prompt = `You are an expert at scoring service provider offers in Morocco's marketplace.

**Job Request:**
- Category: ${job.category}
- City: ${job.city}
- Description: ${job.description}
- Budget Hint: ${job.budgetHintMad || 'Not specified'} MAD
- Fair Price Range: ${priceBand.minMAD}-${priceBand.maxMAD} MAD

**Provider Offer:**
- Price: ${offer.priceMad} MAD
- ETA: ${offer.etaMin} minutes
- Notes: ${offer.notes || 'None'}

**Provider Profile:**
- Rating: ${provider.rating}/5.0 stars
- Verified: ${provider.verified ? 'Yes' : 'No'}

**Scoring Criteria:**
1. **Price Fairness (40%)**: Is price within reasonable range?
2. **Provider Quality (30%)**: Rating and verification status
3. **Response Time (20%)**: ETA competitiveness
4. **Value Proposition (10%)**: Notes and overall fit

**Task:**
Score this offer from 0.0 (terrible) to 1.0 (excellent). Consider:
- Overpriced offers (>maxMAD) should score lower
- Underpriced offers (<minMAD) might indicate quality concerns
- Verified providers with high ratings should score higher
- Fast ETA is valued but shouldn't dominate the score

**Response Format (JSON only):**
{
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<brief explanation>"
}`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      temperature: 0.2,
      messages: [{
        role: "user",
        content: prompt,
      }],
    });

    // Extract JSON from response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Clamp score to [0, 1]
    const score = Math.max(0, Math.min(1, parsed.score));

    return {
      score,
      aiGenerated: true,
      reasoning: parsed.reasoning,
    };

  } catch (error) {
    console.error("AI offer scoring failed, using fallback:", error);
    return scoreOfferHeuristic(params);
  }
}

// Heuristic offer scoring (fallback)
function scoreOfferHeuristic(params: {
  offer: {
    priceMad: number;
    etaMin: number;
  };
  provider: {
    rating: string;
    verified: boolean;
  };
  priceBand: {
    minMAD: number;
    maxMAD: number;
    recommendedMAD: number;
  };
}): { score: number; aiGenerated: boolean } {
  const { offer, provider, priceBand } = params;

  let score = 0;

  // Price fairness (40 points)
  const priceScore = (() => {
    if (offer.priceMad < priceBand.minMAD) {
      // Too cheap - suspicious
      return 0.2;
    } else if (offer.priceMad > priceBand.maxMAD) {
      // Too expensive
      const overprice = (offer.priceMad - priceBand.maxMAD) / priceBand.maxMAD;
      return Math.max(0, 0.4 - overprice * 0.5);
    } else {
      // Within range - score based on proximity to recommended
      const diff = Math.abs(offer.priceMad - priceBand.recommendedMAD);
      const range = priceBand.maxMAD - priceBand.minMAD;
      const proximity = 1 - (diff / range);
      return 0.4 * proximity;
    }
  })();
  score += priceScore;

  // Provider quality (30 points)
  const providerScore = (() => {
    const rating = parseFloat(provider.rating) || 0;
    const ratingScore = (rating / 5.0) * 0.25; // 25 points for rating
    const verifiedBonus = provider.verified ? 0.05 : 0; // 5 points for verified
    return ratingScore + verifiedBonus;
  })();
  score += providerScore;

  // ETA competitiveness (20 points)
  const etaScore = (() => {
    // Assume 60 min is baseline, faster is better
    if (offer.etaMin <= 15) return 0.20;
    if (offer.etaMin <= 30) return 0.15;
    if (offer.etaMin <= 60) return 0.10;
    return 0.05;
  })();
  score += etaScore;

  // Value proposition bonus (10 points)
  // Just award baseline for now
  score += 0.05;

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score));

  return { score, aiGenerated: false };
}

// Export scoring function for offer creation
export async function scoreOffer(params: {
  offer: {
    priceMad: number;
    etaMin: number;
    notes?: string;
  };
  job: {
    category: Job['category'];
    city: string;
    description: string;
    budgetHintMad?: number;
  };
  provider: {
    rating: string;
    verified: boolean;
  };
  priceBand: {
    minMAD: number;
    maxMAD: number;
    recommendedMAD: number;
  };
}): Promise<number> {
  const result = await scoreOfferWithAI(params);
  return result.score;
}
