// Quick test of Lambda astrology function
const LAMBDA_URL = 'https://iay72sryvsjf7tgofqk4pibr240yccoy.lambda-url.us-east-1.on.aws/';

async function testLambda() {
    const params = new URLSearchParams({
        request_type: 'birth_chart',
        birth_date: '1990-02-03',
        birth_time: '12:00:00',
        birth_country: 'United States',
        birth_province: 'California',
        birth_city: 'Los Angeles'
    });
    
    const url = `${LAMBDA_URL}?${params.toString()}`;
    console.log('Testing Lambda URL:', url);
    
    try {
        const response = await fetch(url);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLambda();
