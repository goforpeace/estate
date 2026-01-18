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


/**
 * This component is rendered only for authenticated users.
 * It is responsible for:
 * 1. Fetching the tenant's data.
 * 2. Validating if the tenant is valid and enabled.
 * 3. Redirecting if the tenant is invalid or if the user is on the login page.
 * 4. Displaying the main application UI and the tenant-specific notice pop-up.
 */
function TenantProtectedLayout({ children, tenantId, isLoginPage }: { children: React.ReactNode; tenantId: string; isLoginPage: boolean }) {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isNoticeOpen, setNoticeOpen] = useState(false);

  // A memoized reference to the tenant document in Firestore.
  const tenantRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  // The hook that fetches the tenant data in real-time.
  const { data: tenant, isLoading: isTenantLoading, error: tenantError } = useDoc<Tenant>(tenantRef);

  // This single, robust effect handles all validation and redirection logic.
  useEffect(() => {
    // 1. Wait until the tenant data has finished loading before making any decisions.
    if (isTenantLoading) {
      return;
    }

    // 2. Once loaded, check if the tenant is invalid (doesn't exist, is disabled, or a DB error occurred).
    // If so, deny access by signing the user out and redirecting them to the home page.
    if (!tenant || !tenant.enabled || tenantError) {
      signOut(auth).then(() => {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: tenantError ? `Error: ${tenantError.message}` : 'Tenant not found or account is disabled.',
        });
        router.push('/');
      });
      return; // Stop further execution.
    }

    // 3. If the tenant is valid and the user is on the login page, it means they just logged in.
    // Redirect them to their dashboard.
    if (isLoginPage) {
      router.push(`/${tenantId}/dashboard`);
      return; // Stop further execution.
    }

    // 4. If the tenant is valid and logged in, check if we need to show the tenant-specific notice.
    if (tenant.noticeActive && tenant.noticeMessage) {
      const NOTICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const storageKey = `noticeLastClosed_${tenant.id}`;
      const lastClosed = localStorage.getItem(storageKey);
      const now = new Date().getTime();

      // Show the notice if it has never been closed or if 5 minutes have passed since it was last closed.
      if (!lastClosed || now - Number(lastClosed) > NOTICE_INTERVAL) {
        setNoticeOpen(true);
      }
    }
    
  }, [tenant, isTenantLoading, tenantError, isLoginPage, tenantId, auth, router, toast]);

  // --- RENDER LOGIC ---

  // While tenant data is being fetched, show a full-screen loader.
  if (isTenantLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }
  
  // If the user is authenticated but on the login page, they will be redirected by the effect.
  // Show a "Redirecting..." message in the meantime.
  if (isLoginPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Redirecting...</p>
      </div>
    );
  }

  // If loading is finished but the tenant is invalid, the effect above will trigger a redirect.
  // We render a generic "Validating..." screen to prevent any content flashing before the redirect occurs.
  if (!tenant || !tenant.enabled || tenantError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating access...</p>
      </div>
    );
  }

  // If all checks have passed, render the full application UI.
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
            // Record when the user closes the notice so we don't show it again for 5 minutes.
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


/**
 * This is the root layout for all tenant-specific pages.
 * It acts as a gatekeeper, checking for user authentication before proceeding.
 */
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
  
  const isLoginPage = pathname === `/${tenantId}/login`;

  // 1. While we're checking if a user is logged in, show a global loading screen.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }

  // 2. If the user is NOT authenticated:
  if (!user) {
    // If they try to access any page other than the login page, redirect them to it.
    if (!isLoginPage) {
      useEffect(() => {
        router.push(`/${tenantId}/login`);
      }, [tenantId, router]);
      // Render nothing while the redirect happens.
      return null;
    }
    // If they are already on the login page, just render it.
    return <>{children}</>;
  }
  
  // 3. If we reach here, a user IS authenticated.
  // We can now render the TenantProtectedLayout, which will handle fetching
  // the tenant's data and all further logic.
  return <TenantProtectedLayout tenantId={tenantId} isLoginPage={isLoginPage}>{children}</TenantProtectedLayout>;
}
