'use client'

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { notFound } from "next/navigation";

// Since mock data is removed, we'll need placeholders
const organization = {
    logoUrl: 'https://picsum.photos/seed/102/200/60',
    address: '123 Business Ave, Dhaka',
    phone: 'N/A',
    email: 'N/A',
    name: 'Your Company'
};

export default function ReceiptPage({ params }: { params: { paymentId: string } }) {
    
    useEffect(() => {
        // This is a placeholder for print functionality
        // window.print();
    }, []);

    // Since there's no mock data, we cannot find a payment.
    // In a real app, this would fetch from Firestore and show a not-found page if it fails.
    const payment = null; // payments.find(p => p.id === params.paymentId);
    
    if (!payment) {
        // A real implementation would show a more graceful loading/error state
        // before concluding notFound. For now, we simulate it not being found.
        // To see the receipt layout, you would need to implement Firestore fetching first.
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Payment Not Found</h1>
                <p className="text-muted-foreground">This receipt could not be loaded. Please implement data fetching from Firestore.</p>
                 <Button asChild className="mt-4">
                    <a href
                    ="javascript:history.back()">Go Back</a>
                </Button>
            </div>
        );
    }
    
    // The rest of this component will not render until the above `if` block is modified
    // after implementing data fetching.
    const sale = null;
    const customer = null;
    const project = null;
    const flat = null;

    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl bg-white shadow-lg p-8 sm:p-12" id="receipt">
                <header className="flex justify-between items-start mb-8">
                    <div>
                        <Image src={organization.logoUrl} alt="Company Logo" width={180} height={50} data-ai-hint="company logo"/>
                        <p className="text-xs text-gray-500 mt-2">{organization.address}</p>
                         <p className="text-xs text-gray-500">{organization.phone} | {organization.email}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-bold text-primary font-headline">MONEY RECEIPT</h1>
                        <p className="text-sm">Receipt No: <span className="font-mono">{/*{payment.id.toUpperCase()}*/}</span></p>
                        <p className="text-sm">Date: <span className="font-mono">{/*{new Date(payment.paymentDate).toLocaleDateString('en-GB')}*/}</span></p>
                    </div>
                </header>

                <Separator className="my-8"/>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-8">
                    <div>
                        <h2 className="font-bold mb-2 font-headline text-primary">BILLED TO</h2>
                        <p className="font-semibold">{customer?.name}</p>
                        <p>{customer?.address}</p>
                        <p>Phone: {customer?.phone}</p>
                    </div>
                    <div className="text-right">
                         <h2 className="font-bold mb-2 font-headline text-primary">PROPERTY DETAILS</h2>
                        <p>Project: <span className="font-semibold">{project?.name}</span></p>
                        <p>Flat No: <span className="font-semibold">{flat?.name}</span></p>
                         <p>Size: <span className="font-semibold">{flat?.size} sft</span></p>
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
                            <td className="p-3">Payment via {/*payment.type*/} (Ref: {/*payment.reference*/})</td>
                            <td className="p-3 text-right font-mono">{/*payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })*/}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="flex justify-end mt-4">
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-sm py-2">
                            <span>Subtotal</span>
                            <span className="font-mono">{/*payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })*/}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg py-3 bg-primary text-primary-foreground px-2 rounded-md mt-2">
                            <span>TOTAL PAID</span>
                            <span className="font-mono">৳ {/*payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })*/}</span>
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

                <p className="text-center text-xs text-gray-500 mt-8">Thank you for your business!</p>
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
