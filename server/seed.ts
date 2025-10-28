// Seed data for Trip to Work platform
import bcrypt from 'bcrypt';
import { storage } from './storage';

export async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Hash password for all seed users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create buyers
    const buyer1 = await storage.createUser({
      email: 'ahmed@example.ma',
      password: hashedPassword,
      role: 'buyer',
      locale: 'fr-MA',
    });

    const buyer2 = await storage.createUser({
      email: 'fatima@example.ma',
      password: hashedPassword,
      role: 'buyer',
      locale: 'ar-MA',
    });

    // Create providers
    const provider1User = await storage.createUser({
      email: 'transport@casablanca.ma',
      password: hashedPassword,
      role: 'provider',
      locale: 'fr-MA',
    });

    const provider1 = await storage.createProvider({
      userId: provider1User.id,
      displayName: 'Transport Express Casablanca',
      city: 'Casablanca',
      permits: { identity: true, permit: true, insurance: true },
    });

    await storage.updateProvider(provider1.id, { rating: '4.8', verified: true });

    const provider2User = await storage.createUser({
      email: 'tours@marrakech.ma',
      password: hashedPassword,
      role: 'provider',
      locale: 'fr-MA',
    });

    const provider2 = await storage.createProvider({
      userId: provider2User.id,
      displayName: 'Atlas Mountains Tours',
      city: 'Marrakech',
      permits: { identity: true, permit: true, insurance: true },
    });

    await storage.updateProvider(provider2.id, { rating: '4.9', verified: true });

    const provider3User = await storage.createUser({
      email: 'service@rabat.ma',
      password: hashedPassword,
      role: 'provider',
      locale: 'ar-MA',
    });

    const provider3 = await storage.createProvider({
      userId: provider3User.id,
      displayName: 'Services Pro Rabat',
      city: 'Rabat',
      permits: { identity: true, permit: false, insurance: true },
    });

    await storage.updateProvider(provider3.id, { rating: '4.5', verified: false });

    // Create sample jobs
    const job1 = await storage.createJob({
      buyerId: buyer1.id,
      category: 'transport',
      city: 'Casablanca',
      spec: {
        description: 'Transport de Casablanca à Marrakech pour 4 personnes',
        pickup: 'Casablanca',
        dropoff: 'Marrakech',
        pax: 4,
        km: 240,
        priceBand: { low: 1600, high: 2400, currency: 'MAD' },
      },
      budgetHintMad: 2000,
    });

    const job2 = await storage.createJob({
      buyerId: buyer1.id,
      category: 'tour',
      city: 'Marrakech',
      spec: {
        description: 'Visite guidée de la médina de Marrakech',
        pax: 2,
        priceBand: { low: 300, high: 600, currency: 'MAD' },
      },
      budgetHintMad: 450,
    });

    const job3 = await storage.createJob({
      buyerId: buyer2.id,
      category: 'service',
      city: 'Rabat',
      spec: {
        description: 'Installation de climatisation',
        priceBand: { low: 600, high: 900, currency: 'MAD' },
      },
      budgetHintMad: 750,
    });

    // Create offers for job1
    const offer1 = await storage.createOffer({
      jobId: job1.id,
      providerId: provider1.id,
      priceMad: 1800,
      etaMin: 45,
      notes: 'Véhicule climatisé, chauffeur expérimenté, départ flexible',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await storage.updateOffer(offer1.id, { aiScore: '0.892' });

    const offer2 = await storage.createOffer({
      jobId: job1.id,
      providerId: provider2.id,
      priceMad: 2100,
      etaMin: 60,
      notes: 'Transport premium avec guide touristique inclus',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await storage.updateOffer(offer2.id, { aiScore: '0.845' });

    const offer3 = await storage.createOffer({
      jobId: job1.id,
      providerId: provider3.id,
      priceMad: 1650,
      etaMin: 90,
      notes: 'Prix compétitif, disponible demain',
      compliance: { permit: false, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await storage.updateOffer(offer3.id, { aiScore: '0.756' });

    // Create offers for job2
    const offer4 = await storage.createOffer({
      jobId: job2.id,
      providerId: provider2.id,
      priceMad: 400,
      etaMin: 180,
      notes: 'Visite de 3h avec guide certifié, entrées incluses',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await storage.updateOffer(offer4.id, { aiScore: '0.921' });

    // Create sample messages
    await storage.createMessage({
      jobId: job1.id,
      senderId: buyer1.id,
      body: 'Bonjour, est-ce que vous pouvez faire le transport demain matin à 8h?',
    });

    await storage.createMessage({
      jobId: job1.id,
      senderId: provider1User.id,
      body: 'Bonjour! Oui, absolument. Je confirme la disponibilité pour 8h. Rendez-vous devant votre adresse?',
    });

    // ===== PHASE 1: SUBSCRIPTION & COMMISSION SEED DATA =====
    
    // Create provider subscriptions (different tiers for testing)
    const subscription1 = await storage.createProviderSubscription({
      providerId: provider1.id,
      tier: 'pro',
      subscriptionStartedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const subscription2 = await storage.createProviderSubscription({
      providerId: provider2.id,
      tier: 'basic',
      subscriptionStartedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paidOffersSubmitted: 12, // Already submitted 12 offers this month
    });

    const subscription3 = await storage.createProviderSubscription({
      providerId: provider3.id,
      tier: 'free',
      subscriptionStartedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Free tier never expires
      freeOffersRemaining: 2, // Used 2 out of 4 free offers
    });

    // Create sample transaction for subscription2 purchase
    const transaction1 = await storage.createTransaction({
      providerId: provider2.id,
      type: 'subscription_payment',
      amountMad: 299,
      pspTransactionId: 'CMI_TEST_' + Date.now(),
      metadata: {
        subscriptionId: subscription2.id, // Store in metadata since not in insert schema
        tier: 'basic',
        billingCycle: 'monthly',
        paymentMethod: 'CMI',
      },
    });
    await storage.updateTransaction(transaction1.id, { status: 'completed' });

    // Simulate an accepted offer with commission
    // Create a fourth job that will be "accepted"
    const job4 = await storage.createJob({
      buyerId: buyer2.id,
      category: 'transport',
      city: 'Tangier',
      spec: {
        description: 'Airport transfer from Tangier to Tetouan',
        pickup: 'Tangier Airport',
        dropoff: 'Tetouan',
        pax: 2,
        km: 65,
        priceBand: { minMAD: 400, maxMAD: 700, recommendedMAD: 550 },
      },
      budgetHintMad: 550,
    });
    await storage.updateJob(job4.id, { status: 'accepted' });

    const acceptedOffer = await storage.createOffer({
      jobId: job4.id,
      providerId: provider1.id,
      priceMad: 500,
      etaMin: 40,
      notes: 'Professional airport transfer service',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await storage.updateOffer(acceptedOffer.id, { status: 'accepted', aiScore: '0.910' });

    // Create commission records for the accepted offer
    // Transport category = 12% commission (provider1 is on Pro tier = 10%)
    const grossAmount = 500;
    const commissionRate = 0.10; // Pro tier gets 10% commission
    const platformFee = grossAmount * commissionRate; // 50 MAD
    const providerNet = grossAmount - platformFee; // 450 MAD

    const platformFeeRecord = await storage.createPlatformFee({
      offerId: acceptedOffer.id,
      providerId: provider1.id,
      jobId: job4.id,
      grossAmountMad: grossAmount,
      commissionAmountMad: platformFee,
      providerNetMad: providerNet,
      commissionRate: commissionRate.toString(),
    });

    const providerEarning = await storage.createProviderEarning({
      providerId: provider1.id,
      offerId: acceptedOffer.id,
      jobId: job4.id,
      grossAmountMad: grossAmount,
      commissionAmountMad: platformFee,
      netAmountMad: providerNet,
    });
    // Note: status defaults to 'pending' in the schema

    // Create payout transaction (simulated - would normally be processed by payment provider)
    const transaction2 = await storage.createTransaction({
      providerId: provider1.id,
      type: 'earning_payout',
      amountMad: providerNet,
      metadata: {
        earningId: providerEarning.id, // Store in metadata since not in insert schema
        jobId: job4.id,
        offerId: acceptedOffer.id,
        grossAmount: grossAmount,
        platformFee: platformFee,
      },
    });
    await storage.updateTransaction(transaction2.id, { status: 'pending' });

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${3} buyers and providers`);
    console.log(`Created ${4} jobs with ${5} offers`);
    console.log(`Created ${2} sample messages`);
    console.log(`Created ${3} provider subscriptions (Pro, Basic, Free)`);
    console.log(`Created ${2} transactions (subscription payment, pending payout)`);
    console.log(`Created ${1} platform fee record with ${1} provider earning`);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
seedDatabase()
  .then(() => {
    console.log('Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
