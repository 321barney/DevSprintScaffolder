import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation, formatCurrency } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Map, Package, Building2, Plane, 
  Search, Calendar, MessageSquare, Star,
  CheckCircle2, Shield, CreditCard, HeadphonesIcon,
  ArrowRight, MapPin, Users, Briefcase,
  TrendingUp, FileText, Wallet, Award
} from 'lucide-react';

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  basicPriceMad: number;
  photoUrls?: string[];
  providerId: string;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  city?: string;
  capacity?: number;
  photoUrls?: string[];
}

interface Provider {
  id: string;
  displayName: string;
  verified: boolean;
}

export default function Home() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();

  // Fetch real data
  const { data: providers = [], isLoading: loadingProviders } = useQuery<Provider[]>({
    queryKey: ['/api/providers'],
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery<ServicePackage[]>({
    queryKey: ['/api/service-packages'],
  });

  const { data: venues = [], isLoading: loadingVenues } = useQuery<Venue[]>({
    queryKey: ['/api/venues'],
  });

  // Calculate stats
  const verifiedProviders = providers.filter(p => p.verified).length;
  const totalPackages = packages.length;
  const totalVenues = venues.length;

  // Featured packages (first 3)
  const featuredPackages = packages.slice(0, 3);
  
  // Featured venues (first 3)
  const featuredVenues = venues.slice(0, 3);

  const features = [
    {
      icon: Map,
      title: t('home.features.marketplace.title'),
      description: t('home.features.marketplace.desc'),
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: Package,
      title: t('home.features.packages.title'),
      description: t('home.features.packages.desc'),
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      icon: Building2,
      title: t('home.features.mice.title'),
      description: t('home.features.mice.desc'),
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: Plane,
      title: t('home.features.bleisure.title'),
      description: t('home.features.bleisure.desc'),
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
  ];

  const travelersSteps = [
    { icon: Search, label: t('home.how.travelers.1') },
    { icon: Calendar, label: t('home.how.travelers.2') },
    { icon: Package, label: t('home.how.travelers.3') },
    { icon: Star, label: t('home.how.travelers.4') },
  ];

  const providersSteps = [
    { icon: Users, label: t('home.how.providers.1') },
    { icon: FileText, label: t('home.how.providers.2') },
    { icon: TrendingUp, label: t('home.how.providers.3') },
    { icon: Wallet, label: t('home.how.providers.4') },
  ];

  const trustFeatures = [
    {
      icon: CheckCircle2,
      title: t('home.trust.verified.title'),
      description: t('home.trust.verified.desc'),
    },
    {
      icon: Shield,
      title: t('home.trust.payments.title'),
      description: t('home.trust.payments.desc'),
    },
    {
      icon: Award,
      title: t('home.trust.insurance.title'),
      description: t('home.trust.insurance.desc'),
    },
    {
      icon: HeadphonesIcon,
      title: t('home.trust.support.title'),
      description: t('home.trust.support.desc'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-24 px-4"
        data-testid="section-hero"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 
              className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              data-testid="text-hero-title"
            >
              {t('home.hero.title')}
            </h1>
            <p 
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto"
              data-testid="text-hero-subtitle"
            >
              {t('home.hero.subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => setLocation('/browse')}
                data-testid="button-explore-map"
              >
                <Map className="w-5 h-5 mr-2" />
                {t('home.cta.explore')}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                onClick={() => setLocation('/service-packages')}
                data-testid="button-browse-experiences"
              >
                {t('home.cta.experiences')}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                onClick={() => setLocation('/mice')}
                data-testid="button-for-business"
              >
                {t('home.cta.business')}
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center" data-testid="stat-providers">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {loadingProviders ? '...' : verifiedProviders || providers.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t('home.stats.providers')}
                </div>
              </div>
              <div className="text-center" data-testid="stat-packages">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {loadingPackages ? '...' : totalPackages}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t('home.stats.packages')}
                </div>
              </div>
              <div className="text-center" data-testid="stat-venues">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {loadingVenues ? '...' : totalVenues}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t('home.stats.venues')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Preview */}
      <section className="py-16 px-4 bg-muted/30" data-testid="section-map-preview">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-map-title">
              {t('home.map.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-map-description">
              {t('home.map.description')}
            </p>
          </div>

          <Card 
            className="relative overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => setLocation('/browse')}
            data-testid="card-map-preview"
          >
            <CardContent className="p-0">
              <div className="relative h-96 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Map className="w-24 h-24 text-primary/40" />
                </div>
                <div className="relative z-10 text-center p-8">
                  <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                  <Button size="lg" data-testid="button-view-full-map">
                    <Map className="w-5 h-5 mr-2" />
                    {t('home.map.view')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4" data-testid="section-features">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-features-title">
            {t('home.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works - Dual Paths */}
      <section className="py-16 px-4 bg-muted/30" data-testid="section-how-it-works">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-how-title">
            {t('home.how.title')}
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Travelers */}
            <div data-testid="card-how-travelers">
              <h3 className="text-xl font-semibold mb-6 text-center">
                {t('home.how.travelers')}
              </h3>
              <div className="space-y-6">
                {travelersSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-start gap-4" data-testid={`step-traveler-${index}`}>
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="font-medium">{step.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* For Providers */}
            <div data-testid="card-how-providers">
              <h3 className="text-xl font-semibold mb-6 text-center">
                {t('home.how.providers')}
              </h3>
              <div className="space-y-6">
                {providersSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-start gap-4" data-testid={`step-provider-${index}`}>
                      <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-5 h-5 text-accent" />
                          <span className="font-medium">{step.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Service Packages */}
      <section className="py-16 px-4" data-testid="section-packages">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" data-testid="text-packages-title">
              {t('home.packages.title')}
            </h2>
            <Button 
              variant="outline"
              onClick={() => setLocation('/service-packages')}
              data-testid="button-view-all-packages"
            >
              {t('home.packages.view')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {loadingPackages ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPackages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden"
                  onClick={() => setLocation(`/packages/${pkg.id}`)}
                  data-testid={`card-package-${pkg.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      {pkg.photoUrls?.[0] ? (
                        <img 
                          src={pkg.photoUrls[0]} 
                          alt={pkg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-16 h-16 text-primary/40" />
                      )}
                      <Badge className="absolute top-2 right-2" data-testid={`badge-category-${pkg.id}`}>
                        {pkg.category}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-1" data-testid={`text-package-name-${pkg.id}`}>
                        {pkg.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t('home.packages.from')}
                        </span>
                        <span className="text-lg font-bold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                          {formatCurrency(pkg.basicPriceMad, locale)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No packages available yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Featured Venues */}
      <section className="py-16 px-4 bg-muted/30" data-testid="section-venues">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" data-testid="text-venues-title">
              {t('home.venues.title')}
            </h2>
            <Button 
              variant="outline"
              onClick={() => setLocation('/mice')}
              data-testid="button-browse-venues"
            >
              {t('home.venues.view')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {loadingVenues ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredVenues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredVenues.map((venue) => (
                <Card 
                  key={venue.id} 
                  className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden"
                  onClick={() => setLocation('/mice')}
                  data-testid={`card-venue-${venue.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      {venue.photoUrls?.[0] ? (
                        <img 
                          src={venue.photoUrls[0]} 
                          alt={venue.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-16 h-16 text-primary/40" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-1" data-testid={`text-venue-name-${venue.id}`}>
                        {venue.name}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{venue.type}</span>
                        {venue.capacity && (
                          <span data-testid={`text-venue-capacity-${venue.id}`}>
                            {venue.capacity} {t('home.venues.capacity')}
                          </span>
                        )}
                      </div>
                      {venue.city && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{venue.city}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No venues available yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 px-4" data-testid="section-trust">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-trust-title">
            {t('home.trust.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center" data-testid={`card-trust-${index}`}>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10" data-testid="section-cta-footer">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <Briefcase className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">{t('home.cta.footer.business')}</h3>
                <Button 
                  className="w-full"
                  onClick={() => setLocation('/mice')}
                  data-testid="button-cta-business"
                >
                  {t('nav.mice')}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <Users className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">{t('home.cta.footer.provider')}</h3>
                <Button 
                  className="w-full"
                  onClick={() => setLocation('/provider/signup')}
                  data-testid="button-cta-provider"
                >
                  {t('home.cta.provider')}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <MapPin className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">{t('home.cta.footer.traveler')}</h3>
                <Button 
                  className="w-full"
                  onClick={() => setLocation('/browse')}
                  data-testid="button-cta-traveler"
                >
                  {t('home.cta.explore')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
