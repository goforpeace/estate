'use client'

import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { tenants as mockTenants, type Tenant } from "@/lib/data";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants);

  const toggleTenantStatus = (id: string) => {
    setTenants(tenants.map(tenant =>
      tenant.id === id
        ? { ...tenant, status: tenant.status === 'active' ? 'inactive' : 'active' }
        : tenant
    ));
  };

  return (
    <>
      <PageHeader title="Tenant Management" description="Add, manage, and disable tenant accounts.">
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Tenant
          </span>
        </Button>
      </PageHeader>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Tenant ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.id}</TableCell>
                  <TableCell>
                     <Badge variant={tenant.status === 'active' ? 'secondary' : 'destructive'}>
                        {tenant.status}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={tenant.status === 'active'}
                      onCheckedChange={() => toggleTenantStatus(tenant.id)}
                      aria-label="Toggle tenant access"
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Manage Users</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
