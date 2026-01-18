
'use client'

import Link from "next/link";
import { Shield, LogOut, Newspaper, PanelLeft } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppFooter } from "@/components/layout/footer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const [open, setOpen] = useState(false);


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

  const navLinks = (
      <nav className="grid gap-2 text-lg font-medium">
          <Link
              href="/gopon/dashboard"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
          >
              <Shield className="h-5 w-5" />
              Tenants
          </Link>
          <Link
              href="/gopon/notice-board"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
          >
              <Newspaper className="h-5 w-5" />
              Notice Board
          </Link>
      </nav>
  );

  // If user is authenticated, render the layout for child pages.
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-6">
            <Link
            href="/gopon/dashboard"
            className="flex items-center gap-2 text-lg font-semibold font-headline"
            >
            <Shield className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block">EstateFlow Admin</span>
            </Link>
             <nav className="hidden md:flex items-center gap-4 text-sm">
                <Link href="/gopon/dashboard" className={pathname === '/gopon/dashboard' ? 'text-foreground font-medium' : 'text-muted-foreground transition-colors hover:text-foreground'}>
                    Tenants
                </Link>
                <Link href="/gopon/notice-board" className={pathname.startsWith('/gopon/notice-board') ? 'text-foreground font-medium' : 'text-muted-foreground transition-colors hover:text-foreground'}>
                    Notice Board
                </Link>
            </nav>
        </div>

        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              {navLinks}
            </SheetContent>
          </Sheet>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-6">{children}</main>
      <AppFooter />
    </div>
  );
}
