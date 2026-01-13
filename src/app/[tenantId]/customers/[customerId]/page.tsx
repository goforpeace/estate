'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Home, BadgeInfo } from 'lucide-react';
import Link from 'next/link';

type Customer = {
  id: string;
  tenantId: string;
  name: string;
  phoneNumber: string;
  address: string;
  nid?: string;
};

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground rounded-full p-3">
                <User className="h-8 w-8" />
            </div>
            <div>
                <CardTitle className="font-headline text-3xl">{customer.name}</CardTitle>
                <CardDescription>Customer Profile</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm">
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
    </>
  );
}
