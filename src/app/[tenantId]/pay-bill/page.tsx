'use client'

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { collection, doc, runTransaction } from "firebase/firestore";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";

// --- Type Definitions ---
type Vendor = { id: string; name: string; enterpriseName: string; };
type OutflowTransaction = {
  id: string;
  projectId: string;
  vendorId: string;
  expenseCategoryName: string;
  amount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  paidAmount: number;
};

// --- Zod Schema ---
const payBillSchema = z.object({
    vendorId: z.string().min(1, "Vendor is required."),
    expenseId: z.string().min(1, "Expense is required."),
    amountPaid: z.coerce.number().min(0.01, "Amount must be greater than 0."),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid date is required." }),
    reference: z.string().optional(),
    note: z.string().optional(),
});
type PayBillFormData = z.infer<typeof payBillSchema>;


export default function PayBillPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const vendorsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/vendors`), [firestore, tenantId]);
    const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

    const expensesQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/outflowTransactions`), [firestore, tenantId]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);
    
    // --- Form Setup ---
    const form = useForm<PayBillFormData>({
        resolver: zodResolver(payBillSchema),
        defaultValues: {
            vendorId: '',
            expenseId: '',
            amountPaid: 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            reference: '',
            note: '',
        },
    });

    const selectedVendorId = form.watch('vendorId');
    const selectedExpenseId = form.watch('expenseId');

    // --- Memoized Filters & Calculations ---
    const availableExpenses = useMemo(() => {
        if (!selectedVendorId || !expenses) return [];
        return expenses.filter(e => e.vendorId === selectedVendorId && e.status !== 'Paid');
    }, [selectedVendorId, expenses]);

    const selectedExpense = useMemo(() => {
        if (!selectedExpenseId || !availableExpenses) return null;
        return availableExpenses.find(e => e.id === selectedExpenseId);
    }, [selectedExpenseId, availableExpenses]);

    const dueAmount = useMemo(() => {
        if (!selectedExpense) return 0;
        return selectedExpense.amount - selectedExpense.paidAmount;
    }, [selectedExpense]);
    
    // --- Form Submission ---
    const onSubmit = async (data: PayBillFormData) => {
        if (!firestore || !selectedExpense) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid expense.' });
            return;
        }
        if (data.amountPaid > dueAmount) {
             toast({ variant: 'destructive', title: 'Invalid Amount', description: `Payment cannot exceed the due amount of TK ${dueAmount.toLocaleString()}.` });
            return;
        }
        
        setIsSubmitting(true);
        
        const expenseRef = doc(firestore, `tenants/${tenantId}/outflowTransactions`, data.expenseId);
        const expensePaymentsRef = collection(expenseRef, 'expensePayments');

        try {
            await runTransaction(firestore, async (transaction) => {
                const expenseDoc = await transaction.get(expenseRef);
                if (!expenseDoc.exists()) {
                    throw "Expense document does not exist!";
                }

                const expenseData = expenseDoc.data() as OutflowTransaction;
                const newPaidAmount = (expenseData.paidAmount || 0) + data.amountPaid;
                const newDueAmount = expenseData.amount - newPaidAmount;

                let newStatus: 'Unpaid' | 'Partially Paid' | 'Paid' = 'Partially Paid';
                if (newDueAmount <= 0) {
                    newStatus = 'Paid';
                }

                transaction.update(expenseRef, { 
                    paidAmount: newPaidAmount,
                    status: newStatus 
                });

                const newPaymentRef = doc(expensePaymentsRef); // auto-generate ID
                transaction.set(newPaymentRef, {
                    id: newPaymentRef.id,
                    tenantId,
                    outflowTransactionId: data.expenseId,
                    vendorId: data.vendorId,
                    projectId: expenseData.projectId,
                    amount: data.amountPaid,
                    date: new Date(data.date).toISOString(),
                    note: data.note || '',
                    reference: data.reference || ''
                });
            });

            toast({ title: "Payment Recorded", description: "The payment has been successfully recorded." });
            form.reset();
            form.setValue('date', format(new Date(), 'yyyy-MM-dd'));
        } catch (error) {
            console.error("Payment transaction failed: ", error);
            toast({ variant: "destructive", title: "Payment Failed", description: "Could not record the payment." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = vendorsLoading || expensesLoading;

    return (
        <>
            <PageHeader title="Pay Bill" description="Record a payment made to a vendor for an expense." />

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline">Payment Form</CardTitle>
                    <CardDescription>Select a vendor and expense to record a payment.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="vendorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vendor</FormLabel>
                                            <Select onValueChange={(value) => {
                                                field.onChange(value);
                                                form.setValue('expenseId', '');
                                            }} defaultValue={field.value} disabled={isLoading}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl>
                                                <SelectContent>{vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.enterpriseName} ({v.name})</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="expenseId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expense</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedVendorId}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an expense to pay" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {availableExpenses.map(e => {
                                                        const expenseDue = e.amount - e.paidAmount;
                                                        return <SelectItem key={e.id} value={e.id}>{e.expenseCategoryName} (Due: {expenseDue.toLocaleString()})</SelectItem>
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             {selectedExpense && (
                                <div className="p-4 bg-secondary rounded-lg text-secondary-foreground">
                                    <h4 className="font-bold text-lg">Amount Due: TK {dueAmount.toLocaleString()}</h4>
                                    <p className="text-xs">Total: {selectedExpense.amount.toLocaleString()} / Paid: {selectedExpense.paidAmount.toLocaleString()}</p>
                                </div>
                            )}

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="amountPaid" render={({ field }) => (<FormItem><FormLabel>Amount to Pay (TK)</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} disabled={!selectedExpense} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} disabled={!selectedExpense} /></FormControl><FormMessage /></FormItem>)} />
                            </div>

                            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Cheque #, Transaction ID, etc." {...field} disabled={!selectedExpense} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="note" render={({ field }) => (<FormItem><FormLabel>Note</FormLabel><FormControl><Textarea placeholder="Add a note for this payment..." {...field} disabled={!selectedExpense} /></FormControl><FormMessage /></FormItem>)} />
                            
                            <Button type="submit" disabled={!selectedExpense || isSubmitting}>
                                {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}
