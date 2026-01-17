'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";

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

  useEffect(() => {
    // If auth state is done loading and there is NO user, redirect to login page.
    if (!isUserLoading && !user) {
      // But don't redirect if they are already ON the login page.
      if (pathname !== `/${tenantId}/login`) {
        router.push(`/${tenantId}/login`);
      }
    }
  }, [user, isUserLoading, router, tenantId, pathname]);

  // While checking auth, show a loading screen. This prevents content flashing for unauthenticated users.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  // If we're done loading and there's no user, we check the route.
  if (!user) {
    // If they're on the login page, render it.
    if (pathname === `/${tenantId}/login`) {
      return <>{children}</>;
    }
    // Otherwise, they are being redirected, so render nothing to prevent layout flash.
    return null;
  }
  
  // If we reach here, the user is loaded and authenticated.
  // If they are on the login page, redirect them to the dashboard.
  if (pathname === `/${tenantId}/login`) {
      router.push(`/${tenantId}/dashboard`);
      return (
         <div className="flex h-screen w-screen items-center justify-center bg-background">
            <p>Redirecting to dashboard...</p>
        </div>
      );
  }
  
  return (
    <SidebarProvider>
      <AppSidebar tenantId={tenantId} />
      <div className="flex flex-col flex-1">
        <AppHeader tenantId={tenantId} />
        <main className="flex-1 p-4 sm:p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
