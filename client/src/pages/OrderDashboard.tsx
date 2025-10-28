import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Calendar, DollarSign, FileText } from "lucide-react";
import type { PackageOrder } from "@shared/schema";
import { format } from "date-fns";

interface PackageOrderWithDetails extends PackageOrder {
  package?: {
    name: string;
    category: string;
  };
}

export default function OrderDashboard() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery<PackageOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      in_progress: "default",
      delivered: "default",
      revision: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return colors[status] || "secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      delivered: "Delivered",
      revision: "Revision",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-orders">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                My Orders
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your service package orders
              </p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({statusCounts.pending || 0})
              </TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-in-progress">
                In Progress ({statusCounts.in_progress || 0})
              </TabsTrigger>
              <TabsTrigger value="delivered" data-testid="tab-delivered">
                Delivered ({statusCounts.delivered || 0})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed ({statusCounts.completed || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mb-4" data-testid="icon-empty-orders" />
              <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
                No orders found
              </h3>
              <p className="text-muted-foreground mb-6 text-center" data-testid="text-empty-description">
                {statusFilter === "all" 
                  ? "You haven't placed any orders yet"
                  : `No ${getStatusLabel(statusFilter).toLowerCase()} orders`}
              </p>
              <Button onClick={() => setLocation("/service-packages")} data-testid="button-browse-packages">
                Browse Service Packages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="line-clamp-1" data-testid="text-package-name">
                          {order.package?.name || "Package Order"}
                        </CardTitle>
                        <Badge variant={getStatusColor(order.status)} data-testid="badge-status">
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span data-testid="text-tier">{getTierLabel(order.tier)} Tier</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span data-testid="text-price">{order.totalPriceMad} MAD</span>
                        </span>
                        {order.deliveryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span data-testid="text-delivery-date">
                              Delivery: {format(new Date(order.deliveryDate), "MMM dd, yyyy")}
                            </span>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/jobs/${order.jobId}`)}
                        data-testid="button-view-details"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.requirements && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Requirements
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-requirements">
                        {order.requirements}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Order ID:</span>{" "}
                      <span data-testid="text-order-id">{order.id.slice(0, 8)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Revisions:</span>{" "}
                      <span data-testid="text-revisions">
                        {order.revisions} / {order.maxRevisions}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      <span data-testid="text-created-at">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(order.deliverables) && order.deliverables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Deliverables</h4>
                      <div className="space-y-1">
                        {order.deliverables.map((deliverable: any, index: number) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            {typeof deliverable === 'string' ? deliverable : deliverable.name || deliverable.url}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
