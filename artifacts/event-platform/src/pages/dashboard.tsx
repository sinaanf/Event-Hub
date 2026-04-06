import { MainLayout } from "@/components/layout/main-layout";
import { PageHeader } from "@/components/page-header";
import { useGetDashboardStats, useGetRecentRegistrations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Calendar, Users, Activity, Ticket } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: registrations, isLoading: registrationsLoading } = useGetRecentRegistrations();

  return (
    <MainLayout>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your event activity and key metrics."
      />
      
      <div className="p-8 space-y-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Events" 
            value={stats?.totalEvents} 
            loading={statsLoading} 
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard 
            title="Active Events" 
            value={stats?.activeEvents} 
            loading={statsLoading} 
            icon={<Activity className="h-4 w-4 text-primary" />}
          />
          <StatCard 
            title="Total Attendees" 
            value={stats?.totalAttendees} 
            loading={statsLoading} 
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard 
            title="Total Sessions" 
            value={stats?.totalSessions} 
            loading={statsLoading} 
            icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Registrations by Month</CardTitle>
              <CardDescription>Registration activity over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.registrationsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                      <Tooltip 
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest attendee signups across all events</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {registrationsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {registrations?.map((reg) => (
                    <div key={reg.id} className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{reg.attendeeName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{reg.eventTitle}</p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(parseISO(reg.registeredAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                  {(!registrations || registrations.length === 0) && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No recent registrations.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function StatCard({ title, value, loading, icon }: { title: string; value?: number; loading: boolean; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold">{value?.toLocaleString() || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
