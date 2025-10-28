import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { MapPin, Star, Shield, ArrowLeft, Image as ImageIcon } from "lucide-react";

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
    portfolioPhotos?: string[];
    website?: string;
  };
}

export default function ProviderPortfolio() {
  const { providerId } = useParams();
  const [, setLocation] = useLocation();
  const { locale } = useApp();
  const { t } = useTranslation(locale);

  const { data: provider, isLoading } = useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="text-center p-6" data-testid="card-not-found">
            <p className="text-lg text-muted-foreground">Provider not found</p>
            <Button
              className="mt-4"
              onClick={() => setLocation("/browse")}
              data-testid="button-back-browse"
            >
              Back to Browse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandName = provider.profile?.brandName || provider.displayName;
  const portfolioPhotos = provider.profile?.portfolioPhotos || [];

  return (
    <div className="min-h-screen bg-background" data-testid="page-provider-portfolio">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation(`/provider/${providerId}`)}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Button>

        {/* Provider Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={provider.profile?.profilePhotoUrl} />
                <AvatarFallback className="text-xl">
                  {brandName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2" data-testid="text-provider-name">
                  {brandName} Portfolio
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold" data-testid="text-rating">
                      {provider.rating}
                    </span>
                  </div>
                  {provider.verified && (
                    <Badge variant="secondary" className="gap-1" data-testid="badge-verified">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                  {provider.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span data-testid="text-city">{provider.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Portfolio Gallery */}
        {portfolioPhotos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" data-testid="icon-empty-portfolio" />
              <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
                No Portfolio Photos
              </h3>
              <p className="text-muted-foreground text-center" data-testid="text-empty-description">
                This provider hasn't uploaded any portfolio photos yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Portfolio ({portfolioPhotos.length} {portfolioPhotos.length === 1 ? 'photo' : 'photos'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {portfolioPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-square overflow-hidden rounded-lg hover-elevate"
                    data-testid={`portfolio-photo-${index}`}
                  >
                    <img
                      src={photo}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover"
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
