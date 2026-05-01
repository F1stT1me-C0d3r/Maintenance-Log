const express = require('express');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Link the PostgreSQL plugin to this service in Railway.');
  process.exit(1);
}

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id         SERIAL PRIMARY KEY,
      data       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/log', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT data FROM entries ORDER BY created_at DESC');
    res.json(rows.map(r => JSON.parse(r.data)));
  } catch (err) { next(err); }
});

app.post('/api/log', async (req, res, next) => {
  try {
    await pool.query('INSERT INTO entries (data) VALUES ($1)', [JSON.stringify(req.body)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.put('/api/log', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM entries');
    for (const entry of req.body) {
      await client.query('INSERT INTO entries (data) VALUES ($1)', [JSON.stringify(entry)]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

init().then(() => app.listen(process.env.PORT || 3000, () => console.log('Server ready')));
