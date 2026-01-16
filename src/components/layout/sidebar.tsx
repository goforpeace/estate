'use client'

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter
  } from "@/components/ui/sidebar"
import { Building2, LayoutDashboard, Users, Waypoints, HandCoins, Settings, LogOut, CreditCard, Briefcase, MinusCircle, Banknote, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/projects", icon: Waypoints, label: "Projects" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/sales", icon: HandCoins, label: "Flat Sale" },
    { href: "/payments", icon: CreditCard, label: "Payments" },
    { href: "/expenses", icon: MinusCircle, label: "Expenses" },
    { href: "/pay-bill", icon: Banknote, label: "Pay Bill" },
    { href: "/operating-cost", icon: Wallet, label: "Operating Cost" },
    { href: "/vendors", icon: Briefcase, label: "Vendors" },
    { href: "/organization", icon: Settings, label: "Organization" },
]

const icons: { [key: string]: React.ElementType } = {
  LayoutDashboard,
  Waypoints,
  Users,
  HandCoins,
  CreditCard,
  Briefcase,
  Settings,
  MinusCircle,
  Banknote,
  Wallet
};


export function AppSidebar({ tenantId }: { tenantId: string }) {
    const pathname = usePathname();

    // Helper to get the base path for comparison
    const basePath = `/${tenantId}`;
    
    return (
        <Sidebar>
            <SidebarHeader>
                <Link href={`/${tenantId}/dashboard`} className="flex items-center gap-2 font-bold font-headline text-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                    <span>EstateFlow</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {navItems.map(item => {
                        const Icon = typeof item.icon === 'string' ? icons[item.icon] : item.icon;
                        const fullPath = `${basePath}${item.href}`;
                        const isActive = pathname === fullPath || pathname.startsWith(`${fullPath}/`);

                        return (
                            <SidebarMenuItem key={item.label}>
                                <Link href={fullPath}>
                                    <SidebarMenuButton tooltip={item.label} isActive={isActive}>
                                        <Icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 <SidebarMenu>
                     <SidebarMenuItem>
                         <Link href={`/${tenantId}/login`}>
                            <SidebarMenuButton tooltip="Logout">
                                <LogOut />
                                <span>Logout</span>
                            </SidebarMenuButton>
                         </Link>
                     </SidebarMenuItem>
                 </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
