
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
import { AppFooter } from '@/components/layout/footer';
import { TenantNoticeHandler } from '@/components/TenantNoticeHandler';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  domain: string;
  noticeMessage?: string;
  noticeActive?: boolean;
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

function TenantLayout({ children, tenantId }: { children: React.ReactNode, tenantId: string }) {
    const firestore = useFirestore();

    const tenantRef = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return doc(firestore, 'tenants', tenantId);
    }, [firestore, tenantId]);
    
    const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);

    if (isTenantLoading) {
        return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading application...</p></div>;
    }

    if (!tenant) {
        return <InvalidAccessState message="The tenant you are trying to access does not exist." showSignOut={true} />;
    }

    if (!tenant.enabled) {
        return <InvalidAccessState message="This tenant account has been disabled. Please contact your administrator." showSignOut={true} />;
    }
    
    // The responsibility of checking for a valid tenant is handled at the login screen.
    // If a user gets here, we assume they have access.

    return (
        <SidebarProvider>
            <TenantNoticeHandler tenantId={tenantId} />
            <AppSidebar tenantId={tenantId} />
            <div className="flex flex-col flex-1 min-w-0">
                <AppHeader tenantId={tenantId} />
                <main className="flex-1 p-4 sm:p-6 bg-muted/30">
                    {children}
                </main>
                <AppFooter />
            </div>
        </SidebarProvider>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const tenantId = params?.tenantId as string;

   useEffect(() => {
    if (isUserLoading || !tenantId) {
      return; // Wait until user status and tenantId are resolved
    }

    // User is logged in
    if (user) {
      // If user is on the login page or root, redirect to dashboard
      if (pathname === `/${tenantId}/login` || pathname === `/`) {
        router.push(`/${tenantId}/dashboard`);
      }
    } else { // User is not logged in
      // If user is on a protected page, redirect to the tenant's login page
      if (pathname !== `/${tenantId}/login` && pathname !== `/` && !pathname.startsWith('/gopon')) {
        router.push(`/${tenantId}/login`);
      }
    }
  }, [isUserLoading, user, pathname, tenantId, router]);


  // While checking user auth, show a global loading screen.
  if (isUserLoading || (!user && pathname !== `/${tenantId}/login` && pathname !== `/`)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }
  
  // If we have a user, render the protected layout.
  // Or if we are on a public/login page, render it directly.
  if (user) {
    return <TenantLayout tenantId={tenantId}>{children}</TenantLayout>;
  }
  
  return <>{children}</>;
}
