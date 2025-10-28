import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { MapPin, Star, Shield, Globe, ArrowLeft } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
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
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
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

        {/* Portfolio */}
        {provider.profile?.portfolioPhotos && provider.profile.portfolioPhotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('provider.portfolio')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {provider.profile.portfolioPhotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Portfolio ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
