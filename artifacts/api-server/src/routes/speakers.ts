import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, speakersTable } from "@workspace/db";
import {
  CreateSpeakerBody,
  UpdateSpeakerParams,
  UpdateSpeakerBody,
  DeleteSpeakerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/speakers", async (_req, res): Promise<void> => {
  const speakers = await db.select().from(speakersTable).orderBy(speakersTable.lastName);
  res.json(
    speakers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

router.post("/speakers", async (req, res): Promise<void> => {
  const parsed = CreateSpeakerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [speaker] = await db.insert(speakersTable).values(parsed.data).returning();
  res.status(201).json({ ...speaker, createdAt: speaker.createdAt.toISOString() });
});

router.put("/speakers/:id", async (req, res): Promise<void> => {
  const params = UpdateSpeakerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSpeakerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [speaker] = await db.update(speakersTable).set(parsed.data).where(eq(speakersTable.id, params.data.id)).returning();
  if (!speaker) {
    res.status(404).json({ error: "Speaker not found" });
    return;
  }

  res.json({ ...speaker, createdAt: speaker.createdAt.toISOString() });
});

router.delete("/speakers/:id", async (req, res): Promise<void> => {
  const params = DeleteSpeakerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [speaker] = await db.delete(speakersTable).where(eq(speakersTable.id, params.data.id)).returning();
  if (!speaker) {
    res.status(404).json({ error: "Speaker not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
