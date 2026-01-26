import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query(
        'SELECT id, rating, comment, created_at FROM reviews WHERE toilet_id = $1 ORDER BY created_at DESC LIMIT 10',
        [id]
      );
      return res.json({ reviews: rows });
    } catch (err) {
      console.error('Error fetching reviews:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { fingerprint, rating, comment } = req.body;

    if (!fingerprint || (rating !== 0 && rating !== 1)) {
      return res.status(400).json({ error: 'fingerprint and rating (0 or 1) are required' });
    }

    if (comment && comment.length > 200) {
      return res.status(400).json({ error: 'Comment must be 200 characters or less' });
    }

    try {
      const existing = await pool.query(
        'SELECT id FROM reviews WHERE fingerprint = $1 AND toilet_id = $2',
        [fingerprint, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Already reviewed this toilet' });
      }

      const result = await pool.query(
        `INSERT INTO reviews (toilet_id, fingerprint, rating, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING id, rating, comment, created_at`,
        [id, fingerprint, rating, comment || null]
      );

      await pool.query(`
        UPDATE toilets SET
          review_count = (SELECT COUNT(*) FROM reviews WHERE toilet_id = $1),
          positive_percentage = COALESCE((SELECT ROUND(AVG(rating) * 100) FROM reviews WHERE toilet_id = $1), 0),
          updated_at = NOW()
        WHERE id = $1
      `, [id]);

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating review:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
