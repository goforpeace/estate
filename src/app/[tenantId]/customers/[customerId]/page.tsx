'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Home, BadgeInfo, Building, Briefcase, MinusCircle, List, MoreHorizontal, Search } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useMemo, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { PrintReceiptDialog } from '@/components/dashboard/payments/PrintReceiptDialog';
import { useToast } from '@/hooks/use-toast';
import { type InflowTransaction } from '../../payments/page';
import { formatCurrency } from '@/lib/utils';


type Customer = {
  id: string;
  tenantId: string;
  name: string;
  phoneNumber: string;
  address: string;
  nid?: string;
};

type FlatSale = {
    id: string;
    projectId: string;
    flatName: string;
    amount: number;
}

type Project = {
    id: string;
    name: string;
    flats: { name: string, sizeSft: number }[];
}

type Payment = {
    id: string;
    amount: number;
}

function SaleInfoCard({ tenantId, sale, projectName }: { tenantId: string, sale: FlatSale, projectName?: string }) {
    const firestore = useFirestore();
    
    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId || !sale.id) return null;
        const salePaymentsPath = `tenants/${tenantId}/flatSales/${sale.id}/payments`;
        return collection(firestore, salePaymentsPath);
    }, [firestore, tenantId, sale.id]);
    const { data: payments } = useCollection<Payment>(paymentsQuery);

    const totalPaid = useMemo(() => payments?.reduce((acc, p) => acc + p.amount, 0) || 0, [payments]);
    const dueAmount = sale.amount - totalPaid;
    const progress = sale.amount > 0 ? (totalPaid / sale.amount) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="font-headline text-lg">{projectName || 'Loading Project...'}</CardTitle>
                        <CardDescription>Flat: {sale.flatName}</CardDescription>
                    </div>
                     <Link href={`/${tenantId}/sales/${sale.id}`}>
                        <Button variant="outline" size="sm">View Sale</Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                     <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                        <span>Paid: {formatCurrency(totalPaid)}</span>
                        <span>Due: {formatCurrency(dueAmount)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-right mt-1 text-muted-foreground">Total: {formatCurrency(sale.amount)}</p>
                </div>
            </CardContent>
        </Card>
    );
}

const ITEMS_PER_PAGE = 5;

export default function CustomerDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const customerId = params.customerId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allPayments, setAllPayments] = useState<InflowTransaction[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isReceiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{transaction: InflowTransaction, customer: Customer, project: Project} | null>(null);

  const customerRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !customerId) return null;
    return doc(firestore, `tenants/${tenantId}/customers`, customerId);
  }, [firestore, tenantId, customerId]);

  const { data: customer, isLoading: customerLoading, error } = useDoc<Customer>(customerRef);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !customerId) return null;
    return query(collection(firestore, `tenants/${tenantId}/flatSales`), where('customerId', '==', customerId));
  }, [firestore, tenantId, customerId]);

  const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);
  
  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || !tenantId) return null;
      return collection(firestore, `tenants/${tenantId}/projects`);
  }, [firestore, tenantId]);
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p])), [projects]);

  useEffect(() => {
    if (!firestore || !tenantId || !sales) {
        setPaymentsLoading(sales === undefined);
        if (sales === null) {
            setAllPayments([]);
            setPaymentsLoading(false);
        }
        return;
    }
    
    if (sales.length === 0) {
        setAllPayments([]);
        setPaymentsLoading(false);
        return;
    }

    const fetchAllCustomerPayments = async () => {
        setPaymentsLoading(true);
        const paymentPromises = sales.map(sale => {
            const paymentsRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
            return getDocs(paymentsRef);
        });

        try {
            const paymentSnapshots = await Promise.all(paymentPromises);
            const payments = paymentSnapshots.flatMap(snapshot =>
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InflowTransaction))
            );
            payments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllPayments(payments);
        } catch(e) {
            console.error("Error fetching payments", e);
        } finally {
            setPaymentsLoading(false);
        }
    };
    
    fetchAllCustomerPayments();
  }, [firestore, tenantId, sales]);

  const filteredPayments = useMemo(() => {
    if (!allPayments) return [];
    if (!searchTerm) return allPayments;
    const lowercasedTerm = searchTerm.toLowerCase();

    return allPayments.filter(p => {
        const projectName = projectsMap.get(p.projectId)?.name.toLowerCase() || '';
        return (
            projectName.includes(lowercasedTerm) ||
            p.flatName?.toLowerCase().includes(lowercasedTerm) ||
            p.paymentType?.toLowerCase().includes(lowercasedTerm) ||
            p.amount?.toString().includes(lowercasedTerm) ||
            (p.date && format(new Date(p.date), 'dd MMM yyyy').toLowerCase().includes(lowercasedTerm))
        )
    });
  }, [allPayments, searchTerm, projectsMap]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const handleViewReceipt = (payment: InflowTransaction) => {
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

  const isLoading = customerLoading || salesLoading || paymentsLoading || projectsLoading;

  if (isLoading) {
    return <div className="p-6">Loading customer details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading customer: {error.message}</div>;
  }

  if (!customer) {
    return <div className="p-6">Customer not found.</div>;
  }

  return (
    <>
      {receiptData && (
        <PrintReceiptDialog
          isOpen={isReceiptOpen}
          setIsOpen={setReceiptOpen}
          transaction={receiptData.transaction}
          customer={receiptData.customer}
          project={receiptData.project}
        />
      )}
      <PageHeader title={customer.name} description={`Customer ID: ${customer.id}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/customers`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </PageHeader>
      
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full p-3">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">{customer.name}</CardTitle>
                        <CardDescription>Customer Profile</CardDescription>
                    </div>
                </div>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Phone Number</p>
                        <p className="font-medium">{customer.phoneNumber}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-4">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{customer.address}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-4">
                    <BadgeInfo className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">National ID (NID)</p>
                        <p className="font-medium">{customer.nid || 'N/A'}</p>
                    </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
             <Card className="bg-transparent shadow-none border-none">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/> Purchase History</CardTitle>
                    <CardDescription>A list of all properties purchased by this customer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {salesLoading && <p>Loading purchase history...</p>}
                    {!salesLoading && sales && sales.length > 0 ? (
                        sales.map(sale => <SaleInfoCard key={sale.id} tenantId={tenantId} sale={sale} projectName={projectsMap.get(sale.projectId)?.name} />)
                    ) : (
                       !salesLoading && (
                            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                                <MinusCircle className="h-10 w-10 text-muted-foreground mb-2"/>
                                <p className="font-medium">No Purchase History</p>
                                <p className="text-sm text-muted-foreground">This customer has not purchased any properties yet.</p>
                            </div>
                        )
                    )}
                </CardContent>
             </Card>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><List className="h-5 w-5 text-primary"/> Payment History</CardTitle>
            <CardDescription>A log of all payments made by this customer.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by project, flat, type, amount..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                />
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Flat</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (৳)</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paymentsLoading && (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading payment log...</TableCell></TableRow>
                    )}
                    {!paymentsLoading && paginatedPayments && paginatedPayments.length > 0 ? (
                        paginatedPayments.map(payment => (
                            <TableRow key={payment.id}>
                                <TableCell>{format(new Date(payment.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{projectsMap.get(payment.projectId)?.name || 'N/A'}</TableCell>
                                <TableCell>{payment.flatName}</TableCell>
                                <TableCell>{payment.paymentType}</TableCell>
                                <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleViewReceipt(payment)}>View Receipt</DropdownMenuItem>
                                            <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                                            <DropdownMenuItem disabled className="text-destructive">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                       !paymentsLoading && <TableRow><TableCell colSpan={6} className="h-24 text-center">No payments found for this customer.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        {totalPages > 1 && (
            <CardFooter className="flex justify-end items-center gap-2 pt-4">
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
            </CardFooter>
        )}
     </Card>
    </>
  );
}
