import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Key, RefreshCw, CheckCircle2, AlertCircle, Settings } from "lucide-react";

const HRIS_PROVIDERS = [
  { value: "workday", label: "Workday" },
  { value: "bamboohr", label: "BambooHR" },
  { value: "adp", label: "ADP" },
  { value: "gusto", label: "Gusto" },
  { value: "rippling", label: "Rippling" },
  { value: "personio", label: "Personio" },
];

const SSO_PROTOCOLS = [
  { value: "saml", label: "SAML 2.0" },
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "oidc", label: "OpenID Connect" },
];

const SSO_PROVIDERS = [
  { value: "okta", label: "Okta" },
  { value: "azure_ad", label: "Azure AD" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "auth0", label: "Auth0" },
];

export default function EnterpriseSettings() {
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [hrisDialogOpen, setHrisDialogOpen] = useState(false);
  const [ssoDialogOpen, setSsoDialogOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: hrisConfig, isLoading: loadingHris } = useQuery({
    queryKey: ['/api/hris-sync-configs', selectedCompany],
    enabled: !!selectedCompany,
  });

  const { data: ssoConnection, isLoading: loadingSso } = useQuery({
    queryKey: ['/api/sso-connections', selectedCompany],
    enabled: !!selectedCompany,
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['/api/employee-sync-logs', hrisConfig?.id],
    enabled: !!hrisConfig?.id,
  });

  const createHrisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/hris-sync-configs', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "HRIS integration configured",
        description: "Employee sync is now enabled.",
      });
      setHrisDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/hris-sync-configs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateHrisMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return apiRequest(`/api/hris-sync-configs/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "HRIS settings updated",
        description: "Configuration has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/hris-sync-configs'] });
    },
  });

  const createSsoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/sso-connections', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "SSO configured",
        description: "Single Sign-On is now enabled.",
      });
      setSsoDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sso-connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSsoMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return apiRequest(`/api/sso-connections/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "SSO settings updated",
        description: "Configuration has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sso-connections'] });
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Enterprise Settings</h1>
        <p className="text-muted-foreground text-lg">
          Configure HRIS sync and SSO for your organization
        </p>
      </div>

      <div className="mb-6">
        <Label htmlFor="company-select" className="font-medium">Select Company:</Label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger id="company-select" className="w-[300px] mt-2" data-testid="select-company">
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

      {!selectedCompany ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Select a company to manage enterprise settings</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="hris" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="hris" data-testid="tab-hris">
              <RefreshCw className="w-4 h-4 mr-2" />
              HRIS Sync
            </TabsTrigger>
            <TabsTrigger value="sso" data-testid="tab-sso">
              <Key className="w-4 h-4 mr-2" />
              Single Sign-On
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hris" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>HRIS Integration</CardTitle>
                    <CardDescription>Automatically sync employee data from your HR system</CardDescription>
                  </div>
                  {!hrisConfig && (
                    <Dialog open={hrisDialogOpen} onOpenChange={setHrisDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-configure-hris">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure HRIS
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure HRIS Sync</DialogTitle>
                          <DialogDescription>
                            Connect your HR system to automatically sync employee data
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createHrisMutation.mutate({
                            companyId: selectedCompany,
                            provider: formData.get('provider'),
                            apiEndpoint: formData.get('apiEndpoint'),
                            apiKey: formData.get('apiKey'),
                            syncFrequency: formData.get('syncFrequency'),
                            enabled: true,
                          });
                        }}>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="provider">HRIS Provider</Label>
                              <Select name="provider" required>
                                <SelectTrigger data-testid="select-hris-provider">
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {HRIS_PROVIDERS.map((provider) => (
                                    <SelectItem key={provider.value} value={provider.value}>
                                      {provider.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="apiEndpoint">API Endpoint</Label>
                              <Input
                                id="apiEndpoint"
                                name="apiEndpoint"
                                placeholder="https://api.provider.com/v1"
                                required
                                data-testid="input-api-endpoint"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="apiKey">API Key</Label>
                              <Input
                                id="apiKey"
                                name="apiKey"
                                type="password"
                                placeholder="Enter API key"
                                required
                                data-testid="input-api-key"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="syncFrequency">Sync Frequency</Label>
                              <Select name="syncFrequency" defaultValue="daily">
                                <SelectTrigger data-testid="select-sync-frequency">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="manual">Manual Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setHrisDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createHrisMutation.isPending} data-testid="button-save-hris">
                              {createHrisMutation.isPending ? "Saving..." : "Save Configuration"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingHris ? (
                  <p className="text-center py-8">Loading HRIS configuration...</p>
                ) : hrisConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Provider</Label>
                        <div className="font-semibold capitalize">{hrisConfig.provider}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <div>
                          <Badge variant={hrisConfig.enabled ? "default" : "secondary"}>
                            {hrisConfig.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Sync Frequency</Label>
                        <div className="font-semibold capitalize">{hrisConfig.syncFrequency}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Last Sync</Label>
                        <div className="font-semibold">
                          {hrisConfig.lastSyncAt 
                            ? new Date(hrisConfig.lastSyncAt).toLocaleString()
                            : "Never"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hrisConfig.enabled}
                          onCheckedChange={(checked) => {
                            updateHrisMutation.mutate({
                              id: hrisConfig.id,
                              data: { enabled: checked }
                            });
                          }}
                          data-testid="switch-hris-enabled"
                        />
                        <Label>Auto-sync enabled</Label>
                      </div>
                      <Button variant="outline" data-testid="button-sync-now">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No HRIS integration configured
                  </p>
                )}
              </CardContent>
            </Card>

            {syncLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>Recent employee sync operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {syncLogs.slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`sync-log-${log.id}`}>
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">
                              {log.syncedCount || 0} employees synced
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sso" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Single Sign-On</CardTitle>
                    <CardDescription>Enable SSO for secure employee authentication</CardDescription>
                  </div>
                  {!ssoConnection && (
                    <Dialog open={ssoDialogOpen} onOpenChange={setSsoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-configure-sso">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure SSO
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Configure Single Sign-On</DialogTitle>
                          <DialogDescription>
                            Set up SSO with your identity provider
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createSsoMutation.mutate({
                            companyId: selectedCompany,
                            protocol: formData.get('protocol'),
                            provider: formData.get('provider'),
                            issuerUrl: formData.get('issuerUrl'),
                            clientId: formData.get('clientId'),
                            clientSecret: formData.get('clientSecret'),
                            enabled: true,
                          });
                        }}>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="protocol">Protocol</Label>
                                <Select name="protocol" required>
                                  <SelectTrigger data-testid="select-sso-protocol">
                                    <SelectValue placeholder="Select protocol" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SSO_PROTOCOLS.map((protocol) => (
                                      <SelectItem key={protocol.value} value={protocol.value}>
                                        {protocol.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="provider">Provider</Label>
                                <Select name="provider" required>
                                  <SelectTrigger data-testid="select-sso-provider">
                                    <SelectValue placeholder="Select provider" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SSO_PROVIDERS.map((provider) => (
                                      <SelectItem key={provider.value} value={provider.value}>
                                        {provider.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="issuerUrl">Issuer URL</Label>
                              <Input
                                id="issuerUrl"
                                name="issuerUrl"
                                placeholder="https://accounts.provider.com"
                                required
                                data-testid="input-issuer-url"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="clientId">Client ID</Label>
                              <Input
                                id="clientId"
                                name="clientId"
                                placeholder="Enter client ID"
                                required
                                data-testid="input-client-id"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="clientSecret">Client Secret</Label>
                              <Input
                                id="clientSecret"
                                name="clientSecret"
                                type="password"
                                placeholder="Enter client secret"
                                required
                                data-testid="input-client-secret"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSsoDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createSsoMutation.isPending} data-testid="button-save-sso">
                              {createSsoMutation.isPending ? "Saving..." : "Save Configuration"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingSso ? (
                  <p className="text-center py-8">Loading SSO configuration...</p>
                ) : ssoConnection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Protocol</Label>
                        <div className="font-semibold uppercase">{ssoConnection.protocol}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Provider</Label>
                        <div className="font-semibold capitalize">{ssoConnection.provider?.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <div>
                          <Badge variant={ssoConnection.enabled ? "default" : "secondary"}>
                            {ssoConnection.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Client ID</Label>
                        <div className="font-mono text-sm">{ssoConnection.clientId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Switch
                        checked={ssoConnection.enabled}
                        onCheckedChange={(checked) => {
                          updateSsoMutation.mutate({
                            id: ssoConnection.id,
                            data: { enabled: checked }
                          });
                        }}
                        data-testid="switch-sso-enabled"
                      />
                      <Label>SSO authentication enabled</Label>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No SSO connection configured
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
