'use client';

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface TenantNoticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function TenantNoticeDialog({ isOpen, onClose, message }: TenantNoticeDialogProps) {
  
  const handlePayNow = () => {
      // Placeholder for Pay Now functionality
      alert('Pay Now functionality will be implemented later.');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Important Notice</AlertDialogTitle>
          <AlertDialogDescription className="py-4 whitespace-pre-wrap">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
            <div className="flex gap-2 flex-wrap justify-center">
                 <Button variant="secondary" onClick={handlePayNow}>Pay Now</Button>
                 <a href="tel:+8809649174632">
                    <Button variant="outline">Contact Support: +8809649-174632</Button>
                 </a>
            </div>
            <Button onClick={onClose} className="mt-2 sm:mt-0">
                Close
            </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
