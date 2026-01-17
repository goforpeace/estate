'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-5">
      <div className="hidden bg-muted lg:block relative lg:col-span-4">
        <Image
            src="https://picsum.photos/seed/login/1200/1800"
            alt="Login background"
            fill
            className="object-cover"
            data-ai-hint="restaurant interior"
        />
        <div className="absolute bottom-10 left-10 right-10 p-6 bg-black/50 text-white rounded-lg backdrop-blur-sm">
            <h1 className="text-3xl font-bold font-headline">Welcome to EstateFlow</h1>
            <p className="mt-2 text-sm">Your all-in-one real estate management partner. Streamline projects, sales, and finances with ease.</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold font-headline">EstateFlow</h1>
            <p className="text-balance text-muted-foreground">Enter your Tenant ID to continue</p>
          </div>
          <form onSubmit={handleContinue} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                placeholder="your-company-id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
