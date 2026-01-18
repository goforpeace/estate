'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc, signOut, useAuth } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
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

// A component to render when the user is logged in but tenant validation fails.
function InvalidTenantState() {
    const auth = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
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


export default function AppLayout({ children }: { children: React.ReactNode }) {
  // --- 1. HOOKS (unconditional) ---
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const [isNoticeOpen, setNoticeOpen] = useState(false);

  const isLoginPage = useMemo(() => pathname === `/${tenantId}/login`, [pathname, tenantId]);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  
  const { data: tenant, isLoading: isTenantLoading, error: tenantError } = useDoc<Tenant>(tenantRef);

  // --- 2. EFFECTS ---
  
  // Effect for handling redirects
  useEffect(() => {
    if (isUserLoading) return; // Wait until user status is known

    if (!user && !isLoginPage) {
      router.push(`/${tenantId}/login`);
    }

    if (user && isLoginPage) {
      router.push(`/${tenantId}/dashboard`);
    }
  }, [isUserLoading, user, isLoginPage, tenantId, router]);
  
  // Effect for handling tenant notice
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
  }, [tenant]);

  // --- 3. RENDER LOGIC ---

  // While checking user auth, show a global loading screen.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }

  // If user is not logged in...
  if (!user) {
    // and they ARE on the login page, render it.
    if (isLoginPage) {
      return <>{children}</>;
    }
    // and they are NOT on the login page, show loading during redirect.
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
  // --- At this point, the user is authenticated ---

  // If user is logged in, but on the login page, show loading while redirecting to dashboard.
  if (isLoginPage) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <p>Redirecting to dashboard...</p>
        </div>
      );
  }

  // While tenant data is being fetched, show loader.
  if (isTenantLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application data...</p>
      </div>
    );
  }

  // After loading, if tenant is invalid for any reason, show the error state.
  if (!tenant || !tenant.enabled || tenantError) {
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