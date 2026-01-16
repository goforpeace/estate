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
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import {
  collection,
  doc,
  getDocs,
} from 'firebase/firestore';
import {
  useFirestore,
  deleteDocumentNonBlocking,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
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
import { type FlatSale } from '../sales/page';
import { Combobox } from '@/components/ui/combobox';
import { useLoading } from '@/context/loading-context';


type Project = { id: string; name: string; flats: { name: string }[] };
type Customer = { id: string; name: string, address: string };

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

const ITEMS_PER_PAGE = 20;

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
  const { showLoading, hideLoading, isLoading } = useLoading();

  const defaultValues = useMemo(() => {
    if (!transactionToEdit) return { date: format(new Date(), 'yyyy-MM-dd'), paymentMethod: '', paymentType: '' };
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

  const paymentTypes = useMemo(() => {
    const baseTypes = ["Booking Money", "Installment"];
    if (!selectedSale || !selectedSale.additionalCosts) {
        return baseTypes;
    }
    const additional = selectedSale.additionalCosts.map(cost => cost.description);
    return [...baseTypes, ...additional];
  }, [selectedSale]);


  const onSubmit = async (data: Omit<InflowTransaction, 'id' | 'receiptId' | 'tenantId'>) => {
    if (!firestore || !selectedSale) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not determine the sale to associate this payment with. Please check your selections.',
        });
        return;
    }
    showLoading(transactionToEdit ? 'Updating Payment...' : 'Recording Payment...');
    try {
        if(transactionToEdit) {
            const transactionRef = doc(firestore, transactionToEdit._originalPath!);
            const updatedData = {
                ...data,
                date: new Date(data.date).toISOString(),
                amount: Number(data.amount),
            };
            await updateDocumentNonBlocking(transactionRef, updatedData);
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

            const collectionRef = collection(firestore,`tenants/${tenantId}/flatSales/${selectedSale.id}/payments`);
            const docRef = await addDocumentNonBlocking(collectionRef, transactionData);

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
    } finally {
        hideLoading();
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
                      <Combobox
                        options={customers.map((c) => ({ value: c.id, label: c.name }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Customer"
                        searchPlaceholder="Search customers..."
                        disabled={!!transactionToEdit}
                      />
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
                      <Combobox
                        options={filteredProjects.map((p) => ({ value: p.id, label: p.name }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Project"
                        searchPlaceholder="Search projects..."
                        disabled={!selectedCustomerId || !!transactionToEdit}
                      />
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
                      <Combobox
                        options={filteredFlats.map((flat) => ({ value: flat, label: flat }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Flat"
                        searchPlaceholder="Search flats..."
                        disabled={!selectedProjectId || !!transactionToEdit}
                      />
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
                      <Combobox
                        options={paymentTypes.map(type => ({ value: type, label: type }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Type"
                        searchPlaceholder="Search types..."
                      />
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
                      <Combobox
                        options={[
                          { value: "Cash", label: "Cash" },
                          { value: "Cheque", label: "Cheque" },
                          { value: "Bank Transfer", label: "Bank Transfer" },
                        ]}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Method"
                      />
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
          <Button type="submit" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? 'Recording...' : (transactionToEdit ? 'Update Payment' : 'Record Payment')}
          </Button>
        </div>
    </form>
  );
};

export default function PaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();

  const [isFormOpen, setFormOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{transaction: InflowTransaction, customer: Customer, project: Project} | null>(null);
  const [editTransaction, setEditTransaction] = useState<PaymentRecord | undefined>(undefined);
  const [deleteTransaction, setDeleteTransaction] = useState<PaymentRecord | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
  
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p])), [projects]);
  const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c])), [customers]);
  
  const allDataAvailable = projects && customers && sales;

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!searchTerm) return payments;
    const lowercasedTerm = searchTerm.toLowerCase();
    return payments.filter(payment => {
      const customerName = customersMap.get(payment.customerId)?.name.toLowerCase() || '';
      const projectName = projectsMap.get(payment.projectId)?.name.toLowerCase() || '';
      return (
        customerName.includes(lowercasedTerm) ||
        projectName.includes(lowercasedTerm) ||
        payment.flatName.toLowerCase().includes(lowercasedTerm) ||
        payment.receiptId.includes(lowercasedTerm) ||
        payment.amount.toString().includes(lowercasedTerm) ||
        (payment.date && format(new Date(payment.date), 'dd-MM-yyyy').includes(lowercasedTerm))
      );
    });
  }, [payments, searchTerm, customersMap, projectsMap]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const handlePaymentAdded = (transaction: InflowTransaction, customer: Customer, project: Project, sale: FlatSale) => {
    setReceiptData({ transaction, customer, project });
    setReceiptOpen(true);
    setPayments(prev => [{...transaction, saleId: sale.id}, ...prev]);
  };

  const handleViewReceipt = (payment: PaymentRecord) => {
    const customer = customersMap.get(payment.customerId);
    const project = projectsMap.get(payment.projectId);
    if(customer && project) {
      setReceiptData({ transaction: payment, customer, project });
      setReceiptOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Could not generate receipt",
        description: "Missing customer or project information.",
      });
    }
  };

  const handleFormFinished = () => {
    setFormOpen(false);
    setEditTransaction(undefined);
  };
  
  const handleDelete = async () => {
    if (!firestore || !deleteTransaction?._originalPath) return;
    showLoading("Deleting payment...");
    try {
        const transactionDoc = doc(firestore, deleteTransaction._originalPath);
        await deleteDocumentNonBlocking(transactionDoc);
        setPayments(prev => prev.filter(p => p.id !== deleteTransaction!.id));
        toast({
            variant: "destructive",
            title: "Payment Deleted",
            description: `Payment record has been deleted.`,
        })
        setDeleteTransaction(undefined);
    } catch (error) {
        console.error("Failed to delete payment:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete payment." });
    } finally {
        hideLoading();
    }
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
      
       {receiptData && (
        <PrintReceiptDialog
          isOpen={isReceiptOpen}
          setIsOpen={setReceiptOpen}
          transaction={receiptData.transaction}
          customer={receiptData.customer}
          project={receiptData.project}
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

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by customer, project, amount..."
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
              ) : paginatedPayments && paginatedPayments.length > 0 ? (
                paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                        <TableCell className="font-medium">{customersMap.get(payment.customerId)?.name || 'N/A'}</TableCell>
                        <TableCell>{projectsMap.get(payment.projectId)?.name || 'N/A'}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleViewReceipt(payment)}>View Receipt</DropdownMenuItem>
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
                    <TableCell colSpan={7} className="h-24 text-center">No payments found.</TableCell>
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
