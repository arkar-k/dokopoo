import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function rankScore(distance_m, quality_score) {
  const distanceScore = Math.max(0, 1 - distance_m / 500);
  const qualityNorm = (quality_score || 5) / 10;
  return distanceScore * 0.4 + qualityNorm * 0.6;
}

async function enrichWithGeocode(toilet) {
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
          quality_score, average_rating, review_count,
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

    const ranked = results
      .map(t => ({
        ...t,
        distance_m: Math.round(t.distance_m),
        walk_time_min: Math.max(1, Math.round(t.distance_m / 80)),
        rank_score: rankScore(t.distance_m, t.quality_score)
      }))
      .sort((a, b) => b.rank_score - a.rank_score)
      .slice(0, 3);

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
}
