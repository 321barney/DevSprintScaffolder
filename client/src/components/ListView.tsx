import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, Shield, Calendar, DollarSign } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/i18n";
import { CategoryIcon } from "@/components/CategoryIcon";

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

interface ListViewProps {
  providers: Provider[];
  jobs: Job[];
  onProviderClick: (provider: Provider) => void;
  onJobClick: (job: Job) => void;
}

export default function ListView({ providers, jobs, onProviderClick, onJobClick }: ListViewProps) {
  const { locale } = useApp();
  const { t } = useTranslation(locale);

  const providersWithProfiles = providers.filter(p => p.profile);

  return (
    <div className="h-full overflow-y-auto bg-background" data-testid="view-list">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Providers Section */}
        {providersWithProfiles.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="title-providers">
              <Shield className="w-6 h-6 text-primary" />
              {t('browse.providers')} ({providersWithProfiles.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providersWithProfiles.map((provider) => (
                <Card
                  key={provider.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => onProviderClick(provider)}
                  data-testid={`card-provider-${provider.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={provider.profile?.profilePhotoUrl} />
                        <AvatarFallback>
                          {(provider.profile?.brandName || provider.displayName)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {provider.profile?.brandName || provider.displayName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{provider.rating}</span>
                          </div>
                          {provider.verified && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              <Shield className="w-3 h-3 mr-1" />
                              {t('provider.verified')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {provider.city && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{provider.city}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Jobs Section */}
        {jobs.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" data-testid="title-jobs">
              <Calendar className="w-6 h-6 text-primary" />
              {t('browse.jobs')} ({jobs.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => onJobClick(job)}
                  data-testid={`card-job-${job.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={job.category} size="sm" />
                        <CardTitle className="text-base">
                          {t(`category.${job.category}` as any)}
                        </CardTitle>
                      </div>
                      <Badge 
                        variant={job.status === 'open' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {t(`job.status.${job.status}` as any)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {job.city && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{job.city}</span>
                      </div>
                    )}
                    {job.budgetHintMad && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(job.budgetHintMad, locale)}</span>
                      </div>
                    )}
                    {(job.offersCount !== undefined && job.offersCount > 0) && (
                      <Badge variant="outline" className="mt-2">
                        {job.offersCount} {job.offersCount === 1 ? 'offre' : 'offres'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {providersWithProfiles.length === 0 && jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {t('browse.empty')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
