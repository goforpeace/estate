
'use client';

import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn, useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AppFooter } from '@/components/layout/footer';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@estateflow.com');
  const [password, setPassword] = useState('password');

  useEffect(() => {
    // If the user is already logged in, redirect them to the dashboard.
    if (!isUserLoading && user) {
      router.push('/gopon/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Firebase authentication is not available.",
        });
        return;
    }
    // Attempt to sign in with the provided credentials.
    initiateEmailSignIn(auth, email, password);
    // The useEffect hook will handle redirection upon successful login.
    // We can show a toast to inform the user that login is in progress.
    toast({
        title: "Signing In...",
        description: "Please wait while we verify your credentials.",
    });
  };
  
  // Do not render the login form if we are still checking the user's auth state or if they are logged in.
  if (isUserLoading || user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-t-4 border-destructive">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle className="font-headline text-3xl">Admin Panel</CardTitle>
              <CardDescription>EstateFlow Tenant Management</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-headline">Admin Email</Label>
                  <Input id="email" type="email" placeholder="admin@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full font-headline">Login</Button>
                <Button variant="link" size="sm" asChild>
                  <Link href="/">Back to Tenant Portal</Link>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
