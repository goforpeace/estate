'use client'

import { PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useLoading } from "@/context/loading-context";

// Matches the Tenant entity in backend.json, but 'id' will be the document ID.
export type Tenant = {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  loginImageUrl?: string;
};

function AddTenantDialog({ onTenantAdded }: { onTenantAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading, isLoading } = useLoading();

    const handleAddTenant = async () => {
        if (!name || !domain) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please provide both a name and a domain.",
            });
            return;
        }
        
        if (!firestore) return;

        showLoading("Adding tenant...");
        try {
            const tenantsCol = collection(firestore, 'tenants');
            const newTenant = {
                name,
                domain,
                enabled: true,
                contactName,
                contactEmail,
                contactPhone,
            };

            await addDocumentNonBlocking(tenantsCol, newTenant);
            
            toast({
                title: "Tenant Added",
                description: `${name} has been added successfully.`,
            });

            setName('');
            setDomain('');
            setContactName('');
            setContactEmail('');
            setContactPhone('');
            setOpen(false);
            onTenantAdded();
        } catch (error) {
            console.error("Failed to add tenant:", error);
            toast({ variant: "destructive", title: "Add Failed", description: "Could not add tenant." });
        } finally {
            hideLoading();
        }
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactName" className="text-right">Contact Name</Label>
                        <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} className="col-span-3" placeholder="John Doe" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactEmail" className="text-right">Contact Email</Label>
                        <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="col-span-3" placeholder="john@acme.com" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactPhone" className="text-right">Contact Phone</Label>
                        <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="col-span-3" placeholder="+123456789" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddTenant} disabled={isLoading}>Add Tenant</Button>
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

  const { data: tenants, isLoading: isTenantsLoading, error } = useCollection<Tenant>(tenantsQuery);

  const toggleTenantStatus = (id: string, currentStatus: boolean) => {
    if (!firestore) return;
    const tenantRef = doc(firestore, 'tenants', id);
    updateDocumentNonBlocking(tenantRef, { enabled: !currentStatus });
    toast({
        title: "Status Updated",
        description: `Tenant status has been toggled.`,
    });
  };

  if (isTenantsLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <p>Loading dashboard...</p>
        </div>
    )
  }

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">Error loading tenants: {error.message}</TableCell>
                </TableRow>
              )}
              {!isTenantsLoading && tenants?.map((tenant) => (
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
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/gopon/tenants/${tenant.id}`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Link>
                    </Button>
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
