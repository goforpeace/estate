'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, getDocs, where, doc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { DollarSign, TrendingUp, TrendingDown, Landmark, ArrowLeftRight, Database, MapPin, Tag, Calendar, Building, Target, Wallet, CircleDollarSign, User, Phone, Home, MessageSquare } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// --- Type Definitions ---
type FlatSale = {
    id: string;
    projectId: string;
    amount: number;
    customerId: string;
    additionalCosts?: { description: string, price: number }[];
};
type OutflowTransaction = {
    projectId: string;
    amount: number;
    paidAmount: number;
};
type OperatingCost = {
    amount: number;
    date: string; // ISO string
};

type Project = {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  targetSell: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  expectedHandoverDate: string; // Stored as ISO string
  flats: { name: string; sizeSft: number }[];
};

type Customer = {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
};

type GlobalNotice = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
};

type TenantNotice = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
};


// --- Helper Functions ---
const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 100000) {
        return `৳${(value / 100000).toFixed(2)} Lacs`;
    }
    return `৳${value.toLocaleString('en-IN')}`;
};

// --- Main Component ---
export default function DashboardPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const firestore = useFirestore();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // --- Data Fetching ---
    const projectsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/projects`);
    }, [firestore, tenantId]);
    const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

    const customersQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/customers`);
    }, [firestore, tenantId]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const salesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/flatSales`);
    }, [firestore, tenantId]);
    const { data: sales, isLoading: salesLoading } = useCollection<FlatSale>(salesQuery);

    const expensesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/outflowTransactions`);
    }, [firestore, tenantId]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<OutflowTransaction>(expensesQuery);
    
    const operatingCostsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/operatingCosts`);
    }, [firestore, tenantId]);
    const { data: operatingCosts, isLoading: opCostsLoading } = useCollection<OperatingCost>(operatingCostsQuery);

    const globalNoticesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'notices'), where('isActive', '==', true));
    }, [firestore]);
    const { data: globalNotices, isLoading: globalNoticesLoading } = useCollection<GlobalNotice>(globalNoticesQuery);
    
    const tenantNoticesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return query(collection(firestore, `tenants/${tenantId}/notices`), where('isActive', '==', true));
    }, [firestore, tenantId]);
    const { data: tenantNotices, isLoading: tenantNoticesLoading } = useCollection<TenantNotice>(tenantNoticesQuery);

    const [totalInflow, setTotalInflow] = useState(0);
    const [inflowLoading, setInflowLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !sales) {
            setInflowLoading(sales === undefined);
            if(sales === null) {
                setTotalInflow(0);
                setInflowLoading(false);
            }
            return;
        }

        if (sales.length === 0) {
            setTotalInflow(0);
            setInflowLoading(false);
            return;
        }

        let isMounted = true;
        const fetchAllPayments = async () => {
            setInflowLoading(true);
            const paymentPromises = sales.map(sale => {
                const paymentsRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
                return getDocs(paymentsRef);
            });

            try {
                const paymentSnapshots = await Promise.all(paymentPromises);
                if (!isMounted) return;

                const inflow = paymentSnapshots.reduce((projectTotal, saleSnapshot) => {
                    const saleTotal = saleSnapshot.docs.reduce((saleAcc, doc) => saleAcc + (doc.data().amount || 0), 0);
                    return projectTotal + saleTotal;
                }, 0);
                setTotalInflow(inflow);
            } catch (e) {
                console.error("Error fetching project inflow:", e);
                if (isMounted) setTotalInflow(0);
            } finally {
                if (isMounted) setInflowLoading(false);
            }
        };

        fetchAllPayments();
        return () => { isMounted = false; };
    }, [firestore, tenantId, sales]);

    // --- Memoized Calculations (Tenant-wide) ---
    const financials = useMemo(() => {
        const totalRevenue = sales?.reduce((acc, sale) => acc + sale.amount, 0) || 0;
        const totalOutflow = expenses?.reduce((acc, expense) => acc + (expense.paidAmount || 0), 0) || 0;
        const netCashFlow = totalInflow - totalOutflow;
        const totalProjectExpenses = expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
        const grossProfit = totalRevenue - totalProjectExpenses;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = lastMonth === 11 ? currentYear - 1 : currentYear;

        const monthlyOperatingCost = operatingCosts?.filter(cost => {
            const costDate = new Date(cost.date);
            return costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear;
        }).reduce((acc, cost) => acc + cost.amount, 0) || 0;

        const lastMonthOperatingCost = operatingCosts?.filter(cost => {
            const costDate = new Date(cost.date);
            return costDate.getMonth() === lastMonth && costDate.getFullYear() === lastMonthYear;
        }).reduce((acc, cost) => acc + cost.amount, 0) || 0;
        
        const totalOperatingCosts = operatingCosts?.reduce((acc, cost) => acc + cost.amount, 0) || 0;
        const actualProfit = totalRevenue - (totalProjectExpenses + totalOperatingCosts);

        return {
            totalRevenue,
            totalInflow,
            totalOutflow,
            netCashFlow,
            totalProjectExpenses,
            monthlyOperatingCost,
            lastMonthOperatingCost,
            grossProfit,
            actualProfit,
        };
    }, [sales, expenses, operatingCosts, totalInflow]);


    // --- Project Specific Calculations ---
    const selectedProject = useMemo(() => {
        if (!projects || !selectedProjectId) return null;
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const projectSales = useMemo(() => {
        if (!sales || !selectedProjectId) return [];
        return sales.filter(s => s.projectId === selectedProjectId);
    }, [sales, selectedProjectId]);

    const projectExpenses = useMemo(() => {
        if (!expenses || !selectedProjectId) return [];
        return expenses.filter(e => e.projectId === selectedProjectId);
    }, [expenses, selectedProjectId]);
    
    const [projectInflow, setProjectInflow] = useState(0);
    const [projectInflowLoading, setProjectInflowLoading] = useState(false);

    useEffect(() => {
        if (!firestore || !projectSales || !selectedProjectId) {
            setProjectInflow(0);
            setProjectInflowLoading(false);
            return;
        }

        if (projectSales.length === 0) {
            setProjectInflow(0);
            setProjectInflowLoading(false);
            return;
        }

        let isMounted = true;
        const fetchProjectPayments = async () => {
            setProjectInflowLoading(true);
            const paymentPromises = projectSales.map(sale => {
                const paymentsRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
                return getDocs(paymentsRef);
            });

            try {
                const paymentSnapshots = await Promise.all(paymentPromises);
                if (!isMounted) return;

                const totalInflow = paymentSnapshots.reduce((projectTotal, saleSnapshot) => {
                    const saleTotal = saleSnapshot.docs.reduce((saleAcc, doc) => saleAcc + (doc.data().amount || 0), 0);
                    return projectTotal + saleTotal;
                }, 0);
                setProjectInflow(totalInflow);
            } catch (e) {
                console.error("Error fetching project inflow:", e);
                if (isMounted) setProjectInflow(0);
            } finally {
                if (isMounted) setProjectInflowLoading(false);
            }
        };

        fetchProjectPayments();

        return () => { isMounted = false; };
    }, [firestore, tenantId, projectSales, selectedProjectId]);
    
    const projectFinancials = useMemo(() => {
        const revenue = projectSales.reduce((acc, sale) => acc + sale.amount, 0) || 0;
        const totalExpenses = projectExpenses.reduce((acc, expense) => acc + expense.amount, 0) || 0;
        const outflow = projectExpenses.reduce((acc, expense) => acc + (expense.paidAmount || 0), 0) || 0;
        const cashFlow = projectInflow - outflow;
        const profit = revenue - totalExpenses;
        return { revenue, totalExpenses, outflow, cashFlow, profit };
    }, [projectSales, projectExpenses, projectInflow]);

    // --- Customer Specific Calculations ---
    const selectedCustomer = useMemo(() => {
        if (!customers || !selectedCustomerId) return null;
        return customers.find(c => c.id === selectedCustomerId);
    }, [customers, selectedCustomerId]);

    const customerSales = useMemo(() => {
        if (!sales || !selectedCustomerId) return [];
        return sales.filter(s => s.customerId === selectedCustomerId);
    }, [sales, selectedCustomerId]);

    const customerFinancials = useMemo(() => {
        const totalRevenue = customerSales.reduce((acc, sale) => {
            const additionalCostsTotal = sale.additionalCosts?.reduce((sum, cost) => sum + cost.price, 0) || 0;
            return acc + sale.amount + additionalCostsTotal;
        }, 0);
        return { totalRevenue };
    }, [customerSales]);
    
    const [customerExtraFinancials, setCustomerExtraFinancials] = useState<{
        totalPaid: number;
        dueAmount: number;
        lastPaymentAmount: number | null;
        lastPaymentDate: string | null;
    }>({
        totalPaid: 0,
        dueAmount: 0,
        lastPaymentAmount: null,
        lastPaymentDate: null,
    });
    const [customerFinancialsLoading, setCustomerFinancialsLoading] = useState(false);

    useEffect(() => {
        if (!firestore || !tenantId || !customerSales.length) {
            setCustomerExtraFinancials({ totalPaid: 0, dueAmount: 0, lastPaymentAmount: null, lastPaymentDate: null });
            setCustomerFinancialsLoading(false);
            return;
        }

        let isMounted = true;
        const fetchCustomerPayments = async () => {
            setCustomerFinancialsLoading(true);
            const paymentPromises = customerSales.map(sale => {
                const paymentsRef = collection(firestore, `tenants/${tenantId}/flatSales/${sale.id}/payments`);
                return getDocs(paymentsRef);
            });

            try {
                const paymentSnapshots = await Promise.all(paymentPromises);
                if (!isMounted) return;

                const allPayments = paymentSnapshots.flatMap(snapshot => 
                    snapshot.docs.map(doc => doc.data() as { amount: number; date: string })
                );

                const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
                const dueAmount = customerFinancials.totalRevenue - totalPaid;

                let lastPaymentAmount: number | null = null;
                let lastPaymentDate: string | null = null;

                if (allPayments.length > 0) {
                    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    lastPaymentAmount = allPayments[0].amount;
                    lastPaymentDate = allPayments[0].date;
                }
                
                setCustomerExtraFinancials({
                    totalPaid,
                    dueAmount,
                    lastPaymentAmount,
                    lastPaymentDate,
                });

            } catch (e) {
                console.error("Error fetching customer payments:", e);
                if (isMounted) {
                     setCustomerExtraFinancials({ totalPaid: 0, dueAmount: 0, lastPaymentAmount: null, lastPaymentDate: null });
                }
            } finally {
                if (isMounted) setCustomerFinancialsLoading(false);
            }
        };

        fetchCustomerPayments();

        return () => { isMounted = false; };
    }, [firestore, tenantId, customerSales, customerFinancials.totalRevenue]);


    const isLoading = salesLoading || expensesLoading || opCostsLoading || inflowLoading || projectsLoading || customersLoading;
    const projectOverviewLoading = projectInflowLoading;
    
    const summaryCards = [
        { title: "Total Revenue", value: financials.totalRevenue, description: "Total value of all sales contracts", icon: Database, color: "bg-gray-100 text-gray-800", valueColor: "text-gray-900" },
        { title: "Total Inflow", value: financials.totalInflow, description: "Total cash received", icon: TrendingUp, color: "bg-emerald-100 text-emerald-800", valueColor: "text-emerald-900" },
        { title: "Total Outflow", value: financials.totalOutflow, description: "Total cash paid out", icon: TrendingDown, color: "bg-amber-100 text-amber-800", valueColor: "text-amber-900" },
        { title: "Net Cash Flow", value: financials.netCashFlow, description: "Inflow - Outflow", icon: ArrowLeftRight, color: "bg-red-100 text-red-800", valueColor: financials.netCashFlow >= 0 ? "text-emerald-900" : "text-red-900" },
        { title: "Total Project Expenses", value: financials.totalProjectExpenses, description: "Total recorded project expenses", icon: DollarSign, color: "bg-gray-100 text-gray-800", valueColor: "text-gray-900" },
        { title: "Monthly Operating Cost", value: financials.monthlyOperatingCost, description: `Last Month: ৳${financials.lastMonthOperatingCost.toLocaleString()}`, icon: Landmark, color: "bg-amber-100 text-amber-800", valueColor: "text-amber-900" },
        { title: "Gross Profit", value: financials.grossProfit, description: "Total Revenue - Project Expenses", icon: TrendingUp, color: "bg-emerald-100 text-emerald-800", valueColor: financials.grossProfit >= 0 ? "text-emerald-900" : "text-red-900" },
        { title: "Actual Profit", value: financials.actualProfit, description: "Revenue - (Proj. + Op. Expenses)", icon: DollarSign, color: "bg-red-100 text-red-800", valueColor: financials.actualProfit >= 0 ? "text-emerald-900" : "text-red-900" }
    ];

    const statusVariant = {
      Ongoing: "default",
      Upcoming: "secondary",
      Completed: "outline",
    } as const;

    const globalNoticeContent = useMemo(() => {
        if (!globalNotices || globalNotices.length === 0) return null;
        return globalNotices.map(notice => (
            <span key={notice.id} className="mx-8 whitespace-nowrap">{notice.message}</span>
        ));
    }, [globalNotices]);


  return (
    <>
      {!globalNoticesLoading && globalNotices && globalNotices.length > 0 && (
        <Card className="mb-6 bg-primary border-none text-primary-foreground overflow-hidden">
            <div className="p-3 flex items-center gap-4">
                <MessageSquare className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 w-full overflow-hidden">
                    <div className="animate-ticker-scroll whitespace-nowrap">
                        <span className="inline-flex items-center">
                            {globalNoticeContent}
                        </span>
                        <span className="inline-flex items-center" aria-hidden="true">
                            {globalNoticeContent}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
      )}

      {!tenantNoticesLoading && tenantNotices && tenantNotices.length > 0 && (
        <Card className="mb-6 bg-accent border-none text-accent-foreground">
             <CardHeader>
                <CardTitle className="font-headline flex items-center gap-3"><MessageSquare className="h-6 w-6" /> Important Notices</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {tenantNotices.map(notice => (
                    <div key={notice.id} className="p-4 bg-background/20 rounded-lg">
                        <div className="text-sm" dangerouslySetInnerHTML={{ __html: notice.message }} />
                    </div>
                ))}
             </CardContent>
        </Card>
      )}

      <PageHeader title="Dashboard" description="An overview of your real estate business." />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array(8).fill(0).map((_, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-gray-200 rounded w-2/4 animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
                <Card key={card.title} className={cn("border-none", card.color)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="h-4 w-4 text-current" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold font-headline", card.valueColor)}>{formatCurrency(card.value)}</div>
                        <p className="text-xs text-current/70">{card.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="font-headline">Project Overview</CardTitle>
                <CardDescription>Select a project to see its detailed financial overview.</CardDescription>
            </CardHeader>
            <CardContent>
                <Combobox
                    options={projects?.map(p => ({ value: p.id, label: p.name })) || []}
                    value={selectedProjectId || ''}
                    onChange={(value) => setSelectedProjectId(value === selectedProjectId ? null : value)}
                    placeholder="Select a project"
                    searchPlaceholder="Search projects..."
                    emptyPlaceholder="No projects found."
                />

                {selectedProjectId && projectOverviewLoading && <div className="mt-6 text-center">Loading project overview...</div>}
                {selectedProjectId && !projectOverviewLoading && selectedProject ? (
                    <CardContent className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-sm">
                        <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Location</p><p className="font-medium">{selectedProject.location}</p></div></div>
                        <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Status</p><p className="font-medium"><Badge variant={statusVariant[selectedProject.status]}>{selectedProject.status}</Badge></p></div></div>
                        <div className="flex items-start gap-3"><Calendar className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Handover Date</p><p className="font-medium">{new Date(selectedProject.expectedHandoverDate).toLocaleDateString('en-GB')}</p></div></div>
                        <div className="flex items-start gap-3"><Building className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Total Flats</p><p className="font-medium">{selectedProject.flats?.length || 0}</p></div></div>
                        
                        <div className="flex items-start gap-3"><Target className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Target Sell</p><p className="font-medium">TK {selectedProject.targetSell.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><TrendingUp className="h-5 w-5 text-muted-foreground mt-1 text-green-600" /><div><p className="text-muted-foreground">Total Revenue (Sold)</p><p className="font-medium">TK {projectFinancials.revenue.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><TrendingDown className="h-5 w-5 text-muted-foreground mt-1 text-red-600" /><div><p className="text-muted-foreground">Total Expenses</p><p className="font-medium">TK {projectFinancials.totalExpenses.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><CircleDollarSign className="h-5 w-5 text-muted-foreground mt-1 text-blue-600" /><div><p className="text-muted-foreground">Profit / Loss</p><p className={`font-medium ${projectFinancials.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>TK {projectFinancials.profit.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><TrendingUp className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Inflow (Payments Rec.)</p><p className="font-medium">TK {projectInflow.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><TrendingDown className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Outflow (Bills Paid)</p><p className="font-medium">TK {projectFinancials.outflow.toLocaleString('en-IN')}</p></div></div>
                        <div className="flex items-start gap-3"><Wallet className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Net Cash Flow</p><p className={`font-medium ${projectFinancials.cashFlow >= 0 ? '' : 'text-red-700'}`}>TK {projectFinancials.cashFlow.toLocaleString('en-IN')}</p></div></div>
                         <div className="lg:col-span-4 mt-2">
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/${tenantId}/projects/${selectedProjectId}`}>View Full Project Details</Link>
                            </Button>
                         </div>
                    </CardContent>
                ) : null}
                 {!selectedProjectId && !isLoading && <p className="text-sm text-muted-foreground text-center mt-6">Select a project to view its overview.</p>}
            </CardContent>
        </Card>

        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="font-headline">Customer Overview</CardTitle>
                <CardDescription>Select a customer to see their purchase summary.</CardDescription>
            </CardHeader>
            <CardContent>
                <Combobox
                    options={customers?.map(c => ({ value: c.id, label: c.name })) || []}
                    value={selectedCustomerId || ''}
                    onChange={(value) => setSelectedCustomerId(value === selectedCustomerId ? null : value)}
                    placeholder="Select a customer"
                    searchPlaceholder="Search customers..."
                    emptyPlaceholder="No customers found."
                />

                {selectedCustomerId && (isLoading || customerFinancialsLoading) && <div className="mt-6 text-center">Loading customer overview...</div>}
                {selectedCustomerId && !isLoading && !customerFinancialsLoading && selectedCustomer ? (
                    <CardContent className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                         <div className="sm:col-span-2 flex items-start gap-3"><User className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Name</p><p className="font-medium">{selectedCustomer.name}</p></div></div>
                         <div className="flex items-start gap-3"><Phone className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedCustomer.phoneNumber}</p></div></div>
                         <div className="flex items-start gap-3"><Home className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Address</p><p className="font-medium">{selectedCustomer.address}</p></div></div>
                         <div className="flex items-start gap-3"><Building className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Properties Purchased</p><p className="font-medium">{customerSales.length}</p></div></div>
                         <div className="flex items-start gap-3"><Database className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Total Sale Value</p><p className="font-medium">TK {customerFinancials.totalRevenue.toLocaleString('en-IN')}</p></div></div>
                         
                         {!customerFinancialsLoading && (
                            <>
                                <div className="flex items-start gap-3"><TrendingUp className="h-5 w-5 text-muted-foreground mt-1 text-green-600" /><div><p className="text-muted-foreground">Total Paid</p><p className="font-medium">TK {customerExtraFinancials.totalPaid.toLocaleString('en-IN')}</p></div></div>
                                <div className="flex items-start gap-3"><TrendingDown className="h-5 w-5 text-muted-foreground mt-1 text-red-600" /><div><p className="text-muted-foreground">Total Due</p><p className="font-medium">TK {customerExtraFinancials.dueAmount.toLocaleString('en-IN')}</p></div></div>
                                <div className="flex items-start gap-3"><Wallet className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Last Paid Amount</p><p className="font-medium">{customerExtraFinancials.lastPaymentAmount ? `TK ${customerExtraFinancials.lastPaymentAmount.toLocaleString('en-IN')}` : 'N/A'}</p></div></div>
                                <div className="flex items-start gap-3"><Calendar className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-muted-foreground">Last Payment Date</p><p className="font-medium">{customerExtraFinancials.lastPaymentDate ? new Date(customerExtraFinancials.lastPaymentDate).toLocaleDateString('en-GB') : 'N/A'}</p></div></div>
                            </>
                         )}

                         <div className="sm:col-span-2 mt-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/${tenantId}/customers/${selectedCustomerId}`}>View Full Customer Details</Link>
                            </Button>
                         </div>
                    </CardContent>
                ) : null}
                {!selectedCustomerId && !isLoading && <p className="text-sm text-muted-foreground text-center mt-6">Select a customer to view their overview.</p>}
            </CardContent>
        </Card>
    </>
  );
}
