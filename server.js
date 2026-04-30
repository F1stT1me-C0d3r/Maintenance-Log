const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const LOG_FILE = path.join(__dirname, 'log.json');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/log', (req, res) => {
  const log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE)) : [];
  res.json(log);
});

app.post('/api/log', (req, res) => {
  const log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE)) : [];
  log.unshift(req.body);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  res.json({ ok: true });
});

app.put('/api/log', (req, res) => {
  fs.writeFileSync(LOG_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.listen(5500, '0.0.0.0', () => console.log('Server running at http://0.0.0.0:5500'));
