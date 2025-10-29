import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MapView from "@/components/MapView";
import ListView from "@/components/ListView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Map as MapIcon, List } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

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

export default function Browse() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const { locale } = useApp();
  const { t } = useTranslation(locale);

  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ["/api/providers"],
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/venues"],
  });

  const { data: bleisureData, isLoading: bleisureLoading } = useQuery({
    queryKey: ["/api/bleisure-packages"],
  });

  const { data: servicePackagesData, isLoading: servicePackagesLoading } = useQuery({
    queryKey: ["/api/service-packages"],
  });

  const providers = (providersData as Provider[]) || [];
  const jobs = (jobsData as Job[]) || [];
  const venues = (venuesData as any[]) || [];
  const bleisurePackages = (bleisureData as any[]) || [];
  const servicePackages = (servicePackagesData as any[]) || [];

  const isLoading = providersLoading || jobsLoading || venuesLoading || bleisureLoading || servicePackagesLoading;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="w-32 h-32 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const providersWithProfiles = providers.filter(p => p.profile);

  if (providersWithProfiles.length === 0 && jobs.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('browse.empty')} {t('browse.empty.action')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col" data-testid="page-browse">
      {/* View Toggle Header */}
      <div className="border-b bg-background p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground px-2">
            {providersWithProfiles.length} {t('browse.providers').toLowerCase()} • {jobs.length} {t('browse.jobs').toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            data-testid="button-view-map"
            className="gap-2"
          >
            <MapIcon className="w-4 h-4" />
            {t('browse.view.map')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
            className="gap-2"
          >
            <List className="w-4 h-4" />
            {t('browse.view.list')}
          </Button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          <MapView
            providers={providers}
            jobs={jobs}
            venues={venues}
            bleisurePackages={bleisurePackages}
            servicePackages={servicePackages}
            onProviderClick={(provider) => {
              navigate(`/provider/${provider.id}`);
            }}
            onJobClick={(job) => {
              navigate(`/jobs/${job.id}`);
            }}
            onVenueClick={(venue) => {
              navigate(`/mice`);
            }}
            onBleisureClick={(pkg) => {
              navigate(`/bleisure`);
            }}
            onServicePackageClick={(pkg) => {
              navigate(`/packages/${pkg.id}`);
            }}
          />
        ) : (
          <ListView
            providers={providers}
            jobs={jobs}
            onProviderClick={(provider) => {
              navigate(`/provider/${provider.id}`);
            }}
            onJobClick={(job) => {
              navigate(`/jobs/${job.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
