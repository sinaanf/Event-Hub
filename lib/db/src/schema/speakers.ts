import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const speakersTable = pgTable("speakers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  company: text("company"),
  jobTitle: text("job_title"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSpeakerSchema = createInsertSchema(speakersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpeaker = z.infer<typeof insertSpeakerSchema>;
export type Speaker = typeof speakersTable.$inferSelect;
