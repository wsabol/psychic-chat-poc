const https = require('https');

const data = JSON.stringify({
  name: 'HTTP Test',
  email: 'test@test.com',
  message: 'Testing Lambda Function URL via Node.js HTTP request'
});

const options = {
  hostname: 'ozr7bsfwehjuojny3kcgjwyhca0rkoks.lambda-url.us-east-1.on.aws',
  port: 443,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Sending request to Lambda...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', body);
    try {
      const json = JSON.parse(body);
      console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      if (json.success) {
        console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
        console.log('Check info@starshippsychics.com inbox');
      } else {
        console.log('\n❌ ERROR:', json.error);
      }
    } catch (e) {
      console.log('Could not parse JSON:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ REQUEST ERROR:', error);
});

req.write(data);
req.end();
