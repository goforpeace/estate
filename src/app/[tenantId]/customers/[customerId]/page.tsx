'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Home, BadgeInfo, Building, Briefcase, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

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
}

type Payment = {
    id: string;
    amount: number;
}

function SaleInfoCard({ tenantId, sale }: { tenantId: string, sale: FlatSale }) {
    const firestore = useFirestore();

    const projectRef = useMemoFirebase(() => doc(firestore, `tenants/${tenantId}/projects`, sale.projectId), [firestore, tenantId, sale.projectId]);
    const { data: project } = useDoc<Project>(projectRef);
    
    const paymentsQuery = useMemoFirebase(() => {
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
                        <CardTitle className="font-headline text-lg">{project?.name || 'Loading Project...'}</CardTitle>
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
                        <span>Paid: TK {totalPaid.toLocaleString()}</span>
                        <span>Due: TK {dueAmount.toLocaleString()}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-right mt-1 text-muted-foreground">Total: TK {sale.amount.toLocaleString()}</p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function CustomerDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const customerId = params.customerId as string;
  const firestore = useFirestore();

  const customerRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !customerId) return null;
    return doc(firestore, `tenants/${tenantId}/customers`, customerId);
  }, [firestore, tenantId, customerId]);

  const { data: customer, isLoading, error } = useDoc<Customer>(customerRef);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !customerId) return null;
    return query(collection(firestore, `tenants/${tenantId}/flatSales`), where('customerId', '==', customerId));
  }, [firestore, tenantId, customerId]);

  const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);

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
      <PageHeader title={customer.name} description={`Customer ID: ${customer.id}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/customers`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </PageHeader>
      
      <div className="grid gap-6 md:grid-cols-3">
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

        <div className="md:col-span-2">
             <Card className="bg-transparent shadow-none border-none">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/> Purchase History</CardTitle>
                    <CardDescription>A list of all properties purchased by this customer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {salesLoading && <p>Loading purchase history...</p>}
                    {!salesLoading && sales && sales.length > 0 ? (
                        sales.map(sale => <SaleInfoCard key={sale.id} tenantId={tenantId} sale={sale} />)
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
    </>
  );
}
