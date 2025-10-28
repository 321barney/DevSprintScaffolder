import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Package, 
  Clock, 
  DollarSign, 
  Check, 
  Heart, 
  ArrowLeft,
  ChevronRight,
  Star
} from "lucide-react";
import type { ServicePackage } from "@shared/schema";

interface Provider {
  id: string;
  displayName: string;
  city?: string;
  rating: string;
  verified: boolean;
  profile?: {
    brandName?: string;
    profilePhotoUrl?: string;
  };
}

interface TierCardProps {
  title: string;
  description: string | null;
  price: number;
  deliveryDays: number;
  features: string[];
  tierName: "basic" | "standard" | "premium";
  isPopular?: boolean;
  onSelect: () => void;
  isPending: boolean;
}

function TierCard({ 
  title, 
  description, 
  price, 
  deliveryDays, 
  features, 
  tierName,
  isPopular, 
  onSelect,
  isPending 
}: TierCardProps) {
  return (
    <Card className={isPopular ? "border-primary shadow-lg" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {isPopular && (
              <Badge className="mt-1" variant="default">Most Popular</Badge>
            )}
          </div>
        </div>
        {description && (
          <CardDescription className="mt-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{price}</span>
            <span className="text-lg text-muted-foreground">MAD</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {deliveryDays} {deliveryDays === 1 ? 'day' : 'days'} delivery
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          {features.length > 0 ? (
            features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2"
                data-testid={`feature-${tierName}-${index}`}
              >
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">All basic features included</span>
            </div>
          )}
        </div>

        <Button 
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          onClick={onSelect}
          disabled={isPending}
          data-testid={`button-select-${tierName}`}
        >
          {isPending ? "Processing..." : "Select"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PackageDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: packageData, isLoading: isLoadingPackage } = useQuery<ServicePackage>({
    queryKey: [`/api/service-packages/${id}`],
    enabled: !!id,
  });

  const { data: provider, isLoading: isLoadingProvider } = useQuery<Provider>({
    queryKey: [`/api/providers/${packageData?.providerId}`],
    enabled: !!packageData?.providerId,
  });

  const { data: isFavorited, refetch: refetchFavorite } = useQuery<{ favorited: boolean }>({
    queryKey: [`/api/favorites/check`, packageData?.id],
    enabled: !!packageData?.id,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: { packageId: string; tier: "basic" | "standard" | "premium" }) =>
      apiRequest("POST", "/api/orders", {
        ...data,
        selectedExtras: [],
        requirements: "",
      }),
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Created",
        description: "Your order has been placed successfully! View it in your orders dashboard.",
      });
      setLocation("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () =>
      isFavorited?.favorited
        ? apiRequest("DELETE", "/api/favorites", {
            itemType: "service_package",
            itemId: packageData?.id,
          })
        : apiRequest("POST", "/api/favorites", {
            itemType: "service_package",
            itemId: packageData?.id,
          }),
    onSuccess: () => {
      refetchFavorite();
      toast({
        title: isFavorited?.favorited ? "Removed from favorites" : "Added to favorites",
      });
    },
  });

  const handleSelectTier = (tier: "basic" | "standard" | "premium") => {
    if (!packageData) return;
    createOrderMutation.mutate({ packageId: packageData.id, tier });
  };

  if (isLoadingPackage || isLoadingProvider) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-lg text-muted-foreground">Package not found</p>
            <Button
              className="mt-4"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandName = provider?.profile?.brandName || provider?.displayName || "Provider";

  return (
    <div className="min-h-screen bg-background" data-testid="page-package-detail">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="breadcrumb">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          {provider && (
            <>
              <Link href={`/providers/${provider.id}`} className="hover:text-foreground">
                {brandName}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-foreground font-medium">{packageData.name}</span>
        </nav>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="gap-2"
          data-testid="button-back-navigation"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Package Header with Provider Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {provider && (
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={provider.profile?.profilePhotoUrl} />
                      <AvatarFallback>
                        {brandName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <Link 
                      href={`/providers/${packageData.providerId}`}
                      className="text-sm font-medium hover:underline"
                      data-testid="link-provider"
                    >
                      {brandName}
                    </Link>
                    {provider && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{provider.rating}</span>
                        {provider.city && (
                          <>
                            <span>•</span>
                            <span>{provider.city}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <CardTitle className="text-3xl mb-2" data-testid="text-package-name">
                  {packageData.name}
                </CardTitle>
                <CardDescription className="text-base">
                  {packageData.description}
                </CardDescription>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary">{packageData.category}</Badge>
                  {packageData.active && <Badge variant="default">Active</Badge>}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleFavoriteMutation.mutate()}
                disabled={toggleFavoriteMutation.isPending}
                data-testid="button-favorite"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorited?.favorited ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Pricing Tiers Comparison */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Choose Your Plan
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Basic Tier */}
            <TierCard
              title={packageData.basicTitle}
              description={packageData.basicDescription}
              price={packageData.basicPriceMad}
              deliveryDays={packageData.basicDeliveryDays}
              features={Array.isArray(packageData.basicFeatures) ? packageData.basicFeatures : []}
              tierName="basic"
              onSelect={() => handleSelectTier("basic")}
              isPending={createOrderMutation.isPending}
            />

            {/* Standard Tier */}
            {packageData.standardPriceMad && (
              <TierCard
                title={packageData.standardTitle || "Standard"}
                description={packageData.standardDescription}
                price={packageData.standardPriceMad}
                deliveryDays={packageData.standardDeliveryDays!}
                features={Array.isArray(packageData.standardFeatures) ? packageData.standardFeatures : []}
                tierName="standard"
                isPopular={true}
                onSelect={() => handleSelectTier("standard")}
                isPending={createOrderMutation.isPending}
              />
            )}

            {/* Premium Tier */}
            {packageData.premiumPriceMad && (
              <TierCard
                title={packageData.premiumTitle || "Premium"}
                description={packageData.premiumDescription}
                price={packageData.premiumPriceMad}
                deliveryDays={packageData.premiumDeliveryDays!}
                features={Array.isArray(packageData.premiumFeatures) ? packageData.premiumFeatures : []}
                tierName="premium"
                onSelect={() => handleSelectTier("premium")}
                isPending={createOrderMutation.isPending}
              />
            )}
          </div>
        </div>

        {/* Extras/Add-ons */}
        {packageData.extras && Array.isArray(packageData.extras) && packageData.extras.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Add-ons & Extras</CardTitle>
              <CardDescription>
                Enhance your package with these additional services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(packageData.extras as any[]).map((extra: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`extra-${index}`}
                  >
                    <div>
                      <h4 className="font-medium">{extra.title}</h4>
                      {extra.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {extra.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">+{extra.priceMad} MAD</span>
                    </div>
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
