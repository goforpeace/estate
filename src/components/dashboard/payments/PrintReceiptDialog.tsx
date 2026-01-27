'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt } from '@/components/dashboard/receipt';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { InflowTransaction } from '@/app/[tenantId]/payments/page';

export const PrintReceiptDialog = ({
  isOpen,
  setIsOpen,
  transaction,
  customer,
  project,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transaction: InflowTransaction;
  customer: any;
  project: any;
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleSaveAsPdf = () => {
    if (!receiptRef.current) return;
    html2canvas(receiptRef.current, {
      scale: 3, // Increase scale for higher resolution
      useCORS: true, // Needed for external images like logos
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png'); // Use PNG for lossless quality
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt-${transaction.receiptId}.pdf`);
    });
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Receipt</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `);
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(receiptRef.current.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Print Receipt</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="max-h-[70svh] overflow-auto border rounded-lg">
            <Receipt
              ref={receiptRef}
              transaction={transaction}
              customer={customer}
              project={project}
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleSaveAsPdf}>
              Save as PDF
            </Button>
            <Button onClick={handlePrint}>Print</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
