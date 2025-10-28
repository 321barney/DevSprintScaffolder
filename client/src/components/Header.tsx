import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Briefcase, LogOut, LogIn, UserPlus } from 'lucide-react';

export function Header() {
  const { locale, currentUser, setCurrentUser } = useApp();
  const { t } = useTranslation(locale);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      setCurrentUser(null);
      toast({
        title: t('auth.logout.success'),
      });
      setLocation('/');
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 font-bold text-xl hover-elevate active-elevate-2 rounded-md px-3 py-2 -ml-3"
          data-testid="button-logo"
        >
          <Briefcase className="w-6 h-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('app.title')}
          </span>
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant={location === '/' ? 'secondary' : 'ghost'}
            onClick={() => setLocation('/')}
            data-testid="nav-home"
          >
            {t('nav.home')}
          </Button>
          <Button
            variant={location.startsWith('/browse') ? 'secondary' : 'ghost'}
            onClick={() => setLocation('/browse')}
            data-testid="nav-browse"
          >
            {t('nav.browse')}
          </Button>
          {currentUser && (
            <Button
              variant={location.startsWith('/jobs') ? 'secondary' : 'ghost'}
              onClick={() => setLocation('/jobs')}
              data-testid="nav-jobs"
            >
              {t('nav.jobs')}
            </Button>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              {currentUser.role === 'buyer' && (
                <Button
                  size="sm"
                  onClick={() => setLocation('/post-job')}
                  className="hidden sm:flex"
                  data-testid="button-header-post-job"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('home.cta.post')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/messages')}
                data-testid="button-messages"
              >
                {t('nav.messages')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/login')}
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t('auth.login')}
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation('/signup')}
                data-testid="button-signup"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t('auth.signup')}
              </Button>
            </>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
