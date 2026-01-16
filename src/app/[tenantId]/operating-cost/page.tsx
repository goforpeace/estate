'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Search, Plus } from "lucide-react";
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
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";

// --- Type Definitions ---
type OperatingCost = {
  id: string;
  tenantId: string;
  date: string;
  itemName: string;
  amount: number;
  description?: string;
  reference?: string;
};
type OperatingCostItem = { id: string; name: string; };

// --- Zod Schemas ---
const operatingCostSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date is required." }),
  itemName: z.string().min(1, "Item is required."),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
  description: z.string().optional(),
  reference: z.string().optional(),
});
type OperatingCostFormData = z.infer<typeof operatingCostSchema>;

const costItemSchema = z.object({
    name: z.string().min(1, "Item name is required."),
});
type CostItemFormData = z.infer<typeof costItemSchema>;


// --- Add Item Dialog ---
function AddCostItemDialog({ tenantId, onFinished }: { tenantId: string; onFinished: () => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<CostItemFormData>({
        resolver: zodResolver(costItemSchema),
        defaultValues: { name: "" },
    });

    const onSubmit = (data: CostItemFormData) => {
        if (!firestore) return;
        setIsSubmitting(true);
        const itemData = { ...data, tenantId };
        const itemsCollection = collection(firestore, `tenants/${tenantId}/operatingCostItems`);
        addDocumentNonBlocking(itemsCollection, itemData);
        toast({ title: "Item Added", description: `"${data.name}" has been added.` });
        setIsSubmitting(false);
        onFinished();
        form.reset();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>Create a new item/category for operating costs.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Office Rent" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Item'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


// --- Form Component ---
function OperatingCostForm({ tenantId, onFinished, cost }: { tenantId: string; onFinished: () => void; cost?: OperatingCost }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const itemsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/operatingCostItems`), [firestore, tenantId]);
  const { data: items } = useCollection<OperatingCostItem>(itemsQuery);

  const form = useForm<OperatingCostFormData>({
    resolver: zodResolver(operatingCostSchema),
    defaultValues: cost ? { ...cost, date: format(new Date(cost.date), 'yyyy-MM-dd') } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      itemName: "",
      amount: 0,
      description: "",
      reference: "",
    },
  });

  const onSubmit = (data: OperatingCostFormData) => {
    if (!firestore) return;
    const costData = { ...data, tenantId, date: new Date(data.date).toISOString() };

    if (cost) {
      const costDocRef = doc(firestore, `tenants/${tenantId}/operatingCosts`, cost.id);
      updateDocumentNonBlocking(costDocRef, costData);
      toast({ title: "Cost Updated", description: "The operating cost has been updated." });
    } else {
      const costsCollection = collection(firestore, `tenants/${tenantId}/operatingCosts`);
      addDocumentNonBlocking(costsCollection, costData);
      toast({ title: "Cost Added", description: "The operating cost has been recorded." });
    }
    onFinished();
  };

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Item</FormLabel>
                    <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Combobox
                            options={items?.map(i => ({ value: i.name, label: i.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select an item"
                            searchPlaceholder="Search items..."
                          />
                        </div>
                        <AddCostItemDialog tenantId={tenantId} onFinished={() => {}} />
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (TK)</FormLabel><FormControl><Input type="number" placeholder="10000" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the cost..." {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="e.g. Invoice #, Receipt #" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <Button type="submit" className="w-full">{cost ? 'Save Changes' : 'Add Cost'}</Button>
      </form>
    </Form>
  );
}

const ITEMS_PER_PAGE = 20;

export default function OperatingCostPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editCost, setEditCost] = useState<OperatingCost | undefined>(undefined);
  const [viewCost, setViewCost] = useState<OperatingCost | undefined>(undefined);
  const [deleteCost, setDeleteCost] = useState<OperatingCost | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const costsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/operatingCosts`);
  }, [firestore, tenantId]);

  const { data: costs, isLoading } = useCollection<OperatingCost>(costsQuery);

  const filteredCosts = useMemo(() => {
    if (!costs) return [];
    if (!searchTerm) return costs;
    const lowercasedTerm = searchTerm.toLowerCase();
    return costs.filter(cost =>
      cost.itemName.toLowerCase().includes(lowercasedTerm) ||
      cost.amount.toString().includes(lowercasedTerm) ||
      (cost.description && cost.description.toLowerCase().includes(lowercasedTerm)) ||
      (cost.date && format(new Date(cost.date), 'dd-MM-yyyy').includes(lowercasedTerm))
    );
  }, [costs, searchTerm]);

  const paginatedCosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCosts, currentPage]);

  const totalPages = Math.ceil(filteredCosts.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!firestore || !deleteCost) return;
    const costDoc = doc(firestore, `tenants/${tenantId}/operatingCosts`, deleteCost.id);
    deleteDocumentNonBlocking(costDoc);
    toast({
        variant: "destructive",
        title: "Cost Deleted",
        description: `The cost record has been deleted.`,
    })
    setDeleteCost(undefined);
  }

  const handleFormFinished = () => {
    setFormOpen(false);
    setEditCost(undefined);
  }

  return (
    <>
      <PageHeader title="Operating Costs" description="Manage your general business expenses.">
        <Dialog open={isFormOpen || !!editCost} onOpenChange={(isOpen) => { if (!isOpen) handleFormFinished() }}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1" onClick={() => { setEditCost(undefined); setFormOpen(true); }}>
              <PlusCircle className="h-4 w-4" />
              Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editCost ? 'Edit' : 'Add'} Operating Cost</DialogTitle>
            </DialogHeader>
            <OperatingCostForm tenantId={tenantId} onFinished={handleFormFinished} cost={editCost} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <AlertDialog open={!!deleteCost} onOpenChange={(isOpen) => !isOpen && setDeleteCost(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this cost record.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewCost} onOpenChange={(isOpen) => !isOpen && setViewCost(undefined)}>
          <DialogContent>
              <DialogHeader>
              <DialogTitle>Cost Details</DialogTitle>
              <DialogDescription>
                  Details for cost record on {viewCost?.date && format(new Date(viewCost.date), 'dd MMM, yyyy')}.
              </DialogDescription>
              </DialogHeader>
               {viewCost && (
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Item</Label><div>{viewCost.itemName}</div></div>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Amount</Label><div>TK {viewCost.amount.toLocaleString('en-IN')}</div></div>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Date</Label><div>{format(new Date(viewCost.date), 'dd MMM, yyyy')}</div></div>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Reference</Label><div>{viewCost.reference || 'N/A'}</div></div>
                    <div className="grid grid-cols-[100px_1fr] items-start gap-4"><Label className="text-right text-muted-foreground pt-1">Description</Label><p className="whitespace-pre-wrap">{viewCost.description || 'No description provided.'}</p></div>
                </div>
            )}
          </DialogContent>
      </Dialog>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by item, amount, date..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (TK)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading costs...</TableCell></TableRow>
              ) : paginatedCosts.length > 0 ? (
                paginatedCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{format(new Date(cost.date), 'dd MMM, yyyy')}</TableCell>
                    <TableCell className="font-medium">{cost.itemName}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{cost.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">{cost.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewCost(cost)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditCost(cost)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCost(cost)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No costs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
        </div>
      )}
    </>
  );
}
