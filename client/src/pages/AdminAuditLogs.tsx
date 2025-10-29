import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, Calendar as CalendarIcon, ChevronDown, ChevronRight, Download, FileText, Shield } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AuditLog, User } from "@shared/schema";

interface AuditLogWithUser extends AuditLog {
  user?: User;
}

export default function AdminAuditLogs() {
  const { currentUser } = useApp();
  const [, setLocation] = useLocation();

  // Redirect if not admin
  if (currentUser?.role !== 'admin') {
    setLocation('/');
    return null;
  }

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedResourceType, setSelectedResourceType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const pageSize = 20;

  // Build query params
  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set('startDate', dateFrom.toISOString());
  if (dateTo) queryParams.set('endDate', dateTo.toISOString());
  if (selectedUser) queryParams.set('userId', selectedUser);
  if (selectedAction) queryParams.set('action', selectedAction);
  if (selectedResourceType) queryParams.set('resourceType', selectedResourceType);
  queryParams.set('limit', pageSize.toString());
  queryParams.set('offset', ((page - 1) * pageSize).toString());

  const { data: logs = [], isLoading } = useQuery<AuditLogWithUser[]>({
    queryKey: ['/api/audit-logs', queryParams.toString()],
    enabled: currentUser?.role === 'admin',
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: currentUser?.role === 'admin',
  });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedUser("");
    setSelectedAction("");
    setSelectedResourceType("");
    setPage(1);
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Timestamp', 'User Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Changes'];
    const rows = logs.map(log => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      log.user?.email || 'N/A',
      log.action,
      log.resourceType,
      log.resourceId || 'N/A',
      log.ipAddress || 'N/A',
      JSON.stringify(log.changes || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Extract unique action types and resource types from logs
  const actionTypes = Array.from(new Set(logs.map(log => log.action))).filter(Boolean);
  const resourceTypes = Array.from(new Set(logs.map(log => log.resourceType))).filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin-audit-logs">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                Audit Logs
              </h1>
              <p className="text-muted-foreground mt-1">
                System activity and security audit trail
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter audit logs by date, user, action, and resource type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="date-from">Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-from"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                      data-testid="button-date-from"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      data-testid="calendar-date-from"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="date-to">Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-to"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                      data-testid="button-date-to"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      data-testid="calendar-date-to"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* User Select */}
              <div className="space-y-2">
                <Label htmlFor="user-select">User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger id="user-select" data-testid="select-user">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Type */}
              <div className="space-y-2">
                <Label htmlFor="action-select">Action Type</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger id="action-select" data-testid="select-action">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {actionTypes.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Type */}
              <div className="space-y-2">
                <Label htmlFor="resource-select">Resource Type</Label>
                <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                  <SelectTrigger id="resource-select" data-testid="select-resource-type">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All resources</SelectItem>
                    {resourceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline" data-testid="button-clear-filters">
                Clear Filters
              </Button>
              <Button onClick={exportToCSV} variant="outline" disabled={logs.length === 0} data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail ({logs.length} records)</CardTitle>
            <CardDescription>Showing page {page} ({pageSize} per page)</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" data-testid="icon-no-logs" />
                <p className="text-muted-foreground" data-testid="text-no-logs">
                  No audit logs found matching the selected filters
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead data-testid="header-timestamp">Timestamp</TableHead>
                        <TableHead data-testid="header-user">User</TableHead>
                        <TableHead data-testid="header-action">Action</TableHead>
                        <TableHead data-testid="header-resource-type">Resource Type</TableHead>
                        <TableHead data-testid="header-resource-id">Resource ID</TableHead>
                        <TableHead data-testid="header-ip-address">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <Collapsible
                          key={log.id}
                          open={expandedRows.has(log.id)}
                          onOpenChange={() => toggleRow(log.id)}
                          asChild
                        >
                          <>
                            <TableRow 
                              className="cursor-pointer hover-elevate" 
                              data-testid={`row-audit-log-${log.id}`}
                              onClick={() => toggleRow(log.id)}
                            >
                              <TableCell>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6"
                                    data-testid={`button-expand-${log.id}`}
                                  >
                                    {expandedRows.has(log.id) ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </TableCell>
                              <TableCell data-testid={`text-timestamp-${log.id}`}>
                                {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                              </TableCell>
                              <TableCell data-testid={`text-user-${log.id}`}>
                                <div className="max-w-[200px] truncate">
                                  {log.user?.email || 'Unknown'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.user?.role}
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-action-${log.id}`}>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.action}
                                </code>
                              </TableCell>
                              <TableCell data-testid={`text-resource-type-${log.id}`}>
                                {log.resourceType}
                              </TableCell>
                              <TableCell data-testid={`text-resource-id-${log.id}`}>
                                <code className="text-xs">
                                  {log.resourceId ? log.resourceId.slice(0, 8) : 'N/A'}
                                </code>
                              </TableCell>
                              <TableCell data-testid={`text-ip-address-${log.id}`}>
                                {log.ipAddress || 'N/A'}
                              </TableCell>
                            </TableRow>
                            <CollapsibleContent asChild>
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/50">
                                  <div className="p-4 space-y-2" data-testid={`details-${log.id}`}>
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">Additional Details</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="font-medium">Full Resource ID:</span>{' '}
                                          <code className="text-xs bg-background px-2 py-1 rounded">
                                            {log.resourceId || 'N/A'}
                                          </code>
                                        </div>
                                        <div>
                                          <span className="font-medium">User Agent:</span>{' '}
                                          <span className="text-muted-foreground">
                                            {log.userAgent || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {log.changes && (
                                      <div>
                                        <h4 className="font-semibold text-sm mb-2">Changes / Metadata</h4>
                                        <pre className="text-xs bg-background p-3 rounded overflow-auto max-h-60">
                                          {JSON.stringify(log.changes as Record<string, any>, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                    Page {page}
                  </span>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={logs.length < pageSize}
                    variant="outline"
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
