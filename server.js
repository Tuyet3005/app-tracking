const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment from .env.local when present
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
} catch (e) {
  // dotenv is optional in environments where env vars are provided externally
}
const blobClient = require('@tigrisdata/storage');

const app = express();
const port = process.env.PORT || 3000;

const BLOB_KEY_PROGRESS = 'progress.json';
const BLOB_KEY_FEELINGS = 'feelings.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
