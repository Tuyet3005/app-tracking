import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: int().primaryKey(),
  username: text().unique().notNull(),
  passwordHash: text().notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  userId: int().references(() => users.id),
  cookies: text().notNull(),
  sessionData: text().notNull(),
  expiresAt: int().notNull(),
});

export const passagesProgresses = sqliteTable("passagesProgresses", {
  id: int().primaryKey(),
  userId: int().references(() => users.id).notNull(),
  cambridgeVersion: text().notNull(),
  passageName: text().notNull(),
  testName: text().notNull(),
  result: text().default("").notNull(),
  needReview: int().default(0).notNull(),
});