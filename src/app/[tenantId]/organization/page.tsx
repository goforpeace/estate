'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { doc } from "firebase/firestore";
import { useEffect } from "react";
import { useLoading } from "@/context/loading-context";

const organizationSchema = z.object({
  name: z.string().min(1, "Company name is required."),
  website: z.string().url().or(z.literal("")).optional(),
  phone: z.string().min(1, "Phone number is required."),
  email: z.string().email("Invalid email address."),
  address: z.string().min(1, "Address is required."),
  logoUrl: z.string().url().or(z.literal("")).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

type Organization = OrganizationFormData & {
  id: string;
  tenantId: string;
};

// A fixed ID for the single organization document per tenant.
const ORG_DOC_ID = 'details';

export default function OrganizationPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { showLoading, hideLoading, isLoading: isSaving } = useLoading();

  const orgDocRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, `tenants/${tenantId}/organization`, ORG_DOC_ID);
  }, [firestore, tenantId]);

  const { data: organization, isLoading, error } = useDoc<Organization>(orgDocRef);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      logoUrl: '',
    },
  });

  // When organization data loads, reset the form with the fetched values.
  useEffect(() => {
    if (organization) {
      form.reset(organization);
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!orgDocRef || !tenantId) return;
    
    showLoading("Saving organization details...");
    try {
        const orgData = {
            ...data,
            id: ORG_DOC_ID,
            tenantId,
        };

        await setDocumentNonBlocking(orgDocRef, orgData, { merge: true });
        
        toast({
          title: "Organization Updated",
          description: "Your company profile has been saved.",
        });
    } catch (error) {
        console.error("Failed to save organization:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save details." });
    } finally {
        hideLoading();
    }
  };

  const logoPreview = form.watch('logoUrl');

  if (isLoading) {
    return (
        <>
            <PageHeader title="Organization" description="Manage your company profile and branding." />
            <p>Loading organization details...</p>
        </>
    );
  }

  if (error) {
     return (
        <>
            <PageHeader title="Organization" description="Manage your company profile and branding." />
            <p className="text-destructive">Error loading organization details: {error.message}</p>
        </>
    );
  }

  return (
    <>
      <PageHeader title="Organization" description="Manage your company profile and branding." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Company Details</CardTitle>
              <CardDescription>This information will appear on receipts and other official documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <Image
                      alt="Company Logo"
                      className="rounded-lg object-contain bg-muted"
                      height="80"
                      src={logoPreview}
                      width="200"
                      data-ai-hint="company logo"
                    />
                  ) : (
                    <div className="h-[80px] w-[200px] flex items-center justify-center bg-muted rounded-lg text-sm text-muted-foreground">
                        No logo provided
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Logo Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://yourcompany.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contact@yourcompany.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St, Anytown USA" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isSaving}>Save Changes</Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}

    
