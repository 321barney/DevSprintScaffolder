import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { insertBleisurePackageSchema, insertCoworkingSpaceSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Briefcase, Coffee, MapPin, Users, Wifi, Calendar, DollarSign, Plus } from "lucide-react";

const MOROCCO_CITIES = ["Casablanca", "Marrakech", "Rabat", "Fes", "Tangier", "Agadir", "Essaouira"];

const bleisurePackageFormSchema = insertBleisurePackageSchema.omit({ 
  id: true, 
  providerId: true, 
  createdAt: true, 
  updatedAt: true, 
  status: true 
}).extend({
  businessInclusions: z.array(z.string()).default([]),
  leisureInclusions: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
});

const coworkingSpaceFormSchema = insertCoworkingSpaceSchema.omit({ 
  id: true, 
  providerId: true, 
  createdAt: true, 
  verified: true,
  rating: true,
}).extend({
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  openingHours: z.record(z.any()).default({}),
});

export default function Bleisure() {
  const { toast } = useToast();
  const { currentUser } = useApp();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [createPackageOpen, setCreatePackageOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [participants, setParticipants] = useState<number>(1);

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['/api/bleisure-packages', selectedCity],
    enabled: selectedCity !== "all" || true,
  });

  const { data: coworkingSpaces = [], isLoading: loadingSpaces } = useQuery({
    queryKey: ['/api/coworking-spaces', selectedCity],
    enabled: selectedCity !== "all" || true,
  });

  const packageForm = useForm<z.infer<typeof bleisurePackageFormSchema>>({
    resolver: zodResolver(bleisurePackageFormSchema),
    defaultValues: {
      title: '',
      description: '',
      city: '',
      businessDays: 1,
      leisureDays: 1,
      businessInclusions: [],
      leisureInclusions: [],
      pricePerPersonMad: 1000,
      minParticipants: 1,
      maxParticipants: 10,
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      coworkingIncluded: false,
      photos: [],
    },
  });

  const spaceForm = useForm<z.infer<typeof coworkingSpaceFormSchema>>({
    resolver: zodResolver(coworkingSpaceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      city: '',
      address: '',
      capacity: 1,
      amenities: [],
      hourlyRateMad: 50,
      dailyRateMad: 300,
      monthlyRateMad: 5000,
      meetingRoomsAvailable: 0,
      highSpeedInternet: true,
      prayerRoom: false,
      photos: [],
      openingHours: {},
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/bleisure-bookings', data);
    },
    onSuccess: () => {
      toast({
        title: "Booking created",
        description: "Your bleisure package has been booked successfully.",
      });
      setBookingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bleisure-bookings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error.message || "Failed to create booking.",
        variant: "destructive",
      });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bleisurePackageFormSchema>) => {
      return apiRequest('POST', '/api/bleisure-packages', { ...data, status: 'active' });
    },
    onSuccess: () => {
      toast({
        title: "Package created",
        description: "Your bleisure package has been added successfully.",
      });
      packageForm.reset();
      setCreatePackageOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bleisure-packages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create package.",
        variant: "destructive",
      });
    },
  });

  const createSpaceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof coworkingSpaceFormSchema>) => {
      return apiRequest('POST', '/api/coworking-spaces', data);
    },
    onSuccess: () => {
      toast({
        title: "Coworking space created",
        description: "Your coworking space has been added successfully.",
      });
      spaceForm.reset();
      setCreateSpaceOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/coworking-spaces'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create coworking space.",
        variant: "destructive",
      });
    },
  });

  const handleBookPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setParticipants(1);
    setBookingDialogOpen(true);
  };

  const confirmBooking = () => {
    if (!selectedPackage) return;

    const totalPrice = selectedPackage.pricePerPersonMad * participants;
    
    bookingMutation.mutate({
      packageId: selectedPackage.id,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      participants,
      totalPriceMad: totalPrice,
      status: 'pending',
    });
  };

  const filteredPackages = selectedCity === "all" 
    ? packages 
    : packages.filter((pkg: any) => pkg.city === selectedCity);

  const filteredSpaces = selectedCity === "all"
    ? coworkingSpaces
    : coworkingSpaces.filter((space: any) => space.city === selectedCity);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold mb-2">Bleisure in Morocco</h1>
          <p className="text-muted-foreground text-lg">
            Combine business and leisure with curated packages and coworking spaces
          </p>
        </div>
        {currentUser?.role === 'provider' && (
          <div className="flex gap-2">
            <Dialog open={createPackageOpen} onOpenChange={setCreatePackageOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-package">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Bleisure Package</DialogTitle>
                  <DialogDescription>
                    Offer a combined business and leisure travel package
                  </DialogDescription>
                </DialogHeader>
                <Form {...packageForm}>
                  <form onSubmit={packageForm.handleSubmit((data) => createPackageMutation.mutate(data))}>
                    <div className="space-y-4 py-4">
                      <FormField
                        control={packageForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Marrakech Business & Culture Experience"
                                data-testid="input-package-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={packageForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe what's included in this package..."
                                rows={3}
                                data-testid="input-package-description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={packageForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-package-city">
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {MOROCCO_CITIES.map((city) => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={packageForm.control}
                          name="pricePerPersonMad"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price per Person (MAD) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="5000"
                                  min="0"
                                  data-testid="input-package-price"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={packageForm.control}
                          name="businessDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Days *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="3"
                                  min="1"
                                  data-testid="input-package-days"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={packageForm.control}
                          name="leisureDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Leisure Days *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="2"
                                  min="0"
                                  data-testid="input-package-nights"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={packageForm.control}
                          name="minParticipants"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Participants *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  min="1"
                                  data-testid="input-min-participants"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={packageForm.control}
                          name="maxParticipants"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Participants *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="10"
                                  min="1"
                                  data-testid="input-max-participants"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={packageForm.control}
                          name="availableFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available From *</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  data-testid="input-available-from"
                                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(new Date(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={packageForm.control}
                          name="availableTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available To *</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  data-testid="input-available-to"
                                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(new Date(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={packageForm.control}
                        name="coworkingIncluded"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 pt-2">
                            <FormControl>
                              <Switch
                                id="coworkingIncluded"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-includes-coworking"
                              />
                            </FormControl>
                            <Label htmlFor="coworkingIncluded" className="cursor-pointer">
                              Includes Coworking Space Access
                            </Label>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreatePackageOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createPackageMutation.isPending} data-testid="button-submit-package">
                        {createPackageMutation.isPending ? "Creating..." : "Create Package"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={createSpaceOpen} onOpenChange={setCreateSpaceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-create-space">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Coworking Space
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Coworking Space</DialogTitle>
                  <DialogDescription>
                    List your coworking space for business travelers
                  </DialogDescription>
                </DialogHeader>
                <Form {...spaceForm}>
                  <form onSubmit={spaceForm.handleSubmit((data) => createSpaceMutation.mutate(data))}>
                    <div className="space-y-4 py-4">
                      <FormField
                        control={spaceForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Space Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Downtown Coworking Hub"
                                data-testid="input-space-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={spaceForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your coworking space, facilities, and atmosphere..."
                                rows={3}
                                data-testid="input-space-description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={spaceForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-space-city">
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {MOROCCO_CITIES.map((city) => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={spaceForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="50"
                                  min="1"
                                  data-testid="input-space-capacity"
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
                        control={spaceForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Boulevard Mohammed V"
                                data-testid="input-space-address"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={spaceForm.control}
                          name="hourlyRateMad"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hourly Rate (MAD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="50"
                                  min="0"
                                  data-testid="input-space-hourly"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={spaceForm.control}
                          name="dailyRateMad"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Daily Rate (MAD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="300"
                                  min="0"
                                  data-testid="input-space-daily"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={spaceForm.control}
                          name="monthlyRateMad"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Rate (MAD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="5000"
                                  min="0"
                                  data-testid="input-space-monthly"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={spaceForm.control}
                        name="amenities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amenities (comma-separated)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="WiFi, Coffee, Meeting Rooms, Prayer Room"
                                data-testid="input-space-amenities"
                                value={field.value?.join(', ') || ''}
                                onChange={(e) => {
                                  const amenitiesArray = e.target.value
                                    ? e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                                    : [];
                                  field.onChange(amenitiesArray);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Enter amenities separated by commas
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={spaceForm.control}
                          name="highSpeedInternet"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  id="highSpeedInternet"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-high-speed-internet"
                                />
                              </FormControl>
                              <Label htmlFor="highSpeedInternet" className="cursor-pointer">
                                High-Speed Internet
                              </Label>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={spaceForm.control}
                          name="prayerRoom"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  id="prayerRoom"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-prayer-room"
                                />
                              </FormControl>
                              <Label htmlFor="prayerRoom" className="cursor-pointer">
                                Prayer Room Available
                              </Label>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={spaceForm.control}
                        name="meetingRoomsAvailable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meeting Rooms Available</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2"
                                min="0"
                                data-testid="input-meeting-rooms"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateSpaceOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSpaceMutation.isPending} data-testid="button-submit-space">
                        {createSpaceMutation.isPending ? "Creating..." : "Create Space"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <Label htmlFor="city-filter" className="font-medium">Filter by city:</Label>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger id="city-filter" className="w-[200px]" data-testid="select-city-filter">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {MOROCCO_CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="packages" data-testid="tab-packages">
            <Briefcase className="w-4 h-4 mr-2" />
            Bleisure Packages
          </TabsTrigger>
          <TabsTrigger value="coworking" data-testid="tab-coworking">
            <Coffee className="w-4 h-4 mr-2" />
            Coworking Spaces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          {loadingPackages ? (
            <div className="text-center py-12">Loading packages...</div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bleisure packages available for this city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map((pkg: any) => (
                <Card key={pkg.id} className="flex flex-col" data-testid={`card-package-${pkg.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                        {pkg.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {pkg.city}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm">{pkg.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{pkg.durationDays} days / {pkg.durationNights} nights</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-muted-foreground" />
                        <span>Coworking included: {pkg.includesCoworking ? 'Yes' : 'No'}</span>
                      </div>
                      {pkg.coworkingHours && (
                        <div className="text-xs text-muted-foreground">
                          {pkg.coworkingHours} hours of coworking access
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 items-stretch">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {pkg.pricePerPersonMad.toLocaleString()} MAD
                      </span>
                      <span className="text-sm text-muted-foreground">per person</span>
                    </div>
                    <Button 
                      onClick={() => handleBookPackage(pkg)}
                      className="w-full"
                      data-testid={`button-book-${pkg.id}`}
                    >
                      Book Package
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coworking">
          {loadingSpaces ? (
            <div className="text-center py-12">Loading coworking spaces...</div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No coworking spaces available for this city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpaces.map((space: any) => (
                <Card key={space.id} className="flex flex-col" data-testid={`card-space-${space.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl">{space.name}</CardTitle>
                      {space.verified && (
                        <Badge variant="default">Verified</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {space.city}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm">{space.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>Capacity: {space.capacity}</span>
                      </div>
                      {space.amenities && space.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {space.amenities.slice(0, 4).map((amenity: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {space.amenities.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{space.amenities.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 items-stretch">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {space.hourlyRateMad && (
                        <div className="text-center">
                          <div className="font-semibold">{space.hourlyRateMad} MAD</div>
                          <div className="text-xs text-muted-foreground">hourly</div>
                        </div>
                      )}
                      {space.dailyRateMad && (
                        <div className="text-center">
                          <div className="font-semibold">{space.dailyRateMad} MAD</div>
                          <div className="text-xs text-muted-foreground">daily</div>
                        </div>
                      )}
                      {space.monthlyRateMad && (
                        <div className="text-center">
                          <div className="font-semibold">{space.monthlyRateMad} MAD</div>
                          <div className="text-xs text-muted-foreground">monthly</div>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full" data-testid={`button-contact-${space.id}`}>
                      Contact Space
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent data-testid="dialog-booking">
          <DialogHeader>
            <DialogTitle>Book Bleisure Package</DialogTitle>
            <DialogDescription>
              {selectedPackage?.name} in {selectedPackage?.city}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="participants">Number of Participants</Label>
              <Input
                id="participants"
                type="number"
                min="1"
                value={participants}
                onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                data-testid="input-participants"
              />
            </div>
            {selectedPackage && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Price per person:</span>
                  <span className="font-semibold">{selectedPackage.pricePerPersonMad} MAD</span>
                </div>
                <div className="flex justify-between">
                  <span>Participants:</span>
                  <span className="font-semibold">{participants}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">
                    {(selectedPackage.pricePerPersonMad * participants).toLocaleString()} MAD
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmBooking} 
              disabled={bookingMutation.isPending}
              data-testid="button-confirm-booking"
            >
              {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
