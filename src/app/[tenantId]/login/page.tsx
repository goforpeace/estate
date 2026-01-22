
'use client';

import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, query, where } from 'firebase/firestore';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { AppFooter } from '@/components/layout/footer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const brandingRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'globalSettings', 'loginBranding');
  }, [firestore]);
  const { data: branding, isLoading: brandingLoading } = useDoc<{loginImageUrl?: string}>(brandingRef);

  const tenantsQuery = useMemoFirebase(() => {
      if (!firestore || !tenantId) return null;
      return query(collection(firestore, 'tenants'), where('domain', '==', tenantId));
  }, [firestore, tenantId]);
  const { data: tenants, isLoading: tenantLoading } = useCollection<Tenant>(tenantsQuery);

  const tenant = tenants?.[0];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tenant && !tenant.enabled) {
      toast({
          variant: "destructive",
          title: "Login Failed",
          description: "This tenant account is disabled. Please contact support.",
      });
      return;
    }

    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Please enter both email and password.",
        });
        return;
    }
    if (auth) {
      setIsLoggingIn(true);
      try {
        await initiateEmailSignIn(auth, email, password);
        // On success, the layout's useEffect will handle the redirect.
      } catch (error) {
        console.error("Login failed:", error);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "The email or password you entered is incorrect.",
        });
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const imageUrl = branding?.loginImageUrl || "https://picsum.photos/seed/login/1200/1800";
  const isLoading = brandingLoading || tenantLoading;
  const isFormDisabled = isLoggingIn || !tenant || !tenant.enabled;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex">
        <div className="w-full lg:grid lg:grid-cols-3">
          <div className="hidden bg-muted lg:block relative lg:col-span-2">
            {isLoading ? (
                <Skeleton className="h-full w-full" />
            ) : (
                <Image
                    src={imageUrl}
                    alt="Login background"
                    fill
                    className="object-cover"
                    data-ai-hint="office building modern"
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
                    Sign in to tenant <span className="font-bold text-primary">{tenant?.name || tenantId}</span>
                </p>
              </div>

              {!tenant && !tenantLoading && (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Invalid Tenant</AlertTitle>
                  <AlertDescription>
                    The tenant ID "{tenantId}" does not exist. Please check the URL and try again.
                  </AlertDescription>
                </Alert>
              )}

              {tenant && !tenant.enabled && (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Account Disabled</AlertTitle>
                  <AlertDescription>
                    This tenant account is currently disabled. Please contact support.
                  </AlertDescription>
                </Alert>
              )}


              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="user@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isFormDisabled} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isFormDisabled} />
                </div>
                <Button type="submit" className="w-full" disabled={isFormDisabled}>
                  {isLoggingIn ? 'Signing In...' : 'Login'}
                </Button>
                <Button variant="link" size="sm" asChild>
                    <Link href="/">Wrong Tenant ID?</Link>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
