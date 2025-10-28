import { Truck, MapPin, Briefcase, CreditCard, type LucideIcon } from 'lucide-react';

const categoryIcons: Record<string, LucideIcon> = {
  transport: Truck,
  tour: MapPin,
  service: Briefcase,
  financing: CreditCard,
};

const categoryColors: Record<string, string> = {
  transport: 'text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-400',
  tour: 'text-green-600 bg-green-100 dark:bg-green-950 dark:text-green-400',
  service: 'text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-400',
  financing: 'text-orange-600 bg-orange-100 dark:bg-orange-950 dark:text-orange-400',
};

interface CategoryIconProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

export function CategoryIcon({ category, size = 'md', showBackground = true }: CategoryIconProps) {
  const Icon = categoryIcons[category] || Briefcase;
  const colorClass = categoryColors[category] || categoryColors.service;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  if (showBackground) {
    return (
      <div className={`${containerSizes[size]} rounded-lg ${colorClass} flex items-center justify-center`}>
        <Icon className={sizeClasses[size]} />
      </div>
    );
  }

  return <Icon className={`${sizeClasses[size]} ${colorClass}`} />;
}
