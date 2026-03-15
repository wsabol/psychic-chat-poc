import { useTranslation } from '../context/TranslationContext';

/**
 * Nature-to-colour mapping for aspect badges
 */
const NATURE_STYLES = {
  harmonious:   { bg: '#e8f5e9', border: '#43a047', dot: '#43a047', label: '✦ Harmonious' },
  supportive:   { bg: '#e3f2fd', border: '#1e88e5', dot: '#1e88e5', label: '✦ Supportive' },
  intensifying: { bg: '#ede7f6', border: '#7e57c2', dot: '#7e57c2', label: '⬛ Intensifying' },
  challenging:  { bg: '#fff3e0', border: '#ef6c00', dot: '#ef6c00', label: '▲ Challenging' },
  adjustment:   { bg: '#fce4ec', border: '#d81b60', dot: '#d81b60', label: '◆ Adjustment' },
};

const ASPECT_EMOJI = {
  conjunction:  '☌',
  opposition:   '☍',
  trine:        '△',
  square:       '□',
  sextile:      '⚹',
  quincunx:     '⚻',
};

const PLANET_ICONS = {
  Sun: '☀️', Moon: '🌙', Mercury: '☿', Venus: '♀',
  Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '⛢',
  Neptune: '♆', Pluto: '♇', Rising: '↗️',
};

function AspectBadge({ nature }) {
  const style = NATURE_STYLES[nature] || NATURE_STYLES.intensifying;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '10px',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.border,
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot, display: 'inline-block' }} />
      {style.label}
    </span>
  );
}

function AspectRow({ aspect, isTransit }) {
  const retroLabel = isTransit && aspect.transitRetrograde ? ' Rx' : '';
  const planetA = isTransit
    ? `${PLANET_ICONS[aspect.transitPlanet] || '●'} ${aspect.transitPlanet}${retroLabel} in ${aspect.transitSign}`
    : `${PLANET_ICONS[aspect.planet1] || '●'} ${aspect.planet1} in ${aspect.sign1}`;
  const planetB = isTransit
    ? `${PLANET_ICONS[aspect.natalPlanet] || '●'} ${aspect.natalPlanet} in ${aspect.natalSign}`
    : `${PLANET_ICONS[aspect.planet2] || '●'} ${aspect.planet2} in ${aspect.sign2}`;
  const aspectName = isTransit ? aspect.aspect : aspect.aspect;
  const symbol = ASPECT_EMOJI[aspectName] || '—';
  const nature = aspect.nature;
  const orb = isTransit ? aspect.orb : aspect.orb;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '6px',
      padding: '7px 10px',
      borderRadius: '8px',
      background: '#fafafa',
      border: '1px solid #eee',
      fontSize: '12px',
      color: '#333',
    }}>
      <span style={{ fontWeight: 600 }}>{planetA}</span>
      <span style={{
        fontSize: '15px',
        color: NATURE_STYLES[nature]?.dot || '#666',
        fontWeight: 700,
        lineHeight: 1
      }}>
        {symbol}
      </span>
      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{aspectName}</span>
      <span style={{ color: '#666' }}>{planetB}</span>
      <span style={{ color: '#aaa', fontSize: '10px', marginLeft: 'auto' }}>{orb}° orb</span>
      <AspectBadge nature={nature} />
    </div>
  );
}

/**
 * AspectsDisplay — shows transit-to-natal and natal-to-natal aspects
 * for the Cosmic Weather page.
 *
 * Props:
 *   aspects: { transitToNatal: Array, natal: Array } | null
 */
export default function AspectsDisplay({ aspects }) {
  const { t } = useTranslation();

  if (!aspects) return null;

  const transitAspects = aspects.transitToNatal || [];
  const natalAspects   = aspects.natal || [];

  if (transitAspects.length === 0 && natalAspects.length === 0) return null;

  // Show top 8 transits, top 5 natal aspects in UI
  const topTransits = transitAspects.slice(0, 8);
  const topNatal    = natalAspects.slice(0, 5);

  return (
    <div className="aspects-display" style={{ marginTop: '1.5rem' }}>

      {/* ── Transit-to-Natal ── */}
      {topTransits.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            margin: '0 0 0.75rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#444'
          }}>
            🌠 Today's Active Transits to Your Chart
            <span style={{
              fontSize: '10px',
              background: '#f3e5f5',
              color: '#7b1fa2',
              border: '1px solid #ce93d8',
              borderRadius: '10px',
              padding: '2px 8px',
              fontWeight: 600
            }}>
              {topTransits.length} aspect{topTransits.length !== 1 ? 's' : ''}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topTransits.map((a, i) => (
              <AspectRow key={i} aspect={a} isTransit={true} />
            ))}
          </div>
        </div>
      )}

      {/* ── Natal-to-Natal ── */}
      {topNatal.length > 0 && (
        <div>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            margin: '0 0 0.75rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#444'
          }}>
            ✨ Your Natal Chart Aspects
            <span style={{
              fontSize: '10px',
              background: '#e8eaf6',
              color: '#3949ab',
              border: '1px solid #9fa8da',
              borderRadius: '10px',
              padding: '2px 8px',
              fontWeight: 600
            }}>
              Core character
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topNatal.map((a, i) => (
              <AspectRow key={i} aspect={a} isTransit={false} />
            ))}
          </div>
        </div>
      )}

      <p style={{
        marginTop: '0.75rem',
        fontSize: '10px',
        color: '#aaa',
        fontStyle: 'italic'
      }}>
        Aspects calculated from your birth chart positions. Tighter orb = stronger influence.
      </p>
    </div>
  );
}
