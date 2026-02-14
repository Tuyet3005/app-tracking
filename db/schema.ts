import { int, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: int().primaryKey(),
  username: text().unique().notNull(),
  passwordHash: text().notNull(),
  displayName: text().notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  userId: int().references(() => users.id),
  cookies: text().notNull(),
  sessionData: text().notNull(),
  expiresAt: int().notNull(),
});

export const camProgresses = sqliteTable(
  "camProgresses",
  {
    id: int().primaryKey(),
    userId: int()
      .references(() => users.id)
      .notNull(),
    cambridgeVersion: text().notNull(),
    partName: text().notNull(),
    testName: text().notNull(),
    result: text().default("").notNull(),
    needReview: int().default(0).notNull(),
  },
  (t) => [
    uniqueIndex("uniqueProgress").on(t.userId, t.cambridgeVersion, t.partName, t.testName),
  ],
);
