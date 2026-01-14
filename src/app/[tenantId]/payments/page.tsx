'use client';
import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import {
  useFirestore,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  useCollection,
} from '@/firebase';
import { useParams } from 'next/navigation';
import { getNextReceiptId } from '@/lib/data';
import { PrintReceiptDialog } from '@/components/dashboard/payments/PrintReceiptDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';


type Project = { id: string; name: string; flats: { name: string }[] };
type Customer = { id: string; name: string, address: string };
type FlatSale = { id: string; customerId: string; projectId: string, flatName: string };

export type InflowTransaction = {
  id: string;
  receiptId: string;
  customerId: string;
  projectId: string;
  flatName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  bankName: string;
  chequeNo: string;
  chequeDate: string;
  note: string;
  tenantId: string;
  _originalPath?: string; 
};

// Simplified payment type for the state
type PaymentRecord = InflowTransaction & { saleId: string; };


const AddPaymentForm = ({
  onFinished,
  tenantId,
  projects,
  customers,
  sales,
  onPaymentAdded,
  transactionToEdit
}: {
  onFinished: () => void;
  tenantId: string;
  projects: Project[];
  customers: Customer[];
  sales: FlatSale[];
  onPaymentAdded: (
    transaction: InflowTransaction,
    customer: Customer,
    project: Project,
    sale: FlatSale,
  ) => void;
  transactionToEdit?: PaymentRecord;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const defaultValues = useMemo(() => {
    if (!transactionToEdit) return { date: format(new Date(), 'yyyy-MM-dd') };
    return {
        ...transactionToEdit,
        date: transactionToEdit.date ? format(new Date(transactionToEdit.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        chequeDate: transactionToEdit.chequeDate ? format(new Date(transactionToEdit.chequeDate), 'yyyy-MM-dd') : '',
    }
  }, [transactionToEdit]);


  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Omit<InflowTransaction, 'id' | 'receiptId' | 'tenantId'>>({ defaultValues });

  const selectedCustomerId = watch('customerId');
  const selectedProjectId = watch('projectId');
  const selectedFlatName = watch('flatName');

  const filteredProjects = useMemo(() => {
    if (!selectedCustomerId) return [];
    const customerSales = sales.filter(
      (sale) => sale.customerId === selectedCustomerId
    );
    const projectIds = [...new Set(customerSales.map((sale) => sale.projectId))];
    return projects.filter((p) => projectIds.includes(p.id));
  }, [selectedCustomerId, sales, projects]);

  const filteredFlats = useMemo(() => {
    if (!selectedCustomerId || !selectedProjectId) return [];
    return sales
      .filter(
        (sale) =>
          sale.customerId === selectedCustomerId &&
          sale.projectId === selectedProjectId
      )
      .map((s) => s.flatName);
  }, [selectedCustomerId, selectedProjectId, sales]);
  
  const selectedSale = useMemo(() => {
    if (!selectedCustomerId || !selectedProjectId || !selectedFlatName) return null;
    return sales.find(s => s.customerId === selectedCustomerId && s.projectId === selectedProjectId && s.flatName === selectedFlatName);
  }, [selectedCustomerId, selectedProjectId, selectedFlatName, sales]);


  const onSubmit = async (data: Omit<InflowTransaction, 'id' | 'receiptId' | 'tenantId'>) => {
    if (!firestore || !selectedSale) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not determine the sale to associate this payment with. Please check your selections.',
        });
        return;
    }
    try {
        if(transactionToEdit) {
            const transactionRef = doc(firestore, transactionToEdit._originalPath!);
            const updatedData = {
                ...data,
                date: new Date(data.date).toISOString(),
                amount: Number(data.amount),
            };
            await updateDoc(transactionRef, updatedData);
            toast({
                title: 'Payment Updated',
                description: 'The payment has been updated successfully.',
            });
            onFinished();

        } else {
            const receiptId = await getNextReceiptId(firestore);
            const transactionData = {
                ...data,
                tenantId,
                receiptId,
                date: new Date(data.date).toISOString(),
                amount: Number(data.amount),
            };

            const docRef = await addDoc(
                collection(
                firestore,
                `tenants/${tenantId}/flatSales/${selectedSale.id}/payments`
                ),
                transactionData
            );

            const fullTransaction: InflowTransaction = { ...transactionData, id: docRef.id, flatName: data.flatName };
            const customer = customers.find(c => c.id === data.customerId);
            const project = projects.find(p => p.id === data.projectId);

            toast({
                title: 'Payment Added',
                description: 'The payment has been recorded successfully.',
            });
            onFinished();
            if(customer && project) {
                onPaymentAdded(fullTransaction, customer, project, selectedSale);
            }
        }
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save payment.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
        <ScrollArea className="h-[70vh] p-1 pr-4">
            <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                <Label htmlFor="customerId">Customer</Label>
                <Controller
                    name="customerId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!transactionToEdit}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                        </SelectTrigger>
                        <SelectContent>
                        {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.customerId && <p className="text-red-500 text-xs">Customer is required</p>}
                </div>
                <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Controller
                    name="projectId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedCustomerId || !!transactionToEdit}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                        {filteredProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.projectId && <p className="text-red-500 text-xs">Project is required</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="flatName">Flat</Label>
                    <Controller
                    name="flatName"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedProjectId || !!transactionToEdit}
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Flat" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredFlats.map((flat) => (
                            <SelectItem key={flat} value={flat}>
                                {flat}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                    />
                    {errors.flatName && <p className="text-red-500 text-xs">Flat is required</p>}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" {...register('amount', { required: true, valueAsNumber: true })} />
                {errors.amount && <p className="text-red-500 text-xs">Amount is required</p>}
                </div>
                <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date', { required: true })} />
                {errors.date && <p className="text-red-500 text-xs">Date is required</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Type</Label>
                <Controller
                    name="paymentType"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Booking Money">Booking Money</SelectItem>
                        <SelectItem value="Installment">Installment</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Controller
                    name="paymentMethod"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select Method" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name (if applicable)</Label>
                <Input id="bankName" {...register('bankName')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="chequeNo">Cheque No (if applicable)</Label>
                <Input id="chequeNo" {...register('chequeNo')} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="chequeDate">Cheque Date (if applicable)</Label>
                <Input id="chequeDate" type="date" {...register('chequeDate')} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" {...register('note')} />
            </div>
            </div>

        </ScrollArea>
        <div className="p-4 pt-0 border-t">
          <Button type="submit" className="w-full mt-4">{transactionToEdit ? 'Update Payment' : 'Record Payment'}</Button>
        </div>
    </form>
  );
};

export default function PaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setFormOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<InflowTransaction | null>(null);
  const [lastTransactionCustomer, setLastTransactionCustomer] = useState<any>(null);
  const [lastTransactionProject, setLastTransactionProject] = useState<any>(null);
  const [editTransaction, setEditTransaction] = useState<PaymentRecord | undefined>(undefined);
  const [deleteTransaction, setDeleteTransaction] = useState<PaymentRecord | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  // --- Data Fetching ---
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
  

  useEffect(() => {
    if (!firestore || !tenantId || sales === undefined) {
        setPaymentsLoading(sales === undefined);
        if(sales === null) {
            setPayments([]);
            setPaymentsLoading(false);
        }
        return;
    }
    
    // If sales have loaded but are null or empty, no need to fetch payments.
    if (sales === null || sales.length === 0) {
        setPayments([]);
        setPaymentsLoading(false);
        return;
    }


    const fetchPayments = async () => {
        setPaymentsLoading(true);
        try {
            const paymentPromises = sales.map(async (sale) => {
                const paymentsCollectionRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
                const paymentsSnapshot = await getDocs(paymentsCollectionRef);
                return paymentsSnapshot.docs.map(doc => {
                    const data = doc.data() as InflowTransaction;
                    const path = doc.ref.path;
                    return { ...data, id: doc.id, saleId: sale.id, _originalPath: path };
                });
            });

            const paymentsBySale = await Promise.all(paymentPromises);
            const flattenedPayments = paymentsBySale.flat();

            setPayments(flattenedPayments);
        } catch (error) {
            console.error("Error fetching payments:", error);
            toast({
                variant: 'destructive',
                title: 'Error fetching payments',
                description: 'Could not load payment records.'
            });
        } finally {
            setPaymentsLoading(false);
        }
    };

    fetchPayments();
  }, [firestore, tenantId, sales, toast]);

  const isLoading = projectsLoading || customersLoading || salesLoading || paymentsLoading;
  
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
  const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c.name])), [customers]);
  
  const allDataAvailable = projects && customers && sales;

  const handlePaymentAdded = (transaction: InflowTransaction, customer: Customer, project: Project, sale: FlatSale) => {
    setLastTransaction(transaction);
    setLastTransactionCustomer(customer);
    setLastTransactionProject(project);
    setReceiptOpen(true);
    setPayments(prev => [{...transaction, saleId: sale.id}, ...prev]);
  };

  const handleFormFinished = () => {
    setFormOpen(false);
    setEditTransaction(undefined);
  };
  
  const handleDelete = () => {
    if (!firestore || !deleteTransaction?._originalPath) return;
    const transactionDoc = doc(firestore, deleteTransaction._originalPath);
    deleteDocumentNonBlocking(transactionDoc);
    setPayments(prev => prev.filter(p => p.id !== deleteTransaction.id));
    toast({
        variant: "destructive",
        title: "Payment Deleted",
        description: `Payment record has been deleted.`,
    })
    setDeleteTransaction(undefined);
  };
  
   const getFullTransaction = (payment: PaymentRecord): PaymentRecord | undefined => {
    if (!payment) return undefined;
    return payment;
  };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Record and track customer payments."
      >
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) handleFormFinished(); else setFormOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={!allDataAvailable} onClick={() => { setEditTransaction(undefined); setFormOpen(true);}}>
              <PlusCircle className="h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>{editTransaction ? 'Edit Payment' : 'Record a New Payment'}</DialogTitle>
              <DialogDescription>
                {editTransaction ? 'Update the details for this payment.' : 'Fill in the details to record a new payment.'}
              </DialogDescription>
            </DialogHeader>
            {allDataAvailable ? (
              <AddPaymentForm
                onFinished={handleFormFinished}
                tenantId={tenantId}
                projects={projects || []}
                customers={customers || []}
                sales={sales || []}
                onPaymentAdded={handlePaymentAdded}
                transactionToEdit={editTransaction}
              />
            ) : (
              <p className="p-6">Loading form data...</p>
            )}
          </DialogContent>
        </Dialog>
      </PageHeader>
      
       {lastTransaction && lastTransactionCustomer && lastTransactionProject && (
        <PrintReceiptDialog
          isOpen={isReceiptOpen}
          setIsOpen={setReceiptOpen}
          transaction={lastTransaction}
          customer={lastTransactionCustomer}
          project={lastTransactionProject}
        />
      )}

      <AlertDialog open={!!deleteTransaction} onOpenChange={(isOpen) => !isOpen && setDeleteTransaction(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this payment record.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
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
                <TableHead>Flat</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (TK)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Loading payments...</TableCell>
                </TableRow>
              ) : payments && payments.length > 0 ? (
                payments.map((payment) => (
                    <TableRow key={payment.id}>
                        <TableCell className="font-medium">{customersMap.get(payment.customerId) || 'N/A'}</TableCell>
                        <TableCell>{projectsMap.get(payment.projectId) || 'N/A'}</TableCell>
                        <TableCell>{payment.flatName}</TableCell>
                        <TableCell>{payment.date ? format(new Date(payment.date), 'dd MMM, yyyy') : 'Invalid Date'}</TableCell>
                        <TableCell>{payment.paymentType}</TableCell>
                        <TableCell className="text-right">{payment.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/${tenantId}/sales/${payment.saleId}/payments/${payment.id}/receipt`}>View Receipt</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const fullTransaction = getFullTransaction(payment);
                                if (fullTransaction) {
                                    setEditTransaction(fullTransaction);
                                    setFormOpen(true);
                                }
                              }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => {
                                 const fullTransaction = getFullTransaction(payment);
                                 if (fullTransaction) setDeleteTransaction(fullTransaction);
                              }}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No payments recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
