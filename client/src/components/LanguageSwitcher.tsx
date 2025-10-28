import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { type Locale } from '@/lib/i18n';

const locales: { value: Locale; label: string; flag: string }[] = [
  { value: 'fr-MA', label: 'Français', flag: '🇫🇷' },
  { value: 'ar-MA', label: 'العربية', flag: '🇲🇦' },
  { value: 'en-US', label: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useApp();

  const currentLocale = locales.find(l => l.value === locale) || locales[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-language-switcher">
          <Languages className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{currentLocale.label}</span>
          <span className="sm:hidden">{currentLocale.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.value}
            onClick={() => setLocale(loc.value)}
            className="cursor-pointer"
            data-testid={`option-locale-${loc.value}`}
          >
            <span className="mr-2">{loc.flag}</span>
            {loc.label}
            {locale === loc.value && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
