import "./env.js";

import { get } from "@tigrisdata/storage";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";

const MIGRATE_PROGRESS = false;
const MIGRATE_ACTIVITIES = false;
const MIGRATE_TODOS = true;

(async function () {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, "tuyet"));
  console.log("User:", user);

  const userId = user[0]!.id;

  if (MIGRATE_PROGRESS) {
    console.log("Migrating progress.json");

    const data = await get("progress.json", "string");
    const progress = JSON.parse(data.data || "{}");

    const existingProgress = await db
      .select()
      .from(schema.camProgresses)
      .where(eq(schema.camProgresses.userId, userId));

    const vals = [progress.parts, progress.passages].flatMap((data) => {
      const res: Omit<(typeof existingProgress)[number], "id">[] = [];

      for (const [partName, data2] of Object.entries(data as any)) {
        for (const [cambridgeVersion, data3] of Object.entries(data2 as any)) {
          for (const [testName, result] of Object.entries(data3 as any)) {
            res.push({
              userId,
              cambridgeVersion,
              partName,
              testName,
              result: result as string,
              needReview: Number(
                !!progress.cellStates[
                  `${partName}_${cambridgeVersion}_${testName}`
                ],
              ),
            });
          }
        }
      }

      return res;
    });
    const newVals = vals.filter(
      (val) =>
        !existingProgress.some(
          (existing) =>
            existing.cambridgeVersion === val.cambridgeVersion &&
            existing.partName === val.partName &&
            existing.testName === val.testName,
        ),
    );
    console.log("New progress entries to insert:", newVals.length);

    let i = 1;
    for (const val of newVals) {
      if (i === 1 || i % 50 === 0) {
        console.log(`Processing ${i}/${newVals.length}...`);
      }
      i++;
      await db.insert(schema.camProgresses).values(val);
    }
  } else {
    console.log("Skipping progress migration (MIGRATE_PROGRESS is false)");
  }

  if (MIGRATE_ACTIVITIES) {
    console.log("Migrating activity log");

    const activityData = await get("daybyday.json", "string");
    const activity = JSON.parse(activityData.data || "{}");
    console.log("Active days in progress:", activity.activeDays?.length || 0);

    for (const date of activity.activeDays || []) {
      await db
        .insert(schema.userActiveLog)
        .values({
          userId,
          date,
        })
        .onConflictDoNothing();
    }
  } else {
    console.log(
      "Skipping activity log migration (MIGRATE_ACTIVITIES is false)",
    );
  }

  if (MIGRATE_TODOS) {
    console.log("Migrating todo items");

    const todoData = await get("todo.json", "string");
    const existingTodos = await db
      .select()
      .from(schema.todoItems)
      .where(eq(schema.todoItems.userId, userId));
    console.log("Existing todo items:", existingTodos.length);

    const todos = (JSON.parse(todoData.data || "{}").todos || []).filter(
      (todo: any) =>
        !existingTodos.some(
          (existing) =>
            existing.text === todo.text &&
            existing.createdAt === todo.createdAt,
        ),
    );
    console.log("New todo items to insert:", todos.length);

    for (const todo of todos) {
      await db.insert(schema.todoItems).values({
        userId,
        text: todo.text,
        completed: todo.completed ? 1 : 0,
        createdAt: todo.createdAt || new Date().toISOString(),
      });
    }
  } else {
    console.log("Skipping todo items migration (MIGRATE_TODOS is false)");
  }

  console.log("Migration complete");
})();
