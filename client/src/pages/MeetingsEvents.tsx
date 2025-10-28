import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVenueSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, CheckCircle2, FileText, Users, Wifi, 
  Coffee, Car, Tv, MapPin, Star, Palmtree, ArrowRight, Plus 
} from "lucide-react";

const venueFormSchema = insertVenueSchema.omit({ id: true, providerId: true, createdAt: true, updatedAt: true, verified: true }).extend({
  amenities: z.object({
    wifi: z.boolean().default(false),
    catering: z.boolean().default(false),
    parking: z.boolean().default(false),
    av: z.boolean().default(false),
  }).optional().default({ wifi: false, catering: false, parking: false, av: false }),
});

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
  const { locale, currentUser } = useApp();
  const { t } = useTranslation(locale);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [invoiceReadyOnly, setInvoiceReadyOnly] = useState(false);
  const [createVenueOpen, setCreateVenueOpen] = useState(false);

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
  const venueTypes = ['hotel', 'conference_center', 'coworking', 'event_space', 'other'];

  const venueForm = useForm<z.infer<typeof venueFormSchema>>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'hotel',
      city: '',
      address: '',
      totalCapacity: 1,
      slaResponseHours: 24,
      amenities: {
        wifi: false,
        catering: false,
        parking: false,
        av: false,
      },
      invoiceReady: false,
    },
  });

  const createVenueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof venueFormSchema>) => {
      return apiRequest('POST', '/api/venues', { ...data, status: 'active' });
    },
    onSuccess: () => {
      toast({
        title: "Venue created",
        description: "Your venue has been added successfully.",
      });
      venueForm.reset();
      setCreateVenueOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/venues'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create venue.",
        variant: "destructive",
      });
    },
  });

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              {t('mice.title')}
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">
              {t('mice.subtitle')}
            </p>
          </div>
          {currentUser?.role === 'provider' && (
            <Dialog open={createVenueOpen} onOpenChange={setCreateVenueOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-venue">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Venue</DialogTitle>
                  <DialogDescription>
                    Add your meeting space, conference center, or event venue
                  </DialogDescription>
                </DialogHeader>
                <Form {...venueForm}>
                  <form onSubmit={venueForm.handleSubmit((data) => createVenueMutation.mutate(data))}>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={venueForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Venue Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Royal Palace Hotel"
                                  data-testid="input-venue-name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={venueForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Venue Type *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-venue-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {venueTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                      {t(`venue.type.${type}` as any)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={venueForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your venue, facilities, and unique features..."
                                rows={3}
                                data-testid="input-venue-description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={venueForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-venue-city">
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cities.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={venueForm.control}
                          name="totalCapacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Capacity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="500"
                                  min="1"
                                  data-testid="input-venue-capacity"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={venueForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Avenue Hassan II"
                                data-testid="input-venue-address"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={venueForm.control}
                        name="slaResponseHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SLA Response Time (hours)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="24"
                                min="1"
                                data-testid="input-venue-sla"
                                {...field}
                                value={field.value || 24}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <Label>Amenities</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={venueForm.control}
                            name="amenities.wifi"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch
                                    id="wifi"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-wifi"
                                  />
                                </FormControl>
                                <Label htmlFor="wifi" className="cursor-pointer">WiFi</Label>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={venueForm.control}
                            name="amenities.catering"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch
                                    id="catering"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-catering"
                                  />
                                </FormControl>
                                <Label htmlFor="catering" className="cursor-pointer">Catering</Label>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={venueForm.control}
                            name="amenities.parking"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch
                                    id="parking"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-parking"
                                  />
                                </FormControl>
                                <Label htmlFor="parking" className="cursor-pointer">Parking</Label>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={venueForm.control}
                            name="amenities.av"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch
                                    id="av"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-av"
                                  />
                                </FormControl>
                                <Label htmlFor="av" className="cursor-pointer">AV Equipment</Label>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <FormField
                        control={venueForm.control}
                        name="invoiceReady"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 pt-2">
                            <FormControl>
                              <Switch
                                id="invoiceReady"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-invoice-ready"
                              />
                            </FormControl>
                            <Label htmlFor="invoiceReady" className="cursor-pointer">
                              Invoice Ready (VAT-compliant invoicing available)
                            </Label>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateVenueOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createVenueMutation.isPending} data-testid="button-submit-venue">
                        {createVenueMutation.isPending ? "Creating..." : "Create Venue"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
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

        {/* Bleisure Packages Promotion */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Palmtree className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Combine Business with Leisure</h3>
                  <p className="text-muted-foreground">
                    Explore bleisure packages with integrated coworking spaces across Morocco
                  </p>
                </div>
              </div>
              <Button 
                size="lg"
                onClick={() => setLocation('/bleisure')}
                data-testid="button-view-bleisure"
              >
                View Bleisure Packages
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
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
