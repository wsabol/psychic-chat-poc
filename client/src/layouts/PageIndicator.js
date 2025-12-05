import './PageIndicator.css';

export default function PageIndicator({ current, total }) {
  return (
    <div className="page-indicator">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          className={`indicator-dot ${index === current ? 'active' : ''}`}
          aria-label={`Go to page ${index + 1}`}
          aria-current={index === current}
        />
      ))}
    </div>
  );
}
