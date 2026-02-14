import { blob, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const databaseBackups = sqliteTable("databaseBackups", {
  id: int().primaryKey(),
  timestamp: int().notNull(),
  blobKey: text().notNull(),
  hash: text(),
}, (t) => [
  uniqueIndex("uniqueBlobKey").on(t.blobKey),
]);

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

export const userActiveLog = sqliteTable("userActiveLog", {
  id: int().primaryKey(),
  userId: int().references(() => users.id).notNull(),
  date: text().notNull(),
}, (t) => [
  uniqueIndex("uniqueUserDate").on(t.userId, t.date),
]);

export const todoItems = sqliteTable("todoItems", {
  id: int().primaryKey(),
  userId: int().references(() => users.id).notNull(),
  text: text().notNull(),
  completed: int().default(0).notNull(),
  createdAt: text().notNull(),
});

export const backupTables = {
  users,
  camProgresses,
  userActiveLog,
  todoItems,
}
