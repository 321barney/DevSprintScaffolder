import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { Truck, MapPin, Briefcase, CreditCard, CheckCircle2, Shield, Star } from 'lucide-react';

const categories = [
  { id: 'transport', icon: Truck },
  { id: 'tour', icon: MapPin },
  { id: 'service', icon: Briefcase },
  { id: 'financing', icon: CreditCard },
];

const features = [
  { icon: CheckCircle2, titleKey: 'feature.verified.title' as const, descKey: 'feature.verified.desc' as const },
  { icon: Shield, titleKey: 'feature.secure.title' as const, descKey: 'feature.secure.desc' as const },
  { icon: Star, titleKey: 'feature.quality.title' as const, descKey: 'feature.quality.desc' as const },
];

export default function Home() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('home.hero.title')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => setLocation('/post-job')}
              data-testid="button-post-job"
            >
              {t('home.cta.post')}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => setLocation('/provider/signup')}
              data-testid="button-become-provider"
            >
              {t('home.cta.provider')}
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('category.transport')} & {t('offer.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                onClick={() => setLocation(`/post-job?category=${category.id}`)}
                data-testid={`card-category-${category.id}`}
              >
                <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                  <CategoryIcon category={category.id} size="lg" />
                  <h3 className="font-semibold text-lg text-center">
                    {t(`category.${category.id}` as any)}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-lg">Publiez votre besoin</h3>
                <p className="text-muted-foreground">
                  Décrivez votre projet en quelques mots. Notre IA structure automatiquement votre demande.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-lg">Recevez des offres</h3>
                <p className="text-muted-foreground">
                  Les prestataires vérifiés soumettent leurs offres compétitives avec des scores IA.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-lg">Acceptez & réalisez</h3>
                <p className="text-muted-foreground">
                  Choisissez la meilleure offre, échangez avec le prestataire et finalisez le projet.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.titleKey} className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Prestataires vérifiés</h3>
                  <p className="text-sm text-muted-foreground">
                    KYC complet et permis validés pour votre sécurité
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
