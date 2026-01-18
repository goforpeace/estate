'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc, signOut, useAuth } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { doc } from 'firebase/firestore';
import { TenantNoticeDialog } from '@/components/TenantNoticeDialog';
import { Button } from '@/components/ui/button';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  domain: string;
  noticeMessage?: string;
  noticeActive?: boolean;
  noticeLocked?: boolean;
};

// This component assumes a user is logged in.
// It is responsible for fetching tenant data and protecting the route based on tenant status.
function TenantLayout({ children, tenantId }: { children: React.ReactNode, tenantId: string }) {
  const firestore = useFirestore();
  const [isNoticeOpen, setNoticeOpen] = useState(false);

  // Step 1: Create the tenant document reference.
  const tenantRef = useMemoFirebase(() => {
    // tenantId is guaranteed to be a string here by the parent component.
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  
  // Step 2: Fetch the tenant data.
  const { data: tenant, isLoading: isTenantLoading, error: tenantError } = useDoc<Tenant>(tenantRef);

  // Step 3: Handle the notice pop-up logic.
  useEffect(() => {
    if (tenant && tenant.noticeActive && tenant.noticeMessage) {
      const NOTICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const storageKey = `noticeLastClosed_${tenant.id}`;
      const lastClosed = localStorage.getItem(storageKey);
      const now = new Date().getTime();

      if (!lastClosed || now - Number(lastClosed) > NOTICE_INTERVAL) {
        setNoticeOpen(true);
      }
    }
  }, [tenant]); // This effect only runs when the tenant data changes.

  // --- Render Logic for TenantLayout ---

  // While fetching tenant data, show a consistent loading screen.
  if (isTenantLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application data...</p>
      </div>
    );
  }

  // After loading, if tenant is invalid for any reason, show the error state.
  if (tenantError || !tenant || !tenant.enabled) {
    return <InvalidTenantState />;
  }

  // If all checks pass, render the full application UI.
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
          onClose={() => {
            setNoticeOpen(false);
            if (tenant) {
                localStorage.setItem(`noticeLastClosed_${tenant.id}`, new Date().getTime().toString());
            }
          }}
          message={tenant.noticeMessage || ''}
          isLocked={tenant.noticeLocked || false}
      />
    </>
  );
}

// This component handles the primary user authentication guard.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const tenantId = params?.tenantId as string;
  const isLoginPage = pathname === `/${tenantId}/login`;

  // Effect for handling redirects based on authentication status.
  useEffect(() => {
    if (isUserLoading || !tenantId) return; // Wait until auth status and tenantId are known.

    if (!user && !isLoginPage) {
      router.push(`/${tenantId}/login`);
    }

    if (user && isLoginPage) {
      router.push(`/${tenantId}/dashboard`);
    }
  }, [isUserLoading, user, isLoginPage, tenantId, router]);

  // While checking user auth or waiting for tenantId, show a global loading screen.
  if (isUserLoading || !tenantId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }

  // If user is not logged in, render the login page or a redirecting message.
  if (!user) {
    return isLoginPage ? <>{children}</> : <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to login...</p></div>;
  }
  
  // If user is logged in, but on the login page, show loading while redirecting.
  if (isLoginPage) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <p>Redirecting to dashboard...</p>
        </div>
      );
  }

  // If authenticated and not on login page, render the TenantLayout which handles tenant data.
  return <TenantLayout tenantId={tenantId}>{children}</TenantLayout>;
}

// A standalone component for the error state.
function InvalidTenantState() {
    const auth = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
        if (!auth) return;
        signOut(auth).then(() => {
            router.push('/');
        });
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center p-4">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    The tenant you are trying to access does not exist, has been disabled, or there was an error loading the data. Please check the tenant ID or contact support.
                </p>
                <Button onClick={handleSignOut}>Sign Out</Button>
            </div>
      </div>
    );
}