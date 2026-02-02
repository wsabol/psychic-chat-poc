import { getCurrentPlanets, getCurrentMoonPhase } from '../astrology.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Unified Astronomical Context Module
 * 
 * Provides real-time astronomical data for all astrological features:
 * - Horoscope
 * - Moon Phase
 * - Cosmic Weather
 * 
 * This ensures consistency across all features and avoids the Oracle
 * making up fictional astronomical positions.
 * 
 * Benefits:
 * - Consistency: All features reference the same astronomical reality
 * - Accuracy: Oracle interprets real data, not hallucinations
 * - Efficiency: No storage needed for ephemeral data that changes daily
 * - Simplicity: Single source of truth, calculated on-demand
 */

/**
 * Get current astronomical context with planetary positions and moon phase
 * @returns {Promise<Object>} Astronomical context with planets, moon phase, and timestamp
 */
export async function getAstronomicalContext() {
    try {
        // Fetch current planetary positions and moon phase in parallel
        const [planetsData, moonPhaseData] = await Promise.all([
            getCurrentPlanets(),
            getCurrentMoonPhase()
        ]);

        if (!planetsData.success) {
            throw new Error('Failed to calculate current planets');
        }

        const planets = planetsData.planets;
        const moonPlanet = planets.find(p => p.name === 'Moon');

        return {
            success: true,
            currentPlanets: planets,
            currentMoonPhase: moonPhaseData.phase || 'fullMoon',
            moonPosition: moonPlanet ? {
                sign: moonPlanet.sign,
                degree: moonPlanet.degree,
                retrograde: moonPlanet.retrograde || false
            } : null,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        logErrorFromCatch(err, '[ASTRONOMICAL-CONTEXT] Error fetching astronomical data');
        return {
            success: false,
            error: err.message,
            currentPlanets: [],
            currentMoonPhase: 'fullMoon',
            moonPosition: null,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Format planetary positions for Oracle prompts
 * @param {Array} planets - Array of planet objects
 * @returns {string} Formatted string with detailed planet information
 */
export function formatPlanetsForPrompt(planets) {
    if (!planets || planets.length === 0) {
        return 'Planetary data unavailable';
    }

    return planets
        .map(p => `- ${p.icon} ${p.name} at ${p.degree}° in ${p.sign}${p.retrograde ? ' ♻️ RETROGRADE' : ''}`)
        .join('\n');
}

/**
 * Get simplified current transits summary for Oracle context
 * @param {Object} astronomicalContext - The context from getAstronomicalContext()
 * @returns {string} Human-readable summary of current transits
 */
export function formatTransitsSummary(astronomicalContext) {
    if (!astronomicalContext.success || !astronomicalContext.currentPlanets) {
        return 'Current astronomical data unavailable';
    }

    const { currentPlanets, currentMoonPhase, moonPosition } = astronomicalContext;

    let summary = `CURRENT ASTRONOMICAL POSITIONS:\n`;
    summary += `Moon Phase: ${currentMoonPhase}\n`;
    
    if (moonPosition) {
        summary += `Moon: ${moonPosition.degree}° ${moonPosition.sign}${moonPosition.retrograde ? ' (Retrograde)' : ''}\n`;
    }

    summary += `\nCurrent Planetary Positions:\n`;
    summary += formatPlanetsForPrompt(currentPlanets);

    return summary;
}
