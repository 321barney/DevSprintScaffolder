import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobCard } from '@/components/JobCard';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { Plus, Search, Loader2 } from 'lucide-react';
import { type Job } from '@shared/schema';

export default function Jobs() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: jobs = [], isLoading } = useQuery<(Job & { offerCount: number })[]>({
    queryKey: ['/api/jobs'],
  });

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    const spec = job.spec as any;
    const searchableText = `${job.category} ${job.city || ''} ${spec?.description || ''}`.toLowerCase();
    return searchableText.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t('nav.jobs')}</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos demandes et suivez vos offres
              </p>
            </div>
            <Button onClick={() => setLocation('/post-job')} data-testid="button-post-new-job">
              <Plus className="w-4 h-4 mr-2" />
              {t('home.cta.post')}
            </Button>
          </div>

          {/* Search */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par catégorie, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucun travail publié'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par publier votre premier travail'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setLocation('/post-job')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('home.cta.post')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => setLocation(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
