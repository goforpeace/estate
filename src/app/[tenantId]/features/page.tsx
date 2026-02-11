'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const features = [
  {
    title: "Dashboard",
    description: "The central hub for a quick overview of your business operations.",
    points: [
      { title: "Financial Snapshots", text: "View key financial metrics including Total Revenue, Total Inflow (cash received), Total Outflow (cash paid), and Net Cash Flow." },
      { title: "Profitability Metrics", text: "Track Gross Profit (Revenue - Project Expenses) and Actual Profit (Revenue - All Expenses)." },
      { title: "Project Overview", text: "Select a project from a dropdown to see a detailed summary of its financials, including revenue, expenses, cash flow, and profit/loss." },
      { title: "Customer Overview", text: "Select a customer to view their purchase history, total sale value, amount paid, and outstanding dues." },
      { title: "Notice Board", text: "View important announcements and notices specific to your tenant account." },
    ],
  },
  {
    title: "Project Management",
    description: "Comprehensive tools to manage your real estate projects from start to finish.",
    points: [
        { title: "Create & Edit Projects", text: "Add new projects with details such as name, location, target sell value, status (Upcoming, Ongoing, Completed), and expected handover date." },
        { title: "Manage Flats", text: "For each project, you can add, edit, and remove individual flats, specifying their name/number and size in square feet." },
        { title: "View Project Details", text: "A dedicated page for each project shows a detailed financial breakdown and a list of all flats with their sale status (Available or Sold)." },
    ],
  },
  {
    title: "Customer Relationship Management (CRM)",
    description: "A centralized database for all your clients.",
    points: [
        { title: "Add & Manage Customers", text: "Create and maintain profiles for each customer, including their name, phone number, address, and National ID (NID)." },
        { title: "View Customer Details", text: "Each customer has a detail page showing their purchase history, payment progress for each property, and a complete log of all payments made." },
    ],
  },
  {
    title: "Sales Management",
    description: "Streamline the process of selling properties.",
    points: [
        { title: "Record Flat Sales", text: "Create detailed sale records for each flat, linking a project, a flat, and a customer." },
        { title: "Detailed Financials", text: "For each sale, you can record the total amount, price per square foot, parking price, utility costs, booking money, and monthly installment details." },
        { title: "Additional Costs", text: "Add any number of extra costs for modifications or other charges to a sale record." },
        { title: "Document Linking", text: "Attach a link to the official deed document for easy access." },
    ],
  },
    {
    title: "Payment & Receipt Management",
    description: "Track all incoming funds from customers.",
    points: [
        { title: "Record Payments", text: "Log every payment received from a customer for a specific sale. Details include amount, date, payment type (Booking Money, Installment), and payment method (Cash, Cheque, Bank Transfer)." },
        { title: "Generate Receipts", text: "Automatically generate and print professional money receipts for any payment transaction. The receipt includes your organization's logo and details." },
        { title: "Payment History", text: "A comprehensive log of all payments is available on the main payments page and on each customer's detail page." },
    ],
  },
  {
    title: "Expense & Outflow Management",
    description: "Keep a close eye on all your business expenditures.",
    points: [
        { title: "Track Project Expenses", text: "Record expenses tied to specific projects, including the vendor, category, amount, quantity, and date." },
        { title: "Manage Expense Payments (Pay Bill)", text: "Log payments made to vendors for specific bills. The system tracks the status of each expense (Unpaid, Partially Paid, Paid) and the remaining due amount." },
        { title: "Expense Categories", text: "Create and manage your own categories for expenses (e.g., Raw Materials, Labor, Marketing)." },
    ],
  },
  {
    title: "Operating Cost Management",
    description: "Manage general business costs that aren't tied to a specific project.",
    points: [
        { title: "Record Operating Costs", text: "Log expenses like office rent, salaries, and utilities." },
        { title: "Cost Categories", text: "Create and manage categories for your operating costs to better organize your finances." },
    ],
  },
  {
    title: "Vendor Management",
    description: "Maintain a directory of all your suppliers and vendors.",
    points: [
        { title: "Vendor Profiles", text: "Create and manage profiles for each vendor, including contact person, enterprise name, and phone number." },
        { title: "View Vendor Details", text: "Each vendor has a detail page that summarizes their total billed amount, total paid, and total due, along with a history of all associated expenses and payments." },
    ],
  },
  {
    title: "Organization Profile",
    description: "Configure your company's branding and information.",
    points: [
        { title: "Company Details", text: "Set your company name, website, phone, email, and address. This information is automatically used on documents like payment receipts." },
        { title: "Logo Upload", text: "Add your company's logo URL to be displayed on receipts." },
    ],
  },
  {
    title: "Security & Access Control",
    description: "Your data is secure and under your control.",
    points: [
        { title: "Tenant Isolation", text: "Your data is completely separate from other tenants. You can only access the information associated with your tenant ID." },
        { title: "User Accounts", text: "The system administrator can create multiple user accounts for your organization, each with their own login credentials." },
    ],
  },
];


export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        title="Application Features"
        description="A complete overview of the features available to you in EstateFlow."
      />
      <div className="space-y-6">
        {features.map((featureCategory, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="font-headline">{featureCategory.title}</CardTitle>
              <CardDescription>{featureCategory.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureCategory.points.map((point, pointIndex) => (
                  <div key={pointIndex} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold">{point.title}</p>
                      <p className="text-sm text-muted-foreground">{point.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
