import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Briefcase, Coffee, MapPin, Users, Wifi, Calendar, DollarSign, Plus } from "lucide-react";

const MOROCCO_CITIES = ["Casablanca", "Marrakech", "Rabat", "Fes", "Tangier", "Agadir", "Essaouira"];

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
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/bleisure-packages', data);
    },
    onSuccess: () => {
      toast({
        title: "Package created",
        description: "Your bleisure package has been added successfully.",
      });
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
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/coworking-spaces', data);
    },
    onSuccess: () => {
      toast({
        title: "Coworking space created",
        description: "Your coworking space has been added successfully.",
      });
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
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createPackageMutation.mutate({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    city: formData.get('city'),
                    durationDays: parseInt(formData.get('durationDays') as string),
                    durationNights: parseInt(formData.get('durationNights') as string),
                    pricePerPersonMad: parseFloat(formData.get('pricePerPersonMad') as string),
                    includesCoworking: formData.get('includesCoworking') === 'on',
                    coworkingHours: parseInt(formData.get('coworkingHours') as string) || null,
                    status: 'active',
                  });
                }}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pkg-name">Package Name *</Label>
                      <Input
                        id="pkg-name"
                        name="name"
                        placeholder="Marrakech Business & Culture Experience"
                        required
                        data-testid="input-package-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pkg-description">Description *</Label>
                      <Textarea
                        id="pkg-description"
                        name="description"
                        placeholder="Describe what's included in this package..."
                        rows={3}
                        required
                        data-testid="input-package-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pkg-city">City *</Label>
                        <Select name="city" required>
                          <SelectTrigger data-testid="select-package-city">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOROCCO_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pkg-price">Price per Person (MAD) *</Label>
                        <Input
                          id="pkg-price"
                          name="pricePerPersonMad"
                          type="number"
                          step="0.01"
                          placeholder="5000"
                          min="0"
                          required
                          data-testid="input-package-price"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pkg-days">Duration (Days) *</Label>
                        <Input
                          id="pkg-days"
                          name="durationDays"
                          type="number"
                          placeholder="5"
                          min="1"
                          required
                          data-testid="input-package-days"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pkg-nights">Duration (Nights) *</Label>
                        <Input
                          id="pkg-nights"
                          name="durationNights"
                          type="number"
                          placeholder="4"
                          min="0"
                          required
                          data-testid="input-package-nights"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch name="includesCoworking" id="includesCoworking" data-testid="switch-includes-coworking" />
                      <Label htmlFor="includesCoworking" className="cursor-pointer">
                        Includes Coworking Space Access
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pkg-coworking-hours">Coworking Hours (optional)</Label>
                      <Input
                        id="pkg-coworking-hours"
                        name="coworkingHours"
                        type="number"
                        placeholder="40"
                        min="0"
                        data-testid="input-coworking-hours"
                      />
                    </div>
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
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amenities = formData.get('amenities') ? 
                    (formData.get('amenities') as string).split(',').map(a => a.trim()) : [];
                  
                  createSpaceMutation.mutate({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    city: formData.get('city'),
                    address: formData.get('address'),
                    capacity: parseInt(formData.get('capacity') as string),
                    hourlyRateMad: parseFloat(formData.get('hourlyRateMad') as string) || null,
                    dailyRateMad: parseFloat(formData.get('dailyRateMad') as string) || null,
                    monthlyRateMad: parseFloat(formData.get('monthlyRateMad') as string) || null,
                    amenities,
                    verified: false,
                    status: 'active',
                  });
                }}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="space-name">Space Name *</Label>
                      <Input
                        id="space-name"
                        name="name"
                        placeholder="Downtown Coworking Hub"
                        required
                        data-testid="input-space-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="space-description">Description *</Label>
                      <Textarea
                        id="space-description"
                        name="description"
                        placeholder="Describe your coworking space, facilities, and atmosphere..."
                        rows={3}
                        required
                        data-testid="input-space-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="space-city">City *</Label>
                        <Select name="city" required>
                          <SelectTrigger data-testid="select-space-city">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOROCCO_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="space-capacity">Capacity *</Label>
                        <Input
                          id="space-capacity"
                          name="capacity"
                          type="number"
                          placeholder="50"
                          min="1"
                          required
                          data-testid="input-space-capacity"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="space-address">Address *</Label>
                      <Input
                        id="space-address"
                        name="address"
                        placeholder="123 Boulevard Mohammed V"
                        required
                        data-testid="input-space-address"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="space-hourly">Hourly Rate (MAD)</Label>
                        <Input
                          id="space-hourly"
                          name="hourlyRateMad"
                          type="number"
                          step="0.01"
                          placeholder="50"
                          min="0"
                          data-testid="input-space-hourly"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="space-daily">Daily Rate (MAD)</Label>
                        <Input
                          id="space-daily"
                          name="dailyRateMad"
                          type="number"
                          step="0.01"
                          placeholder="300"
                          min="0"
                          data-testid="input-space-daily"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="space-monthly">Monthly Rate (MAD)</Label>
                        <Input
                          id="space-monthly"
                          name="monthlyRateMad"
                          type="number"
                          step="0.01"
                          placeholder="5000"
                          min="0"
                          data-testid="input-space-monthly"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="space-amenities">Amenities (comma-separated)</Label>
                      <Input
                        id="space-amenities"
                        name="amenities"
                        placeholder="WiFi, Coffee, Meeting Rooms, Prayer Room"
                        data-testid="input-space-amenities"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter amenities separated by commas
                      </p>
                    </div>
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
