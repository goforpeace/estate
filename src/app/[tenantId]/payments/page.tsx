'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

// Dependent data types
type FlatSale = { id: string; projectId: string; customerId: string; flatName: string; amount: number; };
type Project = { id: string; name: string; };
type Customer = { id: string; name: string; };

// Payment entity schema
const paymentSchema = z.object({
  flatSaleId: z.string().min(1, "A sold flat must be selected."),
  amount: z.coerce.number().min(1, "Payment amount must be greater than 0."),
  type: z.enum(["Cash", "Cheque", "Bank Transfer"]),
  paymentFor: z.enum(["Booking Money", "Installment"]),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid payment date is required." }),
  reference: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;
type Payment = PaymentFormData & { id: string; };
type PaymentWithDetails = Payment & { projectName: string; customerName: string; };


function PaymentForm({ tenantId, onFinished, payment, sales, projects, customers, paymentsBySale }: { tenantId: string; onFinished: () => void; payment?: Payment; sales: FlatSale[]; projects: Project[]; customers: Customer[], paymentsBySale: Record<string, Payment[]> }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Create a new form schema that includes a temporary projectId field
    const formSchema = paymentSchema.extend({
        projectId: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: payment ? {
            ...payment,
            projectId: sales.find(s => s.id === payment.flatSaleId)?.projectId,
            paymentDate: format(new Date(payment.paymentDate), 'yyyy-MM-dd'),
        } : {
            projectId: '',
            flatSaleId: '',
            amount: 0,
            type: 'Cash',
            paymentFor: 'Installment',
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            reference: '',
        },
    });

    const selectedProjectId = form.watch('projectId');
    const selectedSaleId = form.watch('flatSaleId');
    const selectedSale = useMemo(() => sales.find(s => s.id === selectedSaleId), [sales, selectedSaleId]);
    
    const availableSalesInProject = useMemo(() => {
        if (!selectedProjectId) return [];
        return sales.filter(s => s.projectId === selectedProjectId);
    }, [sales, selectedProjectId]);

    const { dueAmount, project, customer } = useMemo(() => {
        if (!selectedSale) return { dueAmount: 0, project: null, customer: null };

        const totalPaid = paymentsBySale[selectedSale.id]?.reduce((acc, p) => acc + p.amount, 0) || 0;
        // If editing, subtract the current payment's amount from total paid to calculate due amount correctly
        const currentPaymentAmount = (payment && payment.flatSaleId === selectedSale.id) ? payment.amount : 0;
        const due = selectedSale.amount - totalPaid + currentPaymentAmount;
        
        return {
            dueAmount: due,
            project: projects.find(p => p.id === selectedSale.projectId),
            customer: customers.find(c => c.id === selectedSale.customerId),
        };
    }, [selectedSale, paymentsBySale, projects, customers, payment]);
    
    const onSubmit = (data: PaymentFormData) => {
        if (!firestore || !selectedSale) return;

        const paymentData = {
            ...data,
            paymentDate: new Date(data.paymentDate).toISOString(),
        };

        if (payment) {
            // Update
            const paymentDocRef = doc(firestore, `tenants/${tenantId}/flatSales/${selectedSale.id}/payments`, payment.id);
            updateDocumentNonBlocking(paymentDocRef, paymentData);
            toast({ title: "Payment Updated", description: "The payment record has been updated." });
        } else {
            // Create
            const paymentsColRef = collection(firestore, `tenants/${tenantId}/flatSales/${selectedSale.id}/payments`);
            addDocumentNonBlocking(paymentsColRef, paymentData);
            toast({ title: "Payment Added", description: "The new payment has been recorded." });
        }
        
        onFinished();
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
                                            form.setValue('flatSaleId', ''); // Reset flat selection
                                        }} defaultValue={field.value} disabled={projects.length === 0 || !!payment}>
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
                                name="flatSaleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sold Flat</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId || availableSalesInProject.length === 0 || !!payment}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a sold flat" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableSalesInProject.map(sale => {
                                                    const cust = customers.find(c => c.id === sale.customerId);
                                                    return <SelectItem key={sale.id} value={sale.id}>{sale.flatName} ({cust?.name})</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {selectedSale && (
                            <Card className="bg-muted/50">
                                <CardContent className="pt-4 text-sm space-y-2">
                                    <p><b>Customer:</b> {customer?.name}</p>
                                    <p><b>Total Due:</b> TK {dueAmount.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Payment Amount (TK)</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="paymentDate" render={({ field }) => (<FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="paymentFor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment For</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Booking Money">Booking Money</SelectItem>
                                                <SelectItem value="Installment">Installment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Cheque No. / TXN ID" {...field} /></FormControl><FormDescription className="text-xs">Optional. e.g., Cheque No.</FormDescription><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                </ScrollArea>
                <div className="p-4 pt-0 border-t">
                    <Button type="submit" className="w-full mt-4">{payment ? 'Save Changes' : 'Record Payment'}</Button>
                </div>
            </form>
        </Form>
    );
}

export default function PaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<{payment: Payment, sale: FlatSale} | undefined>(undefined);
  const [deletePayment, setDeletePayment] = useState<{payment: Payment, sale: FlatSale} | undefined>(undefined);
  
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  // --- Data Fetching ---
  const salesQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/flatSales`), [firestore, tenantId]);
  const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);
  
  const projectsQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/projects`), [firestore, tenantId]);
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

  const customersQuery = useMemoFirebase(() => collection(firestore, `tenants/${tenantId}/customers`), [firestore, tenantId]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  // --- New manual payment fetching logic ---
  useEffect(() => {
    if (!sales || !firestore) {
      if(!salesLoading){
        setPaymentsLoading(false);
      }
      return;
    };

    setPaymentsLoading(true);

    const fetchAllPayments = async () => {
        const paymentPromises = sales.map(async (sale) => {
            const paymentsColRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
            const paymentsSnapshot = await getDocs(paymentsColRef);
            return paymentsSnapshot.docs.map(doc => ({
                id: doc.id, // This is the actual payment document ID
                flatSaleId: sale.id, 
                ...doc.data()
            } as Payment));
        });

        const paymentsBySaleArray = await Promise.all(paymentPromises);
        const flattenedPayments = paymentsBySaleArray.flat();
        setAllPayments(flattenedPayments);
        setPaymentsLoading(false);
    };

    fetchAllPayments();

  }, [sales, firestore, tenantId, salesLoading]);


  const isLoading = salesLoading || projectsLoading || customersLoading || paymentsLoading;

  // --- Data Processing ---
  const { paymentsWithDetails, paymentsBySale } = useMemo(() => {
    if (!allPayments || !sales || !projects || !customers) return { paymentsWithDetails: [], paymentsBySale: {} };

    const projectsMap = new Map(projects.map(p => [p.id, p.name]));
    const customersMap = new Map(customers.map(c => [c.id, c.name]));
    const salesMap = new Map(sales.map(s => [s.id, s]));

    const details: PaymentWithDetails[] = [];
    const bySale: Record<string, Payment[]> = {};

    allPayments.forEach(p => {
        const sale = salesMap.get(p.flatSaleId);
        if (sale) {
             details.push({
                ...p,
                projectName: projectsMap.get(sale.projectId) || 'Unknown Project',
                customerName: customersMap.get(sale.customerId) || 'Unknown Customer',
             });
             if (!bySale[p.flatSaleId]) bySale[p.flatSaleId] = [];
             bySale[p.flatSaleId].push(p);
        }
    });
    return { paymentsWithDetails: details.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()), paymentsBySale: bySale };
  }, [allPayments, sales, projects, customers]);

  // --- Handlers ---
  const handleDelete = () => {
    if (!firestore || !deletePayment) return;
    const paymentDoc = doc(firestore, `tenants/${tenantId}/flatSales/${deletePayment.sale.id}/payments`, deletePayment.payment.id);
    deleteDocumentNonBlocking(paymentDoc);
    setAllPayments(prev => prev.filter(p => p.id !== deletePayment.payment.id));
    toast({ variant: "destructive", title: "Payment Deleted", description: "The payment record has been deleted." });
    setDeletePayment(undefined);
  };
  
  const handleFormFinished = () => {
    setFormOpen(false);
    setEditPayment(undefined);
    // This is a temporary way to force a refresh. A more elegant solution would involve
    // state management or another useEffect trigger.
    window.location.reload();
  };

  return (
    <>
      <PageHeader title="Payments" description="Record and track customer payments.">
         <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1" disabled={isLoading} onClick={() => { setEditPayment(undefined); setFormOpen(true); }}>
                    <PlusCircle className="h-4 w-4" />
                    Add Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0">
                <DialogHeader className="p-6 pb-4"><DialogTitle>Add a New Payment</DialogTitle><DialogDescription>Select the property and enter payment details.</DialogDescription></DialogHeader>
                {isFormOpen && <PaymentForm tenantId={tenantId} onFinished={handleFormFinished} sales={sales || []} projects={projects || []} customers={customers || []} paymentsBySale={paymentsBySale} />}
            </DialogContent>
         </Dialog>
      </PageHeader>

      <Dialog open={!!editPayment} onOpenChange={(isOpen) => !isOpen && setEditPayment(undefined)}>
        <DialogContent className="max-w-xl p-0">
            <DialogHeader className="p-6 pb-4"><DialogTitle>Edit Payment</DialogTitle><DialogDescription>Update the details for this payment record.</DialogDescription></DialogHeader>
            {editPayment && <PaymentForm tenantId={tenantId} payment={editPayment.payment} onFinished={handleFormFinished} sales={sales || []} projects={projects || []} customers={customers || []} paymentsBySale={paymentsBySale} />}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletePayment} onOpenChange={(isOpen) => !isOpen && setDeletePayment(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this payment record. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Payment Logs</CardTitle>
            <CardDescription>A history of all recorded payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (TK)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading payments...</TableCell></TableRow>
              ) : paymentsWithDetails.length > 0 ? (
                paymentsWithDetails.map((payment) => {
                  const sale = sales?.find(s => s.id === payment.flatSaleId);
                  return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                    <TableCell>{payment.projectName}</TableCell>
                    <TableCell>{payment.paymentFor}</TableCell>
                    <TableCell>{format(new Date(payment.paymentDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell className="text-right font-mono">{payment.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="gap-1">
                              <Link href={`/${tenantId}/payments/${payment.id}/receipt?saleId=${payment.flatSaleId}`}>
                                  <Printer className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">Print</span>
                              </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => sale && setEditPayment({payment, sale})}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => sale && setDeletePayment({payment, sale})}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No payments recorded yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

    