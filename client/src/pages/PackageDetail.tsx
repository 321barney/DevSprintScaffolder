import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin,
  Clock, 
  Check, 
  Heart, 
  ArrowLeft,
  ChevronRight,
  Star,
  Calendar,
  Users
} from "lucide-react";
import type { ServicePackage } from "@shared/schema";
import { useState } from "react";

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

export default function PackageDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setBookingDialogOpen(false);
      toast({
        title: "Booking Confirmed",
        description: "Your booking has been placed successfully! View it in your orders dashboard.",
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

  const handleBookTier = (tier: "basic" | "standard" | "premium") => {
    if (!packageData) return;
    createOrderMutation.mutate({ packageId: packageData.id, tier });
  };

  if (isLoadingPackage || isLoadingProvider) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
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
  const mainImage = packageData.photoUrls?.[0];
  
  const allFeatures = [
    ...(Array.isArray(packageData.basicFeatures) ? packageData.basicFeatures : []),
    ...(Array.isArray(packageData.standardFeatures) ? packageData.standardFeatures : []),
    ...(Array.isArray(packageData.premiumFeatures) ? packageData.premiumFeatures : []),
  ];
  const uniqueFeatures = Array.from(new Set(allFeatures)).slice(0, 8);

  const tiers = [
    {
      name: "basic",
      title: packageData.basicTitle,
      description: packageData.basicDescription,
      price: packageData.basicPriceMad,
      deliveryDays: packageData.basicDeliveryDays,
      features: Array.isArray(packageData.basicFeatures) ? packageData.basicFeatures : [],
    },
    packageData.standardPriceMad ? {
      name: "standard",
      title: packageData.standardTitle || "Standard",
      description: packageData.standardDescription,
      price: packageData.standardPriceMad,
      deliveryDays: packageData.standardDeliveryDays!,
      features: Array.isArray(packageData.standardFeatures) ? packageData.standardFeatures : [],
    } : null,
    packageData.premiumPriceMad ? {
      name: "premium",
      title: packageData.premiumTitle || "Premium",
      description: packageData.premiumDescription,
      price: packageData.premiumPriceMad,
      deliveryDays: packageData.premiumDeliveryDays!,
      features: Array.isArray(packageData.premiumFeatures) ? packageData.premiumFeatures : [],
    } : null,
  ].filter(Boolean);

  const startingPrice = Math.min(
    packageData.basicPriceMad,
    packageData.standardPriceMad || Infinity,
    packageData.premiumPriceMad || Infinity
  );

  return (
    <div className="min-h-screen bg-background" data-testid="page-package-detail">
      {/* Hero Section */}
      <div className="relative h-64 md:h-96 bg-gradient-to-br from-primary/20 to-accent/20">
        {mainImage ? (
          <>
            <img 
              src={mainImage} 
              alt={packageData.name}
              className="w-full h-full object-cover"
              data-testid="img-package-hero"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="w-24 h-24 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Back Button Overlay */}
        <div className="absolute top-4 left-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.history.back()}
            className="bg-background/80 backdrop-blur-sm"
            data-testid="button-back-navigation"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Favorite Button Overlay */}
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleFavoriteMutation.mutate()}
            disabled={toggleFavoriteMutation.isPending}
            className="bg-background/80 backdrop-blur-sm"
            data-testid="button-favorite"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorited?.favorited ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{packageData.category}</Badge>
                      {packageData.active && <Badge variant="default">Available</Badge>}
                    </div>
                    <CardTitle className="text-3xl mb-2" data-testid="text-package-name">
                      {packageData.name}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {packageData.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Provider Info */}
            {provider && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About the Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/providers/${provider.id}`} className="block hover-elevate rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={provider.profile?.profilePhotoUrl} />
                        <AvatarFallback className="text-xl">
                          {brandName[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg" data-testid="link-provider">
                          {brandName}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{provider.rating}</span>
                          </div>
                          {provider.city && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{provider.city}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* What's Included */}
            {uniqueFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                  <CardDescription>
                    Experience highlights and included services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {uniqueFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3"
                        data-testid={`feature-highlight-${index}`}
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Options</CardTitle>
                <CardDescription>
                  Choose the package tier that best fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-pricing-comparison">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Option</th>
                        <th className="text-left py-3 px-4 font-semibold">Price</th>
                        <th className="text-left py-3 px-4 font-semibold">Duration</th>
                        <th className="text-left py-3 px-4 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((tier: any, index) => (
                        <tr 
                          key={tier.name} 
                          className="border-b last:border-0 hover-elevate"
                          data-testid={`row-tier-${tier.name}`}
                        >
                          <td className="py-4 px-4">
                            <div className="font-semibold">{tier.title}</div>
                            {tier.description && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {tier.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-lg">{tier.price} MAD</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {tier.deliveryDays} {tier.deliveryDays === 1 ? 'day' : 'days'}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-muted-foreground">
                              {tier.features.length > 0 ? `${tier.features.length} features` : 'Standard features'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Extras/Add-ons */}
            {packageData.extras && Array.isArray(packageData.extras) && packageData.extras.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Optional Add-ons</CardTitle>
                  <CardDescription>
                    Enhance your experience with these extras
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(packageData.extras as any[]).map((extra: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-xl border hover-elevate"
                        data-testid={`extra-${index}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{extra.title}</h4>
                          {extra.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {extra.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <Badge variant="secondary">+{extra.priceMad} MAD</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
                <CardDescription>
                  Customer experiences and feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No reviews yet. Be the first to book and share your experience!</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Book This Experience</CardTitle>
                <CardDescription>
                  Starting from
                </CardDescription>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-bold" data-testid="text-starting-price">
                    {startingPrice}
                  </span>
                  <span className="text-xl text-muted-foreground">MAD</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="secondary">{packageData.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Availability</span>
                    <Badge variant={packageData.active ? "default" : "secondary"}>
                      {packageData.active ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={!packageData.active}
                      data-testid="button-book-now"
                    >
                      Book Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Select Your Package Option</DialogTitle>
                      <DialogDescription>
                        Choose the tier that best matches your needs
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                      {tiers.map((tier: any) => (
                        <div
                          key={tier.name}
                          className="border rounded-xl p-6 hover-elevate active-elevate-2"
                          data-testid={`booking-option-${tier.name}`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">{tier.title}</h3>
                              {tier.description && (
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{tier.price} MAD</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {tier.deliveryDays} {tier.deliveryDays === 1 ? 'day' : 'days'}
                              </div>
                            </div>
                          </div>

                          {Array.isArray(tier.features) && tier.features.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {tier.features.slice(0, 5).map((feature: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <Button
                            className="w-full"
                            onClick={() => handleBookTier(tier.name as "basic" | "standard" | "premium")}
                            disabled={createOrderMutation.isPending}
                            data-testid={`button-select-${tier.name}`}
                          >
                            {createOrderMutation.isPending ? "Processing..." : `Book ${tier.title}`}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                <p className="text-xs text-muted-foreground text-center">
                  Secure booking • Instant confirmation
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
