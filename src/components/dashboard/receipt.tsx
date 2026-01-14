'use client';

import { forwardRef } from 'react';
import { InflowTransaction } from '@/app/[tenantId]/payments/page';
import { numberToWords } from '@/lib/utils';
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
      className="p-8 bg-white text-black font-sans text-sm"
      style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}
    >
      <div className="border border-black p-6 h-full flex flex-col">
        <header className="text-center mb-6">
          {organization?.logoUrl && <img src={organization.logoUrl} alt="logo" className="h-20 mx-auto mb-4" data-ai-hint="company logo" />}
          <h2 className="text-xl font-bold">{organization?.name}</h2>
          <p className="text-xs">{organization?.address}</p>
          <p className="text-xs">Phone: {organization?.phone}, Email: {organization?.email}</p>
          <h1 className="text-2xl font-bold underline mt-4">MONEY RECEIPT</h1>
        </header>

        <div className="flex justify-between mb-6">
          <div>
            <strong>Receipt No:</strong> {transaction.receiptId}
          </div>
          <div>
            <strong>Date:</strong> {format(new Date(transaction.date), 'dd/MM/yyyy')}
          </div>
        </div>

        <div className="mb-4">
          <p>
            Received with thanks from{' '}
            <strong>{customer?.name || 'N/A'}</strong> of address{' '}
            <strong>{customer?.address || 'N/A'}</strong>
          </p>
        </div>

        <div className="mb-4">
          <p>
            The sum of Taka (in words):{' '}
            <strong>
              {amountInWords} Taka Only
            </strong>
          </p>
        </div>
        
        <div className="mb-4">
          <p>
            On account of{' '}
            <strong>
              {transaction.paymentType}
            </strong>{' '}
            against Apartment No.{' '}
            <strong>{transaction.flatName}</strong> of{' '}
            Project{' '}
            <strong>{project?.name || 'N/A'}</strong>
          </p>
        </div>

        <div className="mb-6">
          <p>
            By{' '}
            <strong>
              {transaction.paymentMethod}
              {transaction.chequeNo && `, Cheque No: ${transaction.chequeNo}`}
              {transaction.bankName && `, Bank: ${transaction.bankName}`}
              {transaction.chequeDate && `, Date: ${format(new Date(transaction.chequeDate), 'dd/MM/yyyy')}`}
            </strong>
          </p>
        </div>
        
        {transaction.note && <div className="mb-6">
          <p>
            <strong>Note:</strong> {transaction.note}
          </p>
        </div>}

        <div className="flex justify-between items-center bg-gray-100 p-2 font-bold mb-20">
            <span>In Figure</span>
            <span>TK. {transaction.amount.toLocaleString('en-IN')} /=</span>
        </div>


        <div className="flex-grow"></div>

        <footer className="flex justify-between items-end">
          <div className="w-1/3 text-center">
            <hr className="border-black" />
            <p className="pt-2">Receiver's Signature</p>
          </div>
          <div className="w-1/3 text-center">
            <hr className="border-black" />
            <p className="pt-2">for {organization?.name}</p>
          </div>
        </footer>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

    