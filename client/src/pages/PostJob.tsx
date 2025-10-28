import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const categories = ['transport', 'tour', 'service', 'financing'];
const moroccanCities = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir',
  'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Salé', 'Temara'
];

export default function PostJob() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    city: '',
    budgetHintMad: '',
  });

  const handleCategorySelect = (category: string) => {
    setFormData({ ...formData, category });
    setStep(2);
  };

  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/jobs', data),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: 'Travail publié',
        description: 'Les prestataires recevront votre demande sous peu',
      });
      setLocation(`/jobs/${newJob.id}`);
    },
    onError: (error: any) => {
      console.error('Job creation error:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de publier le travail',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async () => {
    const payload = {
      description: formData.description,
      category: formData.category,
      city: formData.city,
      budgetHintMad: formData.budgetHintMad ? parseInt(formData.budgetHintMad) : undefined,
      buyerId: 'demo-buyer', // TODO: Get from auth context
    };
    console.log('Submitting job with payload:', payload);
    createJobMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/30 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('job.post.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Category Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <Label className="text-lg">{t('job.post.category')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <Card
                      key={category}
                      className={`hover-elevate active-elevate-2 cursor-pointer transition-all ${
                        formData.category === category ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleCategorySelect(category)}
                      data-testid={`button-category-${category}`}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-8 space-y-3">
                        <CategoryIcon category={category} size="lg" />
                        <span className="font-semibold text-center">
                          {t(`category.${category}` as any)}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Description */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <CategoryIcon category={formData.category} size="md" />
                  <span className="font-semibold">
                    {t(`category.${formData.category}` as any)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">
                    {t('job.post.description')}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Ex: J'ai besoin d'un transport de Casablanca à Marrakech pour 4 personnes..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={6}
                    className="resize-none"
                    data-testid="input-job-description"
                  />
                  <p className="text-sm text-muted-foreground">
                    Notre IA structurera automatiquement votre demande
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    data-testid="button-back"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!formData.description.trim()}
                    data-testid="button-next"
                  >
                    {t('common.save')}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Details & Confirmation */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-base">
                    {t('job.post.city')}
                  </Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger data-testid="select-city">
                      <SelectValue placeholder="Sélectionnez une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {moroccanCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-base">
                    {t('job.post.budget')}
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="1000"
                    value={formData.budgetHintMad}
                    onChange={(e) =>
                      setFormData({ ...formData, budgetHintMad: e.target.value })
                    }
                    data-testid="input-budget"
                  />
                  <p className="text-sm text-muted-foreground">
                    Optionnel - Aide les prestataires à calibrer leurs offres
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-semibold">Récapitulatif</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Catégorie:</span> {t(`category.${formData.category}` as any)}</p>
                    <p><span className="text-muted-foreground">Ville:</span> {formData.city || '—'}</p>
                    <p><span className="text-muted-foreground">Description:</span> {formData.description}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    data-testid="button-back-step2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    data-testid="button-submit-job"
                  >
                    Publier le travail
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
