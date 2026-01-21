import dotenv from "dotenv";
dotenv.config();

import { getCurrentMoonPhase } from "./modules/astrology.js";

async function testMoonPhase() {
    console.log('Testing getCurrentMoonPhase()...\n');
    
    try {
        const moonPhaseData = await getCurrentMoonPhase();
        console.log('Moon Phase Data:', JSON.stringify(moonPhaseData, null, 2));
        
        if (moonPhaseData && moonPhaseData.success && moonPhaseData.phase) {
            console.log('\n✅ SUCCESS: Current moon phase is:', moonPhaseData.phase);
            console.log('Phase angle:', moonPhaseData.phase_angle);
            console.log('Cycle percentage:', moonPhaseData.cycle_percentage);
        } else {
            console.log('\n❌ FAILED: Moon phase calculation returned invalid data');
        }
    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
    }
}

testMoonPhase();
