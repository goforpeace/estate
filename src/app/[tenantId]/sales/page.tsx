'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

// Mock data has been removed. These should be empty arrays.
// Data will be fetched from Firestore.
const projects: any[] = [];
const customers: any[] = [];

export default function SalesPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const availableFlats = selectedProject?.flats.filter((f:any) => f.status === 'available');

  return (
    <>
      <PageHeader title="Flat Sale" description="Create a new sale record for a flat." />
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">New Sale Record</CardTitle>
            <CardDescription>Fill in the details to record a new flat sale.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                 <Select onValueChange={setSelectedProjectId} disabled={projects.length === 0}>
                    <SelectTrigger id="project">
                        <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="flat">Available Flat</Label>
                 <Select disabled={!selectedProject || !availableFlats || availableFlats.length === 0}>
                    <SelectTrigger id="flat">
                        <SelectValue placeholder="Select a flat" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableFlats?.map((flat:any) => (
                             <SelectItem key={flat.id} value={flat.id}>{flat.name} ({flat.size} sft)</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                 <Select disabled={customers.length === 0}>
                    <SelectTrigger id="customer">
                        <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                        {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="amount">Total Amount (TK)</Label>
                <Input id="amount" type="number" placeholder="15000000" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="per-sft-price">Per SFT Price (TK)</Label>
                <Input id="per-sft-price" type="number" placeholder="10000" />
            </div>

             <div className="space-y-2">
                <Label htmlFor="parking-price">Parking Price (TK)</Label>
                <Input id="parking-price" type="number" placeholder="500000" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="utility-cost">Utility Cost (TK)</Label>
                <Input id="utility-cost" type="number" placeholder="200000" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="booking-money">Booking Money (TK)</Label>
                <Input id="booking-money" type="number" placeholder="2000000" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="monthly-installment">Monthly Installment (TK)</Label>
                <Input id="monthly-installment" type="number" placeholder="100000" />
            </div>

            <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="deed-link">Deed Link</Label>
                <Input id="deed-link" placeholder="https://example.com/deed-document" />
            </div>
            
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" placeholder="Any additional information..." />
            </div>
        </CardContent>
        <CardFooter>
            <Button className="font-headline">Save Sale Record</Button>
        </CardFooter>
      </Card>
    </>
  );
}
