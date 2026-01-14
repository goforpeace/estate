'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Matches the Project entity
type Project = {
  id: string;
  name: string;
  flats: { name: string; sizeSft: number }[];
};

// Matches the Customer entity
type Customer = {
  id: string;
  name: string;
};

// Matches the FlatSale entity
const flatSaleSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
  flatName: z.string().min(1, "Flat is required."), // Using flat name as ID for embedded objects
  customerId: z.string().min(1, "Customer is required."),
  amount: z.coerce.number().min(1, "Total amount is required."),
  perSftPrice: z.coerce.number().min(1, "Price per SFT is required."),
  parkingPrice: z.coerce.number().optional().default(0),
  utilityCost: z.coerce.number().optional().default(0),
  bookingMoney: z.coerce.number().optional().default(0),
  monthlyInstallment: z.coerce.number().optional().default(0),
  deedLink: z.string().url().or(z.literal("")).optional(),
  note: z.string().optional(),
});

type FlatSaleFormData = z.infer<typeof flatSaleSchema>;

export type FlatSale = FlatSaleFormData & {
  id: string;
  tenantId: string;
};

function SaleForm({ tenantId, onFinished, sale, projects, customers, existingSales }: { tenantId: string; onFinished: () => void; sale?: FlatSale, projects: Project[], customers: Customer[], existingSales: FlatSale[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<FlatSaleFormData>({
        resolver: zodResolver(flatSaleSchema),
        defaultValues: sale || {
            projectId: '',
            flatName: '',
            customerId: '',
            amount: 0,
            perSftPrice: 0,
            parkingPrice: 0,
            utilityCost: 0,
            bookingMoney: 0,
            monthlyInstallment: 0,
            deedLink: '',
            note: '',
        },
    });

    const selectedProjectId = form.watch('projectId');
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    // Determine which flats are available (not already sold in this project)
    const availableFlats = useMemo(() => {
        if (!selectedProject) return [];
        const soldFlatNames = existingSales
            .filter(s => s.projectId === selectedProject.id && (!sale || s.id !== sale.id)) // Exclude current sale if editing
            .map(s => s.flatName);
        return selectedProject.flats.filter(f => !soldFlatNames.includes(f.name));
    }, [selectedProject, existingSales, sale]);
    
    const onSubmit = (data: FlatSaleFormData) => {
        if (!firestore || !tenantId) return;

        const saleData = { ...data, tenantId };

        if (sale) {
            const saleDocRef = doc(firestore, `tenants/${tenantId}/flatSales`, sale.id);
            updateDocumentNonBlocking(saleDocRef, saleData);
            toast({ title: "Sale Record Updated", description: "The sale details have been successfully updated." });
        } else {
            const salesCollection = collection(firestore, `tenants/${tenantId}/flatSales`);
            addDocumentNonBlocking(salesCollection, saleData);
            toast({ title: "Sale Record Added", description: "A new flat sale has been successfully recorded." });
        }
        onFinished();
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[70vh] p-1 pr-4">
                    <div className="space-y-4 p-4 pt-0">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project</FormLabel>
                                        <Select onValueChange={(value) => {
                                            field.onChange(value);
                                            form.setValue('flatName', ''); // Reset flat selection
                                        }} defaultValue={field.value} disabled={projects.length === 0}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="flatName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Flat</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedProject || availableFlats.length === 0}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select an available flat" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableFlats.map(f => <SelectItem key={f.name} value={f.name}>{f.name} ({f.sizeSft} sft)</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Customer</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customers.length === 0}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Total Amount (TK)</FormLabel><FormControl><Input type="number" placeholder="15000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="perSftPrice" render={({ field }) => (<FormItem><FormLabel>Per SFT Price (TK)</FormLabel><FormControl><Input type="number" placeholder="10000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="parkingPrice" render={({ field }) => (<FormItem><FormLabel>Parking Price (TK)</FormLabel><FormControl><Input type="number" placeholder="500000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="utilityCost" render={({ field }) => (<FormItem><FormLabel>Utility Cost (TK)</FormLabel><FormControl><Input type="number" placeholder="200000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="bookingMoney" render={({ field }) => (<FormItem><FormLabel>Booking Money (TK)</FormLabel><FormControl><Input type="number" placeholder="2000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="monthlyInstallment" render={({ field }) => (<FormItem><FormLabel>Monthly Installment (TK)</FormLabel><FormControl><Input type="number" placeholder="100000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            
                             <FormField
                                control={form.control}
                                name="deedLink"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Deed Link</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/deed-document" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Note</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Any additional information about the sale..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </ScrollArea>
                 <div className="p-4 pt-0 border-t">
                    <Button type="submit" className="w-full mt-4">{sale ? 'Save Changes' : 'Record Sale'}</Button>
                </div>
            </form>
        </Form>
    )
}

export default function SalesPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setFormOpen] = useState(false);
    const [editSale, setEditSale] = useState<FlatSale | undefined>(undefined);
    const [deleteSale, setDeleteSale] = useState<FlatSale | undefined>(undefined);

    // Fetch dependent data
    const projectsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/projects`);
    }, [firestore, tenantId]);
    const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
    
    const customersQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/customers`);
    }, [firestore, tenantId]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const salesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/flatSales`);
    }, [firestore, tenantId]);
    const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);

    const isLoading = projectsLoading || customersLoading || salesLoading;

    // Create maps for quick lookups
    const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
    const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c.name])), [customers]);

    const handleDelete = () => {
        if (!firestore || !deleteSale || !tenantId) return;
        const saleDoc = doc(firestore, `tenants/${tenantId}/flatSales`, deleteSale.id);
        deleteDocumentNonBlocking(saleDoc);
        toast({ variant: "destructive", title: "Sale Record Deleted", description: "The flat sale record has been permanently deleted." });
        setDeleteSale(undefined);
    };

    const handleFormFinished = () => {
        setFormOpen(false);
        setEditSale(undefined);
    };

  return (
    <>
        <PageHeader title="Flat Sales" description="Manage and record all property sales.">
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" onClick={() => { setEditSale(undefined); setFormOpen(true); }}>
                        <PlusCircle className="h-4 w-4" />
                        Add Sale
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl p-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>Record a New Sale</DialogTitle>
                        <DialogDescription>Fill in the details to record a new flat sale.</DialogDescription>
                    </DialogHeader>
                    {isFormOpen && <SaleForm tenantId={tenantId} onFinished={handleFormFinished} projects={projects || []} customers={customers || []} existingSales={sales || []} />}
                </DialogContent>
            </Dialog>
        </PageHeader>

        <Dialog open={!!editSale} onOpenChange={(isOpen) => !isOpen && setEditSale(undefined)}>
            <DialogContent className="max-w-3xl p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Edit Sale Record</DialogTitle>
                    <DialogDescription>Update the details for this sale.</DialogDescription>
                </DialogHeader>
                {editSale && <SaleForm tenantId={tenantId} sale={editSale} onFinished={handleFormFinished} projects={projects || []} customers={customers || []} existingSales={sales || []} />}
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteSale} onOpenChange={(isOpen) => !isOpen && setDeleteSale(undefined)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete the sale record for <span className="font-bold">{customersMap.get(deleteSale?.customerId || '')}</span> in project <span className="font-bold">{projectsMap.get(deleteSale?.projectId || '')}</span>.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Sales History</CardTitle>
            <CardDescription>A log of all completed flat sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead className="text-right">Total Amount (TK)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading sales records...</TableCell></TableRow>
              ) : sales && sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{customersMap.get(sale.customerId) || 'Unknown Customer'}</TableCell>
                    <TableCell>{projectsMap.get(sale.projectId) || 'Unknown Project'}</TableCell>
                    <TableCell>{sale.flatName}</TableCell>
                    <TableCell className="text-right">{sale.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild><Link href={`/${tenantId}/sales/${sale.id}`}>View Details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditSale(sale)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteSale(sale)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No sales recorded yet. Start by adding a new sale.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
