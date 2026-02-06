const https = require('https');

const data = JSON.stringify({
  name: 'API Test',
  email: 'test@example.com',
  message: 'Testing contact form via API endpoint - THIS SHOULD SEND AN EMAIL'
});

const options = {
  hostname: 'api.starshippsychics.com',
  port: 443,
  path: '/api/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Sending to API endpoint...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', body);
    try {
      const json = JSON.parse(body);
      if (json.success) {
        console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
        console.log('Check info@starshippsychics.com inbox NOW!');
      } else {
        console.log('\n❌ ERROR:', json.error);
      }
    } catch (e) {
      console.log('Response body:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR:', error);
});

req.write(data);
req.end();
