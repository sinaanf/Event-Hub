import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, eventsTable, attendeesTable, sessionsTable, speakersTable } from "@workspace/db";
import { GetEventAnalyticsParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/dashboard", async (_req, res): Promise<void> => {
  const [totals] = await db.select({
    totalEvents: sql<number>`count(*)::int`,
  }).from(eventsTable);

  const [activeCount] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(eventsTable).where(eq(eventsTable.status, "published"));

  const [upcomingCount] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(eventsTable).where(eq(eventsTable.status, "published"));

  const [completedCount] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(eventsTable).where(eq(eventsTable.status, "completed"));

  const [attendeeTotals] = await db.select({
    total: sql<number>`count(*)::int`,
  }).from(attendeesTable);

  const [sessionTotals] = await db.select({
    total: sql<number>`count(*)::int`,
  }).from(sessionsTable);

  const eventIds = await db.select({ id: eventsTable.id }).from(eventsTable);
  let avgAttendance = 0;
  if (eventIds.length > 0) {
    const totalRegistrations = attendeeTotals.total ?? 0;
    avgAttendance = eventIds.length > 0 ? totalRegistrations / eventIds.length : 0;
  }

  const monthlyRegistrations = await db.execute<{ month: string; count: number }>(
    sql`SELECT to_char(registered_at, 'YYYY-MM') as month, count(*)::int as count
        FROM attendees
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6`
  );

  const statusBreakdown = await db.execute<{ status: string; count: number }>(
    sql`SELECT status, count(*)::int as count FROM events GROUP BY status`
  );

  res.json({
    totalEvents: totals.totalEvents ?? 0,
    activeEvents: activeCount.count ?? 0,
    totalAttendees: attendeeTotals.total ?? 0,
    totalSessions: sessionTotals.total ?? 0,
    upcomingEvents: upcomingCount.count ?? 0,
    completedEvents: completedCount.count ?? 0,
    averageAttendance: Math.round(avgAttendance * 10) / 10,
    registrationsByMonth: (monthlyRegistrations.rows ?? []).reverse(),
    eventsByStatus: statusBreakdown.rows ?? [],
  });
});

router.get("/analytics/events/:id", async (req, res): Promise<void> => {
  const params = GetEventAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(attendeesTable).where(eq(attendeesTable.eventId, params.data.id));
  const [{ confirmed }] = await db.select({ confirmed: sql<number>`count(*)::int` }).from(attendeesTable).where(sql`event_id = ${params.data.id} AND status = 'confirmed'`);
  const [{ cancelled }] = await db.select({ cancelled: sql<number>`count(*)::int` }).from(attendeesTable).where(sql`event_id = ${params.data.id} AND status = 'cancelled'`);
  const [{ attended }] = await db.select({ attended: sql<number>`count(*)::int` }).from(attendeesTable).where(sql`event_id = ${params.data.id} AND status = 'attended'`);
  const [{ sessionCount }] = await db.select({ sessionCount: sql<number>`count(*)::int` }).from(sessionsTable).where(eq(sessionsTable.eventId, params.data.id));
  const speakerIds = await db.select({ speakerId: sessionsTable.speakerId }).from(sessionsTable).where(eq(sessionsTable.eventId, params.data.id));
  const uniqueSpeakers = new Set(speakerIds.map((s) => s.speakerId).filter(Boolean)).size;

  const registrationsByDay = await db.execute<{ date: string; count: number }>(
    sql`SELECT to_char(registered_at, 'YYYY-MM-DD') as date, count(*)::int as count
        FROM attendees
        WHERE event_id = ${params.data.id}
        GROUP BY date
        ORDER BY date`
  );

  const registrationRate = event.maxAttendees > 0 ? (total / event.maxAttendees) * 100 : 0;

  res.json({
    eventId: event.id,
    title: event.title,
    registrationRate: Math.round(registrationRate * 10) / 10,
    confirmedCount: confirmed ?? 0,
    cancelledCount: cancelled ?? 0,
    attendedCount: attended ?? 0,
    sessionCount: sessionCount ?? 0,
    speakerCount: uniqueSpeakers,
    registrationsByDay: registrationsByDay.rows ?? [],
  });
});

router.get("/analytics/recent-registrations", async (_req, res): Promise<void> => {
  const recent = await db.execute<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    company: string;
    event_title: string;
    registered_at: string;
    status: string;
  }>(
    sql`SELECT a.id, a.first_name, a.last_name, a.email, a.company, e.title as event_title, a.registered_at, a.status
        FROM attendees a
        JOIN events e ON e.id = a.event_id
        ORDER BY a.registered_at DESC
        LIMIT 20`
  );

  res.json(
    (recent.rows ?? []).map((r) => ({
      id: r.id,
      attendeeName: `${r.first_name} ${r.last_name}`,
      attendeeEmail: r.email,
      company: r.company,
      eventTitle: r.event_title,
      registeredAt: r.registered_at,
      status: r.status,
    }))
  );
});

export default router;
