import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

// Lambda URL from environment variable
const ASTROLOGY_LAMBDA_URL = process.env.ASTROLOGY_LAMBDA_URL || 'https://iay72sryvsjf7tgofqk4pibr240yccoy.lambda-url.us-east-1.on.aws/';

// Timeout for Lambda requests (in milliseconds)
const REQUEST_TIMEOUT = 15000; // 15 seconds

/**
 * Make HTTP request to Lambda function with timeout
 */
async function fetchWithTimeout(url, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Lambda returned status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Lambda request timed out after ${timeout}ms`);
        }
        throw error;
    }
}

/**
 * Build query string from parameters object
 */
function buildQueryString(params) {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value);
        }
    }
    return queryParams.toString();
}

/**
 * Calculate birth chart using Lambda function
 * @param {Object} birthData - Birth data object
 * @param {string} birthData.birth_date - Birth date in YYYY-MM-DD format
 * @param {string} birthData.birth_time - Birth time in HH:MM:SS format
 * @param {string} birthData.birth_country - Birth country
 * @param {string} birthData.birth_province - Birth province/state
 * @param {string} birthData.birth_city - Birth city
 * @param {string} [birthData.birth_timezone] - Optional timezone
 * @returns {Promise<Object>} Birth chart data
 */
export async function calculateBirthChart(birthData) {
    try {
        const params = {
            request_type: 'birth_chart',
            birth_date: birthData.birth_date,
            birth_time: birthData.birth_time,
            birth_country: birthData.birth_country,
            birth_province: birthData.birth_province,
            birth_city: birthData.birth_city
        };
        
        // Add optional timezone if provided
        if (birthData.birth_timezone) {
            params.birth_timezone = birthData.birth_timezone;
        }
        
        const queryString = buildQueryString(params);
        const url = `${ASTROLOGY_LAMBDA_URL}?${queryString}`;
        
        const result = await fetchWithTimeout(url);
        
        // Validate response has required fields for success
        if (!result.success) {
            logErrorFromCatch(new Error('[LAMBDA-ASTROLOGY] Birth chart calculation failed'), result.error || 'Unknown error');
            return result;
        }
        
        return result;
    } catch (error) {
        logErrorFromCatch(error, '[LAMBDA-ASTROLOGY] Error calculating birth chart');
        return {
            success: false,
            error: `Failed to calculate birth chart: ${error.message}`
        };
    }
}

/**
 * Get current moon phase using Lambda function
 * @returns {Promise<Object>} Moon phase data with phase name and percentage
 */
export async function getCurrentMoonPhase() {
    try {
        const params = {
            request_type: 'moon_phase'
        };
        
        const queryString = buildQueryString(params);
        const url = `${ASTROLOGY_LAMBDA_URL}?${queryString}`;
        
        const result = await fetchWithTimeout(url);
        
        // Validate response
        if (!result.success || !result.phase) {
            logErrorFromCatch(new Error('[LAMBDA-ASTROLOGY] Moon phase calculation failed'), result.error || 'Invalid response format');
            return {
                success: false,
                phase: null,
                error: result.error || 'Invalid response format'
            };
        }
        
        return result;
    } catch (error) {
        logErrorFromCatch(error, '[LAMBDA-ASTROLOGY] Error getting current moon phase');
        return {
            success: false,
            phase: null,
            error: `Failed to get moon phase: ${error.message}`
        };
    }
}

/**
 * Get current planetary positions using Lambda function
 * @returns {Promise<Object>} Current planetary positions
 */
export async function getCurrentPlanets() {
    try {
        const params = {
            request_type: 'current_planets'
        };
        
        const queryString = buildQueryString(params);
        const url = `${ASTROLOGY_LAMBDA_URL}?${queryString}`;
        
        const result = await fetchWithTimeout(url);
        
        // Validate response
        if (!result.success || !result.planets) {
            logErrorFromCatch(new Error('[LAMBDA-ASTROLOGY] Planets calculation failed'), result.error || 'Invalid response format');
            return {
                success: false,
                planets: [],
                error: result.error || 'Invalid response format'
            };
        }
        
        return result;
    } catch (error) {
        logErrorFromCatch(error, '[LAMBDA-ASTROLOGY] Error getting current planets');
        return {
            success: false,
            planets: [],
            error: `Failed to get planetary positions: ${error.message}`
        };
    }
}

/**
 * Get current transits (for backward compatibility if needed)
 * This is a placeholder - adjust based on actual Lambda capabilities
 */
export async function getCurrentTransits(birthData) {
    logErrorFromCatch(new Error('[LAMBDA-ASTROLOGY] getCurrentTransits not implemented in Lambda yet'));
    return {
        success: false,
        error: 'Transits calculation not available via Lambda'
    };
}
