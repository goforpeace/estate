'use client';

import { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TenantNoticeDialog } from '@/components/TenantNoticeDialog';

type Tenant = {
  id: string;
  noticeMessage?: string;
  noticeActive?: boolean;
};

export function TenantNoticeHandler({ tenantId }: { tenantId: string }) {
  const firestore = useFirestore();
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  const { data: tenant, isLoading: tenantLoading } = useDoc<Tenant>(tenantRef);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (tenant && !tenantLoading && tenant.noticeActive && tenant.noticeMessage) {
      setNoticeMessage(tenant.noticeMessage);
      
      // Show the notice immediately on load
      setIsNoticeOpen(true);

      // Set up an interval to show the notice every 30 seconds
      intervalId = setInterval(() => {
        setIsNoticeOpen(true);
      }, 30000); // 30000 milliseconds = 30 seconds
    } else {
        // If notice is not active or message is empty, ensure the dialog is closed.
        setIsNoticeOpen(false);
    }

    // Cleanup function to clear the interval when the component unmounts
    // or when the dependencies of the useEffect hook change.
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tenant, tenantLoading]);

  return (
    <TenantNoticeDialog
      isOpen={isNoticeOpen}
      onOpenChange={setIsNoticeOpen}
      message={noticeMessage}
    />
  );
}
