'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, collectionGroup, query, where } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// --- Type Definitions ---
type Project = { id: string; name: string; };
type Vendor = { id: string; name: string; enterpriseName: string; };
type ExpenseCategory = { id: string; name: string; };
type OutflowTransaction = {
  id: string;
  tenantId: string;
  projectId: string;
  vendorId: string;
  expenseCategoryName: string;
  qty?: number;
  description?: string;
  date: string;
  amount: number;
  reference?: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  paidAmount: number;
};
type ExpensePayment = {
  id: string;
  date: string;
  projectId: string;
  vendorId: string;
  expenseCategoryName: string;
  amount: number;
  reference?: string;
}


// --- Zod Schemas ---
const expenseCategorySchema = z.object({
    name: z.string().min(1, "Category name is required."),
});
type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;

const outflowTransactionSchema = z.object({
    projectId: z.string().min(1, "Project is required."),
    vendorId: z.string().min(1, "Vendor is required."),
    expenseCategoryName: z.string().min(1, "Item/Category is required."),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date is required." }),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
    qty: z.coerce.number().optional(),
    description: z.string().optional(),
    reference: z.string().optional(),
});
type OutflowTransactionFormData = z.infer<typeof outflowTransactionSchema>;


// --- Add Category Dialog ---
function AddCategoryDialog({ tenantId, onFinished }: { tenantId: string; onFinished: () => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<ExpenseCategoryFormData>({
        resolver: zodResolver(expenseCategorySchema),
        defaultValues: { name: "" },
    });

    const onSubmit = (data: ExpenseCategoryFormData) => {
        if (!firestore) return;
        setIsSubmitting(true);

        const categoryData = { ...data, tenantId };
        const categoriesCollection = collection(firestore, `tenants/${tenantId}/expenseCategories`);
        
        addDocumentNonBlocking(categoriesCollection, categoryData);

        toast({ title: "Category Added", description: `"${data.name}" has been added.` });
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
                    <DialogTitle>Add Expense Category</DialogTitle>
                    <DialogDescription>Create a new item category for expenses.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Raw Materials" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Category'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


// --- Expense Form ---
function ExpenseForm({ tenantId, onFinished, expense, projects, vendors }: { tenantId: string; onFinished: () => void; expense?: OutflowTransaction; projects: Project[]; vendors: Vendor[]; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const categoriesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `tenants/${tenantId}/expenseCategories`);
    }, [firestore, tenantId]);
    const { data: categories } = useCollection<ExpenseCategory>(categoriesQuery);

    const defaultValues = expense ? {
      ...expense,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
    } : {
      projectId: '',
      vendorId: '',
      expenseCategoryName: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      qty: 1,
      description: '',
      reference: '',
    };
    
    const form = useForm<OutflowTransactionFormData>({
        resolver: zodResolver(outflowTransactionSchema),
        defaultValues,
    });

    const onSubmit = (data: OutflowTransactionFormData) => {
        if (!firestore) return;

        if (expense) {
            const expenseData = {
                ...data,
                date: new Date(data.date).toISOString(),
            };
            const expenseDocRef = doc(firestore, `tenants/${tenantId}/outflowTransactions`, expense.id);
            updateDocumentNonBlocking(expenseDocRef, expenseData);
            toast({ title: "Expense Updated", description: "The expense record has been updated." });
        } else {
             const expenseData = {
                ...data,
                tenantId,
                date: new Date(data.date).toISOString(),
                status: 'Unpaid' as const,
                paidAmount: 0,
            };
            const expensesCollection = collection(firestore, `tenants/${tenantId}/outflowTransactions`);
            addDocumentNonBlocking(expensesCollection, expenseData);
            toast({ title: "Expense Added", description: "The new expense has been recorded." });
        }
        onFinished();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[70vh] p-1 pr-4">
                    <div className="space-y-4 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="projectId" render={({ field }) => (
                                <FormItem><FormLabel>Project</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="vendorId" render={({ field }) => (
                                <FormItem><FormLabel>Vendor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.enterpriseName} ({v.name})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="expenseCategoryName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Item / Category</FormLabel>
                                <div className="flex gap-2">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                                        <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <AddCategoryDialog tenantId={tenantId} onFinished={() => { /* `useCollection` will auto-update */ }} />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Price / Amount (TK)</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="qty" render={({ field }) => (<FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the expense..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Invoice #123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </ScrollArea>
                <div className="p-4 pt-0 border-t">
                    <Button type="submit" className="w-full mt-4">{expense ? 'Save Changes' : 'Add Expense'}</Button>
                </div>
            </form>
        </Form>
    );
}

// --- Main Page ---
export default function ExpensesPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setFormOpen] = useState(false);
    const [editExpense, setEditExpense] = useState<OutflowTransaction | undefined>(undefined);
    const [deleteExpense, setDeleteExpense] = useState<OutflowTransaction | undefined>(undefined);

    // --- Data Fetching ---
    const projectsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/projects`), [firestore, tenantId]);
    const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

    const vendorsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/vendors`), [firestore, tenantId]);
    const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

    const expensesQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/outflowTransactions`), [firestore, tenantId]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);

    const expensePaymentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, `expensePayments`), where('tenantId', '==', tenantId));
    }, [firestore, tenantId]);
    const { data: expensePayments, isLoading: expensePaymentsLoading } = useCollection<ExpensePayment>(expensePaymentsQuery);

    const isLoading = projectsLoading || vendorsLoading || expensesLoading || expensePaymentsLoading;

    // --- Data Maps ---
    const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
    const vendorsMap = useMemo(() => new Map(vendors?.map(v => [v.id, v.enterpriseName])), [vendors]);

    // --- Handlers ---
    const handleDelete = () => {
        if (!firestore || !deleteExpense) return;
        const expenseDoc = doc(firestore, `tenants/${tenantId}/outflowTransactions`, deleteExpense.id);
        deleteDocumentNonBlocking(expenseDoc);
        toast({ variant: "destructive", title: "Expense Deleted", description: "The expense record has been deleted." });
        setDeleteExpense(undefined);
    };

    const handleFormFinished = () => {
        setFormOpen(false);
        setEditExpense(undefined);
    };
    
    const getStatusVariant = (status: OutflowTransaction['status']) => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Partially Paid': return 'secondary';
            case 'Unpaid': return 'destructive';
            default: return 'outline';
        }
    }


    return (
        <>
            <PageHeader title="Expenses" description="Track and manage all project-related expenses.">
                <Button size="sm" className="gap-1" onClick={() => { setEditExpense(undefined); setFormOpen(true); }} disabled={isLoading}>
                    <PlusCircle className="h-4 w-4" />
                    Add Expense
                </Button>
            </PageHeader>

            <Dialog open={isFormOpen || !!editExpense} onOpenChange={(isOpen) => { if (!isOpen) { setFormOpen(false); setEditExpense(undefined); }}}>
                <DialogContent className="max-w-2xl p-0">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>{editExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                        <DialogDescription>{editExpense ? 'Update the details for this expense.' : 'Fill in the form to record a new expense.'}</DialogDescription>
                    </DialogHeader>
                    {(isFormOpen || editExpense) && <ExpenseForm tenantId={tenantId} onFinished={handleFormFinished} expense={editExpense} projects={projects || []} vendors={vendors || []} />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteExpense} onOpenChange={(isOpen) => !isOpen && setDeleteExpense(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this expense record.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Expense History</CardTitle>
                    <CardDescription>A log of all recorded business expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total / Due (TK)</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading expenses...</TableCell></TableRow>
                            ) : expenses && expenses.length > 0 ? (
                                expenses.map((expense) => {
                                    const due = expense.amount - expense.paidAmount;
                                    return (
                                    <TableRow key={expense.id}>
                                        <TableCell>{format(new Date(expense.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(expense.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{vendorsMap.get(expense.vendorId) || 'N/A'}</TableCell>
                                        <TableCell>{expense.expenseCategoryName}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            {expense.amount.toLocaleString('en-IN')}
                                            <br/>
                                            <span className="text-xs text-muted-foreground">{due.toLocaleString('en-IN')} Due</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setEditExpense(expense)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteExpense(expense)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">No expenses recorded yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="font-headline">Expense Payment Log</CardTitle>
                    <CardDescription>A log of all payments made towards expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount (TK)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading payment log...</TableCell></TableRow>
                            ) : expensePayments && expensePayments.length > 0 ? (
                                expensePayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(payment.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{vendorsMap.get(payment.vendorId) || 'N/A'}</TableCell>
                                        <TableCell>{payment.expenseCategoryName}</TableCell>
                                        <TableCell>{payment.reference || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{payment.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">No expense payments recorded yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
