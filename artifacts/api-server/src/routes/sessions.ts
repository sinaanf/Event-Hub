import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, speakersTable } from "@workspace/db";
import {
  ListEventSessionsParams,
  CreateSessionBody,
  UpdateSessionParams,
  UpdateSessionBody,
  DeleteSessionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:id/sessions", async (req, res): Promise<void> => {
  const params = ListEventSessionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessions = await db
    .select({
      id: sessionsTable.id,
      eventId: sessionsTable.eventId,
      speakerId: sessionsTable.speakerId,
      title: sessionsTable.title,
      description: sessionsTable.description,
      startTime: sessionsTable.startTime,
      endTime: sessionsTable.endTime,
      room: sessionsTable.room,
      track: sessionsTable.track,
      createdAt: sessionsTable.createdAt,
      speakerFirstName: speakersTable.firstName,
      speakerLastName: speakersTable.lastName,
    })
    .from(sessionsTable)
    .leftJoin(speakersTable, eq(sessionsTable.speakerId, speakersTable.id))
    .where(eq(sessionsTable.eventId, params.data.id))
    .orderBy(sessionsTable.startTime);

  res.json(
    sessions.map((s) => ({
      ...s,
      speakerName: s.speakerFirstName && s.speakerLastName
        ? `${s.speakerFirstName} ${s.speakerLastName}`
        : undefined,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.insert(sessionsTable).values({
    eventId: parsed.data.eventId,
    speakerId: parsed.data.speakerId,
    title: parsed.data.title,
    description: parsed.data.description,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
    room: parsed.data.room,
    track: parsed.data.track,
  }).returning();

  let speakerName: string | undefined;
  if (session.speakerId) {
    const [speaker] = await db.select().from(speakersTable).where(eq(speakersTable.id, session.speakerId));
    if (speaker) speakerName = `${speaker.firstName} ${speaker.lastName}`;
  }

  res.status(201).json({
    ...session,
    speakerName,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    createdAt: session.createdAt.toISOString(),
  });
});

router.put("/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.speakerId != null) updateData.speakerId = parsed.data.speakerId;
  if (parsed.data.startTime != null) updateData.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime != null) updateData.endTime = new Date(parsed.data.endTime);
  if (parsed.data.room != null) updateData.room = parsed.data.room;
  if (parsed.data.track != null) updateData.track = parsed.data.track;

  const [session] = await db.update(sessionsTable).set(updateData).where(eq(sessionsTable.id, params.data.id)).returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  let speakerName: string | undefined;
  if (session.speakerId) {
    const [speaker] = await db.select().from(speakersTable).where(eq(speakersTable.id, session.speakerId));
    if (speaker) speakerName = `${speaker.firstName} ${speaker.lastName}`;
  }

  res.json({
    ...session,
    speakerName,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    createdAt: session.createdAt.toISOString(),
  });
});

router.delete("/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.delete(sessionsTable).where(eq(sessionsTable.id, params.data.id)).returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
