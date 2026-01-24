import './LogoWithCopyright.css';

/**
 * LogoWithCopyright - Reusable component that displays the Starship Psychics logo
 * with a copyright symbol positioned at the bottom right corner
 * 
 * @param {Object} props
 * @param {string} props.size - Size of the logo (default: '80px')
 * @param {string} props.alt - Alt text for the logo (default: 'Starship Psychics')
 * @param {string} props.className - Additional CSS classes
 */
export default function LogoWithCopyright({ 
  size = '80px', 
  alt = 'Starship Psychics',
  className = ''
}) {
  return (
    <div className={`logo-with-copyright ${className}`} style={{ width: size, height: size }}>
      <img 
        src="/StarshipPsychics_Logo.png" 
        alt={alt}
        className="logo-image"
      />
      <span className="copyright-symbol" aria-label="Copyright">©</span>
    </div>
  );
}
