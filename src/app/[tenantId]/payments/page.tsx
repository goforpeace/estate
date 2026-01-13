'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

// Mock data has been removed. This should be an empty array.
// Data will be fetched from Firestore in a later step.
const paymentsWithDetails: any[] = [];


export default function PaymentsPage({ params }: { params: { tenantId: string } }) {

  const hasPayments = useMemo(() => paymentsWithDetails.length > 0, []);

  return (
    <>
      <PageHeader title="Payments" description="Record and track customer payments.">
         <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Add Payment
        </Button>
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (TK)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasPayments ? (
                paymentsWithDetails.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                    <TableCell>{payment.projectName}</TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell className="text-right">{payment.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="gap-1">
                              <Link href={`/${params.tenantId}/payments/${payment.id}/receipt`}>
                                  <Printer className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only">Print</span>
                              </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
