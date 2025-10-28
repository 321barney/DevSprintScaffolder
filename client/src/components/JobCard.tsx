import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Job } from '@shared/schema';
import { CategoryIcon } from './CategoryIcon';
import { useTranslation, formatCurrency } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { Clock, MapPin, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

interface JobCardProps {
  job: Job & { offerCount?: number };
  onClick?: () => void;
}

const dateLocales = {
  'fr-MA': fr,
  'ar-MA': ar,
  'en-US': enUS,
};

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
};

export function JobCard({ job, onClick }: JobCardProps) {
  const { locale } = useApp();
  const { t } = useTranslation(locale);

  const spec = job.spec as any;
  const title = spec?.description || spec?.pickup || t('category.' + job.category);

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-shadow" 
      onClick={onClick}
      data-testid={`card-job-${job.id}`}
    >
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <CategoryIcon category={job.category} size="md" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg line-clamp-2" data-testid="text-job-title">
                {title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                {job.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{job.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(job.createdAt), {
                      addSuffix: true,
                      locale: dateLocales[locale],
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Badge className={statusColors[job.status] || statusColors.open} data-testid="badge-job-status">
            {t(`job.status.${job.status}` as any)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {job.budgetHintMad && (
              <p className="text-sm text-muted-foreground">
                {t('job.post.budget')}: <span className="font-medium text-foreground">{formatCurrency(job.budgetHintMad, locale)}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {job.offerCount !== undefined && job.offerCount > 0 && (
              <Badge variant="secondary" data-testid="badge-offer-count">
                {job.offerCount} {job.offerCount === 1 ? t('offer.title').slice(0, -1) : t('offer.title')}
              </Badge>
            )}
            <Button size="sm" data-testid="button-view-job">
              <Eye className="w-4 h-4 mr-2" />
              {t('nav.jobs')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
