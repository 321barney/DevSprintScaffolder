import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Trash2, Package, MapPin, Building2 } from "lucide-react";
import type { Favorite } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface FavoriteWithDetails extends Favorite {
  details?: {
    name?: string;
    displayName?: string;
    city?: string;
    rating?: string;
    description?: string;
    basicPriceMad?: number;
  };
}

export default function Favorites() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: favorites = [], isLoading } = useQuery<FavoriteWithDetails[]>({
    queryKey: ["/api/favorites"],
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/favorites/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removed",
        description: "Item removed from favorites",
      });
    },
  });

  const filteredFavorites = selectedType === "all" 
    ? favorites 
    : favorites.filter(f => f.itemType === selectedType);

  const groupedFavorites = filteredFavorites.reduce((acc, fav) => {
    if (!acc[fav.itemType]) {
      acc[fav.itemType] = [];
    }
    acc[fav.itemType].push(fav);
    return acc;
  }, {} as Record<string, FavoriteWithDetails[]>);

  const getItemTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      provider: "Providers",
      service_package: "Service Packages",
      venue: "Venues",
      bleisure_package: "Bleisure Packages",
      coworking_space: "Coworking Spaces",
    };
    return labels[type] || type;
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "provider":
        return <MapPin className="w-5 h-5" />;
      case "service_package":
        return <Package className="w-5 h-5" />;
      case "venue":
      case "coworking_space":
        return <Building2 className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  const handleItemClick = (favorite: FavoriteWithDetails) => {
    if (favorite.itemType === "provider") {
      setLocation(`/provider/${favorite.itemId}`);
    } else if (favorite.itemType === "service_package") {
      setLocation(`/service-packages`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-favorites">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                My Favorites
              </h1>
              <p className="text-muted-foreground mt-1">
                Items you've saved for later
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({favorites.length})
              </TabsTrigger>
              {Object.keys(groupedFavorites).map(type => (
                <TabsTrigger 
                  key={type} 
                  value={type}
                  data-testid={`tab-${type}`}
                >
                  {getItemTypeLabel(type)} ({groupedFavorites[type].length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredFavorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="w-16 h-16 text-muted-foreground mb-4" data-testid="icon-empty-favorites" />
              <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
                No favorites yet
              </h3>
              <p className="text-muted-foreground mb-6 text-center" data-testid="text-empty-description">
                {selectedType === "all" 
                  ? "Start exploring and save items you like"
                  : `No ${getItemTypeLabel(selectedType).toLowerCase()} saved`}
              </p>
              <Button onClick={() => setLocation("/browse")} data-testid="button-browse">
                Browse Providers
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {selectedType === "all" ? (
              Object.entries(groupedFavorites).map(([type, items]) => (
                <div key={type} className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getItemTypeIcon(type)}
                    <h2 className="text-xl font-semibold" data-testid={`heading-${type}`}>
                      {getItemTypeLabel(type)}
                    </h2>
                    <Badge variant="secondary" data-testid={`count-${type}`}>
                      {items.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((favorite) => (
                      <Card 
                        key={favorite.id} 
                        className="hover-elevate"
                        data-testid={`card-favorite-${favorite.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="line-clamp-1" data-testid="text-favorite-name">
                                {favorite.details?.name || favorite.details?.displayName || "Unknown"}
                              </CardTitle>
                              {favorite.details?.city && (
                                <CardDescription className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {favorite.details.city}
                                </CardDescription>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMutation.mutate(favorite.id);
                              }}
                              data-testid="button-remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {favorite.notes && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid="text-notes">
                              {favorite.notes}
                            </p>
                          )}
                          {favorite.details?.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {favorite.details.description}
                            </p>
                          )}
                          {favorite.details?.basicPriceMad && (
                            <p className="text-sm font-semibold mb-3" data-testid="text-price">
                              From {favorite.details.basicPriceMad} MAD
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleItemClick(favorite)}
                            data-testid="button-view"
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFavorites.map((favorite) => (
                  <Card 
                    key={favorite.id} 
                    className="hover-elevate"
                    data-testid={`card-favorite-${favorite.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="line-clamp-1" data-testid="text-favorite-name">
                            {favorite.details?.name || favorite.details?.displayName || "Unknown"}
                          </CardTitle>
                          {favorite.details?.city && (
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {favorite.details.city}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMutation.mutate(favorite.id);
                          }}
                          data-testid="button-remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {favorite.notes && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid="text-notes">
                          {favorite.notes}
                        </p>
                      )}
                      {favorite.details?.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {favorite.details.description}
                        </p>
                      )}
                      {favorite.details?.basicPriceMad && (
                        <p className="text-sm font-semibold mb-3" data-testid="text-price">
                          From {favorite.details.basicPriceMad} MAD
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleItemClick(favorite)}
                        data-testid="button-view"
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
