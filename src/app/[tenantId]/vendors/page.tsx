'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
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
import Link from "next/link";
import { useLoading } from "@/context/loading-context";

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
  const { showLoading, hideLoading, isLoading } = useLoading();
  
  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor || {
      name: "",
      phoneNumber: "",
      enterpriseName: "",
      details: "",
    },
  });

  const onSubmit = async (data: VendorFormData) => {
    if (!firestore || !tenantId) return;

    showLoading(vendor ? "Updating vendor..." : "Adding vendor...");
    try {
        const vendorData = { ...data, tenantId };

        if (vendor) {
            const vendorDocRef = doc(firestore, `tenants/${tenantId}/vendors`, vendor.id);
            await updateDocumentNonBlocking(vendorDocRef, vendorData);
             toast({
              title: "Vendor Updated",
              description: `${data.name} has been successfully updated.`,
            });
        } else {
            const vendorsCollection = collection(firestore, `tenants/${tenantId}/vendors`);
            await addDocumentNonBlocking(vendorsCollection, vendorData);
            toast({
              title: "Vendor Added",
              description: `${data.name} has been successfully added.`,
            });
        }

        onFinished();
        form.reset();
    } catch (error) {
        console.error("Failed to save vendor:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save vendor details." });
    } finally {
        hideLoading();
    }
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
        <Button type="submit" className="w-full" disabled={isLoading}>{vendor ? 'Save Changes' : 'Add Vendor'}</Button>
      </form>
    </Form>
  );
}

const ITEMS_PER_PAGE = 20;

export default function VendorsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/vendors`);
  }, [firestore, tenantId]);

  const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    if (!searchTerm) return vendors;
    const lowercasedTerm = searchTerm.toLowerCase();
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(lowercasedTerm) ||
      vendor.enterpriseName.toLowerCase().includes(lowercasedTerm) ||
      vendor.phoneNumber.toLowerCase().includes(lowercasedTerm)
    );
  }, [vendors, searchTerm]);

  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVendors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);

  const handleDelete = async () => {
    if (!firestore || !deleteVendor || !tenantId) return;
    showLoading("Deleting vendor...");
    try {
        const vendorDoc = doc(firestore, `tenants/${tenantId}/vendors`, deleteVendor.id);
        await deleteDocumentNonBlocking(vendorDoc);
        toast({
            variant: "destructive",
            title: "Vendor Deleted",
            description: `Vendor "${deleteVendor.name}" has been deleted.`,
        })
        setDeleteVendor(undefined);
    } catch (error) {
        console.error("Failed to delete vendor:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete vendor." });
    } finally {
        hideLoading();
    }
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

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, enterprise, or phone..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
        />
      </div>

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
              ) : paginatedVendors.length > 0 ? (
                paginatedVendors.map((vendor) => (
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
                          <DropdownMenuItem asChild>
                            <Link href={`/${tenantId}/vendors/${vendor.id}`}>View Details</Link>
                          </DropdownMenuItem>
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
                    No vendors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
