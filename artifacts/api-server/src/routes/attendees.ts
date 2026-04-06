import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, attendeesTable } from "@workspace/db";
import {
  ListEventAttendeesParams,
  RegisterAttendeeBody,
  UpdateAttendeeParams,
  UpdateAttendeeBody,
  DeleteAttendeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:id/attendees", async (req, res): Promise<void> => {
  const params = ListEventAttendeesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const attendees = await db.select().from(attendeesTable).where(eq(attendeesTable.eventId, params.data.id)).orderBy(attendeesTable.registeredAt);

  res.json(
    attendees.map((a) => ({
      ...a,
      registeredAt: a.registeredAt.toISOString(),
    }))
  );
});

router.post("/attendees", async (req, res): Promise<void> => {
  const parsed = RegisterAttendeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [attendee] = await db.insert(attendeesTable).values({
    eventId: parsed.data.eventId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    company: parsed.data.company,
    jobTitle: parsed.data.jobTitle,
    status: "registered",
  }).returning();

  res.status(201).json({ ...attendee, registeredAt: attendee.registeredAt.toISOString() });
});

router.put("/attendees/:id", async (req, res): Promise<void> => {
  const params = UpdateAttendeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAttendeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [attendee] = await db.update(attendeesTable).set(parsed.data).where(eq(attendeesTable.id, params.data.id)).returning();
  if (!attendee) {
    res.status(404).json({ error: "Attendee not found" });
    return;
  }

  res.json({ ...attendee, registeredAt: attendee.registeredAt.toISOString() });
});

router.delete("/attendees/:id", async (req, res): Promise<void> => {
  const params = DeleteAttendeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [attendee] = await db.delete(attendeesTable).where(eq(attendeesTable.id, params.data.id)).returning();
  if (!attendee) {
    res.status(404).json({ error: "Attendee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
