/**
 * Natal Aspect Calculator
 *
 * Calculates astrological aspects between:
 *   1. Transit planets (today's sky) → Natal planets (user's birth chart)
 *   2. Natal planets → Natal planets (permanent aspects within the birth chart)
 *
 * These calculated aspects are fed directly to the Oracle AI so it can
 * generate precise, personalized interpretations of trines, squares,
 * conjunctions, and oppositions rather than speaking in generalities.
 */

// Absolute ecliptic start degree for each zodiac sign (0° Aries = 0°)
const SIGN_DEGREES = {
    'Aries': 0,   'Taurus': 30,  'Gemini': 60,   'Cancer': 90,
    'Leo': 120,   'Virgo': 150,  'Libra': 180,   'Scorpio': 210,
    'Sagittarius': 240, 'Capricorn': 270, 'Aquarius': 300, 'Pisces': 330
};

// Standard astrological aspects with orbs and interpretive metadata
const ASPECTS = [
    { name: 'conjunction',  angle: 0,   orb: 8, symbol: '☌', nature: 'intensifying', effect: 'merges and powerfully amplifies these energies' },
    { name: 'opposition',   angle: 180, orb: 8, symbol: '☍', nature: 'challenging',  effect: 'creates polarity, tension, and heightened awareness' },
    { name: 'trine',        angle: 120, orb: 8, symbol: '△', nature: 'harmonious',   effect: 'flows with natural ease and graceful support' },
    { name: 'square',       angle: 90,  orb: 7, symbol: '□', nature: 'challenging',  effect: 'creates productive friction and drives growth' },
    { name: 'sextile',      angle: 60,  orb: 6, symbol: '⚹', nature: 'supportive',   effect: 'offers gentle opportunity and cooperative energy' },
    { name: 'quincunx',     angle: 150, orb: 3, symbol: '⚻', nature: 'adjustment',   effect: 'requires adaptation and conscious recalibration' }
];

// Planet weights for significance sorting (higher = more astrologically impactful)
const PLANET_WEIGHT = {
    'Sun': 10, 'Moon': 10, 'Rising': 9,
    'Saturn': 9, 'Jupiter': 9, 'Mars': 8,
    'Venus': 8, 'Mercury': 7,
    'Uranus': 7, 'Neptune': 7, 'Pluto': 7
};

/**
 * Convert zodiac sign + degree to absolute ecliptic longitude (0–360°)
 * @param {string} sign  - e.g. "Scorpio"
 * @param {number} degree - e.g. 14.7
 * @returns {number|null}
 */
function toAbsoluteDegree(sign, degree) {
    const base = SIGN_DEGREES[sign];
    if (base === undefined) return null;
    return base + parseFloat(degree || 0);
}

/**
 * Calculate shortest angular distance between two ecliptic positions
 * @returns {number} 0–180
 */
function getAngularDistance(deg1, deg2) {
    const diff = Math.abs(deg1 - deg2) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Determine if two absolute-degree positions form an aspect.
 * Returns enriched aspect object (with exactOrb), or null if no aspect.
 */
function findAspect(deg1, deg2) {
    const angDist = getAngularDistance(deg1, deg2);
    for (const aspect of ASPECTS) {
        const orb = Math.abs(angDist - aspect.angle);
        if (orb <= aspect.orb) {
            return { ...aspect, exactOrb: Math.round(orb * 10) / 10 };
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate how today's transiting planets aspect the user's natal chart.
 * This is the most astrologically significant data for daily/cosmic readings.
 *
 * @param {Object} natalData      - astrology_data from DB
 *                                  (sun_sign, sun_degree, moon_sign, moon_degree, …)
 * @param {Array}  transitPlanets - current planets from getCurrentPlanets()
 *                                  each: { name, sign, degree, retrograde, icon }
 * @returns {Array} Sorted array of transit-to-natal aspect objects
 */
export function calculateTransitToNatalAspects(natalData, transitPlanets) {
    if (!natalData || !transitPlanets?.length) return [];

    // Build natal absolute positions (only planets we have stored)
    const natalPoints = [
        { name: 'Sun',     sign: natalData.sun_sign,     degree: natalData.sun_degree },
        { name: 'Moon',    sign: natalData.moon_sign,    degree: natalData.moon_degree },
        { name: 'Rising',  sign: natalData.rising_sign,  degree: natalData.rising_degree },
        { name: 'Mercury', sign: natalData.mercury_sign, degree: natalData.mercury_degree },
        { name: 'Venus',   sign: natalData.venus_sign,   degree: natalData.venus_degree },
        { name: 'Mars',    sign: natalData.mars_sign,    degree: natalData.mars_degree },
    ]
    .filter(p => p.sign && p.degree != null)
    .map(p => ({ ...p, absolute: toAbsoluteDegree(p.sign, p.degree) }))
    .filter(p => p.absolute !== null);

    const aspects = [];

    for (const transit of transitPlanets) {
        if (!transit.sign || transit.degree == null) continue;
        const transitAbs = toAbsoluteDegree(transit.sign, transit.degree);
        if (transitAbs === null) continue;

        for (const natal of natalPoints) {
            const aspect = findAspect(transitAbs, natal.absolute);
            if (aspect) {
                aspects.push({
                    transitPlanet:     transit.name,
                    transitSign:       transit.sign,
                    transitDegree:     Math.round(parseFloat(transit.degree) * 10) / 10,
                    transitRetrograde: transit.retrograde || false,
                    transitIcon:       transit.icon || '●',
                    natalPlanet:       natal.name,
                    natalSign:         natal.sign,
                    natalDegree:       Math.round(parseFloat(natal.degree) * 10) / 10,
                    aspect:            aspect.name,
                    aspectSymbol:      aspect.symbol,
                    nature:            aspect.nature,
                    effect:            aspect.effect,
                    orb:               aspect.exactOrb
                });
            }
        }
    }

    // Sort by combined significance weight minus orb (most exact + most important first)
    aspects.sort((a, b) => {
        const wA = (PLANET_WEIGHT[a.transitPlanet] || 5) + (PLANET_WEIGHT[a.natalPlanet] || 5) - a.orb;
        const wB = (PLANET_WEIGHT[b.transitPlanet] || 5) + (PLANET_WEIGHT[b.natalPlanet] || 5) - b.orb;
        return wB - wA;
    });

    return aspects;
}

/**
 * Calculate aspects within the natal chart itself.
 * These are permanent traits and core life themes that never change.
 * Knowing them helps the Oracle explain WHY certain transits hit harder.
 *
 * @param {Object} natalData - astrology_data from DB
 * @returns {Array} Sorted array of natal-to-natal aspect objects (tightest orb first)
 */
export function calculateNatalAspects(natalData) {
    if (!natalData) return [];

    const planets = [
        { name: 'Sun',     sign: natalData.sun_sign,     degree: natalData.sun_degree },
        { name: 'Moon',    sign: natalData.moon_sign,    degree: natalData.moon_degree },
        { name: 'Mercury', sign: natalData.mercury_sign, degree: natalData.mercury_degree },
        { name: 'Venus',   sign: natalData.venus_sign,   degree: natalData.venus_degree },
        { name: 'Mars',    sign: natalData.mars_sign,    degree: natalData.mars_degree },
    ]
    .filter(p => p.sign && p.degree != null)
    .map(p => ({ ...p, absolute: toAbsoluteDegree(p.sign, p.degree) }))
    .filter(p => p.absolute !== null);

    const aspects = [];

    // Compare every unique planet pair (i < j avoids duplicates)
    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const aspect = findAspect(planets[i].absolute, planets[j].absolute);
            if (aspect) {
                aspects.push({
                    planet1:      planets[i].name,
                    sign1:        planets[i].sign,
                    degree1:      Math.round(parseFloat(planets[i].degree) * 10) / 10,
                    planet2:      planets[j].name,
                    sign2:        planets[j].sign,
                    degree2:      Math.round(parseFloat(planets[j].degree) * 10) / 10,
                    aspect:       aspect.name,
                    aspectSymbol: aspect.symbol,
                    nature:       aspect.nature,
                    effect:       aspect.effect,
                    orb:          aspect.exactOrb
                });
            }
        }
    }

    // Sort tightest orb first (most exact = most powerful)
    aspects.sort((a, b) => a.orb - b.orb);

    return aspects;
}

/**
 * Format both aspect sets into a structured text block for injection
 * directly into the Oracle system prompt.
 *
 * @param {Array} transitAspects - from calculateTransitToNatalAspects()
 * @param {Array} natalAspects   - from calculateNatalAspects()
 * @returns {string} Formatted prompt section
 */
export function formatAspectsForPrompt(transitAspects, natalAspects) {
    let text = '';

    // ── Transit-to-Natal ──────────────────────────────────────────────────────
    if (transitAspects.length > 0) {
        text += `TODAY'S ACTIVE TRANSIT ASPECTS TO NATAL CHART (most significant first):\n`;
        const top = transitAspects.slice(0, 10);
        for (const a of top) {
            const retro = a.transitRetrograde ? ' Rx' : '';
            text += `  • Transit ${a.transitPlanet}${retro} in ${a.transitSign} `;
            text += `${a.aspectSymbol} ${a.aspect.toUpperCase()} `;
            text += `Natal ${a.natalPlanet} in ${a.natalSign} `;
            text += `[orb: ${a.orb}°, ${a.nature} — ${a.effect}]\n`;
        }
        text += '\n';
    } else {
        text += `TODAY'S ACTIVE TRANSIT ASPECTS: No exact aspects within standard orbs today — a day of relative cosmic stillness.\n\n`;
    }

    // ── Natal-to-Natal ────────────────────────────────────────────────────────
    if (natalAspects.length > 0) {
        text += `NATAL CHART CORE ASPECTS (permanent character architecture — never changes):\n`;
        const top = natalAspects.slice(0, 6);
        for (const a of top) {
            text += `  • Natal ${a.planet1} in ${a.sign1} `;
            text += `${a.aspectSymbol} ${a.aspect.toUpperCase()} `;
            text += `Natal ${a.planet2} in ${a.sign2} `;
            text += `[orb: ${a.orb}°, ${a.nature} — ${a.effect}]\n`;
        }
        text += '\n';
    }

    return text;
}
