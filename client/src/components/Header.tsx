import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { Plus, Briefcase } from 'lucide-react';

export function Header() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [location, setLocation] = useLocation();

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
            variant={location.startsWith('/jobs') ? 'secondary' : 'ghost'}
            onClick={() => setLocation('/jobs')}
            data-testid="nav-jobs"
          >
            {t('nav.jobs')}
          </Button>
          <Button
            variant={location.startsWith('/messages') ? 'secondary' : 'ghost'}
            onClick={() => setLocation('/messages')}
            data-testid="nav-messages"
          >
            {t('nav.messages')}
          </Button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setLocation('/post-job')}
            className="hidden sm:flex"
            data-testid="button-header-post-job"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('home.cta.post')}
          </Button>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
