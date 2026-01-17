'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TenantNoticeDialog } from '@/components/TenantNoticeDialog';

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

  const [isNoticeOpen, setNoticeOpen] = useState(false);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  
  const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);

  const isLoading = isUserLoading || (tenantId && isTenantLoading);

  // Logic to show notice pop-up
  useEffect(() => {
    if (user && tenant && tenant.noticeActive && tenant.noticeMessage) {
        const NOTICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
        const storageKey = `noticeLastClosed_${tenant.id}`;
        const lastClosed = localStorage.getItem(storageKey);
        const now = new Date().getTime();

        if (!lastClosed || now - Number(lastClosed) > NOTICE_INTERVAL) {
            setNoticeOpen(true);
        }
    }
  }, [user, tenant]);

  const handleCloseNotice = () => {
    setNoticeOpen(false);
    const storageKey = `noticeLastClosed_${tenantId}`;
    localStorage.setItem(storageKey, new Date().getTime().toString());
  };

  useEffect(() => {
    if (isLoading) {
      return; // Wait until all data is loaded
    }
    
    // After loading, if on login page, we let it render
    if (pathname === `/${tenantId}/login`) {
        // If user is already logged in, redirect them away from login page
        if(user) {
            router.push(`/${tenantId}/dashboard`);
        }
        return;
    }

    // For any other page, we run our checks
    if (!tenant) {
      return;
    }

    if (!tenant.enabled) {
      return;
    }

    if (!user) {
      router.push(`/${tenantId}/login`);
    }

  }, [isLoading, user, tenant, tenantId, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }
  
  // If we are not on the login page and checks fail, show error or redirect
  if (pathname !== `/${tenantId}/login`) {
      if (!tenant) {
          return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
                <h1 className="text-2xl font-bold text-destructive">Tenant Not Found</h1>
                <p className="text-muted-foreground">The tenant ID &quot;{tenantId}&quot; does not exist.</p>
                <Button variant="link" asChild className="mt-4"><Link href="/">Go Back</Link></Button>
            </div>
          );
      }

      if (!tenant.enabled) {
          return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
                <h1 className="text-2xl font-bold text-destructive">Tenant Account Disabled</h1>
                <p className="text-muted-foreground">This tenant account has been disabled.</p>
                 <Button variant="link" asChild className="mt-4"><Link href="/">Go Back</Link></Button>
            </div>
          );
      }
      
      // If we are here, tenant exists and is enabled, but user might not be loaded yet or doesn't exist
      // The useEffect will handle redirecting to login if !user.
      // If user is null but still loading, the main loading screen handles it.
  }

  // Render children (which could be the login page) or the main app layout
  if (!user || pathname === `/${tenantId}/login`) {
      return <>{children}</>;
  }
  
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
      {tenant && (
        <TenantNoticeDialog
            isOpen={isNoticeOpen}
            onClose={handleCloseNotice}
            message={tenant.noticeMessage || ''}
            isLocked={tenant.noticeLocked || false}
        />
      )}
    </>
  );
}
