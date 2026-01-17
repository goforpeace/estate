'use client'

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLoading } from "@/context/loading-context";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

// --- Type Definition ---
type Notice = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
};

export default function NoticeBoardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { showLoading, hideLoading, isLoading: isActionLoading } = useLoading();
  
  const [newMessage, setNewMessage] = useState("");
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);

  // --- Data Fetching ---
  const noticesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'notices');
  }, [firestore]);
  const { data: notices, isLoading: noticesLoading } = useCollection<Notice>(noticesQuery);

  // --- Handlers ---
  const handleAddNotice = async () => {
    if (!firestore || !newMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Message is empty",
        description: "Please write a message for the notice.",
      });
      return;
    }

    showLoading("Adding notice...");
    try {
      const noticeData = {
        message: newMessage,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await addDocumentNonBlocking(collection(firestore, 'notices'), noticeData);
      toast({
        title: "Notice Added",
        description: "The new notice has been posted.",
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to add notice:", error);
      toast({
        variant: "destructive",
        title: "Failed to add notice",
        description: "An error occurred while posting the notice.",
      });
    } finally {
      hideLoading();
    }
  };

  const handleToggleStatus = (notice: Notice) => {
    if (!firestore) return;

    const noticeRef = doc(firestore, 'notices', notice.id);
    updateDocumentNonBlocking(noticeRef, { isActive: !notice.isActive })
      .then(() => {
        toast({
          title: "Status Updated",
          description: `Notice has been ${!notice.isActive ? 'activated' : 'deactivated'}.`,
        });
      })
      .catch((error) => {
        console.error("Failed to update status:", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update notice status.",
        });
      });
  };

  const handleDeleteNotice = async () => {
    if (!firestore || !noticeToDelete) return;
    
    showLoading("Deleting notice...");
    try {
        const noticeRef = doc(firestore, 'notices', noticeToDelete.id);
        await deleteDocumentNonBlocking(noticeRef);
        toast({
            variant: "destructive",
            title: "Notice Deleted",
            description: "The notice has been permanently removed.",
        });
        setNoticeToDelete(null);
    } catch (error) {
        console.error("Failed to delete notice:", error);
        toast({
            variant: "destructive",
            title: "Delete Failed",
            description: "Could not delete the notice.",
        });
    } finally {
        hideLoading();
    }
  };

  const sortedNotices = [...(notices || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <PageHeader title="Notice Board" description="Manage global announcements for all tenants." />
      
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
           <Card>
                <CardHeader>
                    <CardTitle>Notice History</CardTitle>
                    <CardDescription>A log of all past and present notices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Message</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {noticesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Loading notices...</TableCell>
                                </TableRow>
                            ) : sortedNotices.length > 0 ? (
                                sortedNotices.map((notice) => (
                                    <TableRow key={notice.id}>
                                        <TableCell className="max-w-sm truncate font-medium">{notice.message}</TableCell>
                                        <TableCell>{format(new Date(notice.createdAt), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={notice.isActive}
                                                onCheckedChange={() => handleToggleStatus(notice)}
                                                aria-label="Toggle notice status"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setNoticeToDelete(notice)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No notices found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
           </Card>
        </div>
        <div className="md:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Notice</CardTitle>
                    <CardDescription>Post a new announcement for all users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Type your notice here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={5}
                    />
                     <Button onClick={handleAddNotice} disabled={isActionLoading || !newMessage.trim()} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Post Notice
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <AlertDialog open={!!noticeToDelete} onOpenChange={(isOpen) => !isOpen && setNoticeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this notice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNotice} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    