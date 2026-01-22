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
    // This effect runs on the client after hydration
    if (typeof window !== 'undefined') {
      const noticeShown = sessionStorage.getItem(`noticeShown_${tenantId}`);

      if (tenant && !tenantLoading && !noticeShown) {
        if (tenant.noticeActive && tenant.noticeMessage) {
          setNoticeMessage(tenant.noticeMessage);
          setIsNoticeOpen(true);
          // Set the flag in session storage so it doesn't show again during this session
          sessionStorage.setItem(`noticeShown_${tenantId}`, 'true');
        }
      }
    }
  }, [tenant, tenantLoading, tenantId]);

  return (
    <TenantNoticeDialog
      isOpen={isNoticeOpen}
      onOpenChange={setIsNoticeOpen}
      message={noticeMessage}
    />
  );
}
