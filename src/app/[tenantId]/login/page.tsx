'use client';

import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage({ params }: { params: { tenantId: string } }) {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic
    router.push(`/${params.tenantId}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-t-4 border-primary">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="font-headline text-3xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to tenant <span className="font-bold text-primary font-headline">{params.tenantId}</span>
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-headline">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full font-headline">Login</Button>
              <Button variant="link" size="sm" asChild>
                <Link href="/">Wrong Tenant ID?</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
