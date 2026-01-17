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

function TenantProtectedLayout({ children, tenantId, isLoginPage }: { children: React.ReactNode; tenantId: string; isLoginPage: boolean }) {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isNoticeOpen, setNoticeOpen] = useState(false);

  const tenantRef = useMemoFirebase(() => {
    // We can be sure tenantId is present because we're in this component.
    if (!firestore) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading: isTenantLoading, error: tenantError } = useDoc<Tenant>(tenantRef);

  useEffect(() => {
    // This effect handles logic AFTER tenant data has been checked.
    // It is simpler because we know the user is authenticated.
    
    // Wait for tenant data to load
    if (isTenantLoading) {
      return;
    }

    // Handle invalid tenant
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
    
    // Handle redirect from login page if tenant is valid
    if (isLoginPage) {
        router.push(`/${tenantId}/dashboard`);
        return;
    }

    // Handle tenant notice display for all other pages
    if (tenant.noticeActive && tenant.noticeMessage) {
      const NOTICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const storageKey = `noticeLastClosed_${tenant.id}`;
      const lastClosed = localStorage.getItem(storageKey);
      const now = new Date().getTime();

      if (!lastClosed || now - Number(lastClosed) > NOTICE_INTERVAL) {
        setNoticeOpen(true);
      }
    }

  }, [tenant, isTenantLoading, tenantError, isLoginPage, tenantId, auth, router, toast]);
  
  const handleCloseNotice = () => {
    setNoticeOpen(false);
    if(tenant) {
        const storageKey = `noticeLastClosed_${tenant.id}`;
        localStorage.setItem(storageKey, new Date().getTime().toString());
    }
  };

  // While tenant is loading, or if the tenant is invalid (before redirect), show a loading screen.
  if (isTenantLoading || !tenant || tenantError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  // If user is on the login page but authenticated with a valid tenant, this will be briefly shown during redirect.
  if (isLoginPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Redirecting...</p>
      </div>
    );
  }

  // If all checks pass, render the full application layout.
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

  // 1. Show a global loading screen while we check for a user session.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }

  // 2. If there is no user, handle the public/login area.
  if (!user) {
    // If they are on any page other than the login page, redirect them.
    if (!isLoginPage) {
       // Use an effect for client-side navigation.
      useEffect(() => {
        router.push(`/${tenantId}/login`);
      }, [tenantId, router]);
      // Render nothing while redirecting.
      return null;
    }
    // If they are already on the login page, just render it.
    return <>{children}</>;
  }
  
  // 3. If we reach here, a user is authenticated. 
  // We can now pass control to the TenantProtectedLayout which handles fetching tenant data.
  return <TenantProtectedLayout tenantId={tenantId} isLoginPage={isLoginPage}>{children}</TenantProtectedLayout>;
}