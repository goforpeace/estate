'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

// Mock data has been removed. This should be an empty array.
// Data will be fetched from Firestore in a later step.
const projects: any[] = [];

export default function ProjectsPage() {
    
    const statusVariant = {
        Ongoing: 'default',
        Upcoming: 'secondary',
        Completed: 'outline',
    } as const;

    const hasProjects = useMemo(() => projects.length > 0, []);
    
  return (
    <>
      <PageHeader title="Projects" description="Manage your real estate projects.">
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Add Project
        </Button>
      </PageHeader>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target Sell (TK)</TableHead>
                <TableHead>Handover Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasProjects ? (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.location}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[project.status as keyof typeof statusVariant] || 'default'}>{project.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{project.targetSell.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{new Date(project.expectedHandoverDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No projects found. Get started by creating a new project.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
