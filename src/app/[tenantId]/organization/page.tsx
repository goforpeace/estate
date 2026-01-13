'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

// Placeholder for organization data, which will come from Firestore.
const mockOrganization = {
    logoUrl: 'https://picsum.photos/seed/102/200/60',
    name: '',
    website: '',
    phone: '',
    email: '',
    address: ''
}

export default function OrganizationPage() {
  return (
    <>
      <PageHeader title="Organization" description="Manage your company profile and branding." />
      <form>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex items-center gap-4">
                    <Image
                        alt="Company Logo"
                        className="rounded-lg object-contain"
                        height="80"
                        src={mockOrganization.logoUrl}
                        width="200"
                        data-ai-hint="company logo"
                    />
                    <div className="grid gap-2 flex-1">
                        <Label htmlFor="logo-url">Logo Link</Label>
                        <Input id="logo-url" defaultValue={mockOrganization.logoUrl} placeholder="https://example.com/logo.png" />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input id="company-name" defaultValue={mockOrganization.name} placeholder="Your Company LLC" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" defaultValue={mockOrganization.website} placeholder="https://yourcompany.com" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue={mockOrganization.phone} placeholder="+1 (555) 123-4567" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={mockOrganization.email} placeholder="contact@yourcompany.com" />
                    </div>
                     <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" defaultValue={mockOrganization.address} placeholder="123 Main St, Anytown USA" />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button>Save Changes</Button>
            </CardFooter>
        </Card>
      </form>
    </>
  );
}
