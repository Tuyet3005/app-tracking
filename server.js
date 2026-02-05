const express = require('express');
const path = require('path');
const fs = require('fs');
let blobClient;
try {
  // Use Vercel Blob SDK when available and token is configured
  const { put, head } = require('@vercel/blob');
  blobClient = { put, head };
} catch (e) {
  // fall back to file system when SDK is not available
  blobClient = null;
}

const app = express();
const port = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'progress.json');
const FEELINGS_FILE = path.join(__dirname, 'feelings.json');

const BLOB_KEY_PROGRESS = 'progress.json';
const BLOB_KEY_FEELINGS = 'feelings.json';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || process.env.BLOB_TOKEN;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

// Return saved progress JSON (if any)
app.get('/progress', async (req, res) => {
  // Prefer Vercel Blob when token + SDK are available
  if (blobClient && BLOB_TOKEN) {
    try {
      const meta = await blobClient.head(BLOB_KEY_PROGRESS, { token: BLOB_TOKEN });
      if (!meta || !meta.downloadUrl) return res.json({});
      const fetchFn = global.fetch || require('undici').fetch;
      const r = await fetchFn(meta.downloadUrl);
      if (!r.ok) return res.json({});
      const text = await r.text();
      const obj = text ? JSON.parse(text) : {};
      return res.json(obj);
    } catch (err) {
      // fall back to local file
      console.warn('Blob read failed, falling back to fs:', err && err.message);
    }
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json({});
      return res.status(500).json({ error: 'Failed to read data' });
    }
    try {
      const obj = JSON.parse(data);
      return res.json(obj);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid data file' });
    }
  });
});

// Save progress (overwrites existing file)
app.post('/progress', async (req, res) => {
  const body = req.body || {};
  const payload = JSON.stringify(body, null, 2);
  // Try to write to Vercel Blob first
  if (blobClient && BLOB_TOKEN) {
    try {
      await blobClient.put(BLOB_KEY_PROGRESS, payload, { token: BLOB_TOKEN, contentType: 'application/json' });
      return res.json({ ok: true });
    } catch (err) {
      console.warn('Blob write failed, falling back to fs:', err && err.message);
    }
  }

  fs.writeFile(DATA_FILE, payload, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save data' });
    res.json({ ok: true });
  });
});

// Save a feeling
app.post('/feeling', async (req, res) => {
  const { date, name, feeling } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  // Read existing feelings
  let feelings = [];
  if (blobClient && BLOB_TOKEN) {
    try {
      const meta = await blobClient.head(BLOB_KEY_FEELINGS, { token: BLOB_TOKEN });
      if (meta && meta.downloadUrl) {
        const fetchFn = global.fetch || require('undici').fetch;
        const r = await fetchFn(meta.downloadUrl);
        if (r.ok) {
          const text = await r.text();
          if (text) feelings = JSON.parse(text);
        }
      }
    } catch (err) {
      console.warn('Blob read failed, falling back to fs:', err && err.message);
    }
  } else {
    try {
      const raw = fs.readFileSync(FEELINGS_FILE, 'utf8');
      if (raw) feelings = JSON.parse(raw);
    } catch (e) {
      // ignore
    }
  }

  const timestamp = new Date().toISOString();
  feelings.push({ date, name, feeling, timestamp });

  const payload = JSON.stringify(feelings, null, 2);
  if (blobClient && BLOB_TOKEN) {
    try {
      await blobClient.put(BLOB_KEY_FEELINGS, payload, { token: BLOB_TOKEN, contentType: 'application/json' });
      return res.json({ ok: true });
    } catch (err) {
      console.warn('Blob write failed, falling back to fs:', err && err.message);
    }
  }

  fs.writeFile(FEELINGS_FILE, payload, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save feeling' });
    res.json({ ok: true });
  });
});

// Get feeling for a specific date
app.get('/feeling', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  // Try blob first
  if (blobClient && BLOB_TOKEN) {
    try {
      const meta = await blobClient.head(BLOB_KEY_FEELINGS, { token: BLOB_TOKEN });
      if (meta && meta.downloadUrl) {
        const fetchFn = global.fetch || require('undici').fetch;
        const r = await fetchFn(meta.downloadUrl);
        if (r.ok) {
          const text = await r.text();
          const feelings = text ? JSON.parse(text) : [];
          const entry = feelings.find(f => f.date === date);
          return res.json(entry || {});
        }
      }
    } catch (err) {
      console.warn('Blob read failed, falling back to fs:', err && err.message);
    }
  }

  fs.readFile(FEELINGS_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json({});
      return res.status(500).json({ error: 'Failed to read feelings' });
    }
    try {
      const feelings = JSON.parse(data);
      const entry = feelings.find(f => f.date === date);
      if (entry) {
        return res.json(entry);
      }
      res.json({});
    } catch (e) {
      res.status(500).json({ error: 'Invalid feelings file' });
    }
  });
});

// Get all feelings history
app.get('/feelings/history', async (req, res) => {
  if (blobClient && BLOB_TOKEN) {
    try {
      const meta = await blobClient.head(BLOB_KEY_FEELINGS, { token: BLOB_TOKEN });
      if (meta && meta.downloadUrl) {
        const fetchFn = global.fetch || require('undici').fetch;
        const r = await fetchFn(meta.downloadUrl);
        if (r.ok) {
          const text = await r.text();
          const feelings = text ? JSON.parse(text) : [];
          return res.json(feelings);
        }
      }
    } catch (err) {
      console.warn('Blob read failed, falling back to fs:', err && err.message);
    }
  }

  fs.readFile(FEELINGS_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json([]);
      return res.status(500).json({ error: 'Failed to read feelings' });
    }
    try {
      const feelings = JSON.parse(data);
      res.json(feelings);
    } catch (e) {
      res.status(500).json({ error: 'Invalid feelings file' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
