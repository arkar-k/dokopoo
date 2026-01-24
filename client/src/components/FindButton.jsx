export default function FindButton({ onFind }) {
  return (
    <div style={styles.wrapper}>
      <button style={styles.button} onClick={onFind}>
        <span style={styles.icon}>&#x1F6BD;</span>
        <span style={styles.text}>FIND TOILET</span>
      </button>
      <p style={styles.brand}>dokopoo</p>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    pointerEvents: 'auto'
  },
  button: {
    width: '220px',
    height: '220px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 0 60px rgba(0, 230, 118, 0.3)',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    WebkitTapHighlightColor: 'transparent'
  },
  icon: {
    fontSize: '48px',
    lineHeight: '1'
  },
  text: {
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '1px'
  },
  brand: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    letterSpacing: '3px',
    textTransform: 'uppercase'
  }
};
