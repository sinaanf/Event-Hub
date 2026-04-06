import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/events/event-form";
import { useGetEvent, useUpdateEvent, getGetEventQueryKey, getListEventsQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventEdit() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: event, isLoading } = useGetEvent(id, {
    query: { enabled: !!id, queryKey: getGetEventQueryKey(id) }
  });
  
  const updateEvent = useUpdateEvent();

  const handleSubmit = (data: any) => {
    updateEvent.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast({ title: "Event updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setLocation(`/events/${id}`);
        },
        onError: () => {
          toast({ title: "Failed to update event", variant: "destructive" });
        },
      }
    );
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Edit Event" 
        description="Update event details and settings."
      />
      <div className="p-8 max-w-4xl mx-auto w-full">
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            ) : event ? (
              <EventForm initialData={event} onSubmit={handleSubmit} isSubmitting={updateEvent.isPending} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Event not found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
