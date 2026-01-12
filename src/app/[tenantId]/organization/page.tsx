'use client'

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organization as mockOrganization } from "@/lib/data";
import Image from "next/image";

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
                        <Input id="logo-url" defaultValue={mockOrganization.logoUrl} />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input id="company-name" defaultValue={mockOrganization.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" defaultValue={mockOrganization.website} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue={mockOrganization.phone} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={mockOrganization.email} />
                    </div>
                     <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" defaultValue={mockOrganization.address} />
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
