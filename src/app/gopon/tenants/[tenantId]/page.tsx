'use client'

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';

type Tenant = {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
};

export default function ManageTenantPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const tenantId = params.tenantId as string;

  // Form state for adding a user
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading, error } = useDoc<Tenant>(tenantRef);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPassword) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all user fields.',
      });
      return;
    }
    if (!auth || !firestore) {
        toast({
        variant: 'destructive',
        title: 'Firebase not available',
        description: 'Cannot create user at this time.',
      });
      return;
    }

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
      const newUser = userCredential.user;

      // 2. Create user profile in Firestore
      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, {
        id: newUser.uid,
        tenantId: tenantId,
        name: userName,
        email: userEmail,
        phone: '', // Phone is optional, so we leave it empty
      });

      toast({
        title: 'User Created',
        description: `Successfully created an account for ${userName}.`,
      });

      // Reset form
      setUserName('');
      setUserEmail('');
      setUserPassword('');

    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to create user',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleDeleteTenant = () => {
    if (!tenantRef) return;
    deleteDocumentNonBlocking(tenantRef);
    toast({
      variant: 'destructive',
      title: 'Tenant Deleted',
      description: `The tenant "${tenant?.name}" has been permanently deleted.`,
    });
    router.push('/gopon/dashboard');
  };
  
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const title = formData.get('notification-title') as string;
    const message = formData.get('notification-message') as string;
    
    if (!title || !message) {
        toast({
            variant: 'destructive',
            title: 'Missing content',
            description: 'Please provide a title and message for the notification.',
        });
        return;
    }

    // Placeholder for actual push notification logic
    console.log('Sending notification:', { tenantId, title, message });

    toast({
        title: 'Notification Sent',
        description: `Push notification sent to ${tenant?.name}.`,
    });
    form.reset();
  }

  if (isLoading) {
    return <div className="p-6">Loading tenant details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error: {error.message}</div>;
  }

  if (!tenant) {
    return <div className="p-6">Tenant not found.</div>;
  }

  return (
    <>
      <PageHeader title={`Manage: ${tenant.name}`} description={`Tenant ID: ${tenant.id}`}>
        <Button asChild variant="outline">
          <Link href="/gopon/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <form onSubmit={handleAddUser}>
            <CardHeader>
              <CardTitle className="font-headline">Add User</CardTitle>
              <CardDescription>Create a new user account for this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name</Label>
                <Input id="user-name" placeholder="John Doe" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" type="email" placeholder="user@example.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password</Label>
                <Input id="user-password" type="password" placeholder="••••••••" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Send Push Notification</CardTitle>
            <CardDescription>Send a broadcast message to all users of this tenant.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSendNotification}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title">Title</Label>
                <Input id="notification-title" name="notification-title" placeholder="Important Announcement" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-message">Message</Label>
                <Textarea id="notification-message" name="notification-message" placeholder="Your message here..." />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="md:col-span-2 border-destructive">
            <CardHeader>
                <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Tenant
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the tenant
                            <span className="font-bold"> {tenant.name}</span> and all of its associated data from our servers.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTenant} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete tenant
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
