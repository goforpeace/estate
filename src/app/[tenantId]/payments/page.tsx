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
  collectionGroup,
  query,
  where,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { useParams } from 'next/navigation';
import { getNextReceiptId } from '@/lib/data';
import { PrintReceiptDialog } from '@/components/dashboard/payments/PrintReceiptDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

type Project = { id: string; name: string; flats: { name: string }[] };
type Customer = { id: string; name: string, address: string };
type FlatSale = { id: string; customerId: string; projectId: string, flatName: string };

export type InflowTransaction = {
  id: string;
  receiptId: string;
  customerId: string;
  projectId: string;
  flatId: string;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  bankName: string;
  chequeNo: string;
  chequeDate: string;
  note: string;
  tenantId: string; // Added for collectionGroup query
};

const AddPaymentForm = ({
  onFinished,
  tenantId,
  projects,
  customers,
  sales,
  onPaymentAdded,
}: {
  onFinished: () => void;
  tenantId: string;
  projects: Project[];
  customers: Customer[];
  sales: FlatSale[];
  onPaymentAdded: (
    transaction: InflowTransaction,
    customer: Customer,
    project: Project
  ) => void;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Omit<InflowTransaction, 'id' | 'receiptId'>>();

  const selectedCustomerId = watch('customerId');
  const selectedProjectId = watch('projectId');

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

  const onSubmit = async (data: Omit<InflowTransaction, 'id' | 'receiptId' | 'tenantId'>) => {
    if (!firestore) return;
    try {
      const receiptId = await getNextReceiptId(firestore);
      const transactionData = {
        ...data,
        tenantId, // Add tenantId to the transaction
        receiptId,
        date: new Date(data.date).toISOString(),
        amount: Number(data.amount),
      };

      const docRef = await addDoc(
        collection(
          firestore,
          `tenants/${tenantId}/projects/${data.projectId}/inflowTransactions`
        ),
        transactionData
      );

      const fullTransaction: InflowTransaction = { ...transactionData, id: docRef.id };
      const customer = customers.find(c => c.id === data.customerId);
      const project = projects.find(p => p.id === data.projectId);

      toast({
        title: 'Payment Added',
        description: 'The payment has been recorded successfully.',
      });
      onFinished();
      if(customer && project) {
          onPaymentAdded(fullTransaction, customer, project);
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record payment.',
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        disabled={!selectedCustomerId}
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
                    <Label htmlFor="flatId">Flat</Label>
                    <Controller
                    name="flatId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedProjectId}
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
                    {errors.flatId && <p className="text-red-500 text-xs">Flat is required</p>}
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
                <Input id="date" type="date" {...register('date', { required: true })} defaultValue={format(new Date(), 'yyyy-MM-dd')}/>
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
          <Button type="submit" className="w-full mt-4">Record Payment</Button>
        </div>
    </form>
  );
};

export default function PaymentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();

  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<InflowTransaction | null>(null);
  const [lastTransactionCustomer, setLastTransactionCustomer] = useState<any>(null);
  const [lastTransactionProject, setLastTransactionProject] = useState<any>(null);

  const projectsQuery = useMemoFirebase(
    () =>
      firestore && tenantId
        ? collection(firestore, `tenants/${tenantId}/projects`)
        : null,
    [firestore, tenantId]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

  const customersQuery = useMemoFirebase(
    () =>
      firestore && tenantId
        ? collection(firestore, `tenants/${tenantId}/customers`)
        : null,
    [firestore, tenantId]
  );
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const salesQuery = useMemoFirebase(
    () =>
      firestore && tenantId
        ? collection(firestore, `tenants/${tenantId}/flatSales`)
        : null,
    [firestore, tenantId]
  );
  const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);
  
  const paymentsQuery = useMemoFirebase(
    () =>
      firestore && tenantId
        ? query(collectionGroup(firestore, 'inflowTransactions'), where('tenantId', '==', tenantId))
        : null,
    [firestore, tenantId]
  );
  const { data: payments, isLoading: paymentsLoading } = useCollection<InflowTransaction>(paymentsQuery);

  const isLoading = projectsLoading || customersLoading || salesLoading || paymentsLoading;
  
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
  const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c.name])), [customers]);
  
  const allDataAvailable = projects && customers && sales;

  const handlePaymentAdded = (transaction: InflowTransaction, customer: Customer, project: Project) => {
    setLastTransaction(transaction);
    setLastTransactionCustomer(customer);
    setLastTransactionProject(project);
    setReceiptOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description="Record and track customer payments."
      >
        <Dialog open={isAddFormOpen} onOpenChange={setAddFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={!allDataAvailable}>
              <PlusCircle className="h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Record a New Payment</DialogTitle>
              <DialogDescription>
                Fill in the details to record a new payment.
              </DialogDescription>
            </DialogHeader>
            {allDataAvailable ? (
              <AddPaymentForm
                onFinished={() => setAddFormOpen(false)}
                tenantId={tenantId}
                projects={projects}
                customers={customers}
                sales={sales}
                onPaymentAdded={handlePaymentAdded}
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
                        <TableCell>{payment.flatId}</TableCell>
                        <TableCell>{format(new Date(payment.date), 'dd MMM, yyyy')}</TableCell>
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
                              <DropdownMenuItem>View Receipt</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
