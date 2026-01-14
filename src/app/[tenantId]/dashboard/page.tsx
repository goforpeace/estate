'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useParams } from "next/navigation";
import { DollarSign, Building2, TrendingUp, CalendarCheck } from "lucide-react";
import { useMemo } from "react";

type Project = {
    expectedHandoverDate: string;
    status: string;
};

type FlatSale = {
    amount: number;
};

export default function DashboardPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();

    const projectsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/projects`);
    }, [firestore, tenantId]);
    const { data: projects } = useCollection<Project>(projectsQuery);
    
    const salesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/flatSales`);
    }, [firestore, tenantId]);
    const { data: sales } = useCollection<FlatSale>(salesQuery);

    const totalRevenue = useMemo(() => {
        return sales?.reduce((acc, sale) => acc + sale.amount, 0) || 0;
    }, [sales]);

    const totalProjects = useMemo(() => {
        return projects?.length || 0;
    }, [projects]);

    const propertiesSold = useMemo(() => {
        return sales?.length || 0;
    }, [sales]);

    const upcomingHandovers = useMemo(() => {
        if (!projects) return 0;
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return projects.filter(p => {
            const handoverDate = new Date(p.expectedHandoverDate);
            return p.status === 'Ongoing' && handoverDate > now && handoverDate <= nextMonth;
        }).length;
    }, [projects]);

    const summaryCards = [
        { title: "Total Revenue", value: `৳${(totalRevenue / 1000000).toFixed(2)}M`, icon: DollarSign, description: "All-time revenue" },
        { title: "Total Projects", value: totalProjects, icon: Building2, description: "All projects managed" },
        { title: "Properties Sold", value: propertiesSold, icon: TrendingUp, description: "Across all projects" },
        { title: "Upcoming Handovers", value: upcomingHandovers, icon: CalendarCheck, description: "In the next 30 days" },
    ];


  return (
    <>
      <PageHeader title="Dashboard" description="An overview of your real estate business." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
            <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
            </Card>
        ))}
      </div>
    </>
  );
}
