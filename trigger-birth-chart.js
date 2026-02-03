// Manually trigger birth chart calculation
import { enqueueMessage } from './api/shared/queue.js';

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: node trigger-birth-chart.js <userId>');
    process.exit(1);
}

async function triggerCalculation() {
    try {
        console.log('Triggering birth chart calculation for user:', userId);
        
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
        });
        
        console.log('✅ Birth chart calculation job enqueued successfully');
        console.log('Check worker logs to see the calculation progress');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

triggerCalculation();
