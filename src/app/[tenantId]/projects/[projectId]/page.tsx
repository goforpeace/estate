'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building, Calendar, MapPin, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo } from 'react';

// Matches the Project entity in backend.json
type Project = {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  targetSell: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  expectedHandoverDate: string; // Stored as ISO string
  flats: { name: string; sizeSft: number }[];
};

type FlatSale = {
    flatName: string;
    amount: number;
};

type OutflowTransaction = {
    amount: number;
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const projectId = params.projectId as string;
  const firestore = useFirestore();

  const projectRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !projectId) return null;
    return doc(firestore, `tenants/${tenantId}/projects`, projectId);
  }, [firestore, tenantId, projectId]);

  const { data: project, isLoading: projectLoading, error } = useDoc<Project>(projectRef);
  
  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !projectId) return null;
    return query(collection(firestore, `tenants/${tenantId}/flatSales`), where('projectId', '==', projectId));
  }, [firestore, tenantId, projectId]);

  const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !projectId) return null;
    return query(collection(firestore, `tenants/${tenantId}/outflowTransactions`), where('projectId', '==', projectId));
  }, [firestore, tenantId, projectId]);

  const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);

  const totalRevenue = useMemo(() => {
    return sales?.reduce((acc, sale) => acc + sale.amount, 0) || 0;
  }, [sales]);
  
  const totalExpenses = useMemo(() => {
    return expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
  }, [expenses]);

  const soldFlatNames = useMemo(() => {
    if (!sales) return new Set();
    return new Set(sales.map(s => s.flatName));
  }, [sales]);

  const isLoading = projectLoading || salesLoading || expensesLoading;

  const statusVariant = {
    Ongoing: "default",
    Upcoming: "secondary",
    Completed: "outline",
  } as const;

  if (isLoading) {
    return <div className="p-6">Loading project details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading project: {error.message}</div>;
  }

  if (!project) {
    return <div className="p-6">Project not found.</div>;
  }

  return (
    <>
      <PageHeader title={project.name} description={`Details for project ID: ${project.id}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/projects`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{project.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Actual Revenue</p>
                <p className="font-medium">TK {totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Total Expenses</p>
                <p className="font-medium">TK {totalExpenses.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Handover Date</p>
                <p className="font-medium">{new Date(project.expectedHandoverDate).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
             <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                        <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-muted-foreground">Total Flats</p>
                    <p className="font-medium">{project.flats?.length || 0}</p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="font-headline">Flats in {project.name}</CardTitle>
                <CardDescription>A list of all the flats available in this project.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Flat Name/Number</TableHead>
                            <TableHead>Size (sft)</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {project.flats && project.flats.length > 0 ? (
                            project.flats.map((flat, index) => {
                                const isSold = soldFlatNames.has(flat.name);
                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{flat.name}</TableCell>
                                        <TableCell>{flat.sizeSft.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={isSold ? 'destructive' : 'secondary'}>
                                                {isSold ? 'Sold' : 'Available'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No flats have been added to this project yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
