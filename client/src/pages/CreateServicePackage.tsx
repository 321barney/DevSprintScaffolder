import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { insertServicePackageSchema, type ServicePackage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";
import { useEffect } from "react";

const formSchema = insertServicePackageSchema.extend({
  basicFeatures: z.array(z.string()).optional(),
  standardFeatures: z.array(z.string()).optional(),
  premiumFeatures: z.array(z.string()).optional(),
});

export default function CreateServicePackage() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditMode = !!id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "tour",
      name: "",
      description: "",
      photoUrls: [],
      basicTitle: "Basic",
      basicDescription: "",
      basicPriceMad: 0,
      basicDeliveryDays: 1,
      basicFeatures: [],
      standardTitle: "Standard",
      standardDescription: "",
      standardPriceMad: undefined,
      standardDeliveryDays: undefined,
      standardFeatures: [],
      premiumTitle: "Premium",
      premiumDescription: "",
      premiumPriceMad: undefined,
      premiumDeliveryDays: undefined,
      premiumFeatures: [],
      extras: [],
      active: true,
    },
  });

  const { data: packageData, isLoading: isLoadingPackage } = useQuery<ServicePackage>({
    queryKey: [`/api/service-packages/${id}`],
    enabled: isEditMode,
  });

  useEffect(() => {
    if (packageData && isEditMode) {
      form.reset({
        category: packageData.category,
        name: packageData.name,
        description: packageData.description,
        photoUrls: packageData.photoUrls || [],
        basicTitle: packageData.basicTitle,
        basicDescription: packageData.basicDescription || "",
        basicPriceMad: packageData.basicPriceMad,
        basicDeliveryDays: packageData.basicDeliveryDays,
        basicFeatures: packageData.basicFeatures || [],
        standardTitle: packageData.standardTitle || "Standard",
        standardDescription: packageData.standardDescription || "",
        standardPriceMad: packageData.standardPriceMad || undefined,
        standardDeliveryDays: packageData.standardDeliveryDays || undefined,
        standardFeatures: packageData.standardFeatures || [],
        premiumTitle: packageData.premiumTitle || "Premium",
        premiumDescription: packageData.premiumDescription || "",
        premiumPriceMad: packageData.premiumPriceMad || undefined,
        premiumDeliveryDays: packageData.premiumDeliveryDays || undefined,
        premiumFeatures: packageData.premiumFeatures || [],
        extras: packageData.extras || [],
        active: packageData.active,
      });
    }
  }, [packageData, isEditMode, form]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("POST", "/api/service-packages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-packages"] });
      toast({
        title: "Success",
        description: "Service package created successfully!",
      });
      setLocation("/service-packages");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("PATCH", `/api/service-packages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-packages"] });
      queryClient.invalidateQueries({ queryKey: [`/api/service-packages/${id}`] });
      toast({
        title: "Success",
        description: "Service package updated successfully!",
      });
      setLocation("/service-packages");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditMode && isLoadingPackage) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-10 w-96 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const isPending = isEditMode ? updateMutation.isPending : createMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Package className="w-8 h-8" />
          {isEditMode ? "Edit Service Package" : "Create Service Package"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode ? "Update your Fiverr-style package with 3 pricing tiers" : "Build a Fiverr-style package with 3 pricing tiers"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Package Details</CardTitle>
              <CardDescription>Basic information about your service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Casablanca City Tour" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this package offers..."
                        className="min-h-24"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Controller
                        name="category"
                        control={form.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="transport">Transport</SelectItem>
                              <SelectItem value="tour">Tour</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="venue">Venue</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Package visible to buyers
                        </div>
                      </div>
                      <FormControl>
                        <Controller
                          name="active"
                          control={form.control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          )}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Tiers</CardTitle>
              <CardDescription>
                Create up to 3 pricing tiers (Basic is required)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="premium">Premium</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="basicTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-basic-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basicDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-basic-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="basicPriceMad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (MAD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-basic-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicDeliveryDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-basic-delivery"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="standard" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="standardTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-standard-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="standardDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} data-testid="input-standard-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="standardPriceMad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (MAD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-standard-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="standardDeliveryDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-standard-delivery"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="premium" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="premiumTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-premium-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="premiumDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} data-testid="input-premium-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="premiumPriceMad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (MAD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-premium-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="premiumDeliveryDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              data-testid="input-premium-delivery"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/service-packages")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Package" : "Create Package")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
