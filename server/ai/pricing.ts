// AI-powered pricing module with Morocco-specific heuristics

interface PriceBandInput {
  city: string;
  category: 'transport' | 'tour' | 'service' | 'financing';
  km?: number;
  pax?: number;
  timeISO: string;
}

interface PriceBand {
  low: number;
  high: number;
  currency: 'MAD';
  factors: {
    base: number;
    surge: number;
    distance?: number;
  };
}

/**
 * Calculate price band for a job based on category, location, and timing
 * Morocco-specific heuristics based on typical market rates
 */
export function calculatePriceBand(input: PriceBandInput): PriceBand {
  // Base rates per category (MAD per km or unit)
  const baseRates = {
    transport: 8, // MAD per km
    tour: 150, // MAD per person per hour
    service: 200, // MAD per hour
    financing: 0, // Broker model, no direct pricing
  };

  const base = baseRates[input.category];

  // Time-based surge pricing
  const date = new Date(input.timeISO);
  const hour = date.getHours();
  const day = date.getDay();

  // Peak hours: 7-9 AM, 5-8 PM, late night (11 PM - 6 AM), Friday/Saturday
  const isPeakHour = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 20) || hour >= 23 || hour < 6;
  const isWeekend = day === 5 || day === 6; // Friday/Saturday in Morocco
  const surge = isPeakHour ? 1.20 : isWeekend ? 1.15 : 1.0;

  // Calculate based on category
  let estimatedCost: number;

  switch (input.category) {
    case 'transport':
      const km = input.km || 20; // Default 20km if not specified
      estimatedCost = base * km;
      break;

    case 'tour':
      const pax = input.pax || 1;
      const defaultHours = 4; // Default 4-hour tour
      estimatedCost = base * pax * defaultHours;
      break;

    case 'service':
      const defaultServiceHours = 3;
      estimatedCost = base * defaultServiceHours;
      break;

    case 'financing':
      // Financing is broker model, return fixed range
      return {
        low: 0,
        high: 0,
        currency: 'MAD',
        factors: { base: 0, surge: 1 },
      };

    default:
      estimatedCost = 500; // Fallback
  }

  // Apply surge and calculate range
  const surgeCost = Math.round(estimatedCost * surge);
  const low = Math.round(surgeCost * 0.80); // 20% below estimate
  const high = Math.round(surgeCost * 1.25); // 25% above estimate

  return {
    low,
    high,
    currency: 'MAD',
    factors: {
      base,
      surge,
      distance: input.km,
    },
  };
}

/**
 * Structure free-text job description into structured spec
 * Simple keyword extraction approach (can be enhanced with LLM later)
 */
export function structureJobDescription(text: string, category: string): Record<string, any> {
  const spec: Record<string, any> = {
    description: text,
  };

  // Extract cities (simple pattern matching for common Moroccan cities)
  const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda'];
  for (const city of cities) {
    if (text.includes(city)) {
      if (!spec.pickup && !spec.dropoff) {
        spec.pickup = city;
      } else if (spec.pickup && !spec.dropoff) {
        spec.dropoff = city;
      }
    }
  }

  // Extract numbers that might be passenger count
  const paxMatch = text.match(/(\d+)\s*(person|passenger|people|pax|passager)/i);
  if (paxMatch) {
    spec.pax = parseInt(paxMatch[1]);
  }

  // Extract time references
  const timeMatch = text.match(/(\d{1,2})[h:](\d{2})/);
  if (timeMatch) {
    spec.preferredTime = `${timeMatch[1]}:${timeMatch[2]}`;
  }

  // Category-specific extraction
  if (category === 'transport') {
    // Look for distance/km
    const kmMatch = text.match(/(\d+)\s*km/i);
    if (kmMatch) {
      spec.km = parseInt(kmMatch[1]);
    }
  }

  return spec;
}
