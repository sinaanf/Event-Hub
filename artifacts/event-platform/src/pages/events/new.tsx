import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/events/event-form";
import { useCreateEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

export default function EventNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent();

  const handleSubmit = (data: any) => {
    createEvent.mutate(
      { data },
      {
        onSuccess: (event) => {
          toast({ title: "Event created successfully" });
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setLocation(`/events/${event.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create event", variant: "destructive" });
        },
      }
    );
  };

  return (
    <MainLayout>
      <PageHeader 
        title="New Event" 
        description="Create a new event in the system."
      />
      <div className="p-8 max-w-4xl mx-auto w-full">
        <Card>
          <CardContent className="p-6">
            <EventForm onSubmit={handleSubmit} isSubmitting={createEvent.isPending} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
