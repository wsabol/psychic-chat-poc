import dotenv from "dotenv";
dotenv.config();

import { getCurrentMoonPhase } from "./modules/astrology.js";
import { logErrorFromCatch } from './shared/errorLogger.js';

async function testMoonPhase() {
    
    try {
        const moonPhaseData = await getCurrentMoonPhase();
        
    } catch (err) {
        logErrorFromCatch('\n❌ ERROR:', err.message);
    }
}

testMoonPhase();
