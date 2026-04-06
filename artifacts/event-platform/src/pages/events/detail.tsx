import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/page-header";
import { 
  useGetEvent, 
  useGetEventAnalytics,
  useListEventSessions,
  useListEventAttendees,
  getGetEventQueryKey,
  getListEventSessionsQueryKey,
  getListEventAttendeesQueryKey,
  useDeleteEvent,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useRegisterAttendee,
  useUpdateAttendee,
  useDeleteAttendee,
  useListSpeakers
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { Users, Ticket, Activity, Edit, Trash2, Plus, ArrowLeft } from "lucide-react";
import { StatusBadge } from "./index";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useToast } from "@/hooks/use-toast";
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
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Session, Attendee } from "@workspace/api-zod";

export default function EventDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: event, isLoading: eventLoading } = useGetEvent(id, {
    query: { enabled: !!id, queryKey: getGetEventQueryKey(id) }
  });
  
  const deleteEvent = useDeleteEvent();

  const handleDelete = () => {
    deleteEvent.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Event deleted" });
          setLocation("/events");
        },
        onError: () => {
          toast({ title: "Failed to delete event", variant: "destructive" });
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="border-b border-border bg-card px-8 py-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/events")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/events/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Event
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the event
                  and all associated data including sessions and attendees.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {eventLoading ? (
        <div className="p-8 space-y-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : event ? (
        <div className="p-8 space-y-8 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
                <StatusBadge status={event.status} />
              </div>
              <p className="text-muted-foreground max-w-3xl">{event.description}</p>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <span>{event.registeredCount} / {event.maxAttendees} Attendees</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="attendees">Attendees</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <EventOverviewTab eventId={id} />
            </TabsContent>
            
            <TabsContent value="sessions">
              <EventSessionsTab eventId={id} />
            </TabsContent>
            
            <TabsContent value="attendees">
              <EventAttendeesTab eventId={id} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">Event not found</div>
      )}
    </MainLayout>
  );
}

function EventOverviewTab({ eventId }: { eventId: number }) {
  const { data: analytics, isLoading } = useGetEventAnalytics(eventId, {
    query: { enabled: !!eventId, queryKey: ["/api/events", eventId, "analytics"] } // custom key just for safety
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!analytics) {
    return <div className="text-center py-8 text-muted-foreground">No analytics data available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Registration Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{Math.round(analytics.registrationRate * 100)}%</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.sessionCount}</div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4 mt-4">
        <CardHeader>
          <CardTitle>Registrations Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.registrationsByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} tickFormatter={(val) => formatDate(val)} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelFormatter={(val) => formatDate(val as string)}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const sessionSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  speakerId: z.coerce.number().optional().nullable(),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  room: z.string().optional(),
  track: z.string().optional(),
});

function EventSessionsTab({ eventId }: { eventId: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useListEventSessions(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventSessionsQueryKey(eventId) }
  });

  const { data: speakers } = useListSpeakers();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      description: "",
      speakerId: null,
      startTime: "",
      endTime: "",
      room: "",
      track: "",
    }
  });

  const openCreateDialog = () => {
    setEditingSession(null);
    form.reset({
      title: "", description: "", speakerId: null, startTime: "", endTime: "", room: "", track: ""
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    form.reset({
      title: session.title,
      description: session.description || "",
      speakerId: session.speakerId || null,
      startTime: session.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : "",
      endTime: session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : "",
      room: session.room || "",
      track: session.track || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSession = (id: number) => {
    deleteSession.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) });
        toast({ title: "Session deleted" });
      }
    });
  };

  const onSubmit = (values: z.infer<typeof sessionSchema>) => {
    const payload = {
      ...values,
      eventId,
      speakerId: values.speakerId || undefined,
    };
    
    if (editingSession) {
      updateSession.mutate({ id: editingSession.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) });
          setIsDialogOpen(false);
          toast({ title: "Session updated" });
        }
      });
    } else {
      createSession.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) });
          setIsDialogOpen(false);
          toast({ title: "Session created" });
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Event Sessions</CardTitle>
          <CardDescription>Manage agenda and schedules</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSession ? "Edit Session" : "Add Session"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="room" render={({ field }) => (
                    <FormItem><FormLabel>Room</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="track" render={({ field }) => (
                    <FormItem><FormLabel>Track</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="speakerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speaker</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select speaker" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {speakers?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No sessions planned yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Speaker</TableHead>
                <TableHead>Room</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(session => (
                <TableRow key={session.id}>
                  <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </TableCell>
                  <TableCell className="font-medium">{session.title}</TableCell>
                  <TableCell>{session.speakerName || "TBA"}</TableCell>
                  <TableCell>{session.room || "TBA"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(session)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSession(session.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

const attendeeSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.enum(["registered", "confirmed", "cancelled", "attended"]).optional(),
});

function EventAttendeesTab({ eventId }: { eventId: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: attendees, isLoading } = useListEventAttendees(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventAttendeesQueryKey(eventId) }
  });

  const registerAttendee = useRegisterAttendee();
  const updateAttendee = useUpdateAttendee();
  const deleteAttendee = useDeleteAttendee();

  const form = useForm<z.infer<typeof attendeeSchema>>({
    resolver: zodResolver(attendeeSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", company: "", jobTitle: "", status: "registered"
    }
  });

  const openCreateDialog = () => {
    setEditingAttendee(null);
    form.reset({ firstName: "", lastName: "", email: "", company: "", jobTitle: "", status: "registered" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    form.reset({
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      company: attendee.company || "",
      jobTitle: attendee.jobTitle || "",
      status: attendee.status,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAttendee = (id: number) => {
    deleteAttendee.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
        toast({ title: "Attendee deleted" });
      }
    });
  };

  const onSubmit = (values: z.infer<typeof attendeeSchema>) => {
    if (editingAttendee) {
      updateAttendee.mutate({ id: editingAttendee.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
          setIsDialogOpen(false);
          toast({ title: "Attendee updated" });
        }
      });
    } else {
      registerAttendee.mutate({ data: { ...values, eventId } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
          setIsDialogOpen(false);
          toast({ title: "Attendee registered" });
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Attendees</CardTitle>
          <CardDescription>Manage registrations and check-ins</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Register Attendee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAttendee ? "Edit Attendee" : "Register Attendee"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                {editingAttendee && (
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="registered">Registered</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="attended">Attended</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !attendees || attendees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No attendees registered yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map(attendee => (
                <TableRow key={attendee.id}>
                  <TableCell>
                    <div className="font-medium">{attendee.firstName} {attendee.lastName}</div>
                    <div className="text-xs text-muted-foreground">{attendee.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{attendee.company || "-"}</div>
                    <div className="text-xs text-muted-foreground">{attendee.jobTitle}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={attendee.status === 'confirmed' ? 'default' : attendee.status === 'attended' ? 'secondary' : 'outline'} className="capitalize">
                      {attendee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(attendee.registeredAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(attendee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAttendee(attendee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

