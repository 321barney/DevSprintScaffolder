import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MapView from "@/components/MapView";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function Marketplace() {
  const [, navigate] = useLocation();

  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ["/api/providers"],
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const providers = (providersData as Provider[]) || [];
  const jobs = (jobsData as Job[]) || [];

  const isLoading = providersLoading || jobsLoading;

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
            No providers or requests found on the map yet. Be the first to post a request or create a provider profile!
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen w-full" data-testid="page-marketplace">
      <MapView
        providers={providers}
        jobs={jobs}
        onProviderClick={(provider) => {
          navigate(`/provider/${provider.id}`);
        }}
        onJobClick={(job) => {
          navigate(`/jobs/${job.id}`);
        }}
      />
    </div>
  );
}
