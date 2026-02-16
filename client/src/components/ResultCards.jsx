import { useState, useRef, useEffect } from 'react';
import ReviewModal from './ReviewModal';

const SWIPE_THRESHOLD = 50;  // min px to count as swipe
const TAP_TOLERANCE = 10;    // max px movement for a clean tap
const SWIPE_COOLDOWN = 300;  // ms to ignore taps after a swipe

export default function ResultCards({ results, expanded, radiusUsed, onBack, onSelectIndex }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);
  const lastSwipeTime = useRef(0);
  const mouseDown = useRef(false);

  useEffect(() => {
    if (onSelectIndex) onSelectIndex(currentIndex);
  }, [currentIndex]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = false;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
    const dx = Math.abs(touchEndX.current - touchStartX.current);
    if (dx > TAP_TOLERANCE) {
      isSwiping.current = true;
    }
  }

  function handleTouchEnd() {
    // Only process swipe if actual dragging movement was detected
    if (!isSwiping.current) return;

    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      lastSwipeTime.current = Date.now();
      if (diff > 0 && currentIndex < results.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  }

  function handleMouseDown(e) {
    mouseDown.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
    isSwiping.current = false;
  }

  function handleMouseMove(e) {
    if (!mouseDown.current) return;
    touchEndX.current = e.clientX;
    if (Math.abs(touchEndX.current - touchStartX.current) > TAP_TOLERANCE) {
      isSwiping.current = true;
    }
  }

  function handleMouseUp() {
    if (!mouseDown.current) return;
    mouseDown.current = false;
    handleTouchEnd();
  }

  function isSwipeActive() {
    return isSwiping.current || (Date.now() - lastSwipeTime.current < SWIPE_COOLDOWN);
  }

  function openNavigation(toilet) {
    if (isSwipeActive()) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  }

  const current = results[currentIndex];

  return (
    <div style={styles.container}>
      {/* Drag handle */}
      <div style={styles.handleBar}>
        <div style={styles.handle} />
      </div>

      {expanded && (
        <div style={styles.expandedNotice}>
          Showing nearest at {radiusUsed}m
        </div>
      )}

      <div
        style={styles.cardArea}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { mouseDown.current = false; }}
      >
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.headerLeft}>
              <span style={styles.rank}>#{currentIndex + 1}</span>
              <h2 style={styles.name}>{current.name || 'Public Toilet'}</h2>
            </div>
          </div>

          <div style={styles.locationInfo}>
            {current.building_name && (
              <span style={styles.locationText}>🏢 {current.building_name}</span>
            )}
            {current.address && (
              <span style={styles.locationText}>📍 {current.address}</span>
            )}
            {current.floor_level && (
              <span style={styles.locationText}>🪜 Floor {current.floor_level}</span>
            )}
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{current.distance_m}m</span>
              <span style={styles.statLabel}>away</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{current.walk_time_min}min</span>
              <span style={styles.statLabel}>walk</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{current.quality_score?.toFixed(1)}</span>
              <span style={styles.statLabel}>score</span>
            </div>
            {current.review_count > 0 && (
              <div style={styles.stat}>
                <span style={styles.statValue}>
                  {current.positive_percentage >= 50 ? '👍' : '👎'} {Math.round(current.positive_percentage)}%
                </span>
                <span style={styles.statLabel}>{current.review_count} reviews</span>
              </div>
            )}
          </div>

          <div style={styles.tags}>
            {current.is_free && <span style={styles.tag}>FREE</span>}
            {current.is_accessible && <span style={styles.tag}>♿</span>}
            {current.has_baby_change && <span style={styles.tag}>🍼</span>}
            {current.is_gender_neutral && <span style={styles.tag}>⚧</span>}
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.rateButton} onClick={() => { if (!isSwipeActive()) setShowReview(true); }}>
              RATE
            </button>
            <button style={styles.navButton} onClick={() => openNavigation(current)}>
              NAVIGATE
            </button>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.backButton} onClick={onBack}>
          ← New Search
        </button>
        <div style={styles.dots}>
          {results.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === currentIndex ? 'var(--accent)' : 'rgba(255,255,255,0.3)'
              }}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
        <span style={styles.swipeHint}>
          {results.length > 1 ? 'Swipe ←→' : ''}
        </span>
      </div>

      {showReview && (
        <ReviewModal
          key={current.id}
          toiletId={current.id}
          toiletName={current.name || 'Public Toilet'}
          onClose={() => setShowReview(false)}
          onSubmitted={() => setShowReview(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '33vh',
    minHeight: '220px',
    maxHeight: '280px',
    background: 'var(--card)',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    zIndex: 1000
  },
  handleBar: {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 0 6px'
  },
  handle: {
    width: '36px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '2px'
  },
  expandedNotice: {
    background: '#2a2000',
    color: '#ffab00',
    padding: '4px 12px',
    margin: '0 16px 6px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textAlign: 'center'
  },
  cardArea: {
    flex: 1,
    overflow: 'hidden',
    touchAction: 'pan-y',
    padding: '0 16px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0
  },
  rank: {
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: '800',
    flexShrink: 0
  },
  name: {
    fontSize: '16px',
    fontWeight: '700',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  locationInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 12px'
  },
  locationText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '800'
  },
  statLabel: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px'
  },
  tag: {
    background: 'rgba(0, 230, 118, 0.15)',
    color: 'var(--accent)',
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700'
  },
  buttonRow: {
    display: 'flex',
    gap: '8px'
  },
  rateButton: {
    padding: '10px 14px',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    borderRadius: '8px',
    border: '1px solid #444'
  },
  navButton: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--accent)',
    color: '#000',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '1px',
    borderRadius: '8px'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  backButton: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 0'
  },
  dots: {
    display: 'flex',
    gap: '6px'
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  swipeHint: {
    color: 'var(--text-muted)',
    fontSize: '11px'
  }
};
