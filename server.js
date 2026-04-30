const express  = require('express');
const path     = require('path');
const Database = require('better-sqlite3');

const app = express();
const db  = new Database(path.join(__dirname, 'logs', 'log.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    data       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/log', (req, res) => {
  const rows = db.prepare('SELECT data FROM entries ORDER BY created_at DESC').all();
  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/log', (req, res) => {
  db.prepare('INSERT INTO entries (data) VALUES (?)').run(JSON.stringify(req.body));
  res.json({ ok: true });
});

app.put('/api/log', (req, res) => {
  const deleteAll  = db.prepare('DELETE FROM entries');
  const insertOne  = db.prepare('INSERT INTO entries (data) VALUES (?)');
  const replaceAll = db.transaction((entries) => {
    deleteAll.run();
    entries.forEach(entry => insertOne.run(JSON.stringify(entry)));
  });
  replaceAll(req.body);
  res.json({ ok: true });
});

app.listen(3000, '0.0.0.0', () => console.log('Server running at http://0.0.0.0:3000'));
