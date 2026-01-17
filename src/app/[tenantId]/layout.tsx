'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { doc } from 'firebase/firestore';
import { TenantNoticeDialog } from '@/components/TenantNoticeDialog';
import { useToast } from '@/hooks/use-toast';
import { signOut, useAuth } from '@/firebase';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  domain: string;
  noticeMessage?: string;
  noticeActive?: boolean;
  noticeLocked?: boolean;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isNoticeOpen, setNoticeOpen] = useState(false);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  
  const { data: tenant, isLoading: isTenantLoading, error: tenantError } = useDoc<Tenant>(tenantRef);

  useEffect(() => {
    // Phase 1: Wait for essential data (user session and tenantId from URL) to finish loading.
    if (isUserLoading || !tenantId) {
      return; 
    }

    const isLoginPage = pathname === `/${tenantId}/login`;

    // Phase 2: Handle unauthenticated users. If not on login page, redirect them.
    if (!user) {
      if (!isLoginPage) {
        router.push(`/${tenantId}/login`);
      }
      return;
    }
    
    // At this point, the user is logged in and we have a tenantId.
    // Phase 3: Wait for the tenant data itself to finish loading from Firestore.
    if (isTenantLoading) {
        return;
    }

    // At this point, the database fetch for the tenant is complete.
    // Phase 4: Handle the case where the tenant is invalid (not found, disabled, or an error occurred).
    if (!tenant || !tenant.enabled || tenantError) {
      signOut(auth).then(() => {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'Tenant not found or account is disabled.',
        });
        router.push('/');
      });
      return;
    }

    // Phase 5: All checks passed. User is authenticated and the tenant is valid.
    // Handle routing and display the tenant-specific notice if needed.
    if (isLoginPage) {
      router.push(`/${tenantId}/dashboard`);
    } else {
      if (tenant.noticeActive && tenant.noticeMessage) {
        const NOTICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
        const storageKey = `noticeLastClosed_${tenant.id}`;
        const lastClosed = localStorage.getItem(storageKey);
        const now = new Date().getTime();

        if (!lastClosed || now - Number(lastClosed) > NOTICE_INTERVAL) {
            setNoticeOpen(true);
        }
      }
    }
  }, [
      isUserLoading, 
      user, 
      tenantId, 
      isTenantLoading, 
      tenant,
      tenantError, 
      pathname, 
      router, 
      auth, 
      toast
  ]);


  const handleCloseNotice = () => {
    setNoticeOpen(false);
    const storageKey = `noticeLastClosed_${tenantId}`;
    localStorage.setItem(storageKey, new Date().getTime().toString());
  };
  
  const isLoginPage = pathname === `/${tenantId}/login`;
  
  // If we are on the login page, just render it. The useEffect handles any necessary redirects.
  if (isLoginPage) {
    return <>{children}</>;
  }

  // For any other page, if we don't have a valid user and tenant yet, show a global loading screen.
  // This prevents flashing the UI before authentication is confirmed.
  if (isUserLoading || !user || (tenantId && (isTenantLoading || !tenant))) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }
  
  // If all checks pass and the user is on a protected page, render the full application layout.
  // The useEffect has already handled the redirect for invalid tenants, so we only need to check for existence here.
  if (user && tenant) {
      return (
        <>
          <SidebarProvider>
            <AppSidebar tenantId={tenantId} />
            <div className="flex flex-col flex-1">
              <AppHeader tenantId={tenantId} />
              <main className="flex-1 p-4 sm:p-6 bg-muted/30">
                {children}
              </main>
            </div>
          </SidebarProvider>
          <TenantNoticeDialog
              isOpen={isNoticeOpen}
              onClose={handleCloseNotice}
              message={tenant.noticeMessage || ''}
              isLocked={tenant.noticeLocked || false}
          />
        </>
      );
  }

  // Fallback case, which should be brief. The useEffect will redirect quickly if something is wrong.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
    </div>
  );
}
