import './env.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import path from 'path';
import * as blobClient from '@tigrisdata/storage';
import { db, schema } from './db/index.js';
import { DrizzleStore } from './drizzle-session-store.js';
import { and, eq, like, desc, max } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const app = express();
const port = process.env.PORT || 3000;

const BLOB_KEY_NOTES = 'notes.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  store: new DrizzleStore(),
}));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy for secure cookies
}

app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login.html');
  }
  res.redirect('/index.html');
});

const BACKUP_INTERVAL = 1000 * 60 * 60; // 1 hour
app.get('/api/cron', async (req, res) => {
  const { needsBackup, backupBlobKey, lastBackupHash, lastBackupBlobKey } =
    await db.transaction(async (tx) => {
      const lastBackupTs = await tx
        .select({
          timestamp: max(schema.databaseBackups.timestamp),
        })
        .from(schema.databaseBackups);
      const lastBackup = await tx
        .select()
        .from(schema.databaseBackups)
        .where(eq(schema.databaseBackups.timestamp, lastBackupTs[0]?.timestamp ?? 0));
      const lastBackupTime = lastBackup[0]?.timestamp || 0;

      const now = Date.now();
      const backupBlobKey = `backups/backup-${new Date(now).toISOString()}.json`;
      const needsBackup = now - lastBackupTime > BACKUP_INTERVAL;

      if (needsBackup) {
        await tx.insert(schema.databaseBackups).values({
          timestamp: now,
          blobKey: backupBlobKey,
        });
      }

      return {
        lastBackupHash: lastBackup[0]?.hash || null,
        lastBackupBlobKey: lastBackup[0]?.blobKey || null,
        backupBlobKey,
        needsBackup,
      };
    });

  if (needsBackup) {
    console.log(`Creating database backup: ${backupBlobKey}`);
    
    const backupData: Record<string, any[]> = {};

    for (const [tableName, table] of Object.entries(schema.backupTables)) {
      console.log(`Backing up table: ${tableName}`);
      const data = await db.select().from(table);
      console.log(`Rows backed up for ${tableName}:`, data.length);
      backupData[tableName] = data;
    }

    const data = JSON.stringify(backupData, null, 2);
    const dataHash = bcrypt.hashSync(data, 10);
    if (dataHash !== lastBackupHash) {
      console.log('Uploading backup to blob storage...');
      // Upload backup to blob storage
      await blobClient.put(backupBlobKey, data);
      // Update backup entry with hash
      await db.update(schema.databaseBackups)
        .set({ hash: dataHash })
        .where(eq(schema.databaseBackups.blobKey, backupBlobKey));
      console.log(`Database backed up to ${backupBlobKey}`);
    } else {
      // Delete current back entry
      await db
        .delete(schema.databaseBackups)
        .where(eq(schema.databaseBackups.blobKey, backupBlobKey));
      // Touch the existing backup to update timestamp
      await db
        .update(schema.databaseBackups)
        .set({ timestamp: Date.now() })
        .where(eq(schema.databaseBackups.blobKey, backupBlobKey));
      console.log('No changes since last backup, skipping upload');
    }
  }
  
  res.json({ success: true, needsBackup, backupBlobKey });
});

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function writeFile(filePath: string, data: string) {
  await blobClient.put(filePath, data);

  for (let i = 0; i < 5; i++) {
    try {
      const newData = await readFile(filePath);
      if (newData === data) return;
    } catch (err: any) {
      console.warn('Read after write failed, retrying...', err?.message);
    }
    await new Promise(res => setTimeout(res, 200));
  }

  throw new Error('Failed to verify written data after multiple attempts');
}

async function readFile(filePath: string) {
  const r = await blobClient.get(filePath, 'string');
  return r.data;
}

// Signup route
app.post('/signup', async (req, res) => {
  const { displayName, username, password } = req.body;

  // Validation
  if (!displayName || !username || !password) {
    return res.status(400).json({ error: 'Display name, username, and password are required' });
  }

  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 50) {
    return res.status(400).json({ error: 'Display name must be between 2 and 50 characters' });
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username.trim()));

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password with bcrypt and PASSWORD_SECRET
    const passwordSecret = process.env.PASSWORD_SECRET || '';
    const passwordHash = await bcrypt.hash(password + passwordSecret, 10);

    // Insert new user
    await db.insert(schema.users).values({
      username: username.trim(),
      passwordHash: passwordHash,
      displayName: trimmedDisplayName,
    });
    
    req.session.userId = username.trim();

    res.json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Find user in database
    const users = await db.select().from(schema.users).where(eq(schema.users.username, username));
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password with bcrypt
    const passwordSecret = process.env.PASSWORD_SECRET || '';
    const isValidPassword = await bcrypt.compare(password + passwordSecret, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Set session
    req.session.userId = user.id;

    res.json({ success: true, username: user.username, displayName: user.displayName });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Get current user info
app.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, req.session.userId!));

    if (!user[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user[0].id,
      username: user[0].username,
      displayName: user[0].displayName,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update current user info
app.put('/me', requireAuth, async (req, res) => {
  try {
    const { displayName } = req.body;

    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 50) {
      return res.status(400).json({ error: 'Display name must be between 2 and 50 characters' });
    }

    // Update in database
    await db
      .update(schema.users)
      .set({ displayName: trimmedDisplayName })
      .where(eq(schema.users.id, req.session.userId!));

    res.json({
      success: true,
      displayName: trimmedDisplayName
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

app.get('/progress', requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const progresses = await db
    .select()
    .from(schema.camProgresses)
    .where(eq(schema.camProgresses.userId, userId));

  const progressResult = {
    passages: {},
    parts: {},
    cellStates: {} as Record<string, boolean>,
  };

  const set = (path: string[], val: any, ptr: Record<string, any> = progressResult) => {
    if (path.length === 1) {
      ptr[path[0]!] = val;
      return;
    }
    if (ptr[path[0]!] === undefined) ptr[path[0]!] = {};
    return set(path.slice(1), val, ptr[path[0]!]);
  };

  for (const p of progresses) {
    const { cambridgeVersion, partName, testName, result, needReview } = p;
    const path = [
      partName.toLowerCase().includes("passage") ? "passages" : "parts",
      partName,
      cambridgeVersion,
      testName,
    ];
    set(path, result);

    progressResult.cellStates[path.slice(1).join("_")] = !!needReview;
  }

  return res.json(progressResult);
});

app.patch('/progress', requireAuth, async (req, res) => {
  const { cambridgeVersion, partName, testName, result, needReview } = req.body || {};
  const userId = req.session.userId!;
  
  await db.transaction(async (tx) => {
    const updateResult = await tx.update(schema.camProgresses)
      .set({ result, needReview })
      .where(and(
        eq(schema.camProgresses.userId, userId),
        eq(schema.camProgresses.partName, partName),
        eq(schema.camProgresses.testName, testName),
        eq(schema.camProgresses.cambridgeVersion, cambridgeVersion)
      ));

    if (updateResult.rowsAffected === 0) {
      await tx.insert(schema.camProgresses).values({
        cambridgeVersion,
        partName,
        testName,
        userId,
        result,
        needReview
      });
    }
  });

  res.json({ ok: true });
})

app.post('/feelings', requireAuth, async (req, res) => {
  const { timestamp, name, feeling } = req.body;
  
  if (!timestamp || !name || !feeling) {
    return res.status(400).json({ error: 'timestamp, name, and feeling are required' });
  }

  const date = new Date().toISOString().slice(0, 10);

  await db.insert(schema.feelingItems).values({
    userId: req.session.userId!,
    date,
    timestamp,
    feeling,
  });
  
  res.json({ ok: true });
});

app.patch('/feelings/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { feeling, isLoved } = req.body;

  const update: Partial<typeof schema.feelingItems.$inferInsert> = {};
  if (feeling !== undefined) update.feeling = feeling;
  if (isLoved !== undefined) update.isLoved = isLoved ? 1 : 0;
  
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'At least one of feeling or isLoved must be provided' });
  }

  await db
    .update(schema.feelingItems)
    .set(update)
    .where(
      and(
        eq(schema.feelingItems.id, Number(id)),
        eq(schema.feelingItems.userId, req.session.userId!),
      ),
    );

  res.json({ ok: true });
});

app.delete('/feelings/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  await db
    .delete(schema.feelingItems)
    .where(
      and(
        eq(schema.feelingItems.id, Number(id)),
        eq(schema.feelingItems.userId, req.session.userId!),
      ),
    );

  res.json({ ok: true });
});

app.get('/feelings', requireAuth, async (req, res) => {
  return res.json(
    await db
      .select()
      .from(schema.feelingItems)
      .where(eq(schema.feelingItems.userId, req.session.userId!))
      .orderBy(desc(schema.feelingItems.timestamp)),
  );
});

// Save notes
app.post('/notes', requireAuth, async (req, res) => {
  const { notes } = req.body;
  const data = { notes: notes || '', lastModified: new Date().toISOString() };
  const payload = JSON.stringify(data, null, 2);
  
  try {
    await writeFile(BLOB_KEY_NOTES, payload);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save notes:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Get notes
app.get('/notes', requireAuth, async (req, res) => {
  try {
    const data = await readFile(BLOB_KEY_NOTES);
    return res.json(JSON.parse(data ?? '{}'));
  } catch (err) {
    // Return empty notes if file doesn't exist yet
    return res.json({ notes: '', lastModified: null });
  }
});

app.post('/todos', requireAuth, async (req, res) => {
  const {text, completed} = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  await db.insert(schema.todoItems).values({
    userId: req.session.userId!,
    text,
    completed: completed ? 1 : 0,
    createdAt: new Date().toISOString(),
  });
  
  res.json({ ok: true });
});

app.patch('/todos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  if (!text && completed === undefined) {
    return res.status(400).json({ error: 'Text or completed status is required' });
  }

  const updateData: Partial<typeof schema.todoItems.$inferInsert> = {};
  if (text) updateData.text = text;
  if (completed !== undefined) updateData.completed = completed ? 1 : 0;

  const result = await db.update(schema.todoItems)
    .set(updateData)
    .where(and(
      eq(schema.todoItems.id, Number(id)),
      eq(schema.todoItems.userId, req.session.userId!)
    ));

  res.json({ ok: true, updated: result.rowsAffected });
});

app.delete('/todos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  await db.delete(schema.todoItems)
    .where(and(
      eq(schema.todoItems.id, Number(id)),
      eq(schema.todoItems.userId, req.session.userId!)
    ));
  res.json({ ok: true });
});

app.get('/todos', requireAuth, async (req, res) => {
  return res.json({
    todos: await db
      .select()
      .from(schema.todoItems)
      .where(eq(schema.todoItems.userId, req.session.userId!))
      .orderBy(desc(schema.todoItems.createdAt)),
  })
});

app.patch('/activity', requireAuth, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'activeDate is required' });

  await db.insert(schema.userActiveLog).values({
    userId: req.session.userId!,
    date: date,
  }).onConflictDoNothing();
  res.json({ success: true });
});

app.delete('/activity', requireAuth, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'activeDate is required' });

  await db.delete(schema.userActiveLog).where(and(
    eq(schema.userActiveLog.userId, req.session.userId!),
    eq(schema.userActiveLog.date, date)
  ));
  res.json({ success: true });
});

// Get activity data
app.get('/activity', requireAuth, async (req, res) => {
  let { month } = req.query; // format: YYYY-MM
  
  if (!month) {
    month = new Date().toISOString().slice(0, 7); // default to current month
  }
  
  const activeDays = await db
    .select()
    .from(schema.userActiveLog)
    .where(
      and(
        eq(schema.userActiveLog.userId, req.session.userId!),
        like(schema.userActiveLog.date, `${month}-%`),
      ),
    )
    .then((rows) => rows.map((r) => r.date));

  return res.json({ activeDays });
});

app.get("/backup", async (req, res) => {
  return res.json(
    await db
      .select({
        lastBackup: max(schema.databaseBackups.timestamp),
      })
      .from(schema.databaseBackups)
      .get(),
  );
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app;
