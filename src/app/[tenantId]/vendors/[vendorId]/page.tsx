'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Phone, Home, Briefcase, DollarSign, List, TrendingUp, TrendingDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';


type Vendor = {
  id: string;
  tenantId: string;
  name: string;
  phoneNumber: string;
  enterpriseName: string;
  details?: string;
};

type OutflowTransaction = {
  id: string;
  projectId: string;
  amount: number;
  date: string;
  description?: string;
  expenseCategoryName: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  paidAmount: number;
};

type ExpensePayment = {
    id: string;
    projectId: string;
    expenseCategoryName: string;
    amount: number;
    date: string;
    reference?: string;
}

type Project = {
    id: string;
    name: string;
}

const ITEMS_PER_PAGE = 7;

export default function VendorDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const vendorId = params.vendorId as string;
  const firestore = useFirestore();

  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [expensesPage, setExpensesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const vendorRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !vendorId) return null;
    return doc(firestore, `tenants/${tenantId}/vendors`, vendorId);
  }, [firestore, tenantId, vendorId]);

  const { data: vendor, isLoading: vendorLoading, error } = useDoc<Vendor>(vendorRef);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !vendorId) return null;
    return query(collection(firestore, `tenants/${tenantId}/outflowTransactions`), where('vendorId', '==', vendorId));
  }, [firestore, tenantId, vendorId]);

  const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);

  useEffect(() => {
    if (!firestore || !expenses) {
      setPaymentsLoading(false);
      return;
    }
    if (expenses.length === 0) {
        setExpensePayments([]);
        setPaymentsLoading(false);
        return;
    }

    const fetchPayments = async () => {
        setPaymentsLoading(true);
        const allPayments: ExpensePayment[] = [];
        const promises = expenses.map(expense => {
            const paymentsRef = collection(firestore, `tenants/${tenantId}/outflowTransactions/${expense.id}/expensePayments`);
            return getDocs(paymentsRef).then(snapshot => {
                snapshot.forEach(doc => {
                    allPayments.push({ id: doc.id, ...doc.data() } as ExpensePayment);
                });
            });
        });

        await Promise.all(promises);
        allPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpensePayments(allPayments);
        setPaymentsLoading(false);
    };

    fetchPayments();
  }, [firestore, tenantId, expenses]);


  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || !tenantId) return null;
      return collection(firestore, `tenants/${tenantId}/projects`);
  }, [firestore, tenantId]);
  const { data: projects } = useCollection<Project>(projectsQuery);
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);

  const { totalBilled, totalPaid, totalDue } = useMemo(() => {
    const billed = expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
    const paid = expenses?.reduce((acc, expense) => acc + (expense.paidAmount || 0), 0) || 0;
    return {
        totalBilled: billed,
        totalPaid: paid,
        totalDue: billed - paid,
    };
  }, [expenses]);
  
    // Reset page to 1 when search term changes
  useEffect(() => {
    setExpensesPage(1);
    setPaymentsPage(1);
  }, [searchTerm]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (!searchTerm) return expenses;
    const lowercasedTerm = searchTerm.toLowerCase();
    return expenses.filter(expense => {
        const project = projectsMap.get(expense.projectId)?.toLowerCase() || '';
        const category = expense.expenseCategoryName.toLowerCase();
        const amount = expense.amount.toString();
        const date = format(new Date(expense.date), 'yyyy-MM-dd');
        return project.includes(lowercasedTerm) ||
               category.includes(lowercasedTerm) ||
               amount.includes(lowercasedTerm) ||
               date.includes(lowercasedTerm);
    });
  }, [expenses, searchTerm, projectsMap]);

  const filteredPayments = useMemo(() => {
    if (!expensePayments) return [];
    if (!searchTerm) return expensePayments;
    const lowercasedTerm = searchTerm.toLowerCase();
    return expensePayments.filter(payment => {
        const project = projectsMap.get(payment.projectId)?.toLowerCase() || '';
        const category = payment.expenseCategoryName.toLowerCase();
        const amount = payment.amount.toString();
        const date = format(new Date(payment.date), 'yyyy-MM-dd');
        const reference = payment.reference?.toLowerCase() || '';
        return project.includes(lowercasedTerm) ||
               category.includes(lowercasedTerm) ||
               amount.includes(lowercasedTerm) ||
               date.includes(lowercasedTerm) ||
               reference.includes(lowercasedTerm);
    });
  }, [expensePayments, searchTerm, projectsMap]);


  const isLoading = vendorLoading || expensesLoading || paymentsLoading;

  // Pagination logic for expenses
  const totalExpensePages = Math.ceil((filteredExpenses?.length || 0) / ITEMS_PER_PAGE);
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses?.slice((expensesPage - 1) * ITEMS_PER_PAGE, expensesPage * ITEMS_PER_PAGE);
  }, [filteredExpenses, expensesPage]);

  // Pagination logic for payments
  const totalPaymentPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice((paymentsPage - 1) * ITEMS_PER_PAGE, paymentsPage * ITEMS_PER_PAGE);
  }, [filteredPayments, paymentsPage]);

  const getStatusVariant = (status: OutflowTransaction['status']) => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Partially Paid': return 'secondary';
        case 'Unpaid': return 'destructive';
        default: return 'outline';
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading vendor details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading vendor: {error.message}</div>;
  }

  if (!vendor) {
    return <div className="p-6">Vendor not found.</div>;
  }

  return (
    <>
      <PageHeader title={vendor.name} description={`Vendor for ${vendor.enterpriseName}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/vendors`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Link>
        </Button>
      </PageHeader>
      
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by project, category, amount, date, reference..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full p-3">
                        <Briefcase className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">{vendor.name}</CardTitle>
                        <CardDescription>{vendor.enterpriseName}</CardDescription>
                    </div>
                </div>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm">
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Phone Number</p>
                            <p className="font-medium">{vendor.phoneNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-muted-foreground">Details</p>
                            <p className="font-medium">{vendor.details || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm">Total Billed</span>
                        <span className="ml-auto font-semibold font-headline">TK {totalBilled.toLocaleString()}</span>
                    </div>
                     <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm">Total Paid</span>
                        <span className="ml-auto font-semibold font-headline text-green-600">TK {totalPaid.toLocaleString()}</span>
                    </div>
                     <div className="flex items-center">
                        <TrendingDown className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm">Total Due</span>
                        <span className="ml-auto font-semibold font-headline text-red-600">TK {totalDue.toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><List className="h-5 w-5 text-primary"/> Expense List</CardTitle>
                    <CardDescription>A list of all expenses billed by this vendor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount (TK)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expensesLoading && (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading expenses...</TableCell></TableRow>
                            )}
                            {!expensesLoading && paginatedExpenses && paginatedExpenses.length > 0 ? (
                                paginatedExpenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{format(new Date(expense.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(expense.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{expense.expenseCategoryName}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge></TableCell>
                                        <TableCell className="text-right">{expense.amount.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                               !expensesLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center">No expenses found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {totalExpensePages > 1 && (
                     <CardFooter className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setExpensesPage(p => p - 1)} disabled={expensesPage === 1}>Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {expensesPage} of {totalExpensePages}</span>
                        <Button variant="outline" size="sm" onClick={() => setExpensesPage(p => p + 1)} disabled={expensesPage === totalExpensePages}>Next</Button>
                    </CardFooter>
                )}
             </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><List className="h-5 w-5 text-primary"/> Expense Payment Log</CardTitle>
                    <CardDescription>A log of all payments made to this vendor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount (TK)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {paymentsLoading && (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading payments...</TableCell></TableRow>
                            )}
                            {!paymentsLoading && paginatedPayments && paginatedPayments.length > 0 ? (
                                paginatedPayments.map(payment => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(payment.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{payment.expenseCategoryName}</TableCell>
                                        <TableCell>{payment.reference || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{payment.amount.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                               !paymentsLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center">No payments found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 {totalPaymentPages > 1 && (
                     <CardFooter className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setPaymentsPage(p => p - 1)} disabled={paymentsPage === 1}>Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {paymentsPage} of {totalPaymentPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPaymentsPage(p => p + 1)} disabled={paymentsPage === totalPaymentPages}>Next</Button>
                    </CardFooter>
                )}
             </Card>
        </div>
      </div>
    </>
  );
}
