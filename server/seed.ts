// Seed data for SoukMatch marketplace
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
      verified: true,
    });

    await storage.updateProvider(provider1.id, { rating: '4.8' });

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
      verified: true,
    });

    await storage.updateProvider(provider2.id, { rating: '4.9' });

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
      verified: false,
    });

    await storage.updateProvider(provider3.id, { rating: '4.5' });

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
    await storage.createOffer({
      jobId: job1.id,
      providerId: provider1.id,
      priceMad: 1800,
      etaMin: 45,
      notes: 'Véhicule climatisé, chauffeur expérimenté, départ flexible',
      aiScore: '0.892',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await storage.createOffer({
      jobId: job1.id,
      providerId: provider2.id,
      priceMad: 2100,
      etaMin: 60,
      notes: 'Transport premium avec guide touristique inclus',
      aiScore: '0.845',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await storage.createOffer({
      jobId: job1.id,
      providerId: provider3.id,
      priceMad: 1650,
      etaMin: 90,
      notes: 'Prix compétitif, disponible demain',
      aiScore: '0.756',
      compliance: { permit: false, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create offers for job2
    await storage.createOffer({
      jobId: job2.id,
      providerId: provider2.id,
      priceMad: 400,
      etaMin: 180,
      notes: 'Visite de 3h avec guide certifié, entrées incluses',
      aiScore: '0.921',
      compliance: { permit: true, insurance: true },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

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

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${3} buyers and providers`);
    console.log(`Created ${3} jobs with ${4} offers`);
    console.log(`Created ${2} sample messages`);
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
