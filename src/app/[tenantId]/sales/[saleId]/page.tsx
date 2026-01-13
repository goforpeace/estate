'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building, User, Tag, DollarSign, ParkingCircle, Wrench, HandCoins, Calendar, Link as LinkIcon, FileText } from 'lucide-react';
import Link from 'next/link';
import { type FlatSale } from '../page';

type Project = { id: string; name: string; location: string, flats: {name: string, sizeSft: number}[] };
type Customer = { id: string; name: string; address: string; phoneNumber: string };

export default function SaleDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const saleId = params.saleId as string;
  const firestore = useFirestore();

  const saleRef = useMemoFirebase(() => doc(firestore, `tenants/${tenantId}/flatSales`, saleId), [firestore, tenantId, saleId]);
  const { data: sale, isLoading: saleLoading, error: saleError } = useDoc<FlatSale>(saleRef);

  const projectRef = useMemoFirebase(() => sale ? doc(firestore, `tenants/${tenantId}/projects`, sale.projectId) : null, [firestore, tenantId, sale]);
  const { data: project, isLoading: projectLoading } = useDoc<Project>(projectRef);
  
  const customerRef = useMemoFirebase(() => sale ? doc(firestore, `tenants/${tenantId}/customers`, sale.customerId) : null, [firestore, tenantId, sale]);
  const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerRef);

  const isLoading = saleLoading || projectLoading || customerLoading;
  const error = saleError;

  const flatDetails = useMemo(() => {
    if (!project || !sale) return null;
    return project.flats.find(f => f.name === sale.flatName);
  }, [project, sale]);

  if (isLoading) {
    return <div className="p-6">Loading sale details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading sale: {error.message}</div>;
  }

  if (!sale) {
    return <div className="p-6">Sale record not found.</div>;
  }

  return (
    <>
      <PageHeader title="Sale Details" description={`Record ID: ${sale.id}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/sales`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Sales</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-5">
        
        <div className="md:col-span-3 space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Financial Overview</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div className="flex items-start gap-3"><DollarSign className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Total Amount:</span><br/><span className="font-medium">TK {sale.amount.toLocaleString('en-IN')}</span></p></div>
                    <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Per SFT Price:</span><br/><span className="font-medium">TK {sale.perSftPrice.toLocaleString('en-IN')}</span></p></div>
                    <div className="flex items-start gap-3"><ParkingCircle className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Parking Price:</span><br/><span className="font-medium">TK {sale.parkingPrice?.toLocaleString('en-IN') || 'N/A'}</span></p></div>
                    <div className="flex items-start gap-3"><Wrench className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Utility Cost:</span><br/><span className="font-medium">TK {sale.utilityCost?.toLocaleString('en-IN') || 'N/A'}</span></p></div>
                    <div className="flex items-start gap-3"><HandCoins className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Booking Money:</span><br/><span className="font-medium">TK {sale.bookingMoney?.toLocaleString('en-IN') || 'N/A'}</span></p></div>
                    <div className="flex items-start gap-3"><Calendar className="h-5 w-5 text-muted-foreground mt-1" /><p><span className="text-muted-foreground">Installment:</span><br/><span className="font-medium">TK {sale.monthlyInstallment?.toLocaleString('en-IN') || 'N/A'}</span></p></div>
                 </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="font-headline">Notes & Documents</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                        <LinkIcon className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-muted-foreground">Deed Link</p>
                            {sale.deedLink ? <a href={sale.deedLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{sale.deedLink}</a> : <p className="font-medium">Not provided</p>}
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-muted-foreground">Additional Notes</p>
                            <p className="font-medium whitespace-pre-wrap">{sale.note || 'No notes for this sale.'}</p>
                        </div>
                    </div>
                </CardContent>
             </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary text-primary-foreground rounded-full p-2"><User className="h-6 w-6" /></div>
                        <div>
                            <CardTitle className="font-headline">{customer?.name || 'Loading...'}</CardTitle>
                            <CardDescription>Customer Profile</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p><span className="text-muted-foreground">Address:</span> {customer?.address}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {customer?.phoneNumber}</p>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-secondary text-secondary-foreground rounded-full p-2"><Building className="h-6 w-6" /></div>
                        <div>
                            <CardTitle className="font-headline">{project?.name || 'Loading...'}</CardTitle>
                            <CardDescription>Property Details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p><span className="text-muted-foreground">Location:</span> {project?.location}</p>
                    <p><span className="text-muted-foreground">Flat:</span> {sale.flatName} ({flatDetails?.sizeSft.toLocaleString('en-IN')} sft)</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
