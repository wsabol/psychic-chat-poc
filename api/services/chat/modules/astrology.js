/**
 * Astrology calculation module using AWS Lambda
 * 
 * This module provides birth chart calculations, moon phase data, and planetary positions
 * by calling an AWS Lambda function instead of running local Python scripts.
 * 
 * Migration from Python shell to Lambda provides:
 * - Better performance (no process spawning)
 * - Improved reliability (managed AWS infrastructure)
 * - Simpler deployment (no Python dependencies)
 * - Better scalability (Lambda auto-scaling)
 */

// Import all functions from the Lambda client
export {
    calculateBirthChart,
    getCurrentMoonPhase,
    getCurrentPlanets,
    getCurrentTransits
} from './lambda-astrology.js';

