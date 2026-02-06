const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment from .env.local when present
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
} catch (e) {
  // dotenv is optional in environments where env vars are provided externally
}
let blobClient;
try {
  // Use Vercel Blob SDK when available and token is configured
  const { put, head } = require('@vercel/blob');
  blobClient = { put, head };
} catch (e) {
  console.warn('Vercel Blob SDK not available, falling back to file system storage.');
  console.warn(e);
  // fall back to file system when SDK is not available
  blobClient = null;
}

const app = express();
const port = process.env.PORT || 3000;

const BLOB_KEY_PROGRESS = 'progress.json';
const BLOB_KEY_FEELINGS = 'feelings.json';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.BLOB_TOKEN;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function writeFile(filePath, data) {
  await blobClient.put(filePath, data, {
    token: BLOB_TOKEN,
    contentType: 'application/json',
    access: 'public',
    allowOverwrite: true
  });

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
  const meta = await blobClient.head(filePath, { token: BLOB_TOKEN });
  const fetchFn = global.fetch || require('undici').fetch;
  const r = await fetchFn(meta.downloadUrl);
  const text = await r.text();
  return text;
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
