import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useApp } from '@/contexts/AppContext';
import { useLocation, Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from '@/lib/i18n';

export default function Signup() {
  const { locale, setCurrentUser } = useApp();
  const { t } = useTranslation(locale);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer' as 'buyer' | 'provider',
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; role: string }) => {
      const response = await apiRequest('POST', '/api/auth/signup', {
        email: data.email,
        password: data.password,
        role: data.role,
        locale,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      toast({
        title: t('auth.signup.success'),
        description: t('auth.signup.success.message'),
      });
      
      // Redirect providers to complete their profile
      if (formData.role === 'provider') {
        setLocation('/provider/signup');
      } else {
        setLocation('/jobs');
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('auth.password.mismatch'),
      });
      return;
    }

    signupMutation.mutate({
      email: formData.email,
      password: formData.password,
      role: formData.role,
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="title-signup">{t('auth.signup')}</CardTitle>
          <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('auth.password.requirements')}
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('auth.confirm.password')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                data-testid="input-confirm-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label>{t('auth.role')}</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as 'buyer' | 'provider' })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" data-testid="radio-buyer" />
                  <Label htmlFor="buyer" className="font-normal cursor-pointer">
                    {t('auth.role.buyer')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="provider" id="provider" data-testid="radio-provider" />
                  <Label htmlFor="provider" className="font-normal cursor-pointer">
                    {t('auth.role.provider')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              type="submit"
              className="w-full"
              data-testid="button-signup"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? t('common.loading') : t('auth.signup')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.have.account')}{' '}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                {t('auth.login')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
