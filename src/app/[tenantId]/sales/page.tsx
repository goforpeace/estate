'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Search, XCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { useLoading } from "@/context/loading-context";

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

const additionalCostSchema = z.object({
  description: z.string().min(1, "Description is required."),
  price: z.coerce.number().min(1, "Price must be greater than 0."),
});

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
  additionalCosts: z.array(additionalCostSchema).optional(),
});

type FlatSaleFormData = z.infer<typeof flatSaleSchema>;

export type FlatSale = FlatSaleFormData & {
  id: string;
  tenantId: string;
};

function SaleForm({ tenantId, onFinished, sale, projects, customers, existingSales }: { tenantId: string; onFinished: () => void; sale?: FlatSale, projects: Project[], customers: Customer[], existingSales: FlatSale[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading, isLoading } = useLoading();

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
            additionalCosts: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "additionalCosts",
    });

    const [newCostDescription, setNewCostDescription] = useState("");
    const [newCostPrice, setNewCostPrice] = useState("");

    const handleAddCost = () => {
        const price = parseFloat(newCostPrice);
        if (newCostDescription.trim() && !isNaN(price) && price > 0) {
          append({ description: newCostDescription, price: price });
          setNewCostDescription("");
          setNewCostPrice("");
        } else {
            toast({
                variant: "destructive",
                title: "Invalid Cost",
                description: "Please enter a valid description and price."
            })
        }
    };

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
    
    const onSubmit = async (data: FlatSaleFormData) => {
        if (!firestore || !tenantId) return;
        showLoading(sale ? "Updating sale..." : "Recording sale...");

        try {
            const saleData = { ...data, tenantId };

            if (sale) {
                const saleDocRef = doc(firestore, `tenants/${tenantId}/flatSales`, sale.id);
                await updateDocumentNonBlocking(saleDocRef, saleData);
                toast({ title: "Sale Record Updated", description: "The sale details have been successfully updated." });
            } else {
                const salesCollection = collection(firestore, `tenants/${tenantId}/flatSales`);
                await addDocumentNonBlocking(salesCollection, saleData);
                toast({ title: "Sale Record Added", description: "A new flat sale has been successfully recorded." });
            }
            onFinished();
            form.reset();
        } catch (error) {
            console.error("Failed to save sale:", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save sale record." });
        } finally {
            hideLoading();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
                <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="space-y-4 p-1 pr-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Project</FormLabel>
                                        <Combobox
                                          options={projects.map(p => ({ value: p.id, label: p.name }))}
                                          value={field.value}
                                          onChange={(value) => {
                                              field.onChange(value);
                                              form.setValue('flatName', ''); // Reset flat selection
                                          }}
                                          placeholder="Select a project"
                                          searchPlaceholder="Search projects..."
                                          disabled={projects.length === 0}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="flatName"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Available Flat</FormLabel>
                                        <Combobox
                                          options={availableFlats.map(f => ({ value: f.name, label: `${f.name} (${f.sizeSft} sft)` }))}
                                          value={field.value}
                                          onChange={field.onChange}
                                          placeholder="Select an available flat"
                                          searchPlaceholder="Search flats..."
                                          disabled={!selectedProject || availableFlats.length === 0}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2 flex flex-col">
                                        <FormLabel>Customer</FormLabel>
                                        <Combobox
                                          options={customers.map(c => ({ value: c.id, label: c.name }))}
                                          value={field.value}
                                          onChange={field.onChange}
                                          placeholder="Select a customer"
                                          searchPlaceholder="Search customers..."
                                          disabled={customers.length === 0}
                                        />
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
                            
                            <div className="space-y-4 rounded-lg border p-4 md:col-span-2">
                                <h3 className="font-medium">Additional Costs</h3>
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                            <p className="flex-1 text-sm">
                                                <span className="font-medium">{field.description}</span>
                                                - TK {field.price.toLocaleString('en-IN')}
                                            </p>
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}>
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {fields.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">No additional costs added yet.</p>}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="additionalCosts"
                                    render={() => (
                                        <FormItem>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-end gap-2">
                                    <div className="grid gap-1.5 flex-1">
                                        <Label htmlFor="new-cost-description" className="text-xs">Description</Label>
                                        <Input id="new-cost-description" placeholder="e.g., Extra cabinet" value={newCostDescription} onChange={(e) => setNewCostDescription(e.target.value)} />
                                    </div>
                                    <div className="grid gap-1.5 w-36">
                                        <Label htmlFor="new-cost-price" className="text-xs">Price (TK)</Label>
                                        <Input id="new-cost-price" type="number" placeholder="25000" value={newCostPrice} onChange={(e) => setNewCostPrice(e.target.value)} />
                                    </div>
                                    <Button type="button" variant="outline" onClick={handleAddCost}>Add Cost</Button>
                                </div>
                            </div>
                             
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
                 <div className="pt-4 mt-4 border-t">
                    <Button type="submit" className="w-full" disabled={isLoading}>{sale ? 'Save Changes' : 'Record Sale'}</Button>
                </div>
            </form>
        </Form>
    )
}

const ITEMS_PER_PAGE = 20;

export default function SalesPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading } = useLoading();

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingSale, setEditingSale] = useState<FlatSale | undefined>(undefined);
    const [deleteSale, setDeleteSale] = useState<FlatSale | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

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

    const filteredSales = useMemo(() => {
        if (!sales) return [];
        if (!searchTerm) return sales;
        const lowercasedTerm = searchTerm.toLowerCase();
        return sales.filter(sale => {
            const customerName = customersMap.get(sale.customerId)?.toLowerCase() || '';
            const projectName = projectsMap.get(sale.projectId)?.toLowerCase() || '';
            return (
                customerName.includes(lowercasedTerm) ||
                projectName.includes(lowercasedTerm) ||
                sale.flatName.toLowerCase().includes(lowercasedTerm) ||
                sale.amount.toString().includes(lowercasedTerm)
            );
        });
    }, [sales, searchTerm, customersMap, projectsMap]);

    const paginatedSales = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredSales, currentPage]);

    const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);

    const handleDelete = async () => {
        if (!firestore || !deleteSale || !tenantId) return;
        showLoading("Deleting sale record...");
        try {
            const saleDoc = doc(firestore, `tenants/${tenantId}/flatSales`, deleteSale.id);
            await deleteDocumentNonBlocking(saleDoc);
            toast({ variant: "destructive", title: "Sale Record Deleted", description: "The flat sale record has been permanently deleted." });
            setDeleteSale(undefined);
        } catch (error) {
            console.error("Failed to delete sale:", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete sale record." });
        } finally {
            hideLoading();
        }
    };

    const handleCancel = () => {
        setView('list');
        setEditingSale(undefined);
    };

    const handleAddClick = () => {
        setEditingSale(undefined);
        setView('form');
    }
    
    const handleEditClick = (sale: FlatSale) => {
        setEditingSale(sale);
        setView('form');
    }

    if (view === 'form') {
        return (
            <>
                <PageHeader
                    title={editingSale ? 'Edit Sale Record' : 'Record a New Sale'}
                    description={editingSale ? 'Update the details for this sale.' : 'Fill in the details to record a new flat sale.'}
                >
                    <Button variant="outline" onClick={handleCancel}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                </PageHeader>
                <Card className="max-w-4xl">
                    <CardContent className="pt-6">
                        <SaleForm tenantId={tenantId} sale={editingSale} onFinished={handleCancel} projects={projects || []} customers={customers || []} existingSales={sales || []} />
                    </CardContent>
                </Card>
            </>
        )
    }

  return (
    <>
        <PageHeader title="Flat Sales" description="Manage and record all property sales.">
            <Button size="sm" className="gap-1" onClick={handleAddClick} disabled={isLoading}>
                <PlusCircle className="h-4 w-4" />
                Add Sale
            </Button>
        </PageHeader>

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

        <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search by customer, project, flat..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
            />
        </div>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Sales History</CardTitle>
            <CardDescription>A log of all completed flat sales.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
              ) : paginatedSales && paginatedSales.length > 0 ? (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{customersMap.get(sale.customerId) || 'Unknown Customer'}</TableCell>
                    <TableCell>{projectsMap.get(sale.projectId) || 'Unknown Project'}</TableCell>
                    <TableCell>{sale.flatName}</TableCell>
                    <TableCell className="text-right">{sale.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild><Link href={`/${tenantId}/sales/${sale.id}`}>View Details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(sale)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteSale(sale)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No sales found.</TableCell></TableRow>
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
