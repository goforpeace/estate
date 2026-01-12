import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Link
          href="/gopon/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline"
        >
          <Shield className="h-6 w-6 text-primary" />
          <span className="">EstateFlow Admin</span>
        </Link>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
