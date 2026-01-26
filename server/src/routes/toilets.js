import { Router } from 'express';
import pool from '../db/index.js';
import { rankScore } from '../services/ranking.js';

const router = Router();

async function enrichWithGeocode(toilet) {
  // Skip if already has address data cached
  if (toilet.address && toilet.building_name) return toilet;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${toilet.latitude}&lon=${toilet.longitude}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'Dokopoo/1.0' } }
    );

    if (!res.ok) return toilet;

    const data = await res.json();
    const addr = data.address || {};

    const buildingName = !toilet.building_name
      ? (data.name || addr.building || addr.amenity || addr.shop || addr.leisure || null)
      : toilet.building_name;

    const addressParts = [
      addr.house_number,
      addr.road,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town
    ].filter(Boolean);
    const address = !toilet.address && addressParts.length > 0
      ? addressParts.join(', ')
      : toilet.address;

    // Cache in database
    if (buildingName || address) {
      pool.query(
        'UPDATE toilets SET building_name = COALESCE($1, building_name), address = COALESCE($2, address), updated_at = NOW() WHERE id = $3',
        [buildingName, address, toilet.id]
      ).catch(() => {});
    }

    return { ...toilet, building_name: buildingName, address };
  } catch {
    return toilet;
  }
}

/**
 * GET /api/toilets/nearby?lat=...&lng=...&radius=500
 * Returns top 5 toilets ranked by distance + quality.
 * Auto-expands radius if no results found within initial radius.
 */
router.get('/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  let radius = parseInt(req.query.radius) || 500;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    let results = [];
    let expanded = false;
    const maxRadius = 2000;

    while (results.length === 0 && radius <= maxRadius) {
      const query = `
        SELECT
          id, name, description, latitude, longitude,
          is_free, is_accessible, has_baby_change, is_gender_neutral,
          is_indoor, venue_type, building_name, address, floor_level,
          opening_hours, status,
          quality_score, positive_percentage, review_count,
          ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_m
        FROM toilets
        WHERE status = 'open'
          AND ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY distance_m
        LIMIT 20
      `;

      const { rows } = await pool.query(query, [longitude, latitude, radius]);
      results = rows;

      if (results.length === 0) {
        expanded = true;
        radius += 500;
      }
    }

    // Rank by combined score
    const ranked = results
      .map(t => ({
        ...t,
        distance_m: Math.round(t.distance_m),
        walk_time_min: Math.max(1, Math.round(t.distance_m / 80)),
        rank_score: rankScore(t.distance_m, t.quality_score, t.positive_percentage, t.review_count)
      }))
      .sort((a, b) => b.rank_score - a.rank_score)
      .slice(0, 5);

    // Reverse geocode toilets missing address/building info
    const enriched = await Promise.all(ranked.map(t => enrichWithGeocode(t)));

    res.json({
      results: enriched,
      radius_used: radius,
      expanded
    });
  } catch (err) {
    console.error('Error querying toilets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/toilets/:id
 * Get a single toilet with its reviews.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const toiletResult = await pool.query(
      'SELECT * FROM toilets WHERE id = $1',
      [id]
    );

    if (toiletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Toilet not found' });
    }

    const reviewsResult = await pool.query(
      'SELECT id, rating, comment, created_at FROM reviews WHERE toilet_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    res.json({
      toilet: toiletResult.rows[0],
      reviews: reviewsResult.rows
    });
  } catch (err) {
    console.error('Error fetching toilet:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/toilets/:id/reviews
 * Submit a thumbs up/down review with optional comment.
 */
router.post('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { fingerprint, rating, comment } = req.body;

  if (!fingerprint || (rating !== 0 && rating !== 1)) {
    return res.status(400).json({ error: 'fingerprint and rating (0 or 1) are required' });
  }

  if (comment && comment.length > 200) {
    return res.status(400).json({ error: 'Comment must be 200 characters or less' });
  }

  try {
    // Check if this fingerprint already reviewed this toilet
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

    // Update toilet aggregates
    await pool.query(`
      UPDATE toilets SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE toilet_id = $1),
        positive_percentage = COALESCE((SELECT ROUND(AVG(rating) * 100) FROM reviews WHERE toilet_id = $1), 0),
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
