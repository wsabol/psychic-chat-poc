import React, { useMemo } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { getLocalizedWheelData } from '../../../data/zodiac/wheelData';
import '../styles/ZodiacWheel.css';

// Zodiac signs in order (starting with Aries at 0°)
const ZODIAC_ORDER = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces'
];

// House numbers in Roman numerals (I-XII clockwise)
const HOUSE_NUMBERS = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

/**
 * ZodiacWheel Component - 6 Concentric Rings
 * Coordinate System (Standard Cartesian):
 * - 0° = East (right) = Sunrise/Ascendant
 * - 90° = North (up) = Noon/Midheaven
 * - 180° = West (left) = Sunset/Descendant
 * - 270° = South (down) = Midnight/Imum Coeli
 * - Horizontal line = horizon (day above, night below)
 * 
 * Ring 1 (outer): Sign names (curved along arc) - radius 180-150
 * Ring 2: Sign emoji - radius 150-120
 * Ring 3: Ruling planet - radius 120-90
 * Ring 4: Element emoji - radius 90-60
 * Ring 5: House number - radius 60-30
 * Ring 6 (inner): Stylized sun emoji - radius 30
 */
export function ZodiacWheel({ astroData }) {
  const { t } = useTranslation();

  // Get rising degree and sign
  const risingDegree = astroData?.rising_degree || 0;
  const risingSgn = astroData?.rising_sign?.toLowerCase() || '';
  
  // Get the index of the rising sign (0-11)
  const risingSignIndex = ZODIAC_ORDER.indexOf(risingSgn);

  // Get localized wheel data (planets and elements translated)
  const localizedWheelData = useMemo(() => getLocalizedWheelData(t), [t]);

  // Build wheel data with sign info
  const wheelSections = useMemo(() => {
    return ZODIAC_ORDER.map((signKey, index) => {
      const signData = astroData[signKey];
      const wheelInfo = localizedWheelData[signKey];

      return {
        key: signKey,
        index: index,
        name: signData?.name || t(`mySign.${signKey}`),
        emoji: wheelInfo?.emoji || '',
        rulingPlanet: wheelInfo?.rulingPlanet || '',
        elementEmoji: wheelInfo?.elementEmoji || '',
        house: HOUSE_NUMBERS[index],
        isRising: signKey === risingSgn,
        startDegree: (index * 30) - 180,  // Convert zodiac to SVG by subtracting 180
        centerDegree: (index * 30 + 15) - 180  // Center of segment for text placement
      };
    });
  }, [astroData, risingSgn, t, localizedWheelData]);

  // Calculate wheel rotation to position rising sign on eastern horizon (right side)
  // Convert zodiac angles to SVG by subtracting 180°, then apply rotation
  // SVG Capricorn at 90-120, rotate by (11-9)*30 + 21.64 = 81.64 → 171.64-201.64 SVG = 351.64-21.64 Zodiac
  // Formula: wheelRotation = (11 - risingSignIndex) * 30 + risingDegree
  // For Capricorn (0-based index 9) at 21.64°: (11 - 9) * 30 + 21.64 = 81.64°
  const wheelRotation = -((11 - risingSignIndex) * 30 + risingDegree);

  // Ring radii (concentric circles) - midpoints between pairs
  const rings = {
    ring1Outer: 180,  // Ring 1 outer
    ring1Mid: 165,    // Midpoint 1-2: Sign names
    ring2Outer: 150,  // Ring 2 outer
    ring2Mid: 135,    // Midpoint 2-3: Sign emoji
    ring3Outer: 120,  // Ring 3 outer
    ring3Mid: 105,    // Midpoint 3-4: Planet
    ring4Outer: 90,   // Ring 4 outer
    ring4Mid: 75,     // Midpoint 4-5: Element emoji
    ring5Outer: 60,   // Ring 5 outer
    ring5Mid: 45,     // Midpoint 5-6: House number
    ring6Inner: 30    // Ring 6 inner: Sun
  };

  const centerX = 200;
  const centerY = 200;

  // Helper function to convert angle to SVG coordinates (standard Cartesian)
  // 0° = East (right), 90° = North (up), 180° = West (left), 270° = South (down)
  const getCoords = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY - radius * Math.sin(rad) // Y-axis flipped for standard math
    };
  };

  return (
    <div className="zodiac-wheel-container">
      <h3 className="wheel-title">{t('zodiacWheel.title')}</h3>
      <p className="wheel-subtitle">{t('zodiacWheel.subtitle')}</p>

      <div className="wheel-wrapper">
        <svg
          className="zodiac-wheel"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Rotating group for all zodiac elements */}
          <g style={{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: '200px 200px' }}>
            {/* Background circles for each ring */}
            <circle cx={centerX} cy={centerY} r={rings.ring1Outer} className="ring-bg ring-1" />
            <circle cx={centerX} cy={centerY} r={rings.ring2Outer} className="ring-bg ring-2" />
            <circle cx={centerX} cy={centerY} r={rings.ring3Outer} className="ring-bg ring-3" />
            <circle cx={centerX} cy={centerY} r={rings.ring4Outer} className="ring-bg ring-4" />
            <circle cx={centerX} cy={centerY} r={rings.ring5Outer} className="ring-bg ring-5" />
            <circle cx={centerX} cy={centerY} r={rings.ring6Inner} className="ring-bg ring-6" />

            {/* 12 Radial dividers (every 30 degrees) */}
            {ZODIAC_ORDER.map((_, index) => {
              const angle = index * 30;
              const outer = getCoords(angle, rings.ring1Outer);
              const inner = getCoords(angle, rings.ring6Inner);

              return (
                <line
                  key={`divider-${index}`}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  className="radial-divider"
                />
              );
            })}

            {/* Zodiac sections with all rings */}
            {wheelSections.map((section) => {
              const centerAngle = section.centerDegree;

              // Positions for each ring (at midpoints)
              const ring2Mid = getCoords(centerAngle, rings.ring2Mid);
              const ring4Mid = getCoords(centerAngle, rings.ring4Mid);
              const ring5Mid = getCoords(centerAngle, rings.ring5Mid);

              // For curved text, create a path (reversed: from end to start for left-to-right reading clockwise)
              const startAngle = section.startDegree + 30;
              const endAngle = section.startDegree;
              const start = getCoords(startAngle, rings.ring1Mid);
              const end = getCoords(endAngle, rings.ring1Mid);

              // For planet text path (same reversal)
              const planetStart = getCoords(startAngle, rings.ring3Mid);
              const planetEnd = getCoords(endAngle, rings.ring3Mid);

              return (
                <g key={`section-${section.key}`} className="zodiac-section">
                  {/* Ring 1 Midpoint: Sign name (curved text along arc) - left-to-right clockwise */}
                  <path
                    id={`arc-${section.key}`}
                    d={`M ${start.x},${start.y} A ${rings.ring1Mid},${rings.ring1Mid} 0 0,1 ${end.x},${end.y}`}
                    fill="none"
                  />
                  <text className={`ring-1-text ${section.isRising ? 'is-rising' : ''}`}>
                    <textPath
                      href={`#arc-${section.key}`}
                      startOffset="50%"
                      textAnchor="middle"
                      className="sign-name-curved"
                    >
                      {section.name}
                    </textPath>
                  </text>

                  {/* Ring 2 Midpoint: Sign emoji */}
                  <text
                    x={ring2Mid.x}
                    y={ring2Mid.y}
                    className={`ring-2-text ${section.isRising ? 'is-rising' : ''}`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {section.emoji}
                  </text>

                  {/* Ring 3 Midpoint: Ruling planet (curved text along arc) - left-to-right clockwise */}
                  <path
                    id={`planet-arc-${section.key}`}
                    d={`M ${planetStart.x},${planetStart.y} A ${rings.ring3Mid},${rings.ring3Mid} 0 0,1 ${planetEnd.x},${planetEnd.y}`}
                    fill="none"
                  />
                  <text className={`ring-3-text ${section.isRising ? 'is-rising' : ''}`}>
                    <textPath
                      href={`#planet-arc-${section.key}`}
                      startOffset="50%"
                      textAnchor="middle"
                      className="planet-name-curved"
                    >
                      {section.rulingPlanet}
                    </textPath>
                  </text>

                  {/* Ring 4 Midpoint: Element emoji */}
                  <text
                    x={ring4Mid.x}
                    y={ring4Mid.y}
                    className="ring-4-text"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {section.elementEmoji}
                  </text>

                  {/* Ring 5 Midpoint: House number (NOT on curve, rotated for readability) */}
                  <g transform={`translate(${ring5Mid.x},${ring5Mid.y}) rotate(${-centerAngle})`}>
                    <text
                      x="0"
                      y="0"
                      className={`ring-5-text ${section.isRising ? 'is-rising' : ''}`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {section.house}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Ring 6 Center: Stylized sun emoji */}
            <text x={centerX} y={centerY} className="sun-emoji" textAnchor="middle" dominantBaseline="middle">
              ☀️
            </text>
          </g>

          {/* Horizontal line - NOT ROTATED (stays horizontal with page) */}
          <line
            x1={centerX - rings.ring1Outer}
            y1={centerY}
            x2={centerX + rings.ring1Outer}
            y2={centerY}
            className="horizon-line-horizontal"
          />
        </svg>
      </div>
    </div>
  );
}
