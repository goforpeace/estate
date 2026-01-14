'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

// --- Type Definitions ---
type Project = { id: string; name: string; };
type Customer = { id: string; name: string; };
type FlatSale = { id: string; projectId: string; customerId: string; flatName: string; };

const paymentSchema = z.object({
  flatSaleId: z.string().min(1, "A flat sale must be selected."),
  amount: z.coerce.number().min(1, "Payment amount is required."),
  type: z.enum(["Cash", "Cheque", "Bank Transfer"]),
  paymentFor: z.enum(["Booking Money", "Installment"]),
  reference: z.string().optional(),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid payment date is required.",
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// --- Payment Form Component ---
function PaymentForm({ tenantId, onFinished, flatSales, projectsMap, customersMap }: { tenantId: string; onFinished: () => void; flatSales: FlatSale[], projectsMap: Map<string, string>, customersMap: Map<string, string> }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            flatSaleId: '',
            amount: 0,
            type: 'Cash',
            paymentFor: 'Installment',
            reference: '',
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
        },
    });
    
    const onSubmit = (data: PaymentFormData) => {
        if (!firestore || !tenantId) return;

        const paymentData = { 
            ...data, 
            tenantId, // Ensure tenantId is included
            paymentDate: new Date(data.paymentDate).toISOString(),
        };
        const paymentCollectionRef = collection(firestore, `tenants/${tenantId}/flatSales/${data.flatSaleId}/payments`);

        addDocumentNonBlocking(paymentCollectionRef, paymentData);
        toast({ title: "Payment Recorded", description: "The new payment has been successfully recorded." });
        
        onFinished();
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[70vh] p-1 pr-4">
                    <div className="space-y-4 p-4 pt-0">
                        <FormField
                            control={form.control}
                            name="flatSaleId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flat Sale</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={flatSales.length === 0}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a sale to apply payment to" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {flatSales.map(sale => (
                                                <SelectItem key={sale.id} value={sale.id}>
                                                    {customersMap.get(sale.customerId)} - {projectsMap.get(sale.projectId)} ({sale.flatName})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (TK)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="paymentDate" render={({ field }) => (<FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="type" render={({ field }) => (
                               <FormItem><FormLabel>Payment Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="paymentFor" render={({ field }) => (
                               <FormItem><FormLabel>Payment For</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Booking Money">Booking Money</SelectItem><SelectItem value="Installment">Installment</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                           )} />
                        </div>
                         <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Cheque No. / Transaction ID" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </ScrollArea>
                <div className="p-4 pt-0 border-t">
                    <Button type="submit" className="w-full mt-4">Record Payment</Button>
                </div>
            </form>
        </Form>
    );
}

// --- Main Page Component ---
export default function PaymentsPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();

    const [isFormOpen, setFormOpen] = useState(false);

    // --- Data Fetching for the form ---
    const projectsQuery = useMemoFirebase(() => !firestore || !tenantId ? null : collection(firestore, `tenants/${tenantId}/projects`), [firestore, tenantId]);
    const { data: projects } = useCollection<Project>(projectsQuery);

    const customersQuery = useMemoFirebase(() => !firestore || !tenantId ? null : collection(firestore, `tenants/${tenantId}/customers`), [firestore, tenantId]);
    const { data: customers } = useCollection<Customer>(customersQuery);

    const flatSalesQuery = useMemoFirebase(() => !firestore || !tenantId ? null : collection(firestore, `tenants/${tenantId}/flatSales`), [firestore, tenantId]);
    const { data: flatSales } = useCollection<FlatSale>(flatSalesQuery);
    
    // --- Data Mapping for Display ---
    const projectsMap = useMemo(() => new Map(projects?.map(p => [p.id, p.name])), [projects]);
    const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c.name])), [customers]);

    const handleFormFinished = () => {
        setFormOpen(false);
    };

  return (
    <>
      <PageHeader title="Payments" description="Record and track customer payments.">
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1" onClick={() => setFormOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Record a New Payment</DialogTitle>
                <DialogDescription>Fill in the details to record a new payment.</DialogDescription>
            </DialogHeader>
            {isFormOpen && <PaymentForm tenantId={tenantId} onFinished={handleFormFinished} flatSales={flatSales || []} projectsMap={projectsMap} customersMap={customersMap} />}
          </DialogContent>
        </Dialog>
      </PageHeader>

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
                <TableHead>For</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (TK)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        Payment history is temporarily unavailable. You can still add new payments.
                    </TableCell>
                </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
