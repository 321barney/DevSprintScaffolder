import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, Eye } from "lucide-react";
import type { ServicePackage } from "@shared/schema";

export default function ServicePackages() {
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);

  const { data: packages, isLoading } = useQuery<ServicePackage[]>({
    queryKey: ["/api/service-packages"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-packages/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-packages"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Service Packages</h1>
          <p className="text-muted-foreground">
            Create Fiverr-style packages with Basic, Standard, and Premium tiers
          </p>
        </div>
        <Link href="/service-packages/create">
          <Button data-testid="button-create-package">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        </Link>
      </div>

      {!packages || packages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No packages yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first service package to start selling
            </p>
            <Link href="/service-packages/create">
              <Button data-testid="button-create-first-package">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Package
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="hover-elevate" data-testid={`card-package-${pkg.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1" data-testid="text-package-name">
                      {pkg.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {pkg.description}
                    </CardDescription>
                  </div>
                  <Badge variant={pkg.active ? "default" : "secondary"} data-testid="badge-package-status">
                    {pkg.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span data-testid="text-views">{pkg.views}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span data-testid="text-orders">{pkg.orders} orders</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Basic</span>
                    <span className="font-semibold" data-testid="text-basic-price">
                      {pkg.basicPriceMad} MAD
                    </span>
                  </div>
                  {pkg.standardPriceMad && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Standard</span>
                      <span className="font-semibold" data-testid="text-standard-price">
                        {pkg.standardPriceMad} MAD
                      </span>
                    </div>
                  )}
                  {pkg.premiumPriceMad && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Premium</span>
                      <span className="font-semibold" data-testid="text-premium-price">
                        {pkg.premiumPriceMad} MAD
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link href={`/service-packages/${pkg.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm" data-testid="button-edit-package">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this package?")) {
                        deleteMutation.mutate(pkg.id);
                      }
                    }}
                    data-testid="button-delete-package"
                  >
                    <Trash2 className="w-4 h-4" />
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
