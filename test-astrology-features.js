/**
 * Test script to diagnose astrology feature issues
 * Run this to test horoscope, moon phase, and cosmic weather generation
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const USER_ID = process.env.TEST_USER_ID; // Set your test user ID
const TOKEN = process.env.TEST_TOKEN; // Set your test token

if (!USER_ID || !TOKEN) {
    console.error('❌ Missing TEST_USER_ID or TEST_TOKEN environment variables');
    console.log('Usage: TEST_USER_ID=your_user_id TEST_TOKEN=your_token node test-astrology-features.js');
    process.exit(1);
}

async function testHoroscope() {
    console.log('\n🔮 Testing Horoscope Generation...');
    try {
        const response = await fetch(`${API_URL}/horoscope/${USER_ID}/daily`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ Horoscope generated successfully!');
            console.log(`Preview: ${data.horoscope?.substring(0, 100)}...`);
        } else {
            console.log('❌ Horoscope generation failed');
            console.log('Error:', data);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
}

async function testMoonPhase() {
    console.log('\n🌙 Testing Moon Phase Generation...');
    try {
        const response = await fetch(`${API_URL}/moon-phase/${USER_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phase: 'fullMoon' })
        });
        
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ Moon phase generated successfully!');
            console.log(`Preview: ${data.commentary?.substring(0, 100)}...`);
        } else {
            console.log('❌ Moon phase generation failed');
            console.log('Error:', data);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
}

async function testCosmicWeather() {
    console.log('\n⭐ Testing Cosmic Weather Generation...');
    try {
        const response = await fetch(`${API_URL}/astrology-insights/cosmic-weather/${USER_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ Cosmic weather generated successfully!');
            console.log(`Preview: ${data.weather?.substring(0, 100)}...`);
        } else {
            console.log('❌ Cosmic weather generation failed');
            console.log('Error:', data);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
}

async function runTests() {
    console.log('🧪 Starting Astrology Features Test');
    console.log(`API URL: ${API_URL}`);
    console.log(`User ID: ${USER_ID}`);
    
    await testHoroscope();
    await testMoonPhase();
    await testCosmicWeather();
    
    console.log('\n✨ Tests complete! Check your API logs for detailed error information.');
}

runTests().catch(console.error);
