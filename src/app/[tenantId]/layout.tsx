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

  // Unified loading state
  const isLoading = isUserLoading || (tenantId && isTenantLoading);

  useEffect(() => {
    // Wait until all data is loaded before running any logic
    if (isLoading) return;

    const isLoginPage = pathname === `/${tenantId}/login`;

    if (!user) {
      // If user is not logged in, they should only be on the login page.
      // If they land anywhere else, redirect them.
      if (!isLoginPage) {
        router.push(`/${tenantId}/login`);
      }
      return; // Stay on login page
    }

    // From here, we know the user is logged in.

    // Check if the tenant is valid.
    if (!tenant || !tenant.enabled || tenantError) {
      // If tenant is invalid, disabled, or there was an error, log the user out and redirect them home.
      // This prevents them from being stuck on an error page for an invalid tenant.
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

    // From here, we know user is logged in AND tenant is valid.

    if (isLoginPage) {
      // If they are on the login page somehow, redirect to the dashboard.
      router.push(`/${tenantId}/dashboard`);
    } else {
      // If on any other page, check if a notice should be displayed.
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
  }, [isLoading, user, tenant, tenantId, pathname, router, auth, toast, tenantError]);


  const handleCloseNotice = () => {
    setNoticeOpen(false);
    const storageKey = `noticeLastClosed_${tenantId}`;
    localStorage.setItem(storageKey, new Date().getTime().toString());
  };
  
  // Render loading state while waiting for auth/data.
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  // If user is authenticated and tenant is valid, render the full app layout.
  // The useEffect above handles redirecting away from the login page.
  if (user && tenant && tenant.enabled && pathname !== `/${tenantId}/login`) {
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

  // Otherwise, render the children (e.g., the login page) as the default.
  // The useEffect will handle any necessary redirects.
  return <>{children}</>;
}
