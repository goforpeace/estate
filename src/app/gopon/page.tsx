'use client';

import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@estateflow.com');
  const [password, setPassword] = useState('password');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would have a secure way to verify admin credentials.
    // For this demo, we'll use a hardcoded admin email.
    if (email === 'admin@estateflow.com') {
      initiateEmailSignIn(auth, email, password);
      router.push('/gopon/dashboard');
    } else {
        toast({
            variant: "destructive",
            title: "Admin Login Failed",
            description: "Invalid admin credentials provided.",
        });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                <Input id="email" type="email" placeholder="admin@estateflow.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full font-headline">Login</Button>
               <Button variant="link" size="sm" asChild>
                <Link href="/">Back to Tenant Portal</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
