import { useState, useEffect } from 'react';

function getFingerprint() {
  let fp = localStorage.getItem('dokopoo_fp');
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem('dokopoo_fp', fp);
  }
  return fp;
}

export default function ReviewModal({ toiletId, toiletName, onClose, onSubmitted }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => onSubmitted(), 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  async function handleSubmit() {
    if (rating === null) return;
    setState('submitting');

    try {
      const res = await fetch(`/api/toilets/${toiletId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: getFingerprint(),
          rating,
          comment: comment.trim() || null
        })
      });

      if (res.status === 409) {
        setErrorMsg('You already reviewed this toilet');
        setState('error');
        return;
      }

      if (!res.ok) {
        setErrorMsg('Something went wrong');
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setErrorMsg('Could not connect to server');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.successText}>Thanks! :)</div>
          <div style={styles.successSub}>Your review has been saved.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>How was this toilet?</span>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.toiletName}>{toiletName}</div>

        <div style={styles.thumbs}>
          <button
            style={{
              ...styles.thumbButton,
              ...(rating === 0 ? styles.thumbDownSelected : {})
            }}
            onClick={() => setRating(0)}
          >
            <span style={styles.thumbEmoji}>👎</span>
            <span style={styles.thumbLabel}>Bad</span>
          </button>
          <button
            style={{
              ...styles.thumbButton,
              ...(rating === 1 ? styles.thumbUpSelected : {})
            }}
            onClick={() => setRating(1)}
          >
            <span style={styles.thumbEmoji}>👍</span>
            <span style={styles.thumbLabel}>Good</span>
          </button>
        </div>

        <div style={styles.commentWrapper}>
          <textarea
            style={styles.textarea}
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 200))}
            rows={3}
          />
          <span style={styles.charCount}>{comment.length}/200</span>
        </div>

        {state === 'error' && (
          <div style={styles.errorText}>{errorMsg}</div>
        )}

        <button
          style={{
            ...styles.submitButton,
            ...(rating === null || state === 'submitting' ? styles.submitDisabled : {})
          }}
          onClick={handleSubmit}
          disabled={rating === null || state === 'submitting'}
        >
          {state === 'submitting' ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modal: {
    background: 'var(--card)',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '18px',
    fontWeight: '800'
  },
  closeButton: {
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '20px',
    padding: '4px 8px'
  },
  toiletName: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    fontWeight: '500',
    marginTop: '-8px'
  },
  thumbs: {
    display: 'flex',
    gap: '12px'
  },
  thumbButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px',
    background: 'var(--surface)',
    borderRadius: '12px',
    border: '2px solid transparent',
    transition: 'all 0.15s ease'
  },
  thumbDownSelected: {
    background: 'rgba(255, 82, 82, 0.15)',
    borderColor: 'var(--danger)'
  },
  thumbUpSelected: {
    background: 'rgba(0, 230, 118, 0.15)',
    borderColor: 'var(--accent)'
  },
  thumbEmoji: {
    fontSize: '32px'
  },
  thumbLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-muted)'
  },
  commentWrapper: {
    position: 'relative'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid #333',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    boxSizing: 'border-box'
  },
  charCount: {
    position: 'absolute',
    bottom: '8px',
    right: '12px',
    fontSize: '11px',
    color: 'var(--text-muted)'
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'var(--accent)',
    color: '#000',
    fontSize: '16px',
    fontWeight: '900',
    letterSpacing: '2px',
    borderRadius: '10px'
  },
  submitDisabled: {
    opacity: 0.4,
    cursor: 'default'
  },
  successText: {
    fontSize: '28px',
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: '12px'
  },
  successSub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    paddingBottom: '12px'
  }
};
