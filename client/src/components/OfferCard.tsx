import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { type Offer, type Provider } from '@shared/schema';
import { useTranslation, formatCurrency } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, Clock, Star, Shield } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

interface OfferCardProps {
  offer: Offer & { provider: Provider };
  onAccept?: (offerId: string) => void;
  onDecline?: (offerId: string) => void;
  showActions?: boolean;
}

export function OfferCard({ offer, onAccept, onDecline, showActions = true }: OfferCardProps) {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const aiScore = offer.aiScore ? parseFloat(offer.aiScore.toString()) : 0;
  const scorePercentage = Math.round(aiScore * 100);
  const compliance = offer.compliance as any;

  const initials = offer.provider.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card 
      className="hover-elevate transition-shadow"
      data-testid={`card-offer-${offer.id}`}
    >
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-14 h-14">
            <AvatarImage src="" alt={offer.provider.displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <button
                    onClick={() => setLocation(`/provider/${offer.provider.id}`)}
                    className="truncate text-primary hover:underline cursor-pointer"
                    data-testid="link-provider-profile"
                  >
                    {offer.provider.displayName}
                  </button>
                  {offer.provider.verified && (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('provider.verified')}
                    </Badge>
                  )}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {offer.provider.city && <span>{offer.provider.city}</span>}
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current text-yellow-500" />
                    <span className="font-medium text-foreground" data-testid="text-provider-rating">
                      {parseFloat(offer.provider.rating || '0').toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price and ETA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('offer.price')}</p>
            <p className="text-2xl font-bold text-primary" data-testid="text-offer-price">
              {offer.priceMad ? formatCurrency(offer.priceMad, locale) : '—'}
            </p>
          </div>
          {offer.etaMin && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('offer.eta')}</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {offer.etaMin} {t('time.minutes')}
              </p>
            </div>
          )}
        </div>

        {/* AI Score */}
        {aiScore > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('offer.score')}</span>
              <span className="font-semibold" data-testid="text-ai-score">{scorePercentage}%</span>
            </div>
            <Progress value={scorePercentage} className="h-2" />
          </div>
        )}

        {/* Compliance Badges */}
        {compliance && Object.keys(compliance).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {compliance.permit && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Permit
              </Badge>
            )}
            {compliance.insurance && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Insurance
              </Badge>
            )}
          </div>
        )}

        {/* Notes */}
        {offer.notes && (
          <div className="space-y-2">
            <p className={`text-sm ${expanded ? '' : 'line-clamp-2'}`}>
              {offer.notes}
            </p>
            {offer.notes.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-auto p-0 text-xs text-primary hover:no-underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && offer.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => onAccept?.(offer.id)}
              data-testid={`button-accept-offer-${offer.id}`}
            >
              {t('offer.accept')}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onDecline?.(offer.id)}
              data-testid={`button-decline-offer-${offer.id}`}
            >
              {t('offer.decline')}
            </Button>
          </div>
        )}

        {offer.status === 'accepted' && (
          <Badge className="w-full justify-center bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Accepted
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
