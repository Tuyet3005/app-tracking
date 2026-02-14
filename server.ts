// @ts-nocheck
import './env.js';
import express from 'express';
import session from 'express-session';
import path from 'path';
import * as blobClient from '@tigrisdata/storage';
import { db, schema } from './db/index.js';
import { DrizzleStore } from './drizzle-session-store.js';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const app = express();
const port = process.env.PORT || 3000;

const BLOB_KEY_PROGRESS = 'progress.json';
const BLOB_KEY_FEELINGS = 'feelings.json';
const BLOB_KEY_NOTES = 'notes.json';
const BLOB_KEY_TODOS = 'todo.json';
const BLOB_KEY_ACTIVITY = 'daybyday.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(import.meta.dirname, 'public'), {
  index: false,
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  },
  store: new DrizzleStore(),
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    if (req.path === '/' || req.path.endsWith('.html')) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function writeFile(filePath, data) {
  await blobClient.put(filePath, data);

  for (let i = 0; i < 5; i++) {
    try {
      const newData = await readFile(filePath);
      if (newData === data) return;
    } catch (err) {
      console.warn('Read after write failed, retrying...', err && err.message);
    }
    await new Promise(res => setTimeout(res, 200));
  }

  throw new Error('Failed to verify written data after multiple attempts');
}

async function readFile(filePath) {
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
    req.session.username = user.username;
    req.session.displayName = user.displayName;

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

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      username: req.session.username,
      displayName: req.session.displayName
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get current user info
app.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, req.session.userId));
    
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user[0].id,
      username: user[0].username,
      displayName: user[0].displayName
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
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
      .where(eq(schema.users.id, req.session.userId));

    // Update session
    req.session.displayName = trimmedDisplayName;

    res.json({
      success: true,
      displayName: trimmedDisplayName
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

// Return saved progress JSON (if any)
app.get('/progress', requireAuth, async (req, res) => {
  return res.send(await readFile(BLOB_KEY_PROGRESS));
});

// Save progress (overwrites existing file)
app.post('/progress', requireAuth, async (req, res) => {
  const body = req.body || {};
  const payload = JSON.stringify(body, null, 2);

  await writeFile(BLOB_KEY_PROGRESS, payload);

  res.json({ ok: true });
});

app.patch('/progress', requireAuth, async (req, res) => {
  const {cambridgeVersion, passageName, testName, result} = req.body || {};
  const userId = req.session.userId;

  await db.insert(schema.passagesProgresses).values({
    cambridgeVersion,
    passageName,
    testName,
    userId,
    result,
  }).onConflictDoUpdate({
    targetWhere: and(
      eq(schema.passagesProgresses.userId, userId),
      eq(schema.passagesProgresses.passageName, passageName),
      eq(schema.passagesProgresses.testName, testName),
      eq(schema.passagesProgresses.cambridgeVersion, cambridgeVersion)
    ),
    set: {
      result,
    }
  });

  res.json({ ok: true });
})

// Save a feeling
app.post('/feeling', requireAuth, async (req, res) => {
  const { date, name, feeling } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  // Read existing feelings
  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));

  const timestamp = new Date().toISOString();
  feelings.push({ date, name, feeling, timestamp });

  const payload = JSON.stringify(feelings, null, 2);
  await writeFile(BLOB_KEY_FEELINGS, payload);

  res.json({ ok: true, entry: { date, name, feeling, timestamp } });
});

// Delete a feeling by timestamp
app.delete('/feeling', requireAuth, async (req, res) => {
  const ts = (req.body && req.body.timestamp) || req.query.timestamp;
  if (!ts) return res.status(400).json({ error: 'timestamp is required' });

  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));
  const idx = feelings.findIndex(f => f.timestamp === ts);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  feelings.splice(idx, 1);
  const payload = JSON.stringify(feelings, null, 2);
  await writeFile(BLOB_KEY_FEELINGS, payload);

  res.json({ ok: true });
});

// Update love status for a feeling
app.post('/feeling/love', requireAuth, async (req, res) => {
  const { timestamp, loved } = req.body;
  if (!timestamp) return res.status(400).json({ error: 'timestamp is required' });

  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));
  const entry = feelings.find(f => f.timestamp === timestamp);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  entry.loved = loved;
  const payload = JSON.stringify(feelings, null, 2);
  await writeFile(BLOB_KEY_FEELINGS, payload);

  res.json({ ok: true, loved: entry.loved });
});

app.post('/feeling/edit', requireAuth, async (req, res) => {
  const { timestamp, feeling } = req.body;
  if (!timestamp) return res.status(400).json({ error: 'timestamp is required' });
  if (typeof feeling !== 'string') return res.status(400).json({ error: 'feeling is required' });

  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));
  const entry = feelings.find(f => f.timestamp === timestamp);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  entry.feeling = feeling;
  const payload = JSON.stringify(feelings, null, 2);
  await writeFile(BLOB_KEY_FEELINGS, payload);

  res.json({ ok: true, entry });
});

// Get feeling for a specific date
app.get('/feeling', requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));
  const entry = feelings.find(f => f.date === date);
  return res.json(entry || {});
});

// Get all feelings history
app.get('/feelings/history', requireAuth, async (req, res) => {
  return res.json(JSON.parse(await readFile(BLOB_KEY_FEELINGS)));
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
    return res.json(JSON.parse(data));
  } catch (err) {
    // Return empty notes if file doesn't exist yet
    return res.json({ notes: '', lastModified: null });
  }
});

// Save todos
app.post('/todos', requireAuth, async (req, res) => {
  const { todos } = req.body;
  console.log('Received todos to save:', todos);
  const data = { 
    todos: Array.isArray(todos) ? todos : [], 
    lastModified: new Date().toISOString() 
  };
  const payload = JSON.stringify(data, null, 2);
  
  try {
    await writeFile(BLOB_KEY_TODOS, payload);
    console.log('Todos saved successfully');
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save todos:', err);
    res.status(500).json({ error: 'Failed to save todos' });
  }
});

// Get todos
app.get('/todos', requireAuth, async (req, res) => {
  try {
    const data = await readFile(BLOB_KEY_TODOS);
    const parsed = JSON.parse(data);
    console.log('Loaded todos from storage:', parsed);
    return res.json(parsed);
  } catch (err) {
    console.log('No todos file found, returning empty array');
    // Return empty todos if file doesn't exist yet
    return res.json({ todos: [], lastModified: null });
  }
});

// Save activity data
app.post('/activity', requireAuth, async (req, res) => {
  try {
    const { activeDays } = req.body;
    const payload = {
      activeDays: activeDays || [],
      lastModified: new Date().toISOString()
    };
    console.log('Received activity data to save:', payload);
    await writeFile(BLOB_KEY_ACTIVITY, JSON.stringify(payload, null, 2));
    console.log('Activity data saved successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save activity data:', err);
    res.status(500).json({ error: 'Failed to save activity data' });
  }
});

// Get activity data
app.get('/activity', requireAuth, async (req, res) => {
  try {
    const data = await readFile(BLOB_KEY_ACTIVITY);
    const parsed = JSON.parse(data);
    console.log('Loaded activity data from storage:', parsed);
    return res.json(parsed);
  } catch (err) {
    console.log('No activity file found, returning empty array');
    return res.json({ activeDays: [], lastModified: null });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app;
