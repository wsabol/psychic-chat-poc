/**
 * TEST SCRIPT FOR CHAT-DIRECT ENDPOINT
 * Tests the new synchronous chat processing without queue
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// You'll need to replace this with a real auth token from your development environment
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

async function testChatDirect() {
    console.log('🧪 Testing /chat-direct endpoint...\n');
    
    try {
        const response = await fetch(`${API_URL}/chat-direct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                message: 'What does my day look like today?'
            })
        });
        
        const data = await response.json();
        
        console.log('📊 Response Status:', response.status);
        console.log('📦 Response Data:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('\n✅ SUCCESS! Chat message processed synchronously');
            console.log('📝 Role:', data.role);
            console.log('💬 Content Preview:', data.content?.text?.substring(0, 200) + '...');
            if (data.content?.cards) {
                console.log('🎴 Cards:', data.content.cards.length);
            }
        } else {
            console.log('\n❌ FAILED:', data.error);
        }
        
    } catch (err) {
        console.error('❌ Error testing endpoint:', err.message);
    }
}

// Run test
testChatDirect();
