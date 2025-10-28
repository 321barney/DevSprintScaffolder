import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, DollarSign, Users, Calendar, BarChart3, PieChart } from "lucide-react";

export default function Analytics() {
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current-quarter");

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: savingsData = [], isLoading: loadingSavings } = useQuery({
    queryKey: ['/api/savings-attributions', selectedCompany],
    enabled: !!selectedCompany,
  });

  const { data: cohortData = [], isLoading: loadingCohorts } = useQuery({
    queryKey: ['/api/cohort-analyses'],
  });

  const totalSavings = savingsData.reduce((sum: number, item: any) => 
    sum + (item.negotiatedRates || 0) + (item.earlyBooking || 0) + 
    (item.volumeDiscounts || 0) + (item.bleisurePackages || 0) + 
    (item.consolidation || 0), 0
  );

  const savingsByCategory = savingsData.length > 0 ? {
    negotiatedRates: savingsData.reduce((sum: number, item: any) => sum + (item.negotiatedRates || 0), 0),
    earlyBooking: savingsData.reduce((sum: number, item: any) => sum + (item.earlyBooking || 0), 0),
    volumeDiscounts: savingsData.reduce((sum: number, item: any) => sum + (item.volumeDiscounts || 0), 0),
    bleisurePackages: savingsData.reduce((sum: number, item: any) => sum + (item.bleisurePackages || 0), 0),
    consolidation: savingsData.reduce((sum: number, item: any) => sum + (item.consolidation || 0), 0),
  } : null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Track savings attribution and customer lifetime value
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <Label htmlFor="company-select" className="font-medium">Company:</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger id="company-select" className="w-[250px]" data-testid="select-company">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company: any) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="savings" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="savings" data-testid="tab-savings">
            <DollarSign className="w-4 h-4 mr-2" />
            Savings Attribution
          </TabsTrigger>
          <TabsTrigger value="cohorts" data-testid="tab-cohorts">
            <Users className="w-4 h-4 mr-2" />
            Cohort Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="space-y-6">
          {!selectedCompany ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a company to view savings attribution</p>
              </CardContent>
            </Card>
          ) : loadingSavings ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p>Loading savings data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                    <TrendingDown className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {totalSavings.toLocaleString()} MAD
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all categories
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reporting Periods</CardTitle>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{savingsData.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total periods tracked
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                    <PieChart className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {savingsByCategory && Object.entries(savingsByCategory)
                        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0]
                        ?.replace(/([A-Z])/g, ' $1')
                        .trim() || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Largest savings source
                    </p>
                  </CardContent>
                </Card>
              </div>

              {savingsByCategory && (
                <Card>
                  <CardHeader>
                    <CardTitle>Savings by Category</CardTitle>
                    <CardDescription>Breakdown of cost savings across different strategies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(savingsByCategory).map(([category, amount]) => {
                        const percentage = totalSavings > 0 ? ((amount as number) / totalSavings * 100) : 0;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium capitalize">
                                {category.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="text-muted-foreground">
                                {(amount as number).toLocaleString()} MAD ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Savings History</CardTitle>
                  <CardDescription>Period-by-period savings breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {savingsData.map((item: any) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-2" data-testid={`savings-period-${item.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Period: {item.periodMonth}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {((item.negotiatedRates || 0) + (item.earlyBooking || 0) + 
                                (item.volumeDiscounts || 0) + (item.bleisurePackages || 0) + 
                                (item.consolidation || 0)).toLocaleString()} MAD
                            </div>
                            <div className="text-xs text-muted-foreground">Total Saved</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold">{item.negotiatedRates || 0} MAD</div>
                            <div className="text-xs text-muted-foreground">Negotiated</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold">{item.earlyBooking || 0} MAD</div>
                            <div className="text-xs text-muted-foreground">Early Booking</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold">{item.volumeDiscounts || 0} MAD</div>
                            <div className="text-xs text-muted-foreground">Volume</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold">{item.bleisurePackages || 0} MAD</div>
                            <div className="text-xs text-muted-foreground">Bleisure</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="font-semibold">{item.consolidation || 0} MAD</div>
                            <div className="text-xs text-muted-foreground">Consolidation</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {savingsData.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No savings data available for this company
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          {loadingCohorts ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p>Loading cohort data...</p>
              </CardContent>
            </Card>
          ) : cohortData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No cohort analysis data available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cohorts</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cohortData.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Across all segments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Customer Count</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(cohortData.reduce((sum: number, c: any) => sum + c.customerCount, 0) / cohortData.length)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Per cohort</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Retention</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {(cohortData.reduce((sum: number, c: any) => sum + (c.retentionRate || 0), 0) / cohortData.length).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Across cohorts</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cohort Performance</CardTitle>
                  <CardDescription>Customer lifetime value and retention metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cohortData.map((cohort: any) => (
                      <div key={cohort.id} className="border rounded-lg p-4 space-y-3" data-testid={`cohort-${cohort.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-lg">{cohort.cohortValue}</div>
                            <div className="text-sm text-muted-foreground">
                              Type: <Badge variant="outline">{cohort.cohortType}</Badge> · Month: {cohort.cohortMonth}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">{cohort.customerCount}</div>
                            <div className="text-xs text-muted-foreground">Customers</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-muted p-3 rounded text-center">
                            <div className="text-lg font-semibold">{cohort.lifetimeValueMad?.toLocaleString() || 'N/A'} MAD</div>
                            <div className="text-xs text-muted-foreground">Lifetime Value</div>
                          </div>
                          <div className="bg-muted p-3 rounded text-center">
                            <div className="text-lg font-semibold text-green-600">{cohort.retentionRate || 0}%</div>
                            <div className="text-xs text-muted-foreground">Retention</div>
                          </div>
                          <div className="bg-muted p-3 rounded text-center">
                            <div className="text-lg font-semibold text-red-600">{cohort.churnRate || 0}%</div>
                            <div className="text-xs text-muted-foreground">Churn</div>
                          </div>
                          <div className="bg-muted p-3 rounded text-center">
                            <div className="text-lg font-semibold">{cohort.monthlyActiveRate || 0}%</div>
                            <div className="text-xs text-muted-foreground">Monthly Active</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
