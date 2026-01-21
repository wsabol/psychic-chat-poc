import dotenv from "dotenv";
dotenv.config();

import { getCurrentMoonPhase } from "./modules/astrology.js";

async function testMoonPhase() {
    
    try {
        const moonPhaseData = await getCurrentMoonPhase();
        
    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
    }
}

testMoonPhase();
