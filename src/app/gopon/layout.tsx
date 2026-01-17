'use client'

import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // This layout protects all child routes. If auth is done and no user, redirect to admin login.
    if (!isUserLoading && !user) {
      if (pathname !== '/gopon') {
          router.push('/gopon');
      }
    }
  }, [user, isUserLoading, router, pathname]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/gopon');
      });
    }
  };

  // If user is on the login page, render it without layout.
  if (pathname === '/gopon') {
      return <>{children}</>;
  }

  // While checking auth or if there is no user (and we are about to redirect), show a loading screen.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading admin portal...</p>
      </div>
    );
  }

  // If user is authenticated, render the layout for child pages.
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Link
          href="/gopon/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline"
        >
          <Shield className="h-6 w-6 text-primary" />
          <span className="">EstateFlow Admin</span>
        </Link>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
