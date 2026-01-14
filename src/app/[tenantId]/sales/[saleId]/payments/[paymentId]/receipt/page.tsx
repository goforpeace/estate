'use client';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { Loader2, Printer } from "lucide-react";
import { doc } from "firebase/firestore";
import Image from "next/image";
import { useParams, notFound } from "next/navigation";
import { useMemo } from "react";
import { format } from "date-fns";
import { InflowTransaction } from '@/app/[tenantId]/payments/page';

// --- Type Definitions ---
type Organization = { name: string; logoUrl?: string; address: string; phone: string; email: string; website?: string; };
type Project = { name: string; flats: { name: string; sizeSft: number }[] };
type Customer = { name: string; address: string; phoneNumber: string; };
type FlatSale = { projectId: string; customerId: string; flatName: string; };


export default function ReceiptPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const saleId = params.saleId as string;
    const paymentId = params.paymentId as string;

    const firestore = useFirestore();

    // --- Data Fetching Hooks ---
    const orgRef = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return doc(firestore, `tenants/${tenantId}/organization`, 'details');
    }, [firestore, tenantId]);
    const { data: organization, isLoading: orgLoading } = useDoc<Organization>(orgRef);

    const saleRef = useMemoFirebase(() => {
        if (!firestore || !tenantId || !saleId) return null;
        return doc(firestore, `tenants/${tenantId}/flatSales`, saleId);
    }, [firestore, tenantId, saleId]);
    const { data: sale, isLoading: saleLoading } = useDoc<FlatSale>(saleRef);

    const paymentRef = useMemoFirebase(() => {
        if (!firestore || !tenantId || !saleId || !paymentId) return null;
        return doc(firestore, `tenants/${tenantId}/flatSales/${saleId}/payments`, paymentId);
    }, [firestore, tenantId, saleId, paymentId]);
    const { data: payment, isLoading: paymentLoading } = useDoc<InflowTransaction>(paymentRef);

    const projectRef = useMemoFirebase(() => {
        if (!firestore || !tenantId || !sale) return null;
        return doc(firestore, `tenants/${tenantId}/projects`, sale.projectId);
    }, [firestore, tenantId, sale]);
    const { data: project, isLoading: projectLoading } = useDoc<Project>(projectRef);
    
    const customerRef = useMemoFirebase(() => {
        if (!firestore || !tenantId || !sale) return null;
        return doc(firestore, `tenants/${tenantId}/customers`, sale.customerId);
    }, [firestore, tenantId, sale]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerRef);

    const isLoading = orgLoading || saleLoading || paymentLoading || projectLoading || customerLoading;

    // --- Memoized Derived Data ---
    const flatDetails = useMemo(() => {
        if (!project || !sale) return null;
        return project.flats.find(f => f.name === sale.flatName);
    }, [project, sale]);

    const handlePrint = () => {
        window.print();
    };

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Generating Receipt...</p>
            </div>
        );
    }
    
    if (!payment || !sale || !customer || !project || !organization) {
        notFound();
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-8 flex flex-col items-center print:bg-white">
            <div className="w-full max-w-4xl bg-white dark:bg-background shadow-lg p-8 sm:p-12 print:shadow-none print:p-0" id="receipt">
                <header className="flex justify-between items-start mb-8">
                    <div>
                        {organization.logoUrl && <Image src={organization.logoUrl} alt="Company Logo" width={180} height={50} data-ai-hint="company logo" className="object-contain"/>}
                        <p className="text-xs text-gray-500 mt-2">{organization.address}</p>
                        <p className="text-xs text-gray-500">{organization.phone} | {organization.email}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold text-primary font-headline">MONEY RECEIPT</h1>
                        <p className="text-sm">Receipt No: <span className="font-mono">{payment.receiptId}</span></p>
                        <p className="text-sm">Date: <span className="font-mono">{format(new Date(payment.date), 'dd/MM/yyyy')}</span></p>
                    </div>
                </header>

                <Separator className="my-8"/>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-8">
                    <div>
                        <h2 className="font-bold mb-2 font-headline text-primary">BILLED TO</h2>
                        <p className="font-semibold">{customer.name}</p>
                        <p>{customer.address}</p>
                        <p>Phone: {customer.phoneNumber}</p>
                    </div>
                    <div className="text-right">
                         <h2 className="font-bold mb-2 font-headline text-primary">PROPERTY DETAILS</h2>
                        <p>Project: <span className="font-semibold">{project.name}</span></p>
                        <p>Flat No: <span className="font-semibold">{sale.flatName}</span></p>
                         <p>Size: <span className="font-semibold">{flatDetails?.sizeSft} sft</span></p>
                    </div>
                </div>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted">
                            <th className="p-3 text-left font-headline">Description</th>
                            <th className="p-3 text-right font-headline">Amount (TK)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-3">Payment for {payment.paymentType} via {payment.paymentMethod} {payment.bankName && `(Bank: ${payment.bankName})`} {payment.chequeNo && `(Cheque: ${payment.chequeNo})`}</td>
                            <td className="p-3 text-right font-mono">{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="flex justify-end mt-4">
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-sm py-2">
                            <span>Subtotal</span>
                            <span className="font-mono">{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg py-3 bg-primary text-primary-foreground px-2 rounded-md mt-2">
                            <span>TOTAL PAID</span>
                            <span className="font-mono">৳ {payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-24 flex justify-between items-end text-xs">
                    <div className="text-center w-48">
                        <Separator className="border-dashed"/>
                        <p className="pt-2">Customer Signature</p>
                    </div>
                     <div className="text-center w-48">
                        <Separator className="border-dashed"/>
                        <p className="pt-2">Authorized Signature</p>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-500 mt-8">Thank you for your business! | {organization.website}</p>
            </div>
             <div className="mt-4 w-full max-w-4xl text-right print:hidden">
                <Button onClick={handlePrint} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Receipt
                </Button>
            </div>
        </div>
    );
}
