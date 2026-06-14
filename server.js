const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const db = new sqlite3.Database('./shop.db');

db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    image_path TEXT,
    caption TEXT,
    description TEXT,
    timestamp INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

db.get("SELECT value FROM settings WHERE key = 'background'", (err, row) => {
  if (!row) {
    db.run("INSERT INTO settings (key, value) VALUES ('background', '')");
  }
});

app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/background', (req, res) => {
  db.get("SELECT value FROM settings WHERE key = 'background'", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ background: row ? row.value : '' });
  });
});

app.post('/api/products', (req, res) => {
  const { adminUser, adminPass, imageDataUrl, caption, description } = req.body;
  
  if (!((adminUser === 'kamonohashi' && adminPass === 'kamoSecret2025') ||
        (adminUser === 'med' && adminPass === 'medVault123'))) {
    return res.status(401).json({ error: 'Only kamonohashi and med can upload' });
  }
  
  if (!imageDataUrl || !caption) {
    return res.status(400).json({ error: 'Image and caption required' });
  }
  
  const id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
  
  db.run(
    "INSERT INTO products (id, image_path, caption, description, timestamp) VALUES (?, ?, ?, ?, ?)",
    [id, imageDataUrl, caption, description || '', Date.now()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: id });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { adminUser, adminPass } = req.body;
  
  if (!((adminUser === 'kamonohashi' && adminPass === 'kamoSecret2025') ||
        (adminUser === 'med' && adminPass === 'medVault123'))) {
    return res.status(401).json({ error: 'Only kamonohashi and med can delete' });
  }
  
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/background', (req, res) => {
  const { adminUser, adminPass, backgroundUrl } = req.body;
  
  if (!((adminUser === 'kamonohashi' && adminPass === 'kamoSecret2025') ||
        (adminUser === 'med' && adminPass === 'medVault123'))) {
    return res.status(401).json({ error: 'Only kamonohashi and med can change background' });
  }
  
  db.run("UPDATE settings SET value = ? WHERE key = 'background'", [backgroundUrl || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔐 Only kamonohashi & med can upload/delete/change background`);
});