'use client';

import { useUser, useFirestore, useMemoFirebase, useDoc, signOut, useAuth } from '@/firebase';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  domain: string;
};

// A standalone component for the error state.
function InvalidAccessState({ message, showSignOut }: { message: string, showSignOut: boolean }) {
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
                   {message}
                </p>
                {showSignOut && <Button onClick={handleSignOut}>Sign Out</Button>}
                 {!showSignOut && <Button asChild><Link href="/">Go to Homepage</Link></Button>}
            </div>
      </div>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const tenantId = params?.tenantId as string;

  // 1. Redirect to login if not authenticated and not already on login page
  useEffect(() => {
    if (!isUserLoading && !user && pathname !== `/${tenantId}/login`) {
      router.push(`/${tenantId}/login`);
    }
  }, [isUserLoading, user, pathname, tenantId, router]);
  
  // While checking user auth, show a global loading screen.
  if (isUserLoading || !tenantId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }

  // If on the login page, just render it. If not logged in yet, it will be rendered. If logged in, a redirect will happen.
  if (pathname === `/${tenantId}/login`) {
      // If user is logged in and on login page, redirect to dashboard.
      if (user) {
          router.push(`/${tenantId}/dashboard`);
          return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to dashboard...</p></div>;
      }
      return <>{children}</>;
  }
  
  // For all other pages, we need an authenticated user.
  if (!user) {
       return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to login...</p></div>;
  }
  
  // If we have a user, render the protected layout
  return <TenantLayout tenantId={tenantId}>{children}</TenantLayout>;
}

function TenantLayout({ children, tenantId }: { children: React.ReactNode, tenantId: string }) {
    const firestore = useFirestore();

    const tenantRef = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return doc(firestore, 'tenants', tenantId);
    }, [firestore, tenantId]);
    
    // We still fetch the tenant data to make it available to child components (e.g., for the notice),
    // but we no longer use it to block access in this layout.
    const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);

    if (isTenantLoading) {
        return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading application...</p></div>;
    }
    
    // Previously, there was a check here: if (!tenant || !tenant.enabled).
    // This was the source of the race condition and has been removed as requested
    // to ensure the notice feature does not interfere with user access.
    // The responsibility of checking for a valid tenant is now handled at the login screen.

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
