'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Plus } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, getDocs, runTransaction } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { useLoading } from "@/context/loading-context";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  tenantId: string;
  outflowTransactionId: string;
  vendorId: string;
  projectId: string;
  expenseCategoryName: string;
  amount: number;
  date: string;
  note?: string;
  reference?: string;
  _originalPath?: string; // For easy doc reference
};


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

const expensePaymentEditSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date is required." }),
    reference: z.string().optional(),
    note: z.string().optional(),
});
type ExpensePaymentEditFormData = z.infer<typeof expensePaymentEditSchema>;


// --- Add Category Dialog ---
function AddCategoryDialog({ tenantId, onFinished }: { tenantId: string; onFinished: () => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading, isLoading } = useLoading();
    
    const form = useForm<ExpenseCategoryFormData>({
        resolver: zodResolver(expenseCategorySchema),
        defaultValues: { name: "" },
    });

    const onSubmit = async (data: ExpenseCategoryFormData) => {
        if (!firestore) return;
        showLoading("Adding category...");

        try {
            const categoryData = { ...data, tenantId };
            const categoriesCollection = collection(firestore, `tenants/${tenantId}/expenseCategories`);
            await addDocumentNonBlocking(categoriesCollection, categoryData);
            toast({ title: "Category Added", description: `"${data.name}" has been added.` });
            onFinished();
            form.reset();
        } catch (error) {
            console.error("Failed to add category:", error);
            toast({ variant: "destructive", title: "Failed", description: "Could not add category." });
        } finally {
            hideLoading();
        }
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
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Category'}
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
    const { showLoading, hideLoading, isLoading } = useLoading();
    
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

    const onSubmit = async (data: OutflowTransactionFormData) => {
        if (!firestore) return;
        showLoading(expense ? 'Updating expense...' : 'Adding expense...');

        try {
            if (expense) {
                const expenseData = {
                    ...data,
                    date: new Date(data.date).toISOString(),
                };
                const expenseDocRef = doc(firestore, `tenants/${tenantId}/outflowTransactions`, expense.id);
                await updateDocumentNonBlocking(expenseDocRef, expenseData);
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
                await addDocumentNonBlocking(expensesCollection, expenseData);
                toast({ title: "Expense Added", description: "The new expense has been recorded." });
            }
            onFinished();
        } catch (error) {
            console.error("Failed to save expense:", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save expense record." });
        } finally {
            hideLoading();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
                <div className="space-y-4 p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="projectId" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Project</FormLabel>
                                <Combobox
                                options={projects.map(p => ({ value: p.id, label: p.name }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a project"
                                searchPlaceholder="Search projects..."
                                />
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="vendorId" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Vendor</FormLabel>
                                <Combobox
                                options={vendors.map(v => ({ value: v.id, label: `${v.enterpriseName} (${v.name})` }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select a vendor"
                                searchPlaceholder="Search vendors..."
                                />
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="expenseCategoryName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Item / Category</FormLabel>
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <Combobox
                                    options={categories?.map(c => ({ value: c.name, label: c.name })) || []}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select an item"
                                    searchPlaceholder="Search items..."
                                    />
                                </div>
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
                <div className="mt-6">
                    <Button type="submit" className="w-full" disabled={isLoading}>{expense ? 'Save Changes' : 'Add Expense'}</Button>
                </div>
            </form>
        </Form>
    );
}

function EditExpensePaymentForm({ tenantId, payment, onFinished }: { tenantId: string; payment: ExpensePayment; onFinished: () => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading, isLoading } = useLoading();
    
    const form = useForm<ExpensePaymentEditFormData>({
        resolver: zodResolver(expensePaymentEditSchema),
        defaultValues: {
            amount: payment.amount,
            date: format(new Date(payment.date), 'yyyy-MM-dd'),
            reference: payment.reference || '',
            note: payment.note || '',
        },
    });

    const onSubmit = async (data: ExpensePaymentEditFormData) => {
        if (!firestore || !payment._originalPath || !payment.outflowTransactionId) return;
        showLoading("Updating payment...");

        const paymentDocRef = doc(firestore, payment._originalPath);
        const expenseDocRef = doc(firestore, `tenants/${tenantId}/outflowTransactions`, payment.outflowTransactionId);
        const amountDifference = data.amount - payment.amount;

        try {
            await runTransaction(firestore, async (transaction) => {
                const expenseDoc = await transaction.get(expenseDocRef);
                if (!expenseDoc.exists()) {
                    throw new Error("Parent expense document does not exist!");
                }
                const expenseData = expenseDoc.data() as OutflowTransaction;
                
                const currentPaid = expenseData.paidAmount || 0;
                const newPaidAmount = currentPaid + amountDifference;
                
                if (newPaidAmount > expenseData.amount) {
                    throw new Error(`Payment would exceed the total expense amount of TK ${expenseData.amount}.`);
                }

                let newStatus: OutflowTransaction['status'] = 'Partially Paid';
                if (newPaidAmount <= 0) {
                    newStatus = 'Unpaid';
                } else if (newPaidAmount >= expenseData.amount) {
                    newStatus = 'Paid';
                }
                
                transaction.update(expenseDocRef, { paidAmount: newPaidAmount, status: newStatus });
                transaction.update(paymentDocRef, { ...data, date: new Date(data.date).toISOString() });
            });
            toast({ title: "Payment Updated", description: "The payment has been updated successfully." });
            onFinished();
        } catch (error: any) {
            console.error("Payment update failed: ", error);
            toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update payment." });
        } finally {
            hideLoading();
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (TK)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Cheque #, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="note" render={({ field }) => (<FormItem><FormLabel>Note</FormLabel><FormControl><Textarea placeholder="Payment note..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Updating...' : 'Update Payment'}</Button>
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
    const { showLoading, hideLoading } = useLoading();

    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editExpense, setEditExpense] = useState<OutflowTransaction | undefined>(undefined);
    const [deleteExpense, setDeleteExpense] = useState<OutflowTransaction | undefined>(undefined);
    const [viewPayment, setViewPayment] = useState<ExpensePayment | undefined>(undefined);
    const [editPayment, setEditPayment] = useState<ExpensePayment | undefined>(undefined);
    const [deletePayment, setDeletePayment] = useState<ExpensePayment | undefined>(undefined);

    // --- Data Fetching ---
    const projectsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/projects`), [firestore, tenantId]);
    const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

    const vendorsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/vendors`), [firestore, tenantId]);
    const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

    const expensesQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/outflowTransactions`), [firestore, tenantId]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);

    const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
    const [expensePaymentsLoading, setExpensePaymentsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !tenantId || expenses === undefined) {
            setExpensePaymentsLoading(false);
            return;
        }

        if (expenses === null || expenses.length === 0) {
            setExpensePayments([]);
            setExpensePaymentsLoading(false);
            return;
        }

        const fetchAllPayments = async () => {
            setExpensePaymentsLoading(true);
            const allPayments: ExpensePayment[] = [];
            const promises = expenses.map(expense => {
                const paymentsRef = collection(firestore, `tenants/${tenantId}/outflowTransactions/${expense.id}/expensePayments`);
                return getDocs(paymentsRef).then(snapshot => {
                    snapshot.forEach(doc => {
                        allPayments.push({ id: doc.id, ...doc.data(), _originalPath: doc.ref.path } as ExpensePayment);
                    });
                });
            });

            try {
                await Promise.all(promises);
                allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setExpensePayments(allPayments);
            } catch (e: any) {
                console.error("Error fetching expense payments:", e);
                toast({
                    variant: "destructive",
                    title: "Error loading payment log",
                    description: e.message || "Could not fetch all payment records."
                });
            } finally {
                setExpensePaymentsLoading(false);
            }
        };

        fetchAllPayments();

    }, [firestore, tenantId, expenses, toast]);


    const isLoading = projectsLoading || vendorsLoading || expensesLoading || expensePaymentsLoading;

    // --- Data Maps ---
    const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
    const vendorsMap = useMemo(() => new Map(vendors?.map(v => [v.id, v.enterpriseName])), [vendors]);

    // --- Handlers ---
    const handleDeleteExpense = async () => {
        if (!firestore || !deleteExpense) return;
        showLoading("Deleting expense...");
        try {
            const expenseDoc = doc(firestore, `tenants/${tenantId}/outflowTransactions`, deleteExpense.id);
            await deleteDocumentNonBlocking(expenseDoc);
            toast({ variant: "destructive", title: "Expense Deleted", description: "The expense record has been deleted." });
            setDeleteExpense(undefined);
        } catch (error) {
            console.error("Failed to delete expense:", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete expense record." });
        } finally {
            hideLoading();
        }
    };

    const handleSheetClose = () => {
        setSheetOpen(false);
        setTimeout(() => {
          setEditExpense(undefined);
        }, 300);
      };
    
      const handleAddClick = () => {
        setEditExpense(undefined);
        setSheetOpen(true);
      };
    
      const handleEditClick = (expense: OutflowTransaction) => {
        setEditExpense(expense);
        setSheetOpen(true);
      };

    const handleDeletePayment = async () => {
        if (!firestore || !deletePayment || !deletePayment._originalPath || !deletePayment.outflowTransactionId) return;
        showLoading("Deleting payment...");
        
        const paymentDocRef = doc(firestore, deletePayment._originalPath);
        const expenseDocRef = doc(firestore, `tenants/${tenantId}/outflowTransactions`, deletePayment.outflowTransactionId);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const expenseDoc = await transaction.get(expenseDocRef);
                if (!expenseDoc.exists()) {
                    throw new Error("Parent expense document does not exist!");
                }
                const expenseData = expenseDoc.data() as OutflowTransaction;
                const newPaidAmount = expenseData.paidAmount - deletePayment.amount;
    
                let newStatus: OutflowTransaction['status'] = 'Partially Paid';
                if (newPaidAmount <= 0) {
                    newStatus = 'Unpaid';
                } else if (newPaidAmount >= expenseData.amount) {
                    newStatus = 'Paid';
                }
    
                transaction.update(expenseDocRef, { paidAmount: newPaidAmount, status: newStatus });
                transaction.delete(paymentDocRef);
            });
    
            setExpensePayments(prev => prev.filter(p => p.id !== deletePayment.id));
            
            toast({
                variant: "destructive",
                title: "Payment Deleted",
                description: `Payment record has been deleted and expense status updated.`,
            });
    
        } catch (error: any) {
            console.error("Error deleting payment:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Could not delete payment record." });
        } finally {
            hideLoading();
            setDeletePayment(undefined);
        }
    }
    
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
                <Button size="sm" className="gap-1" onClick={handleAddClick} disabled={isLoading}>
                    <PlusCircle className="h-4 w-4" />
                    Add Expense
                </Button>
            </PageHeader>

            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="sm:max-w-2xl w-full">
                    <SheetHeader>
                        <SheetTitle>{editExpense ? 'Edit Expense' : 'Add New Expense'}</SheetTitle>
                        <SheetDescription>{editExpense ? 'Update the details for this expense.' : 'Fill in the form to record a new expense.'}</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100%-4rem)]">
                        <div className="pr-6 pl-1 py-4">
                            <ExpenseForm tenantId={tenantId} onFinished={handleSheetClose} expense={editExpense} projects={projects || []} vendors={vendors || []} />
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteExpense} onOpenChange={(isOpen) => !isOpen && setDeleteExpense(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this expense record.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             <Dialog open={!!editPayment} onOpenChange={(isOpen) => !isOpen && setEditPayment(undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment Record</DialogTitle>
                        <DialogDescription>Update the details for this payment.</DialogDescription>
                    </DialogHeader>
                    {editPayment && <EditExpensePaymentForm tenantId={tenantId} payment={editPayment} onFinished={() => setEditPayment(undefined)} />}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletePayment} onOpenChange={(isOpen) => !isOpen && setDeletePayment(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this payment record and update the expense's due amount.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePayment}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!viewPayment} onOpenChange={(isOpen) => !isOpen && setViewPayment(undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Payment Details</DialogTitle>
                        <DialogDescription>Reference: {viewPayment?.reference || 'N/A'}</DialogDescription>
                    </DialogHeader>
                    {viewPayment && (
                        <div className="grid gap-4 py-4 text-sm">
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Amount</Label><div>TK {viewPayment.amount.toLocaleString('en-IN')}</div></div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Date</Label><div>{format(new Date(viewPayment.date), 'dd MMM, yyyy')}</div></div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Project</Label><div>{projectsMap.get(viewPayment.projectId) || 'N/A'}</div></div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Vendor</Label><div>{vendorsMap.get(viewPayment.vendorId) || 'N/A'}</div></div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4"><Label className="text-right text-muted-foreground">Category</Label><div>{viewPayment.expenseCategoryName}</div></div>
                            <div className="grid grid-cols-[100px_1fr] items-start gap-4"><Label className="text-right text-muted-foreground pt-1">Note</Label><p className="whitespace-pre-wrap">{viewPayment.note || 'No note provided.'}</p></div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
                                                    <DropdownMenuItem onClick={() => handleEditClick(expense)}>Edit</DropdownMenuItem>
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
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading payment log...</TableCell></TableRow>
                            ) : expensePayments && expensePayments.length > 0 ? (
                                expensePayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(payment.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{vendorsMap.get(payment.vendorId) || 'N/A'}</TableCell>
                                        <TableCell>{payment.expenseCategoryName}</TableCell>
                                        <TableCell>{payment.reference || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{payment.amount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setViewPayment(payment)}>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditPayment(payment)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletePayment(payment)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">No expense payments recorded yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
