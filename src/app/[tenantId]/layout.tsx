'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";

export default function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantId: string };
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If auth state is not loading and there is a user, they are authenticated.
    if (!isUserLoading && user) {
      setIsAuthenticated(true);
    } 
    // If auth state is not loading and there is NO user, redirect to login page.
    else if (!isUserLoading && !user) {
      setIsAuthenticated(false);
      // But don't redirect if they are already ON the login page.
      if (pathname !== `/${params.tenantId}/login`) {
        router.push(`/${params.tenantId}/login`);
      }
    }
  }, [user, isUserLoading, router, params.tenantId, pathname]);

  // While checking auth, show a loading screen.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  // If the user is on the login page, just render the login page content without the main layout.
  if (pathname === `/${params.tenantId}/login`) {
    return <>{children}</>;
  }
  
  // If authenticated and not on the login page, render the full app layout.
  if (isAuthenticated) {
    return (
      <SidebarProvider>
        <AppSidebar tenantId={params.tenantId} />
        <div className="flex flex-col flex-1">
          <AppHeader tenantId={params.tenantId} />
          <main className="flex-1 p-4 sm:p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // If none of the above, it means we are redirecting or waiting, so render nothing.
  return null;
}
