'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Phone, Home, Briefcase, DollarSign, List } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

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
};

type Project = {
    id: string;
    name: string;
}

export default function VendorDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const vendorId = params.vendorId as string;
  const firestore = useFirestore();

  const vendorRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !vendorId) return null;
    return doc(firestore, `tenants/${tenantId}/vendors`, vendorId);
  }, [firestore, tenantId, vendorId]);

  const { data: vendor, isLoading, error } = useDoc<Vendor>(vendorRef);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !vendorId) return null;
    return query(collection(firestore, `tenants/${tenantId}/outflowTransactions`), where('vendorId', '==', vendorId));
  }, [firestore, tenantId, vendorId]);

  const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);

  const projectsQuery = useMemoFirebase(() => {
      if (!firestore || !tenantId) return null;
      return collection(firestore, `tenants/${tenantId}/projects`);
  }, [firestore, tenantId]);
  const { data: projects } = useCollection<Project>(projectsQuery);
  const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);

  const totalBilled = useMemo(() => {
    return expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
  }, [expenses]);

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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">
                        TK {totalBilled.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Across {expenses?.length || 0} transactions
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><List className="h-5 w-5 text-primary"/> Expense History</CardTitle>
                    <CardDescription>A list of all expenses billed by this vendor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expensesLoading && (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading expenses...</TableCell></TableRow>
                            )}
                            {!expensesLoading && expenses && expenses.length > 0 ? (
                                expenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{format(new Date(expense.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{projectsMap.get(expense.projectId) || 'N/A'}</TableCell>
                                        <TableCell>{expense.expenseCategoryName}</TableCell>
                                        <TableCell className="text-right">TK {expense.amount.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                               !expensesLoading && <TableRow><TableCell colSpan={4} className="h-24 text-center">No expenses found for this vendor.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        </div>
      </div>
    </>
  );
}
