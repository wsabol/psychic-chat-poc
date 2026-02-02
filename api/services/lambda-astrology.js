import { logErrorFromCatch } from '../shared/errorLogger.js';

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
