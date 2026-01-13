'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Building2, TrendingUp, CalendarCheck } from "lucide-react";

export default function DashboardPage() {

    const totalRevenue = 0;
    const totalProjects = 0;
    const propertiesSold = 0;
    const upcomingHandovers = 0;

    const summaryCards = [
        { title: "Total Revenue", value: `৳${(totalRevenue / 1000000).toFixed(2)}M`, icon: DollarSign, description: "All-time revenue" },
        { title: "Total Projects", value: totalProjects, icon: Building2, description: "All projects managed" },
        { title: "Properties Sold", value: propertiesSold, icon: TrendingUp, description: "Across all projects" },
        { title: "Upcoming Handovers", value: upcomingHandovers, icon: CalendarCheck, description: "Projects nearing completion" },
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
