import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/page-header";
import { useListSpeakers, useCreateSpeaker, useUpdateSpeaker, useDeleteSpeaker, getListSpeakersQueryKey } from "@workspace/api-client-react";
import { Speaker, CreateSpeakerBody } from "@workspace/api-zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Edit, Trash2, Mail, Briefcase } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SpeakersList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: speakers, isLoading } = useListSpeakers();
  
  const filteredSpeakers = speakers?.filter(s => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return s.firstName.toLowerCase().includes(term) || 
           s.lastName.toLowerCase().includes(term) ||
           s.company?.toLowerCase().includes(term);
  });

  return (
    <MainLayout>
      <PageHeader 
        title="Speakers Directory" 
        description="Manage speakers for your events."
      >
        <SpeakerDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </PageHeader>
      
      <div className="p-8 space-y-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search speakers..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-muted"></div>
                  <div className="h-4 w-32 bg-muted rounded"></div>
                  <div className="h-3 w-24 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredSpeakers || filteredSpeakers.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-lg">
            <h3 className="text-lg font-medium">No speakers found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or add a new speaker.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSpeakers.map(speaker => (
              <SpeakerCard key={speaker.id} speaker={speaker} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteSpeaker = useDeleteSpeaker();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = () => {
    deleteSpeaker.mutate(
      { id: speaker.id },
      {
        onSuccess: () => {
          toast({ title: "Speaker deleted" });
          queryClient.invalidateQueries({ queryKey: getListSpeakersQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete speaker", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Card className="overflow-hidden group flex flex-col h-full hover:border-primary/50 transition-colors">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start w-full mb-4">
          <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
            <AvatarImage src={speaker.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {speaker.firstName[0]}{speaker.lastName[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <SpeakerDialog 
              speaker={speaker} 
              open={isEditOpen} 
              onOpenChange={setIsEditOpen} 
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Speaker</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {speaker.firstName} {speaker.lastName} from the directory?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="space-y-1 mb-4 flex-1">
          <h3 className="font-bold text-lg leading-tight">{speaker.firstName} {speaker.lastName}</h3>
          {(speaker.jobTitle || speaker.company) && (
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {[speaker.jobTitle, speaker.company].filter(Boolean).join(" at ")}
              </span>
            </p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">{speaker.email}</span>
          </p>
        </div>
        
        {speaker.bio && (
          <p className="text-sm text-muted-foreground/80 line-clamp-3 border-t pt-4 mt-auto">
            {speaker.bio}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const speakerSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

function SpeakerDialog({ 
  speaker, 
  open, 
  onOpenChange,
  trigger
}: { 
  speaker?: Speaker; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSpeaker = useCreateSpeaker();
  const updateSpeaker = useUpdateSpeaker();
  
  const isEditing = !!speaker;

  const form = useForm<z.infer<typeof speakerSchema>>({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      firstName: speaker?.firstName || "",
      lastName: speaker?.lastName || "",
      email: speaker?.email || "",
      company: speaker?.company || "",
      jobTitle: speaker?.jobTitle || "",
      bio: speaker?.bio || "",
      avatarUrl: speaker?.avatarUrl || "",
    },
  });

  const onSubmit = (data: z.infer<typeof speakerSchema>) => {
    const payload = {
      ...data,
      avatarUrl: data.avatarUrl || undefined,
    };

    if (isEditing) {
      updateSpeaker.mutate(
        { id: speaker.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Speaker updated" });
            queryClient.invalidateQueries({ queryKey: getListSpeakersQueryKey() });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to update speaker", variant: "destructive" })
        }
      );
    } else {
      createSpeaker.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Speaker created" });
            queryClient.invalidateQueries({ queryKey: getListSpeakersQueryKey() });
            onOpenChange(false);
            form.reset();
          },
          onError: () => toast({ title: "Failed to create speaker", variant: "destructive" })
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Speaker
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Speaker" : "Add New Speaker"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update speaker information." : "Add a new speaker to the directory."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="jobTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="avatarUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar URL (Optional)</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl><Textarea className="h-24" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createSpeaker.isPending || updateSpeaker.isPending}>
                {createSpeaker.isPending || updateSpeaker.isPending ? "Saving..." : "Save Speaker"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
