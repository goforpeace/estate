'use client'

import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/gopon');
      });
    }
  };

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
