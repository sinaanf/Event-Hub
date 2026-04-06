import { Router, type IRouter } from "express";
import { eq, sql, ilike, and } from "drizzle-orm";
import { db, eventsTable, attendeesTable, sessionsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { status, search } = query.data;

  const conditions = [];
  if (status) conditions.push(eq(eventsTable.status, status));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));

  const events = await db.select().from(eventsTable).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(eventsTable.startDate);

  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      const [{ count: registeredCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(attendeesTable)
        .where(eq(attendeesTable.eventId, event.id));
      const [{ count: sessionCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sessionsTable)
        .where(eq(sessionsTable.eventId, event.id));
      return {
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        registeredCount,
        sessionCount,
      };
    })
  );

  res.json(eventsWithCounts);
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db.insert(eventsTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    status: parsed.data.status ?? "draft",
    maxAttendees: parsed.data.maxAttendees,
  }).returning();

  res.status(201).json({
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    registeredCount: 0,
    sessionCount: 0,
  });
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [{ count: registeredCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendeesTable)
    .where(eq(attendeesTable.eventId, event.id));
  const [{ count: sessionCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(eq(sessionsTable.eventId, event.id));

  res.json({
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    registeredCount,
    sessionCount,
  });
});

router.put("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.location != null) updateData.location = parsed.data.location;
  if (parsed.data.startDate != null) updateData.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate != null) updateData.endDate = new Date(parsed.data.endDate);
  if (parsed.data.status != null) updateData.status = parsed.data.status;
  if (parsed.data.maxAttendees != null) updateData.maxAttendees = parsed.data.maxAttendees;

  const [event] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, params.data.id)).returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [{ count: registeredCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendeesTable)
    .where(eq(attendeesTable.eventId, event.id));
  const [{ count: sessionCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(eq(sessionsTable.eventId, event.id));

  res.json({
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    registeredCount,
    sessionCount,
  });
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id)).returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
