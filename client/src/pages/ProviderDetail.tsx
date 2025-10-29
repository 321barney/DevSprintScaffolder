import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { MapPin, Star, Shield, Globe, ArrowLeft, Package, Calendar, ChevronRight } from "lucide-react";
import type { ServicePackage } from "@shared/schema";

interface Provider {
  id: string;
  displayName: string;
  city?: string;
  rating: string;
  verified: boolean;
  profile?: {
    brandName?: string;
    bio?: string;
    profilePhotoUrl?: string;
    heroImageUrl?: string;
    portfolioPhotos?: string[];
    latitude?: string;
    longitude?: string;
    serviceAreaRadius?: number;
    website?: string;
    socialMedia?: any;
  };
}

export default function ProviderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { locale } = useApp();
  const { t } = useTranslation(locale);

  const { data: provider, isLoading } = useQuery<Provider>({
    queryKey: [`/api/providers/${id}`],
  });

  const { data: packages, isLoading: isLoadingPackages } = useQuery<ServicePackage[]>({
    queryKey: [`/api/providers/${id}/packages`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-lg text-muted-foreground">{t('provider.not.found')}</p>
            <Button
              className="mt-4"
              onClick={() => window.history.back()}
              data-testid="button-back-browse"
            >
              {t('provider.back.browse')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandName = provider.profile?.brandName || provider.displayName;
  const bio = provider.profile?.bio || t('provider.no.bio');

  const getStartingPrice = (pkg: ServicePackage) => {
    return Math.min(
      pkg.basicPriceMad,
      pkg.standardPriceMad || Infinity,
      pkg.premiumPriceMad || Infinity
    );
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-provider-detail">
      {/* Hero Section */}
      {provider.profile?.heroImageUrl && (
        <div
          className="h-48 md:h-64 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${provider.profile.heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('provider.back')}
        </Button>

        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={provider.profile?.profilePhotoUrl} />
                <AvatarFallback className="text-2xl">
                  {brandName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2">{brandName}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{provider.rating}</span>
                  </div>
                  {provider.verified && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      {t('provider.verified')}
                    </Badge>
                  )}
                  {provider.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{provider.city}</span>
                    </div>
                  )}
                </div>
                {provider.profile?.website && (
                  <a
                    href={provider.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {provider.profile.website}
                  </a>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{bio}</p>
          </CardContent>
        </Card>

        {/* Service Packages */}
        {isLoadingPackages ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          </div>
        ) : packages && packages.length > 0 ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="text-packages-title">
              <Package className="w-6 h-6" />
              Service Packages
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const startingPrice = getStartingPrice(pkg);
                const mainImage = pkg.photoUrls?.[0];
                
                return (
                  <Card 
                    key={pkg.id} 
                    className="overflow-hidden hover-elevate cursor-pointer group"
                    onClick={() => setLocation(`/packages/${pkg.id}`)}
                    data-testid={`card-package-${pkg.id}`}
                  >
                    {/* Package Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                      {mainImage ? (
                        <img 
                          src={mainImage} 
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-16 h-16 text-muted-foreground/20" />
                        </div>
                      )}
                      
                      {/* Badge Overlay */}
                      <div className="absolute top-3 right-3">
                        <Badge variant={pkg.active ? "default" : "secondary"}>
                          {pkg.active ? "Available" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="mb-2">
                            {pkg.category}
                          </Badge>
                          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                            {pkg.name}
                          </CardTitle>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {pkg.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Starting Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">From</span>
                        <span className="text-2xl font-bold" data-testid={`text-price-${pkg.id}`}>
                          {startingPrice}
                        </span>
                        <span className="text-lg text-muted-foreground">MAD</span>
                      </div>

                      {/* Quick Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{pkg.basicDeliveryDays} {pkg.basicDeliveryDays === 1 ? 'day' : 'days'}</span>
                        {pkg.standardPriceMad && pkg.premiumPriceMad ? (
                          <span>• 3 options</span>
                        ) : pkg.standardPriceMad ? (
                          <span>• 2 options</span>
                        ) : (
                          <span>• 1 option</span>
                        )}
                      </div>

                      {/* View Details Button */}
                      <Button 
                        className="w-full gap-2"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/packages/${pkg.id}`);
                        }}
                        data-testid={`button-view-details-${pkg.id}`}
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Portfolio */}
        {provider.profile?.portfolioPhotos && provider.profile.portfolioPhotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('provider.portfolio')}</CardTitle>
              <CardDescription>
                Gallery of previous work and experiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {provider.profile.portfolioPhotos.map((photo, index) => (
                  <div 
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer hover-elevate"
                  >
                    <img
                      src={photo}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
