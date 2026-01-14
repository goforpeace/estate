'use client';

import { forwardRef } from 'react';
import { InflowTransaction } from '@/app/[tenantId]/payments/page';
import { numberToWords } from '@/lib/utils';
import { format } from 'date-fns';

export const Receipt = forwardRef<
  HTMLDivElement,
  { transaction: InflowTransaction; customer: any; project: any }
>(({ transaction, customer, project }, ref) => {
  const amountInWords = numberToWords(transaction.amount);

  return (
    <div
      ref={ref}
      className="p-8 bg-white text-black font-sans text-sm"
      style={{ width: '210mm', height: '297mm' }}
    >
      <div className="border border-black p-6 h-full flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">MONEY RECEIPT</h1>
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
            <strong>{customer?.name || 'N/A'}</strong>
          </p>
        </div>

        <div className="mb-4">
          <p>
            Address: <strong>{customer?.address || 'N/A'}</strong>
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
            (in figures) TK. <strong>{transaction.amount.toLocaleString('en-IN')}</strong>
          </p>
        </div>

        <div className="mb-4">
          <p>
            As{' '}
            <strong>
              {transaction.paymentType}
            </strong>{' '}
            Against Flat No.{' '}
            <strong>{transaction.flatId}</strong> of{' '}
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


        <div className="flex-grow"></div>

        <footer className="flex justify-between items-end">
          <div className="w-1/3 text-center">
            <hr className="border-black" />
            <p className="pt-2">Prepared by</p>
          </div>
          <div className="text-center">
            <p className="font-bold">TK. {transaction.amount.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-1/3 text-center">
            <hr className="border-black" />
            <p className="pt-2">Authorized Signature</p>
          </div>
        </footer>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

    