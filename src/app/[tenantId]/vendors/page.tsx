'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required."),
  phoneNumber: z.string().min(1, "Phone number is required."),
  enterpriseName: z.string().min(1, "Enterprise name is required."),
  details: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

type Vendor = VendorFormData & {
  id: string;
  tenantId: string;
};

function VendorForm({ tenantId, onFinished, vendor }: { tenantId: string; onFinished: () => void; vendor?: Vendor }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor || {
      name: "",
      phoneNumber: "",
      enterpriseName: "",
      details: "",
    },
  });

  const onSubmit = (data: VendorFormData) => {
    if (!firestore || !tenantId) return;

    const vendorData = {
      ...data,
      tenantId: tenantId,
    };

    if (vendor) {
        const vendorDocRef = doc(firestore, `tenants/${tenantId}/vendors`, vendor.id);
        updateDocumentNonBlocking(vendorDocRef, vendorData);
         toast({
          title: "Vendor Updated",
          description: `${data.name} has been successfully updated.`,
        });
    } else {
        const vendorsCollection = collection(firestore, `tenants/${tenantId}/vendors`);
        addDocumentNonBlocking(vendorsCollection, vendorData);
        toast({
          title: "Vendor Added",
          description: `${data.name} has been successfully added.`,
        });
    }

    onFinished();
    form.reset();
  };

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 01812345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="enterpriseName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enterprise Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Smith Construction Supplies" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Specializes in high-quality cement." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">{vendor ? 'Save Changes' : 'Add Vendor'}</Button>
      </form>
    </Form>
  );
}

export default function VendorsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined);
  const [viewVendor, setViewVendor] = useState<Vendor | undefined>(undefined);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | undefined>(undefined);

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/vendors`);
  }, [firestore, tenantId]);

  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

  const hasVendors = useMemo(() => vendors && vendors.length > 0, [vendors]);

  const handleDelete = () => {
    if (!firestore || !deleteVendor || !tenantId) return;
    const vendorDoc = doc(firestore, `tenants/${tenantId}/vendors`, deleteVendor.id);
    deleteDocumentNonBlocking(vendorDoc);
    toast({
        variant: "destructive",
        title: "Vendor Deleted",
        description: `Vendor "${deleteVendor.name}" has been deleted.`,
    })
    setDeleteVendor(undefined);
  }

  const handleFormFinished = () => {
    setFormOpen(false);
    setEditVendor(undefined);
  }

  return (
    <>
      <PageHeader title="Vendors" description="Manage your list of vendors and suppliers.">
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1" onClick={() => { setEditVendor(undefined); setFormOpen(true); }}>
              <PlusCircle className="h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Vendor</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new vendor.
              </DialogDescription>
            </DialogHeader>
            <VendorForm tenantId={tenantId} onFinished={handleFormFinished} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={!!editVendor} onOpenChange={(isOpen) => !isOpen && setEditVendor(undefined)}>
          <DialogContent>
              <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>
                  Update the details for &quot;{editVendor?.name}&quot;.
              </DialogDescription>
              </DialogHeader>
              {editVendor && <VendorForm tenantId={tenantId} vendor={editVendor} onFinished={handleFormFinished} />}
          </DialogContent>
      </Dialog>
      
      <Dialog open={!!viewVendor} onOpenChange={(isOpen) => !isOpen && setViewVendor(undefined)}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{viewVendor?.name}</DialogTitle>
              <DialogDescription>{viewVendor?.enterpriseName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
                <p><strong className="text-muted-foreground">Phone:</strong> {viewVendor?.phoneNumber}</p>
                <p><strong className="text-muted-foreground">Details:</strong></p>
                <p className="whitespace-pre-wrap">{viewVendor?.details || 'No additional details provided.'}</p>
            </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteVendor} onOpenChange={(isOpen) => !isOpen && setDeleteVendor(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the vendor
                <span className="font-bold"> &quot;{deleteVendor?.name}&quot;</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Enterprise</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading vendors...
                  </TableCell>
                </TableRow>
              ) : hasVendors ? (
                vendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.enterpriseName}</TableCell>
                    <TableCell>{vendor.phoneNumber}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewVendor(vendor)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditVendor(vendor)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteVendor(vendor)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No vendors found. Start by adding a new vendor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
