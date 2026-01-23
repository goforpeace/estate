'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useAuth, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, setDoc, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Save, Trash2, UserX, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoading } from '@/context/loading-context';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

// Matches the User entity in backend.json
type UserProfile = {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    phone?: string;
};

type TenantNotice = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
};

function TenantDetailsCard({ tenant, onSave }: { tenant: Tenant, onSave: (data: Partial<Omit<Tenant, 'id'>>) => Promise<boolean> }) {
    const [name, setName] = useState(tenant.name);
    const { isLoading: isActionInProgress } = useLoading();

    useEffect(() => {
        setName(tenant.name);
    }, [tenant]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name });
    };

    return (
        <Card>
            <form onSubmit={handleSave}>
                <CardHeader>
                    <CardTitle className="font-headline">Tenant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tenant-name">Tenant Name</Label>
                        <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tenant-domain">Domain (Login ID)</Label>
                        <Input id="tenant-domain" value={tenant.id} disabled />
                         <p className="text-xs text-muted-foreground">The Login ID cannot be changed after creation.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isActionInProgress}><Save className="mr-2 h-4 w-4" /> Save Details</Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function ContactPersonCard({ tenant, onSave }: { tenant: Tenant, onSave: (data: Partial<Tenant>) => Promise<boolean> }) {
    const [contactName, setContactName] = useState(tenant.contactName || '');
    const [contactEmail, setContactEmail] = useState(tenant.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(tenant.contactPhone || '');
    const { isLoading: isActionInProgress } = useLoading();
    
    useEffect(() => {
        setContactName(tenant.contactName || '');
        setContactEmail(tenant.contactEmail || '');
        setContactPhone(tenant.contactPhone || '');
    }, [tenant]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ contactName, contactEmail, contactPhone });
    };

    return (
         <Card>
            <form onSubmit={handleSave}>
                <CardHeader>
                    <CardTitle className="font-headline">Contact Person</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="contact-name">Contact Name</Label>
                        <Input id="contact-name" placeholder="John Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact-email">Contact Email</Label>
                        <Input id="contact-email" type="email" placeholder="john@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input id="contact-phone" placeholder="+123456789" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isActionInProgress}><Save className="mr-2 h-4 w-4" /> Save Contact</Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function TenantNoticesManager({ tenantId }: { tenantId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { showLoading, hideLoading, isLoading: isActionInProgress } = useLoading();
    const [newMessage, setNewMessage] = useState("");
    const [noticeToDelete, setNoticeToDelete] = useState<TenantNotice | null>(null);

    const noticesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `tenants/${tenantId}/notices`);
    }, [firestore, tenantId]);
    const { data: notices, isLoading: noticesLoading } = useCollection<TenantNotice>(noticesQuery);

    const sortedNotices = [...(notices || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleAddNotice = async () => {
        if (!firestore || !newMessage.trim()) {
            toast({ variant: "destructive", title: "Message is empty" });
            return;
        }
        showLoading("Adding notice...");
        try {
            const newNoticeRef = doc(collection(firestore, `tenants/${tenantId}/notices`));
            const noticeData = {
                id: newNoticeRef.id,
                message: newMessage,
                isActive: true,
                createdAt: new Date().toISOString(),
                tenantId: tenantId,
            };
            await setDocumentNonBlocking(newNoticeRef, noticeData, {});
            toast({ title: "Notice Added" });
            setNewMessage("");
        } catch (error) {
            console.error("Failed to add notice:", error);
            toast({ variant: "destructive", title: "Failed to add notice" });
        } finally {
            hideLoading();
        }
    };

    const handleToggleStatus = (notice: TenantNotice) => {
        if (!firestore) return;
        const noticeRef = doc(firestore, `tenants/${tenantId}/notices`, notice.id);
        updateDocumentNonBlocking(noticeRef, { isActive: !notice.isActive });
        toast({ title: `Notice ${!notice.isActive ? 'activated' : 'deactivated'}.` });
    };

    const handleDeleteNotice = async () => {
        if (!firestore || !noticeToDelete) return;
        showLoading("Deleting notice...");
        try {
            await deleteDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/notices`, noticeToDelete.id));
            toast({ variant: "destructive", title: "Notice Deleted" });
            setNoticeToDelete(null);
        } catch (error) {
            toast({ variant: "destructive", title: "Failed to delete notice" });
        } finally {
            hideLoading();
        }
    };

    return (
        <Card className="lg:col-span-2">
            <AlertDialog open={!!noticeToDelete} onOpenChange={(isOpen) => !isOpen && setNoticeToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this notice.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteNotice}>Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <CardHeader>
                <CardTitle className="font-headline">Tenant Notices</CardTitle>
                <CardDescription>Create notices that will appear on this tenant's dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Textarea placeholder="Type your notice here..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                    <p className="text-xs text-muted-foreground">HTML tags are supported for formatting (e.g., &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;).</p>
                </div>
                 <Button onClick={handleAddNotice} disabled={isActionInProgress || !newMessage.trim()}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Message</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {noticesLoading ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading notices...</TableCell></TableRow>
                        ) : sortedNotices.length > 0 ? (
                            sortedNotices.map((notice) => (
                                <TableRow key={notice.id}>
                                    <TableCell className="max-w-xs truncate">{notice.message}</TableCell>
                                    <TableCell>{format(new Date(notice.createdAt), 'dd MMM, yyyy')}</TableCell>
                                    <TableCell><Switch checked={notice.isActive} onCheckedChange={() => handleToggleStatus(notice)} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setNoticeToDelete(notice)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No notices found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function ManageTenantPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const tenantId = params.tenantId as string;
  const { showLoading, hideLoading, isLoading: isActionInProgress } = useLoading();

  // Form state for adding a user
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  
  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading, error } = useDoc<Tenant>(tenantRef);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
  }, [firestore, tenantId]);

  const { data: users, isLoading: isUsersLoading, error: usersError } = useCollection<UserProfile>(usersQuery);

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
    if (!auth || !firestore || !tenantId) {
        toast({
        variant: 'destructive',
        title: 'Firebase not available',
        description: 'Cannot create user at this time.',
      });
      return;
    }

    showLoading("Creating user...");
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
    } finally {
        hideLoading();
    }
  };
  
  const handleUpdateTenant = async (updateData: Partial<Tenant>) => {
    if (!tenantRef) return false;
    showLoading("Saving changes...");
    try {
        await updateDocumentNonBlocking(tenantRef, updateData);
        toast({
            title: "Tenant Updated",
            description: "The tenant information has been successfully updated.",
        });
        return true;
    } catch (error: any) {
        console.error("Error updating tenant:", error);
        toast({
            variant: 'destructive',
            title: 'Update failed',
            description: error.message || 'Could not save details.',
        });
        return false;
    } finally {
        hideLoading();
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenantRef) return;
    showLoading("Deleting tenant...");
    try {
        await deleteDocumentNonBlocking(tenantRef);
        toast({
          variant: 'destructive',
          title: 'Tenant Deleted',
          description: `The tenant "${tenant?.name}" has been permanently deleted.`,
        });
        router.push('/gopon/dashboard');
    } catch (error) {
        console.error("Failed to delete tenant:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete tenant.' });
    } finally {
        hideLoading();
    }
  };

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">User List</CardTitle>
                <CardDescription>Users associated with this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isUsersLoading && (
                             <TableRow>
                                <TableCell colSpan={3} className="text-center">Loading users...</TableCell>
                            </TableRow>
                        )}
                        {usersError && (
                             <TableRow>
                                <TableCell colSpan={3} className="text-center text-destructive">Error: {usersError.message}</TableCell>
                            </TableRow>
                        )}
                        {!isUsersLoading && users?.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-destructive" title="Remove User (not implemented)">
                                        <UserX className="h-4 w-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isUsersLoading && users?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">No users found for this tenant.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

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
              <Button type="submit" disabled={isActionInProgress}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardFooter>
          </form>
        </Card>

        <TenantNoticesManager tenantId={tenant.id} />

        <TenantDetailsCard tenant={tenant} onSave={handleUpdateTenant} />
        
        <ContactPersonCard tenant={tenant} onSave={handleUpdateTenant} />

        <Card className="lg:col-span-3 border-destructive">
            <CardHeader>
                <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isActionInProgress}>
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
