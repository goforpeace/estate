'use client';

import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

type Tenant = {
  id: string;
  name: string;
  loginImageUrl?: string;
};

export default function LoginPage({ params }: { params: { tenantId: string } }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const tenantRef = useMemoFirebase(() => {
      if (!firestore || !params.tenantId) return null;
      return doc(firestore, 'tenants', params.tenantId as string);
  }, [firestore, params.tenantId]);
  const { data: tenant, isLoading: tenantLoading } = useDoc<Tenant>(tenantRef);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Please enter both email and password.",
        });
        return;
    }
    initiateEmailSignIn(auth, email, password);
    // The useUser hook in the layout will redirect on successful login
    router.push(`/${params.tenantId}/dashboard`);
  };

  const imageUrl = tenant?.loginImageUrl || "https://picsum.photos/seed/login/1200/1800";

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-5">
      <div className="hidden bg-muted lg:block relative lg:col-span-4">
        {tenantLoading ? (
            <Skeleton className="h-full w-full" />
        ) : (
            <Image
                src={imageUrl}
                alt="Login background"
                fill
                className="object-cover"
                data-ai-hint="restaurant interior"
                unoptimized
            />
        )}
        <div className="absolute bottom-10 left-10 right-10 p-6 bg-black/50 text-white rounded-lg backdrop-blur-sm">
            <h1 className="text-3xl font-bold font-headline">Welcome to {tenant?.name || 'EstateFlow'}</h1>
            <p className="mt-2 text-sm">Your all-in-one real estate management partner. Streamline projects, sales, and finances with ease.</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
                Sign in to tenant <span className="font-bold text-primary">{params.tenantId}</span>
            </p>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="user@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Login</Button>
            <Button variant="link" size="sm" asChild>
                <Link href="/">Wrong Tenant ID?</Link>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
