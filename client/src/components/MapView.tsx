import { useState, useMemo, useCallback } from "react";
import { Map as MapboxMap, Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, User, Briefcase, Building2, Package, Palmtree } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Provider {
  id: string;
  displayName: string;
  city?: string;
  rating: string;
  verified: boolean;
  profile?: {
    latitude: string;
    longitude: string;
    brandName?: string;
    profilePhotoUrl?: string;
  };
}

interface Job {
  id: string;
  category: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  budgetHintMad?: number;
  status: string;
  spec: any;
  offersCount?: number;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  capacity?: number;
}

interface BleisurePackage {
  id: string;
  title: string;
  city: string;
  pricePerPersonMad: number;
  businessDays: number;
  leisureDays: number;
  provider?: {
    latitude?: string;
    longitude?: string;
  };
}

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  basicPriceMad: number;
  providerId: string;
}

interface MapViewProps {
  providers: Provider[];
  jobs: Job[];
  venues?: Venue[];
  bleisurePackages?: BleisurePackage[];
  servicePackages?: ServicePackage[];
  onProviderClick?: (provider: Provider) => void;
  onJobClick?: (job: Job) => void;
  onVenueClick?: (venue: Venue) => void;
  onBleisureClick?: (pkg: BleisurePackage) => void;
  onServicePackageClick?: (pkg: ServicePackage) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

export default function MapView({ 
  providers, 
  jobs, 
  venues = [], 
  bleisurePackages = [], 
  servicePackages = [],
  onProviderClick, 
  onJobClick,
  onVenueClick,
  onBleisureClick,
  onServicePackageClick
}: MapViewProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedBleisure, setSelectedBleisure] = useState<BleisurePackage | null>(null);
  const [selectedServicePackage, setSelectedServicePackage] = useState<ServicePackage | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -7.6,
    latitude: 33.6,
    zoom: 6,
  });

  if (!MAPBOX_TOKEN) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-muted">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Map Configuration Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The map cannot be displayed because the Mapbox access token is not configured. 
              Please add VITE_MAPBOX_ACCESS_TOKEN to your environment variables.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providersWithLocation = useMemo(() => 
    providers.filter(p => p.profile?.latitude && p.profile?.longitude),
    [providers]
  );

  const jobsWithLocation = useMemo(() => 
    jobs.filter(j => j.latitude && j.longitude && j.status === "open"),
    [jobs]
  );

  const venuesWithLocation = useMemo(() => 
    venues.filter(v => v.latitude && v.longitude),
    [venues]
  );

  const bleisureWithLocation = useMemo(() => 
    bleisurePackages.filter(b => b.provider?.latitude && b.provider?.longitude),
    [bleisurePackages]
  );

  const servicePackagesWithLocation = useMemo(() => {
    return servicePackages.map(pkg => {
      const provider = providers.find(p => p.id === pkg.providerId);
      return provider?.profile?.latitude && provider?.profile?.longitude
        ? { ...pkg, provider }
        : null;
    }).filter(Boolean) as (ServicePackage & { provider: Provider })[];
  }, [servicePackages, providers]);

  const handleProviderClick = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedJob(null);
    setSelectedVenue(null);
    setSelectedBleisure(null);
    setSelectedServicePackage(null);
  }, []);

  const handleJobClick = useCallback((job: Job) => {
    setSelectedJob(job);
    setSelectedProvider(null);
    setSelectedVenue(null);
    setSelectedBleisure(null);
    setSelectedServicePackage(null);
  }, []);

  const handleVenueClick = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedProvider(null);
    setSelectedJob(null);
    setSelectedBleisure(null);
    setSelectedServicePackage(null);
  }, []);

  const handleBleisureClick = useCallback((pkg: BleisurePackage) => {
    setSelectedBleisure(pkg);
    setSelectedProvider(null);
    setSelectedJob(null);
    setSelectedVenue(null);
    setSelectedServicePackage(null);
  }, []);

  const handleServicePackageClick = useCallback((pkg: ServicePackage) => {
    setSelectedServicePackage(pkg);
    setSelectedProvider(null);
    setSelectedJob(null);
    setSelectedVenue(null);
    setSelectedBleisure(null);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "transport": return "hsl(var(--primary))";
      case "tour": return "hsl(var(--chart-2))";
      case "service": return "hsl(var(--chart-3))";
      case "financing": return "hsl(var(--chart-4))";
      default: return "hsl(var(--muted))";
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-primary">Trip to Work</h1>
            <nav className="hidden md:flex items-center gap-4">
              <a href="/jobs" className="text-sm hover:text-primary transition-colors" data-testid="link-jobs">
                Browse Jobs
              </a>
              <a href="/post-job" className="text-sm hover:text-primary transition-colors" data-testid="link-post-job">
                Post Request
              </a>
              <a href="/provider/signup" className="text-sm hover:text-primary transition-colors" data-testid="link-provider-signup">
                Become Provider
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login" className="text-sm hover:text-primary transition-colors" data-testid="link-login">
              Login
            </a>
            <a href="/signup">
              <Button size="sm" data-testid="button-signup">Sign Up</Button>
            </a>
          </div>
        </div>
      </div>
      <MapboxMap
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        onError={(evt: any) => setMapError(evt.error?.message || "Failed to load map")}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        {providersWithLocation.map((provider) => (
          <Marker
            key={`provider-${provider.id}`}
            longitude={parseFloat(provider.profile!.longitude)}
            latitude={parseFloat(provider.profile!.latitude)}
            anchor="bottom"
          >
            <div
              className="cursor-pointer hover-elevate active-elevate-2 transition-transform"
              onClick={() => handleProviderClick(provider)}
              data-testid={`marker-provider-${provider.id}`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                {provider.verified && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent border border-background flex items-center justify-center">
                    <span className="text-[10px]">✓</span>
                  </div>
                )}
              </div>
            </div>
          </Marker>
        ))}

        {jobsWithLocation.map((job) => (
          <Marker
            key={`job-${job.id}`}
            longitude={parseFloat(job.longitude!)}
            latitude={parseFloat(job.latitude!)}
            anchor="bottom"
          >
            <div
              className="cursor-pointer hover-elevate active-elevate-2 transition-transform"
              onClick={() => handleJobClick(job)}
              data-testid={`marker-job-${job.id}`}
            >
              <div className="relative">
                <div 
                  className="px-3 py-1.5 rounded-full border-2 border-background shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: getCategoryColor(job.category) }}
                >
                  <Briefcase className="w-4 h-4 text-white" />
                  {job.budgetHintMad && (
                    <span className="text-xs font-semibold text-white">
                      {job.budgetHintMad} MAD
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Marker>
        ))}

        {venuesWithLocation.map((venue) => (
          <Marker
            key={`venue-${venue.id}`}
            longitude={parseFloat(venue.longitude!)}
            latitude={parseFloat(venue.latitude!)}
            anchor="bottom"
          >
            <div
              className="cursor-pointer hover-elevate active-elevate-2 transition-transform"
              onClick={() => handleVenueClick(venue)}
              data-testid={`marker-venue-${venue.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-green-600 border-2 border-background shadow-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {bleisureWithLocation.map((pkg) => (
          <Marker
            key={`bleisure-${pkg.id}`}
            longitude={parseFloat(pkg.provider!.longitude!)}
            latitude={parseFloat(pkg.provider!.latitude!)}
            anchor="bottom"
          >
            <div
              className="cursor-pointer hover-elevate active-elevate-2 transition-transform"
              onClick={() => handleBleisureClick(pkg)}
              data-testid={`marker-bleisure-${pkg.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-background shadow-lg flex items-center justify-center">
                <Palmtree className="w-5 h-5 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {servicePackagesWithLocation.map((pkg) => (
          <Marker
            key={`package-${pkg.id}`}
            longitude={parseFloat(pkg.provider.profile!.longitude)}
            latitude={parseFloat(pkg.provider.profile!.latitude)}
            anchor="bottom"
          >
            <div
              className="cursor-pointer hover-elevate active-elevate-2 transition-transform"
              onClick={() => handleServicePackageClick(pkg)}
              data-testid={`marker-package-${pkg.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-background shadow-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {selectedProvider && (
          <Popup
            longitude={parseFloat(selectedProvider.profile!.longitude)}
            latitude={parseFloat(selectedProvider.profile!.latitude)}
            anchor="top"
            onClose={() => setSelectedProvider(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Card className="border-0 shadow-none min-w-[250px]" data-testid="popup-provider">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-sm">
                      {selectedProvider.profile?.brandName || selectedProvider.displayName}
                    </CardTitle>
                    {selectedProvider.verified && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedProvider.city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">Rating:</span>
                  <span>{parseFloat(selectedProvider.rating).toFixed(1)} ⭐</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (onProviderClick) {
                      onProviderClick(selectedProvider);
                    }
                  }}
                  data-testid="button-view-provider"
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </Popup>
        )}

        {selectedJob && (
          <Popup
            longitude={parseFloat(selectedJob.longitude!)}
            latitude={parseFloat(selectedJob.latitude!)}
            anchor="top"
            onClose={() => setSelectedJob(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Card className="border-0 shadow-none min-w-[250px]" data-testid="popup-job">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm capitalize">
                  {selectedJob.category} Request
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedJob.city}</span>
                </div>
                {selectedJob.budgetHintMad && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">Budget:</span>
                    <span className="text-primary font-bold">{selectedJob.budgetHintMad} MAD</span>
                  </div>
                )}
                {selectedJob.offersCount !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">Offers:</span>
                    <Badge variant="secondary">{selectedJob.offersCount}</Badge>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (onJobClick) {
                      onJobClick(selectedJob);
                    }
                  }}
                  data-testid="button-view-job"
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Popup>
        )}

        {selectedVenue && (
          <Popup
            longitude={parseFloat(selectedVenue.longitude!)}
            latitude={parseFloat(selectedVenue.latitude!)}
            anchor="top"
            onClose={() => setSelectedVenue(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Card className="border-0 shadow-none min-w-[250px]" data-testid="popup-venue">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">{selectedVenue.name}</CardTitle>
                <Badge variant="secondary" className="w-fit text-xs capitalize">
                  {selectedVenue.type}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedVenue.city}</span>
                </div>
                {selectedVenue.capacity && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">Capacity:</span>
                    <span>{selectedVenue.capacity} people</span>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (onVenueClick) {
                      onVenueClick(selectedVenue);
                    }
                  }}
                  data-testid="button-view-venue"
                >
                  View Venue
                </Button>
              </CardContent>
            </Card>
          </Popup>
        )}

        {selectedBleisure && (
          <Popup
            longitude={parseFloat(selectedBleisure.provider!.longitude!)}
            latitude={parseFloat(selectedBleisure.provider!.latitude!)}
            anchor="top"
            onClose={() => setSelectedBleisure(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Card className="border-0 shadow-none min-w-[250px]" data-testid="popup-bleisure">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">{selectedBleisure.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedBleisure.city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">Price:</span>
                  <span className="text-primary font-bold">{selectedBleisure.pricePerPersonMad} MAD/person</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">Duration:</span>
                  <span>{selectedBleisure.businessDays + selectedBleisure.leisureDays} days</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (onBleisureClick) {
                      onBleisureClick(selectedBleisure);
                    }
                  }}
                  data-testid="button-view-bleisure"
                >
                  View Package
                </Button>
              </CardContent>
            </Card>
          </Popup>
        )}

        {selectedServicePackage && (
          <Popup
            longitude={parseFloat(selectedServicePackage.provider.profile!.longitude)}
            latitude={parseFloat(selectedServicePackage.provider.profile!.latitude)}
            anchor="top"
            onClose={() => setSelectedServicePackage(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <Card className="border-0 shadow-none min-w-[250px]" data-testid="popup-service-package">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">{selectedServicePackage.name}</CardTitle>
                <Badge variant="secondary" className="w-fit text-xs capitalize">
                  {selectedServicePackage.category}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">Provider:</span>
                  <span>{selectedServicePackage.provider.displayName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">From:</span>
                  <span className="text-primary font-bold">{selectedServicePackage.basicPriceMad} MAD</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (onServicePackageClick) {
                      onServicePackageClick(selectedServicePackage);
                    }
                  }}
                  data-testid="button-view-service-package"
                >
                  View Package
                </Button>
              </CardContent>
            </Card>
          </Popup>
        )}
      </MapboxMap>

      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-2 border max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="text-sm font-semibold mb-2">Map Legend</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-primary-foreground" />
          </div>
          <span>Providers ({providersWithLocation.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2 py-1 rounded-full bg-primary border-2 border-background flex-shrink-0">
            <Briefcase className="w-3 h-3 text-white" />
          </div>
          <span>Open Requests ({jobsWithLocation.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-green-600 border-2 border-background flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3 h-3 text-white" />
          </div>
          <span>Venues ({venuesWithLocation.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-purple-600 border-2 border-background flex items-center justify-center flex-shrink-0">
            <Palmtree className="w-3 h-3 text-white" />
          </div>
          <span>Bleisure ({bleisureWithLocation.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-orange-600 border-2 border-background flex items-center justify-center flex-shrink-0">
            <Package className="w-3 h-3 text-white" />
          </div>
          <span>Service Packages ({servicePackagesWithLocation.length})</span>
        </div>
      </div>
    </div>
  );
}
