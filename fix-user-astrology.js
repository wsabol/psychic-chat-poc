/**
 * Manual script to trigger astrology calculation for a user
 * Usage: node fix-user-astrology.js <userId>
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: node fix-user-astrology.js <userId>');
    process.exit(1);
}

async function triggerAstrologyCalculation() {
    try {
        const client = new LambdaClient({ region: 'us-east-1' });
        
        const payload = {
            userId,
            requestType: 'birth_chart'
        };
        
        console.log(`Triggering astrology calculation for user: ${userId.substring(0, 8)}...`);
        
        const command = new InvokeCommand({
            FunctionName: 'psychic-chat-astrology-production',
            InvocationType: 'Event', // Async
            Payload: JSON.stringify(payload)
        });
        
        await client.send(command);
        
        console.log('✅ Lambda invoked successfully!');
        console.log('The astrology calculation should complete within 10-30 seconds.');
        console.log('Check the database or refresh the app to see the results.');
        
    } catch (err) {
        console.error('❌ Failed to invoke Lambda:', err.message);
        process.exit(1);
    }
}

triggerAstrologyCalculation();
