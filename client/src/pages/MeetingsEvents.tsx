import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, CheckCircle2, FileText, Users, Wifi, 
  Coffee, Car, Tv, MapPin, Star 
} from "lucide-react";

type Venue = {
  id: string;
  providerId: string;
  name: string;
  description: string;
  type: string;
  city: string;
  address: string;
  totalCapacity: number;
  photoUrls: string[];
  amenities: any;
  pricing: any;
  verified: boolean;
  invoiceReady: boolean;
  slaResponseHours: number;
  status: string;
  rooms?: VenueRoom[];
};

type VenueRoom = {
  id: string;
  name: string;
  capacity: number;
  layout: string[];
  squareMeters: number;
  features: any;
  pricePerDayMad: number;
};

export default function MeetingsEvents() {
  const { locale } = useApp();
  const { t } = useTranslation(locale);
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [invoiceReadyOnly, setInvoiceReadyOnly] = useState(false);

  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ['/api/venues', cityFilter, typeFilter, verifiedOnly, invoiceReadyOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityFilter) params.append('city', cityFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (verifiedOnly) params.append('verified', 'true');
      if (invoiceReadyOnly) params.append('invoiceReady', 'true');
      
      const url = `/api/venues?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch venues');
      return res.json();
    },
  });

  const cities = ['Casablanca', 'Marrakech', 'Rabat', 'Fez', 'Tangier', 'Agadir'];
  const venueTypes = ['hotel', 'conference_center', 'restaurant', 'villa'];

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'catering': return <Coffee className="w-4 h-4" />;
      case 'parking': return <Car className="w-4 h-4" />;
      case 'av': return <Tv className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {t('mice.title')}
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            {t('mice.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('venue.filter.features')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('job.post.city')}</label>
                <Select value={cityFilter || "all"} onValueChange={(val) => setCityFilter(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-city-filter">
                    <SelectValue placeholder={t('job.post.city')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('venue.filter.features')}</label>
                <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {venueTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {t(`venue.type.${type}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant={verifiedOnly ? "default" : "outline"}
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="w-full"
                  data-testid="button-verified-filter"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('venue.verified')}
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  variant={invoiceReadyOnly ? "default" : "outline"}
                  onClick={() => setInvoiceReadyOnly(!invoiceReadyOnly)}
                  className="w-full"
                  data-testid="button-invoice-ready-filter"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('venue.invoice.ready')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12" data-testid="text-loading">
          {t('common.loading')}
        </div>
      ) : !venues || venues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No venues found with these filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <Card 
              key={venue.id} 
              className="hover-elevate cursor-pointer"
              data-testid={`card-venue-${venue.id}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-venue-name-${venue.id}`}>
                      {venue.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {venue.city}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {venue.verified && (
                      <Badge variant="default" className="gap-1" data-testid={`badge-verified-${venue.id}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {t('venue.verified')}
                      </Badge>
                    )}
                    {venue.invoiceReady && (
                      <Badge variant="secondary" className="gap-1" data-testid={`badge-invoice-${venue.id}`}>
                        <FileText className="w-3 h-3" />
                        Invoice
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span data-testid={`text-capacity-${venue.id}`}>
                    {venue.totalCapacity} {t('venue.room.capacity' as any).replace('{capacity}', String(venue.totalCapacity))}
                  </span>
                </div>

                {venue.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {venue.description}
                  </p>
                )}

                {venue.amenities && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(venue.amenities).map(([key, value]) => 
                      value ? (
                        <Badge key={key} variant="outline" className="gap-1">
                          {getAmenityIcon(key)}
                          {t(`venue.features.${key}` as any)}
                        </Badge>
                      ) : null
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{t('venue.sla.response' as any).replace('{hours}', String(venue.slaResponseHours))}</span>
                  </div>
                  <Button size="sm" data-testid={`button-view-venue-${venue.id}`}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
