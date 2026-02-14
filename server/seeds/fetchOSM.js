import pool from '../src/db/index.js';
import { calculateQualityScore } from '../src/services/ranking.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tokyo 23 Wards (23区) bounding box
// Covers: Chiyoda, Chuo, Minato, Shinjuku, Bunkyo, Taito, Sumida, Koto,
// Shinagawa, Meguro, Ota, Setagaya, Shibuya, Nakano, Suginami, Toshima,
// Kita, Arakawa, Itabashi, Nerima, Adachi, Katsushika, Edogawa
const TOKYO_BBOX = {
  south: 35.53,  // Ota area
  west: 139.56,  // Setagaya/Suginami area
  north: 35.82,  // Adachi/Kita area
  east: 139.92   // Edogawa area
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = `
[out:json][timeout:300];
(
  node["amenity"="toilets"](${TOKYO_BBOX.south},${TOKYO_BBOX.west},${TOKYO_BBOX.north},${TOKYO_BBOX.east});
  way["amenity"="toilets"](${TOKYO_BBOX.south},${TOKYO_BBOX.west},${TOKYO_BBOX.north},${TOKYO_BBOX.east});
);
out center body;
`;

function parseVenueType(tags) {
  const location = (tags.location || '').toLowerCase();
  const building = (tags.building || '').toLowerCase();
  const operator = (tags.operator || '').toLowerCase();

  if (tags.railway || operator.includes('jr') || operator.includes('metro') || operator.includes('station')) {
    return 'station';
  }
  if (building.includes('retail') || building.includes('commercial') || tags.shop) {
    return 'mall';
  }
  if (location === 'indoor' || building) {
    return 'convenience_store';
  }
  if (tags.leisure === 'park' || tags.landuse === 'recreation_ground') {
    return 'park';
  }
  return 'street';
}

function parseTags(element) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;

  if (!lat || !lon) return null;

  const venueType = parseVenueType(tags);
  const isIndoor = venueType !== 'street' && venueType !== 'park';

  // Build address from addr:* tags
  const addressParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:postcode']
  ].filter(Boolean);
  const address = tags['addr:full'] || (addressParts.length > 0 ? addressParts.join(', ') : null);

  return {
    osm_id: element.id,
    name: tags.name || tags['name:en'] || null,
    description: tags.description || tags['description:en'] || null,
    latitude: lat,
    longitude: lon,
    is_free: tags.fee !== 'yes',
    is_accessible: tags.wheelchair === 'yes',
    has_baby_change: tags.changing_table === 'yes' || tags.diaper === 'yes',
    is_gender_neutral: tags.unisex === 'yes' || tags.gender === 'unisex',
    is_indoor: isIndoor,
    venue_type: venueType,
    building_name: tags['building:name'] || tags['name:building'] || null,
    address,
    floor_level: tags.level || tags['addr:floor'] || null,
    opening_hours: tags.opening_hours || null
  };
}

async function seed() {
  console.log('Fetching toilet data from OpenStreetMap Overpass API...');
  console.log(`Bounding box: ${JSON.stringify(TOKYO_BBOX)}`);

  // Initialize schema
  const schema = readFileSync(join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('Schema initialized.');

  // Fetch from Overpass
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const elements = data.elements || [];
  console.log(`Fetched ${elements.length} toilet entries from OSM.`);

  let inserted = 0;
  let skipped = 0;

  for (const element of elements) {
    const toilet = parseTags(element);
    if (!toilet) {
      skipped++;
      continue;
    }

    toilet.quality_score = calculateQualityScore(toilet);

    try {
      await pool.query(`
        INSERT INTO toilets (osm_id, name, description, latitude, longitude, geom,
          is_free, is_accessible, has_baby_change, is_gender_neutral,
          is_indoor, venue_type, building_name, address, floor_level,
          opening_hours, quality_score)
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326),
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (osm_id) DO UPDATE SET
          name = EXCLUDED.name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          geom = EXCLUDED.geom,
          is_free = EXCLUDED.is_free,
          is_accessible = EXCLUDED.is_accessible,
          has_baby_change = EXCLUDED.has_baby_change,
          is_gender_neutral = EXCLUDED.is_gender_neutral,
          is_indoor = EXCLUDED.is_indoor,
          venue_type = EXCLUDED.venue_type,
          building_name = EXCLUDED.building_name,
          address = EXCLUDED.address,
          floor_level = EXCLUDED.floor_level,
          opening_hours = EXCLUDED.opening_hours,
          quality_score = EXCLUDED.quality_score,
          updated_at = NOW()
      `, [
        toilet.osm_id, toilet.name, toilet.description,
        toilet.latitude, toilet.longitude,
        toilet.longitude, toilet.latitude,
        toilet.is_free, toilet.is_accessible, toilet.has_baby_change,
        toilet.is_gender_neutral, toilet.is_indoor, toilet.venue_type,
        toilet.building_name, toilet.address, toilet.floor_level,
        toilet.opening_hours, toilet.quality_score
      ]);
      inserted++;
    } catch (err) {
      console.error(`Error inserting OSM ID ${toilet.osm_id}:`, err.message);
      skipped++;
    }
  }

  console.log(`Done. Inserted/updated: ${inserted}, Skipped: ${skipped}`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
