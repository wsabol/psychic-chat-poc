/**
 * ExitButton - Temporary account exit button
 */
export default function ExitButton({ onClick, isTemporaryAccount }) {
  if (!isTemporaryAccount) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 1000
    }}>
      <button
        type="button"
        onClick={onClick}
        className="exit-btn"
        title="Exit free trial"
      >
        ✕ Exit
      </button>
    </div>
  );
}
