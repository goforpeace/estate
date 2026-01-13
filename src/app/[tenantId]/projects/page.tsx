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
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Matches the Project entity in backend.json
type Project = {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  targetSell: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  expectedHandoverDate: string; // Stored as ISO string
};

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  location: z.string().min(1, "Location is required."),
  targetSell: z.coerce.number().min(0, "Target sell must be a positive number."),
  status: z.enum(["Ongoing", "Upcoming", "Completed"]),
  expectedHandoverDate: z.date({
    required_error: "A handover date is required.",
  }),
});

type ProjectFormData = z.infer<typeof projectSchema>;

function AddProjectForm({ tenantId, onFinished }: { tenantId: string; onFinished: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      location: "",
      targetSell: 0,
      status: "Upcoming",
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    const projectsCollection = collection(firestore, `tenants/${tenantId}/projects`);
    const newProject = {
      ...data,
      tenantId: tenantId,
      expectedHandoverDate: data.expectedHandoverDate.toISOString(),
    };

    addDocumentNonBlocking(projectsCollection, newProject);
    
    toast({
      title: "Project Added",
      description: `${data.name} has been successfully added.`,
    });

    onFinished();
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormItem className="flex flex-col">
              <FormLabel>Expected Handover Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date("1990-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Add Project</Button>
      </form>
    </Form>
  );
}


export default function ProjectsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const firestore = useFirestore();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/projects`);
  }, [firestore, tenantId]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

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
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
             <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Project</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new project for your tenant.
              </DialogDescription>
            </DialogHeader>
            <AddProjectForm tenantId={tenantId} onFinished={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
