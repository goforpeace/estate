
'use client';

import { forwardRef } from 'react';
import { InflowTransaction } from '@/app/[tenantId]/payments/page';
import { numberToWords, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

// --- Type Definitions ---
type Organization = { name: string; logoUrl?: string; address: string; phone: string; email: string; website?: string; };

export const Receipt = forwardRef<
  HTMLDivElement,
  { transaction: InflowTransaction; customer: any; project: any }
>(({ transaction, customer, project }, ref) => {
  const amountInWords = numberToWords(transaction.amount);
  const firestore = useFirestore();

  const orgRef = useMemoFirebase(() => {
    if (!firestore || !transaction.tenantId) return null;
    return doc(firestore, `tenants/${transaction.tenantId}/organization`, 'details');
  }, [firestore, transaction.tenantId]);
  const { data: organization } = useDoc<Organization>(orgRef);


  return (
    <div
      ref={ref}
      className="bg-white text-black font-times text-sm"
      style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}
    >
      <div className="p-8 h-full flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-200">
          <div className="flex items-start gap-4">
            {organization?.logoUrl && <img src={organization.logoUrl} alt="logo" className="h-20 w-auto object-contain" data-ai-hint="company logo" />}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{organization?.name}</h2>
              <p className="text-xs text-gray-500 max-w-xs">{organization?.address}</p>
              <p className="text-xs text-gray-500">Phone: {organization?.phone}</p>
              <p className="text-xs text-gray-500">Email: {organization?.email}</p>
              {organization?.website && <p className="text-xs text-gray-500">Website: {organization.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold uppercase text-gray-700">Money Receipt</h1>
            <div className="mt-2 text-xs">
                <p><span className="font-bold text-gray-600">Receipt No:</span> {transaction.receiptId}</p>
                <p><span className="font-bold text-gray-600">Date:</span> {format(new Date(transaction.date), 'dd MMMM, yyyy')}</p>
            </div>
          </div>
        </header>

        {/* Bill To Section */}
        <div className="py-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Received From</h3>
            <p className="font-bold text-lg text-gray-800">{customer?.name || 'N/A'}</p>
            <p className="text-xs text-gray-600">{customer?.address || 'N/A'}</p>
        </div>

        {/* Items Table */}
        <div className="flex-grow">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-gray-100">
                        <td className="p-3 align-top">
                            <p className="font-semibold text-gray-800">Payment for {transaction.paymentType}</p>
                            <p className="text-xs text-gray-500">
                                Project: {project?.name || 'N/A'} <br />
                                Apartment No: {transaction.flatName}
                            </p>
                        </td>
                        <td className="p-3 text-right align-top font-medium">{formatCurrency(transaction.amount)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Total and Footer */}
        <div className="pt-6">
             <div className="flex justify-end">
                <div className="w-2/5">
                    <div className="flex justify-between py-2 border-b">
                        <span className="font-medium text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-gray-100 px-3">
                        <span className="font-bold text-gray-800">Total</span>
                        <span className="font-bold text-lg">{formatCurrency(transaction.amount)} /=</span>
                    </div>
                </div>
            </div>

            <div className="py-6">
                <p className="text-sm text-gray-600">
                    <span className="font-semibold">Amount in Words:</span> {amountInWords} Taka Only.
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-semibold">Paid By:</span> {transaction.paymentMethod}
                    {transaction.chequeNo && `, Cheque No: ${transaction.chequeNo}`}
                    {transaction.bankName && `, Bank: ${transaction.bankName}`}
                    {transaction.chequeDate && `, Date: ${format(new Date(transaction.chequeDate), 'dd/MM/yyyy')}`}
                </p>
                {transaction.note && <p className="text-xs text-gray-500 mt-2"><strong>Note:</strong> {transaction.note}</p>}
            </div>

            <div className="flex justify-between items-end mt-16 pt-8 border-t border-gray-200">
              <div className="w-1/3 text-center">
                <p className="border-t-2 border-gray-400 pt-2 text-xs text-gray-600">Receiver's Signature</p>
              </div>
              <div className="w-1/3 text-center">
                <p className="border-t-2 border-gray-400 pt-2 text-xs text-gray-600">For {organization?.name}</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
