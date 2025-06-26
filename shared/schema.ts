import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  roomName: text("room_name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  participantCount: integer("participant_count").default(0).notNull(),
});

export const transcriptionSessions = pgTable("transcription_sessions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id),
  provider: text("provider").notNull(), // 'deepgram' | 'elevenlabs'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  roomName: true,
});

export const insertTranscriptionSessionSchema = createInsertSchema(transcriptionSessions).pick({
  meetingId: true,
  provider: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertTranscriptionSession = z.infer<typeof insertTranscriptionSessionSchema>;
export type TranscriptionSession = typeof transcriptionSessions.$inferSelect;