import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Upload, CheckCircle2, ShieldCheck } from 'lucide-react';

const moroccanCities = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir',
  'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Salé', 'Temara'
];

export default function ProviderSignup() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    city: '',
    email: '',
    phone: '',
    password: '',
  });

  const [kycFiles, setKycFiles] = useState({
    identity: null as File | null,
    permit: null as File | null,
    insurance: null as File | null,
  });

  const handleFileUpload = (type: keyof typeof kycFiles, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setKycFiles({ ...kycFiles, [type]: file });
    }
  };

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create user
      const userResponse = await apiRequest('POST', '/api/auth/signup', {
        email: data.email,
        password: data.password,
        role: 'provider',
        locale,
      });
      const userData = await userResponse.json();

      // Then create provider
      await apiRequest('POST', '/api/providers', {
        userId: userData.user.id,
        displayName: data.displayName,
        city: data.city,
        permits: { identity: true, permit: true, insurance: true }, // TODO: Upload actual files
      });

      return userData;
    },
    onSuccess: () => {
      toast({
        title: 'Inscription réussie',
        description: 'Votre compte sera vérifié sous 24-48h',
      });
      setLocation('/jobs');
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: "Impossible de créer le compte",
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async () => {
    signupMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
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
            <CardTitle className="text-2xl">{t('home.cta.provider')}</CardTitle>
            <p className="text-muted-foreground">
              Rejoignez notre réseau de prestataires vérifiés
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nom d'entreprise / Nom complet</Label>
                  <Input
                    id="displayName"
                    placeholder="Transport Express Maroc"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    data-testid="input-display-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@example.ma"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+212 6XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    data-testid="input-password"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!formData.displayName || !formData.city || !formData.email || !formData.password}
                  data-testid="button-continue-kyc"
                >
                  Continuer vers la vérification
                </Button>
              </div>
            )}

            {/* Step 2: KYC Upload */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <ShieldCheck className="w-5 h-5 text-accent mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Vérification KYC requise</p>
                    <p className="text-muted-foreground">
                      Pour garantir la sécurité de nos utilisateurs, tous les prestataires doivent soumettre des documents de vérification.
                    </p>
                  </div>
                </div>

                {/* Identity Document */}
                <div className="space-y-2">
                  <Label>Pièce d'identité (CIN/Passeport)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover-elevate cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('identity', e)}
                      className="hidden"
                      id="identity-upload"
                      data-testid="input-identity-upload"
                    />
                    <label htmlFor="identity-upload" className="cursor-pointer">
                      {kycFiles.identity ? (
                        <div className="flex items-center justify-center gap-2 text-accent">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">{kycFiles.identity.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Cliquez pour télécharger
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Transport Permit */}
                <div className="space-y-2">
                  <Label>Permis de transport / Licence professionnelle</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover-elevate cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('permit', e)}
                      className="hidden"
                      id="permit-upload"
                      data-testid="input-permit-upload"
                    />
                    <label htmlFor="permit-upload" className="cursor-pointer">
                      {kycFiles.permit ? (
                        <div className="flex items-center justify-center gap-2 text-accent">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">{kycFiles.permit.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Cliquez pour télécharger
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Insurance */}
                <div className="space-y-2">
                  <Label>Assurance professionnelle</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover-elevate cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('insurance', e)}
                      className="hidden"
                      id="insurance-upload"
                      data-testid="input-insurance-upload"
                    />
                    <label htmlFor="insurance-upload" className="cursor-pointer">
                      {kycFiles.insurance ? (
                        <div className="flex items-center justify-center gap-2 text-accent">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">{kycFiles.insurance.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Cliquez pour télécharger
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    data-testid="button-back"
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={!kycFiles.identity || !kycFiles.permit || !kycFiles.insurance}
                    data-testid="button-submit-provider"
                  >
                    Soumettre pour vérification
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
