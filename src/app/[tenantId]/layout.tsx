
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

// Matches the User entity in backend.json
type UserProfile = {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    phone?: string;
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
        // The document ID for a tenant is its domain/login ID.
        return doc(firestore, 'tenants', tenantId);
    }, [firestore, tenantId]);
    
    const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);

    if (isTenantLoading) {
        return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading application...</p></div>;
    }

    if (!tenant) {
        // This case should ideally be caught by the login page, but as a fallback.
        return <InvalidAccessState message="The tenant you are trying to access does not exist." showSignOut={true} />;
    }

    if (!tenant.enabled) {
        return <InvalidAccessState message="This tenant account has been disabled. Please contact your administrator." showSignOut={true} />;
    }

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
  const firestore = useFirestore();

  const tenantId = params?.tenantId as string;

  // Fetch the user's profile from Firestore to get their assigned tenantId
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<UserProfile>(userProfileRef);

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


  const isLoading = isUserLoading || isProfileLoading;

  // While checking user auth and profile, show a global loading screen.
  if (isLoading || (!user && pathname !== `/${tenantId}/login` && pathname !== `/`)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Validating session...</p>
      </div>
    );
  }
  
  // If we have a user, perform security checks before rendering the layout.
  if (user) {
    // Handle case where profile fails to load
    if (profileError) {
        return <InvalidAccessState message={`There was an error loading your user profile: ${profileError.message}`} showSignOut={true} />;
    }
    
    // Handle case where user exists in Auth, but not in 'users' collection
    if (!isProfileLoading && !userProfile) {
        return <InvalidAccessState message="Your user profile could not be found in the database. Please contact your administrator." showSignOut={true} />;
    }
    
    // Handle case where profile is missing tenantId
    if (userProfile && !userProfile.tenantId) {
      return <InvalidAccessState message={`Your user profile is improperly configured and is missing a tenant assignment. Please contact your administrator.`} showSignOut={true} />;
    }

    // THE CRITICAL SECURITY CHECK:
    // Ensure the tenantId in the user's profile matches the tenantId in the URL.
    if (userProfile && userProfile.tenantId !== tenantId) {
      const accessDeniedMessage = `You are trying to access the tenant "${tenantId}", but your account is assigned to the tenant "${userProfile.tenantId}". Please log out and sign in with the correct tenant ID.`;
      return <InvalidAccessState message={accessDeniedMessage} showSignOut={true} />;
    }

    // If all checks pass, render the protected layout.
    return <TenantLayout tenantId={tenantId}>{children}</TenantLayout>;
  }
  
  // If no user, and not on a protected route, render the children (e.g., login page)
  return <>{children}</>;
}
