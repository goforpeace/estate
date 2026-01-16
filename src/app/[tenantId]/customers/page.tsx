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
import Link from "next/link";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  phoneNumber: z.string().min(1, "Phone number is required."),
  address: z.string().min(1, "Address is required."),
  nid: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

type Customer = {
  id: string;
  tenantId: string;
  name: string;
  phoneNumber: string;
  address: string;
  nid?: string;
};

function CustomerForm({ tenantId, onFinished, customer }: { tenantId: string; onFinished: () => void; customer?: Customer }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      name: "",
      phoneNumber: "",
      address: "",
      nid: "",
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (!firestore || !tenantId) return;

    const customerData = {
      ...data,
      tenantId: tenantId,
    };

    if (customer) {
        const customerDocRef = doc(firestore, `tenants/${tenantId}/customers`, customer.id);
        updateDocumentNonBlocking(customerDocRef, customerData);
         toast({
          title: "Customer Updated",
          description: `${data.name} has been successfully updated.`,
        });
    } else {
        const customersCollection = collection(firestore, `tenants/${tenantId}/customers`);
        addDocumentNonBlocking(customersCollection, customerData);
        toast({
          title: "Customer Added",
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
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
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
                <Input placeholder="e.g., 01712345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Main St, Anytown" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NID</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1990123456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">{customer ? 'Save Changes' : 'Add Customer'}</Button>
      </form>
    </Form>
  );
}

const ITEMS_PER_PAGE = 20;

export default function CustomersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/customers`);
  }, [firestore, tenantId]);

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchTerm) return customers;
    const lowercasedTerm = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedTerm) ||
      customer.phoneNumber.toLowerCase().includes(lowercasedTerm) ||
      customer.address.toLowerCase().includes(lowercasedTerm) ||
      (customer.nid || '').toLowerCase().includes(lowercasedTerm)
    );
  }, [customers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!firestore || !deleteCustomer || !tenantId) return;
    const customerDoc = doc(firestore, `tenants/${tenantId}/customers`, deleteCustomer.id);
    deleteDocumentNonBlocking(customerDoc);
    toast({
        variant: "destructive",
        title: "Customer Deleted",
        description: `Customer "${deleteCustomer.name}" has been deleted.`,
    })
    setDeleteCustomer(undefined);
  }

  const handleFormFinished = () => {
    setFormOpen(false);
    setEditCustomer(undefined);
  }

  return (
    <>
      <PageHeader title="Customers" description="Manage your customer database.">
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1" onClick={() => { setEditCustomer(undefined); setFormOpen(true); }}>
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Customer</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new customer.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm tenantId={tenantId} onFinished={handleFormFinished} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={!!editCustomer} onOpenChange={(isOpen) => !isOpen && setEditCustomer(undefined)}>
          <DialogContent>
              <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                  Update the details for &quot;{editCustomer?.name}&quot;.
              </DialogDescription>
              </DialogHeader>
              {editCustomer && <CustomerForm tenantId={tenantId} customer={editCustomer} onFinished={handleFormFinished} />}
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteCustomer} onOpenChange={(isOpen) => !isOpen && setDeleteCustomer(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer
                <span className="font-bold"> &quot;{deleteCustomer?.name}&quot;</span>.
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
          placeholder="Search by name, phone, address, NID..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>NID</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phoneNumber}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell>{customer.nid || 'N/A'}</TableCell>
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
                           <DropdownMenuItem asChild>
                            <Link href={`/${tenantId}/customers/${customer.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditCustomer(customer)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCustomer(customer)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No customers found.
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
