import { useState, useRef, useEffect } from 'react';

export default function ResultCards({ results, expanded, radiusUsed, onBack, onSelectIndex }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (onSelectIndex) onSelectIndex(currentIndex);
  }, [currentIndex]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < results.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  }

  function openNavigation(toilet) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  }

  const current = results[currentIndex];

  return (
    <div style={styles.container}>
      {expanded && (
        <div style={styles.expandedNotice}>
          Nothing within 500m — showing nearest at {radiusUsed}m
        </div>
      )}

      <div
        style={styles.cardArea}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={styles.card}>
          <div style={styles.photoPlaceholder}>
            <span style={styles.photoIcon}>📷</span>
            <span style={styles.photoText}>Photo coming soon</span>
          </div>

          <div style={styles.cardContent}>
            <div style={styles.cardHeader}>
              <span style={styles.rank}>#{currentIndex + 1}</span>
              <span style={styles.badge}>{current.venue_type}</span>
            </div>

            <h2 style={styles.name}>
              {current.name || 'Public Toilet'}
            </h2>

            {current.building_name && (
              <div style={styles.locationRow}>
                <span style={styles.locationIcon}>🏢</span>
                <span style={styles.locationText}>{current.building_name}</span>
              </div>
            )}

            {current.address && (
              <div style={styles.locationRow}>
                <span style={styles.locationIcon}>📍</span>
                <span style={styles.locationText}>{current.address}</span>
              </div>
            )}

            {current.floor_level && (
              <div style={styles.locationRow}>
                <span style={styles.locationIcon}>🪜</span>
                <span style={styles.locationText}>Floor {current.floor_level}</span>
              </div>
            )}

            <div style={styles.stats}>
              <div style={styles.stat}>
                <span style={styles.statValue}>{current.distance_m}m</span>
                <span style={styles.statLabel}>distance</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{current.walk_time_min} min</span>
                <span style={styles.statLabel}>walk</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{current.quality_score?.toFixed(1)}</span>
                <span style={styles.statLabel}>score</span>
              </div>
            </div>

            <div style={styles.tags}>
              {current.is_free && <span style={styles.tag}>FREE</span>}
              {current.is_accessible && <span style={styles.tag}>ACCESSIBLE</span>}
              {current.has_baby_change && <span style={styles.tag}>BABY CHANGE</span>}
              {current.is_gender_neutral && <span style={styles.tag}>GENDER NEUTRAL</span>}
            </div>

            <button style={styles.navButton} onClick={() => openNavigation(current)}>
              NAVIGATE
            </button>
          </div>
        </div>
      </div>

      <div style={styles.dots}>
        {results.map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              background: i === currentIndex ? 'var(--accent)' : 'var(--text-muted)'
            }}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>

      <div style={styles.footer}>
        <span style={styles.swipeHint}>
          {results.length > 1 ? 'Swipe for more options' : ''}
        </span>
        <button style={styles.backButton} onClick={onBack}>
          New Search
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    pointerEvents: 'auto'
  },
  expandedNotice: {
    background: '#2a2000',
    color: '#ffab00',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center'
  },
  cardArea: {
    width: '100%',
    touchAction: 'pan-y'
  },
  card: {
    background: 'var(--card)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  photoPlaceholder: {
    width: '100%',
    height: '120px',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  photoIcon: {
    fontSize: '28px',
    opacity: 0.5
  },
  photoText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  cardContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rank: {
    color: 'var(--accent)',
    fontSize: '14px',
    fontWeight: '800'
  },
  badge: {
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  name: {
    fontSize: '20px',
    fontWeight: '800',
    lineHeight: '1.2',
    margin: 0
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  locationIcon: {
    fontSize: '14px',
    flexShrink: 0
  },
  locationText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500',
    lineHeight: '1.3'
  },
  stats: {
    display: 'flex',
    gap: '24px',
    marginTop: '4px'
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '800'
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  tag: {
    background: 'rgba(0, 230, 118, 0.15)',
    color: 'var(--accent)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px'
  },
  navButton: {
    width: '100%',
    padding: '14px',
    background: 'var(--accent)',
    color: '#000',
    fontSize: '16px',
    fontWeight: '900',
    letterSpacing: '2px',
    borderRadius: '10px',
    marginTop: '4px'
  },
  dots: {
    display: 'flex',
    gap: '8px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  swipeHint: {
    color: 'var(--text-muted)',
    fontSize: '12px'
  },
  backButton: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'underline',
    padding: '8px'
  }
};
