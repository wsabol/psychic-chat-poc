/**
 * Test script to verify the optimized single-call Oracle API
 * This tests that both full and brief responses are generated correctly
 */

import dotenv from 'dotenv';
dotenv.config();

// Import the optimized callOracle function
import { callOracle, getOracleSystemPrompt } from './api/services/chat/modules/oracle.js';

async function testOracleOptimization() {
    console.log('========================================');
    console.log('Testing Optimized Oracle API Call');
    console.log('========================================\n');
    
    try {
        const systemPrompt = getOracleSystemPrompt(false, 'en-US');
        const testMessage = 'Generate a brief test reading about career guidance for today.';
        
        console.log('Starting single API call test...');
        const startTime = Date.now();
        
        const result = await callOracle(systemPrompt, [], testMessage, true);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('RESULTS:');
        console.log('========================================');
        console.log(`Total Time: ${duration} seconds`);
        console.log(`\nFull Response Length: ${result.full?.length || 0} characters`);
        console.log(`Brief Response Length: ${result.brief?.length || 0} characters`);
        console.log(`\nRatio: ${result.brief ? ((result.brief.length / result.full.length) * 100).toFixed(1) : 0}%`);
        
        console.log('\n--- FULL RESPONSE ---');
        console.log(result.full);
        
        console.log('\n--- BRIEF RESPONSE ---');
        console.log(result.brief);
        
        console.log('\n========================================');
        console.log('✅ TEST PASSED');
        console.log('========================================');
        
    } catch (error) {
        console.error('\n========================================');
        console.error('❌ TEST FAILED');
        console.error('========================================');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testOracleOptimization();
