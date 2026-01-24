import { useState } from 'react';
import FindButton from './components/FindButton';
import ResultCards from './components/ResultCards';
import MapView from './components/MapView';

const API_BASE = '/api';

export default function App() {
  const [state, setState] = useState('idle'); // idle | loading | results | error
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [radiusUsed, setRadiusUsed] = useState(500);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  async function handleFind() {
    setState('loading');
    setError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      const res = await fetch(
        `${API_BASE}/toilets/nearby?lat=${latitude}&lng=${longitude}&radius=500`
      );

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      if (data.results.length === 0) {
        setError('No toilets found nearby. Try a different location.');
        setState('error');
        return;
      }

      setResults(data.results);
      setExpanded(data.expanded);
      setRadiusUsed(data.radius_used);
      setSelectedIndex(0);
      setState('results');
    } catch (err) {
      if (err.code === 1) {
        setError('Location permission denied. Please enable location access.');
      } else if (err.code === 2) {
        setError('Unable to determine your location.');
      } else if (err.code === 3) {
        setError('Location request timed out.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setState('error');
    }
  }

  function handleReset() {
    setState('idle');
    setResults(null);
    setError(null);
    setSelectedIndex(0);
  }

  return (
    <div style={styles.container}>
      <MapView
        userLocation={userLocation}
        results={state === 'results' ? results : null}
        selectedIndex={state === 'results' ? selectedIndex : null}
      />
      <div style={styles.overlay}>
        {state === 'idle' && <FindButton onFind={handleFind} />}
        {state === 'loading' && <LoadingView />}
        {state === 'results' && (
          <ResultCards
            results={results}
            expanded={expanded}
            radiusUsed={radiusUsed}
            onBack={handleReset}
            onSelectIndex={setSelectedIndex}
          />
        )}
        {state === 'error' && <ErrorView message={error} onRetry={handleFind} onBack={handleReset} />}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Finding nearby toilets...</p>
    </div>
  );
}

function ErrorView({ message, onRetry, onBack }) {
  return (
    <div style={styles.center}>
      <p style={styles.errorText}>{message}</p>
      <div style={styles.errorButtons}>
        <button style={styles.retryBtn} onClick={onRetry}>Try Again</button>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    height: '100%',
    width: '100%'
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '20px',
    paddingBottom: '40px',
    pointerEvents: 'none'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    pointerEvents: 'auto'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #333',
    borderTop: '4px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '16px'
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '18px',
    textAlign: 'center',
    maxWidth: '300px'
  },
  errorButtons: {
    display: 'flex',
    gap: '12px'
  },
  retryBtn: {
    padding: '12px 24px',
    background: 'var(--accent)',
    color: '#000',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '8px'
  },
  backBtn: {
    padding: '12px 24px',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px'
  }
};
