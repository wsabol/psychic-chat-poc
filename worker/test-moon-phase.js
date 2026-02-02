import dotenv from "dotenv";
dotenv.config();

import { getCurrentMoonPhase, getCurrentPlanets, calculateBirthChart } from "./modules/astrology.js";
import { logErrorFromCatch } from '../shared/errorLogger.js';

async function testLambdaIntegration() {
    console.log('🔍 Testing Lambda Astrology Integration...\n');
    console.log('Lambda URL:', process.env.ASTROLOGY_LAMBDA_URL || 'Using default URL');
    console.log('─────────────────────────────────────────────────────\n');
    
    // Test 1: Current Moon Phase
    console.log('📅 Test 1: Current Moon Phase');
    try {
        const moonPhaseData = await getCurrentMoonPhase();
        if (moonPhaseData.success) {
            console.log('✅ SUCCESS');
            console.log('   Phase:', moonPhaseData.phase);
            console.log('   Angle:', moonPhaseData.phase_angle + '°');
            console.log('   Cycle:', moonPhaseData.cycle_percentage + '%');
            console.log('   Timestamp:', moonPhaseData.timestamp);
        } else {
            console.log('❌ FAILED:', moonPhaseData.error);
        }
    } catch (err) {
        console.log('❌ ERROR:', err.message);
    }
    
    console.log('\n─────────────────────────────────────────────────────\n');
    
    // Test 2: Current Planetary Positions
    console.log('🪐 Test 2: Current Planetary Positions');
    try {
        const planetsData = await getCurrentPlanets();
        if (planetsData.success) {
            console.log('✅ SUCCESS');
            console.log('   Planets:', planetsData.planets.length);
            planetsData.planets.forEach(planet => {
                const retrograde = planet.retrograde ? ' ℞' : '';
                console.log(`   ${planet.icon} ${planet.name}: ${planet.degree}° ${planet.sign}${retrograde}`);
            });
        } else {
            console.log('❌ FAILED:', planetsData.error);
        }
    } catch (err) {
        console.log('❌ ERROR:', err.message);
    }
    
    console.log('\n─────────────────────────────────────────────────────\n');
    
    // Test 3: Birth Chart Calculation
    console.log('🌟 Test 3: Birth Chart Calculation');
    try {
        const birthData = {
            birth_date: '1988-06-14',
            birth_time: '00:00:00',
            birth_country: 'United States',
            birth_province: 'New York',
            birth_city: 'New York'
        };
        
        console.log('   Input:', JSON.stringify(birthData, null, 2).replace(/\n/g, '\n   '));
        
        const chartData = await calculateBirthChart(birthData);
        if (chartData.success) {
            console.log('✅ SUCCESS');
            console.log('   Sun Sign:', chartData.sun_sign, '(' + chartData.sun_degree + '°)');
            console.log('   Moon Sign:', chartData.moon_sign, '(' + chartData.moon_degree + '°)');
            console.log('   Rising Sign:', chartData.rising_sign, '(' + chartData.rising_degree + '°)');
            console.log('   Location:', chartData.latitude + ', ' + chartData.longitude);
            console.log('   Timezone:', chartData.timezone);
        } else {
            console.log('❌ FAILED:', chartData.error);
            if (chartData.location_error) {
                console.log('   Location Error:', chartData.location_error);
            }
        }
    } catch (err) {
        console.log('❌ ERROR:', err.message);
    }
    
    console.log('\n─────────────────────────────────────────────────────');
    console.log('✨ Lambda integration test complete!\n');
}

testLambdaIntegration();
