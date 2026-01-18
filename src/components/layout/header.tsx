'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

export function AppHeader({ tenantId }: { tenantId: string }) {
  const auth = useAuth();
  const router = useRouter();
  const [isSupportDialogOpen, setSupportDialogOpen] = useState(false);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push(`/${tenantId}/login`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://picsum.photos/seed/101/100/100" alt="User Avatar" data-ai-hint="person face" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block">My Account</span>
              <ChevronDown className="h-4 w-4 hidden sm:inline-block opacity-75" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSupportDialogOpen(true)}>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      
      <Dialog open={isSupportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support Information</DialogTitle>
            <DialogDescription className="pt-4">
              If you face any diffculties please reach us at +8809649-174632
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSupportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
