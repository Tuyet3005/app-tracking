// @ts-nocheck
import './env';
import express from 'express';
import session from 'express-session';
import path from 'path';
import * as blobClient from '@tigrisdata/storage';
import { db, schema } from './db/index';
import { DrizzleStore } from './drizzle-session-store';
import { and, eq } from 'drizzle-orm';

const app = express();
const port = process.env.PORT || 3000;

const BLOB_KEY_PROGRESS = 'progress.json';
const BLOB_KEY_FEELINGS = 'feelings.json';
const BLOB_KEY_NOTES = 'notes.json';
const BLOB_KEY_TODOS = 'todo.json';
const BLOB_KEY_ACTIVITY = 'daybyday.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(import.meta.dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' },
  store: new DrizzleStore(),
}));

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

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

// Return saved progress JSON (if any)
app.get('/progress', async (req, res) => {
  return res.send(await readFile(BLOB_KEY_PROGRESS));
});

// Save progress (overwrites existing file)
app.post('/progress', async (req, res) => {
  const body = req.body || {};
  const payload = JSON.stringify(body, null, 2);

  await writeFile(BLOB_KEY_PROGRESS, payload);

  res.json({ ok: true });
});

app.patch('/progress', async (req, res) => {
  const {cambridgeVersion, passageName, testName, result} = req.body || {};
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
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
})

// Save a feeling
app.post('/feeling', async (req, res) => {
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
app.delete('/feeling', async (req, res) => {
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
app.post('/feeling/love', async (req, res) => {
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

app.post('/feeling/edit', async (req, res) => {
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
app.get('/feeling', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const feelings = JSON.parse(await readFile(BLOB_KEY_FEELINGS));
  const entry = feelings.find(f => f.date === date);
  return res.json(entry || {});
});

// Get all feelings history
app.get('/feelings/history', async (req, res) => {
  return res.json(JSON.parse(await readFile(BLOB_KEY_FEELINGS)));
});

// Save notes
app.post('/notes', async (req, res) => {
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
app.get('/notes', async (req, res) => {
  try {
    const data = await readFile(BLOB_KEY_NOTES);
    return res.json(JSON.parse(data));
  } catch (err) {
    // Return empty notes if file doesn't exist yet
    return res.json({ notes: '', lastModified: null });
  }
});

// Save todos
app.post('/todos', async (req, res) => {
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
app.get('/todos', async (req, res) => {
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
app.post('/activity', async (req, res) => {
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
app.get('/activity', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
