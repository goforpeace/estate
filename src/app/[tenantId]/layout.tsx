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
