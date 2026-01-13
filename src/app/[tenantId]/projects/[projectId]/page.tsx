'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building, Calendar, DollarSign, MapPin, Tag } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Matches the Project entity in backend.json
type Project = {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  targetSell: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  expectedHandoverDate: string; // Stored as ISO string
  flats: { name: string; sizeSft: number }[];
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const projectId = params.projectId as string;
  const firestore = useFirestore();

  const projectRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !projectId) return null;
    return doc(firestore, `tenants/${tenantId}/projects`, projectId);
  }, [firestore, tenantId, projectId]);

  const { data: project, isLoading, error } = useDoc<Project>(projectRef);

  const statusVariant = {
    Ongoing: "default",
    Upcoming: "secondary",
    Completed: "outline",
  } as const;

  if (isLoading) {
    return <div className="p-6">Loading project details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading project: {error.message}</div>;
  }

  if (!project) {
    return <div className="p-6">Project not found.</div>;
  }

  return (
    <>
      <PageHeader title={project.name} description={`Details for project ID: ${project.id}`}>
        <Button asChild variant="outline">
          <Link href={`/${tenantId}/projects`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{project.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Target Sell</p>
                <p className="font-medium">TK {project.targetSell.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-muted-foreground">Handover Date</p>
                <p className="font-medium">{new Date(project.expectedHandoverDate).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
             <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                        <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-muted-foreground">Total Flats</p>
                    <p className="font-medium">{project.flats?.length || 0}</p>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="font-headline">Flats in {project.name}</CardTitle>
                <CardDescription>A list of all the flats available in this project.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Flat Name/Number</TableHead>
                            <TableHead className="text-right">Size (sft)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {project.flats && project.flats.length > 0 ? (
                            project.flats.map((flat, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{flat.name}</TableCell>
                                    <TableCell className="text-right">{flat.sizeSft.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    No flats have been added to this project yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
