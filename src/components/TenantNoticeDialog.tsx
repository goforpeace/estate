'use client';

import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface TenantNoticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  isLocked: boolean;
}

const LOCK_DURATION = 180; // 3 minutes in seconds

export function TenantNoticeDialog({ isOpen, onClose, message, isLocked }: TenantNoticeDialogProps) {
  const [countdown, setCountdown] = useState(LOCK_DURATION);

  useEffect(() => {
    if (isOpen && isLocked) {
      setCountdown(LOCK_DURATION); // Reset countdown when opened
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, isLocked]);

  const canClose = !isLocked || countdown === 0;

  const handleClose = () => {
    if (canClose) {
      onClose();
    }
  };
  
  const handlePayNow = () => {
      // Placeholder for Pay Now functionality
      alert('Pay Now functionality will be implemented later.');
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent onEscapeKeyDown={(e) => !canClose && e.preventDefault()} onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
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
            <Button onClick={handleClose} disabled={!canClose} className="mt-2 sm:mt-0">
                {canClose ? 'Close' : `Close in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`}
            </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
