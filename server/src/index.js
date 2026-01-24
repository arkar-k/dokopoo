import express from 'express';
import cors from 'cors';
import toiletRoutes from './routes/toilets.js';
import pool from './db/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/toilets', toiletRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database schema
async function initDB() {
  try {
    const schema = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf-8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Dokopoo API running on port ${PORT}`);
  });
});
