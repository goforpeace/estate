'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

// Matches the Flat entity in backend.json but is nested here
const flatSchema = z.object({
  name: z.string().min(1, "Flat name is required."),
  sizeSft: z.coerce.number().min(1, "Size must be greater than 0."),
});

// Matches the Project entity in backend.json
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  location: z.string().min(1, "Location is required."),
  targetSell: z.coerce.number().min(0, "Target sell must be a positive number."),
  status: z.enum(["Ongoing", "Upcoming", "Completed"]),
  expectedHandoverDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid handover date is required.",
  }),
  flats: z.array(flatSchema).min(1, "At least one flat is required."),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type FlatFormData = z.infer<typeof flatSchema>;

// Matches the Project entity in backend.json
type Project = {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  targetSell: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  expectedHandoverDate: string; // Stored as ISO string
  flats: FlatFormData[];
};


function ProjectForm({ tenantId, onFinished, project }: { tenantId: string; onFinished: () => void; project?: Project }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const defaultValues = project ? {
      ...project,
      // Format the ISO string date back to 'yyyy-MM-dd' for the date input
      expectedHandoverDate: format(new Date(project.expectedHandoverDate), 'yyyy-MM-dd'),
  } : {
      name: "",
      location: "",
      targetSell: 0,
      status: "Upcoming" as const,
      flats: [],
      expectedHandoverDate: "",
  };

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "flats",
  });

  const [newFlatName, setNewFlatName] = useState("");
  const [newFlatSize, setNewFlatSize] = useState("");

  const handleAddFlat = () => {
    const size = parseFloat(newFlatSize);
    if (newFlatName.trim() && !isNaN(size) && size > 0) {
      append({ name: newFlatName, sizeSft: size });
      setNewFlatName("");
      setNewFlatSize("");
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Flat",
            description: "Please enter a valid name and size for the flat."
        })
    }
  };


  const onSubmit = (data: ProjectFormData) => {
    if (!firestore || !tenantId) return;

    const projectData = {
      ...data,
      tenantId: tenantId,
      // Convert the string date from the input into an ISO string for consistent storage
      expectedHandoverDate: new Date(data.expectedHandoverDate).toISOString(),
    };

    if (project) {
        // Update existing project
        const projectDocRef = doc(firestore, `tenants/${tenantId}/projects`, project.id);
        updateDocumentNonBlocking(projectDocRef, projectData);
         toast({
          title: "Project Updated",
          description: `${data.name} has been successfully updated.`,
        });
    } else {
        // Add new project
        const projectsCollection = collection(firestore, `tenants/${tenantId}/projects`);
        addDocumentNonBlocking(projectsCollection, projectData);
        toast({
          title: "Project Added",
          description: `${data.name} has been successfully added.`,
        });
    }

    onFinished();
    form.reset();
  };

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[70vh] p-1 pr-4">
          <div className="space-y-6 p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Emerald Heights" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Gulshan, Dhaka" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="targetSell"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Sell (TK)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="10000000" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select project status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="expectedHandoverDate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Expected Handover Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">Flats</h3>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                            <span className="font-mono text-sm">{index + 1}.</span>
                            <p className="flex-1 text-sm">
                                <span className="font-medium">{field.name}</span>
                                - {field.sizeSft} sft
                            </p>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {fields.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">No flats added yet.</p>}
                </div>
                <FormField
                    control={form.control}
                    name="flats"
                    render={() => (
                        <FormItem>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-end gap-2">
                    <div className="grid gap-1.5 flex-1">
                        <Label htmlFor="new-flat-name" className="text-xs">Flat Number/Name</Label>
                        <Input id="new-flat-name" placeholder="e.g., A1" value={newFlatName} onChange={(e) => setNewFlatName(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5 w-28">
                        <Label htmlFor="new-flat-size" className="text-xs">Size (sft)</Label>
                        <Input id="new-flat-size" type="number" placeholder="1250" value={newFlatSize} onChange={(e) => setNewFlatSize(e.target.value)} />
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddFlat}>Add Flat</Button>
                </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 pt-0 border-t">
          <Button type="submit" className="w-full mt-4">{project ? 'Save Changes' : 'Add Project'}</Button>
        </div>
      </form>
    </Form>
  );
}


export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>(undefined);
  const [deleteProject, setDeleteProject] = useState<Project | undefined>(undefined);


  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/projects`);
  }, [firestore, tenantId]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);
  
  const handleDelete = () => {
    if (!firestore || !deleteProject || !tenantId) return;
    const projectDoc = doc(firestore, `tenants/${tenantId}/projects`, deleteProject.id);
    deleteDocumentNonBlocking(projectDoc);
    toast({
        variant: "destructive",
        title: "Project Deleted",
        description: `Project "${deleteProject.name}" has been deleted.`,
    })
    setDeleteProject(undefined);
  }

  const statusVariant = {
    Ongoing: "default",
    Upcoming: "secondary",
    Completed: "outline",
  } as const;

  const hasProjects = useMemo(() => projects && projects.length > 0, [projects]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage your real estate projects."
      >
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1" onClick={() => setAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Add a New Project</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new project for your tenant.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm tenantId={tenantId} onFinished={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

       {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(isOpen) => !isOpen && setEditProject(undefined)}>
          <DialogContent className="max-w-2xl p-0">
              <DialogHeader className="p-6 pb-4">
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                  Update the details for &quot;{editProject?.name}&quot;.
              </DialogDescription>
              </DialogHeader>
              {editProject && <ProjectForm tenantId={tenantId} project={editProject} onFinished={() => setEditProject(undefined)} />}
          </DialogContent>
      </Dialog>
      
       {/* Delete Project Alert Dialog */}
      <AlertDialog open={!!deleteProject} onOpenChange={(isOpen) => !isOpen && setDeleteProject(undefined)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project
                <span className="font-bold"> &quot;{deleteProject?.name}&quot;</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flats</TableHead>
                <TableHead className="text-right">Target Sell (TK)</TableHead>
                <TableHead>Handover Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : hasProjects ? (
                projects?.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusVariant[project.status as keyof typeof statusVariant] || "default"
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.flats?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      {project.targetSell.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {new Date(project.expectedHandoverDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                             <Link href={`/${tenantId}/projects/${project.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditProject(project)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteProject(project)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
