import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OfferCard } from '@/components/OfferCard';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useTranslation, formatCurrency } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Loader2, MapPin, Calendar, DollarSign } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { type Job, type Offer, type Provider } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

const dateLocales = {
  'fr-MA': fr,
  'ar-MA': ar,
  'en-US': enUS,
};

export default function JobDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { locale, currentUser } = useApp();
  const { t } = useTranslation(locale);
  const { toast } = useToast();

  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', id],
    enabled: !!id,
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery<(Offer & { provider: Provider })[]>({
    queryKey: ['/api/jobs', id, 'offers'],
    enabled: !!id,
  });

  const handleAcceptOffer = (offerId: string) => {
    // Check if user is authenticated
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: t('auth.required'),
        description: t('auth.required.message'),
      });
      setLocation('/login');
      return;
    }
    
    // Proceed with accepting the offer
    acceptMutation.mutate(offerId);
  };

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => apiRequest('POST', `/api/offers/${offerId}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', id, 'offers'] });
      toast({
        title: 'Offer Accepted',
        description: 'The provider has been notified. You can now message them.',
      });
      setLocation(`/messages/${id}`);
    },
  });

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Travail introuvable</h2>
        <Button onClick={() => setLocation('/jobs')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour aux travaux
        </Button>
      </div>
    );
  }

  const spec = job.spec as any;
  const sortedOffers = [...offers].sort((a, b) => {
    const scoreA = parseFloat(a.aiScore?.toString() || '0');
    const scoreB = parseFloat(b.aiScore?.toString() || '0');
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/jobs')}
            className="mb-4"
            data-testid="button-back-to-jobs"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Retour aux travaux
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-start gap-3 mb-4">
                  <CategoryIcon category={job.category} size="md" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl mb-2">
                      {spec?.description || t(`category.${job.category}` as any)}
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                      {t(`job.status.${job.status}` as any)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{job.city}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(job.createdAt), {
                      addSuffix: true,
                      locale: dateLocales[locale],
                    })}
                  </span>
                </div>

                {job.budgetHintMad && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formatCurrency(job.budgetHintMad, locale)}</span>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {spec?.description || 'Aucune description'}
                  </p>
                </div>

                {spec && Object.keys(spec).length > 1 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Détails</h4>
                    <dl className="text-sm space-y-2">
                      {spec.pickup && (
                        <div>
                          <dt className="text-muted-foreground">Départ:</dt>
                          <dd className="font-medium">{spec.pickup}</dd>
                        </div>
                      )}
                      {spec.dropoff && (
                        <div>
                          <dt className="text-muted-foreground">Arrivée:</dt>
                          <dd className="font-medium">{spec.dropoff}</dd>
                        </div>
                      )}
                      {spec.pax && (
                        <div>
                          <dt className="text-muted-foreground">Passagers:</dt>
                          <dd className="font-medium">{spec.pax}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Offers List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {t('offer.title')} ({offers.length})
              </h2>
            </div>

            {offersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : offers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MapPin className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Aucune offre pour le moment</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Les prestataires vérifiés recevront votre demande et soumettront leurs offres sous peu.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={handleAcceptOffer}
                    showActions={job.status === 'open'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
