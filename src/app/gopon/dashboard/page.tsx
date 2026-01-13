'use client'

import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Matches the Tenant entity in backend.json, but 'id' will be the document ID.
export type Tenant = {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
};

function AddTenantDialog({ onTenantAdded }: { onTenantAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleAddTenant = async () => {
        if (!name || !domain) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please provide both a name and a domain.",
            });
            return;
        }
        
        const tenantsCol = collection(firestore, 'tenants');
        const newTenant = {
            name,
            domain,
            enabled: true,
        };

        await addDocumentNonBlocking(tenantsCol, newTenant);
        
        toast({
            title: "Tenant Added",
            description: `${name} has been added successfully.`,
        });

        setName('');
        setDomain('');
        setOpen(false);
        onTenantAdded();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add Tenant
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Tenant</DialogTitle>
                    <DialogDescription>
                        Create a new tenant account in the system.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Acme Inc." />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="domain" className="text-right">Domain</Label>
                        <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} className="col-span-3" placeholder="acme.com" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddTenant}>Add Tenant</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tenants');
  }, [firestore]);

  const { data: tenants, isLoading, error } = useCollection<Tenant>(tenantsQuery);

  const toggleTenantStatus = (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    const tenantRef = doc(firestore, 'tenants', id);
    updateDocumentNonBlocking(tenantRef, { enabled: !currentStatus });
    toast({
        title: "Status Updated",
        description: `Tenant status has been toggled.`,
    });
  };

  const deleteTenant = (id: string) => {
    if (!firestore) return;
    const tenantRef = doc(firestore, 'tenants', id);
    deleteDocumentNonBlocking(tenantRef);
    toast({
        variant: "destructive",
        title: "Tenant Deleted",
        description: `The tenant has been permanently deleted.`,
    });
  };

  return (
    <>
      <PageHeader title="Tenant Management" description="Add, manage, and disable tenant accounts.">
        <AddTenantDialog onTenantAdded={() => {}} />
      </PageHeader>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Tenant Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading tenants...</TableCell>
                </TableRow>
              )}
              {error && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">Error loading tenants: {error.message}</TableCell>
                </TableRow>
              )}
              {!isLoading && tenants?.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.domain}</TableCell>
                  <TableCell>
                     <Badge variant={tenant.enabled ? 'secondary' : 'destructive'}>
                        {tenant.enabled ? 'active' : 'inactive'}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={tenant.enabled}
                      onCheckedChange={() => toggleTenantStatus(tenant.id, tenant.enabled)}
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
                        <DropdownMenuItem
                            onClick={() => deleteTenant(tenant.id)}
                            className="text-destructive"
                        >
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
