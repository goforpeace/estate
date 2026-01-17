'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TenantIdPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantId.trim()) {
      router.push(`/${tenantId.trim()}/login`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-t-4 border-primary">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="font-headline text-3xl">EstateFlow</CardTitle>
            <CardDescription>Your Real Estate Management Partner</CardDescription>
          </CardHeader>
          <form onSubmit={handleContinue}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId" className="font-headline">Tenant ID</Label>
                <Input
                  id="tenantId"
                  placeholder="your-company-id"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  required
                  className="text-base"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full font-headline">Continue</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
