const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'progress.json');
const FEELINGS_FILE = path.join(__dirname, 'feelings.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/echo', (req, res) => {
  const text = req.body.text || '';
  res.json({ text });
});

// Return saved progress JSON (if any)
app.get('/progress', (req, res) => {
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
app.post('/progress', (req, res) => {
  const body = req.body || {};
  fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save data' });
    res.json({ ok: true });
  });
});

// Save a feeling
app.post('/feeling', (req, res) => {
  const { date, name, feeling } = req.body;
  
  if (!date) return res.status(400).json({ error: 'Date is required' });
  
  fs.readFile(FEELINGS_FILE, 'utf8', (err, data) => {
    let feelings = [];
    if (!err && data) {
      try {
        feelings = JSON.parse(data);
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    
    // Find and update or add new entry
    const idx = feelings.findIndex(f => f.date === date && f.name === name);
    if (idx >= 0) {
      feelings[idx].feeling = feeling;
    } else {
      feelings.push({ date, name, feeling });
    }
    
    fs.writeFile(FEELINGS_FILE, JSON.stringify(feelings, null, 2), 'utf8', (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save feeling' });
      res.json({ ok: true });
    });
  });
});

// Get feeling for a specific date
app.get('/feeling', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  
  fs.readFile(FEELINGS_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json({});
      return res.status(500).json({ error: 'Failed to read feelings' });
    }
    
    try {
      const feelings = JSON.parse(data);
      // Return the first entry for this date (or most recent one)
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
app.get('/feelings/history', (req, res) => {
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
