import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { insertServicePackageSchema, type ServicePackage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Package, Image as ImageIcon, X, Plus } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [newImageUrl, setNewImageUrl] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "tour",
      name: "",
      description: "",
      photoUrls: [],
      basicTitle: "Essential",
      basicDescription: "",
      basicPriceMad: 0,
      basicDeliveryDays: 1,
      basicFeatures: [],
      standardTitle: "Enhanced",
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
        basicFeatures: Array.isArray(packageData.basicFeatures) ? packageData.basicFeatures : [],
        standardTitle: packageData.standardTitle || "Enhanced",
        standardDescription: packageData.standardDescription || "",
        standardPriceMad: packageData.standardPriceMad || undefined,
        standardDeliveryDays: packageData.standardDeliveryDays || undefined,
        standardFeatures: Array.isArray(packageData.standardFeatures) ? packageData.standardFeatures : [],
        premiumTitle: packageData.premiumTitle || "Premium",
        premiumDescription: packageData.premiumDescription || "",
        premiumPriceMad: packageData.premiumPriceMad || undefined,
        premiumDeliveryDays: packageData.premiumDeliveryDays || undefined,
        premiumFeatures: Array.isArray(packageData.premiumFeatures) ? packageData.premiumFeatures : [],
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

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      const currentUrls = form.getValues('photoUrls') || [];
      form.setValue('photoUrls', [...currentUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    const currentUrls = form.getValues('photoUrls') || [];
    form.setValue('photoUrls', currentUrls.filter((_, i) => i !== index));
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
          {isEditMode ? "Edit Tourism Package" : "Create Tourism Package"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode ? "Update your tourism package and pricing options" : "Create an unforgettable tourism experience with flexible pricing"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Package Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Package Overview</CardTitle>
              <CardDescription>
                Describe your tourism experience to attract travelers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Magical Marrakech & Sahara Desert Tour" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormDescription>
                      Choose a compelling name that captures the essence of your experience
                    </FormDescription>
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
                        placeholder="Describe what makes this experience special, what travelers will see and do..."
                        className="min-h-32"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Paint a vivid picture of the experience
                    </FormDescription>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make visible to travelers
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

          {/* Package Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Package Images
              </CardTitle>
              <CardDescription>
                Add photos to showcase your experience (recommended: at least 1 image)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Images */}
              {form.watch('photoUrls') && form.watch('photoUrls')!.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {form.watch('photoUrls')!.map((url, index) => (
                    <div key={index} className="relative group rounded-xl overflow-hidden border">
                      <img
                        src={url}
                        alt={`Package image ${index + 1}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3C/svg%3E';
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImageUrl(index)}
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md">
                            Main Image
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Image URL */}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImageUrl();
                    }
                  }}
                  data-testid="input-image-url"
                />
                <Button
                  type="button"
                  onClick={addImageUrl}
                  disabled={!newImageUrl.trim()}
                  data-testid="button-add-image"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                First image will be used as the main package image
              </p>
            </CardContent>
          </Card>

          {/* Pricing Options */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Options</CardTitle>
              <CardDescription>
                Offer different experience levels to cater to various traveler preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Essential</TabsTrigger>
                  <TabsTrigger value="standard">Enhanced</TabsTrigger>
                  <TabsTrigger value="premium">Premium</TabsTrigger>
                </TabsList>

                {/* Essential Tier */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="rounded-xl bg-muted/50 p-4 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Essential:</strong> Perfect for budget-conscious travelers who want the core experience
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="basicTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Essential Experience" data-testid="input-basic-title" />
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
                          <Textarea 
                            {...field} 
                            placeholder="What's included in the essential experience?"
                            className="min-h-24"
                            data-testid="input-basic-description"
                          />
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
                          <FormLabel>Duration (Days)</FormLabel>
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

                {/* Enhanced Tier */}
                <TabsContent value="standard" className="space-y-4 mt-6">
                  <div className="rounded-xl bg-muted/50 p-4 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Enhanced:</strong> The most popular choice with additional perks and comfort (Optional)
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="standardTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Enhanced Experience" data-testid="input-standard-title" />
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
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="What extras are included in the enhanced experience?"
                            className="min-h-24"
                            data-testid="input-standard-description"
                          />
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
                              placeholder="Leave empty to disable"
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
                          <FormLabel>Duration (Days)</FormLabel>
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

                {/* Premium Tier */}
                <TabsContent value="premium" className="space-y-4 mt-6">
                  <div className="rounded-xl bg-muted/50 p-4 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Premium:</strong> The ultimate luxury experience with VIP treatment (Optional)
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="premiumTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Premium Experience" data-testid="input-premium-title" />
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
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="What luxury features are included?"
                            className="min-h-24"
                            data-testid="input-premium-description"
                          />
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
                              placeholder="Leave empty to disable"
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
                          <FormLabel>Duration (Days)</FormLabel>
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

          {/* Action Buttons */}
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
