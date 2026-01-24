/**
 * Calculate quality score from toilet metadata.
 * Used when seeding data (no reviews yet).
 */
export function calculateQualityScore(toilet) {
  let score = 5.0;

  // Indoor locations are generally better maintained
  if (toilet.is_indoor) score += 2.0;

  // Venue type bonuses
  const venueBonus = {
    station: 2.0,
    mall: 2.5,
    department_store: 2.5,
    convenience_store: 1.0,
    park: 0.5,
    street: 0.0
  };
  score += venueBonus[toilet.venue_type] || 0;

  // Accessibility features suggest better maintenance
  if (toilet.is_accessible) score += 1.0;
  if (toilet.has_baby_change) score += 0.5;

  // Free is a slight positive
  if (toilet.is_free) score += 0.5;

  // Cap at 10
  return Math.min(score, 10.0);
}

/**
 * Rank toilets by combined distance and quality.
 * distance_m: distance in meters
 * quality_score: 0-10 score
 *
 * Returns a combined score where higher is better.
 */
export function rankScore(distance_m, quality_score) {
  // Normalize distance: 0m = 1.0, 500m = 0.0, >500m negative
  const distanceScore = Math.max(0, 1 - distance_m / 500);

  // Normalize quality: 0-10 → 0-1
  const qualityNorm = (quality_score || 5) / 10;

  // Weight: 40% distance, 60% quality
  return distanceScore * 0.4 + qualityNorm * 0.6;
}
