/**
 * Local Lambda Function Invoker
 * 
 * Usage:
 *   node invoke-local.js temp-account-cleanup
 *   node invoke-local.js account-cleanup
 *   node invoke-local.js subscription-check
 *   node invoke-local.js policy-reminder
 *   node invoke-local.js grace-period-enforcement
 *   node invoke-local.js price-migration
 * 
 * Or use npm scripts:
 *   npm run invoke:temp-cleanup
 *   npm run invoke:account-cleanup
 *   npm run invoke:subscription-check
 *   npm run invoke:policy-reminder
 *   npm run invoke:grace-period
 *   npm run invoke:price-migration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lambda function mapping
const LAMBDA_FUNCTIONS = {
  'temp-account-cleanup': './temp-account-cleanup/index.js',
  'account-cleanup': './account-cleanup/index.js',
  'subscription-check': './subscription-check/index.js',
  'policy-reminder': './policy-reminder/index.js',
  'grace-period-enforcement': './grace-period-enforcement/index.js',
  'price-migration': './price-migration/index.js'
};

/**
 * Mock EventBridge event
 */
const mockEvent = {
  version: '0',
  id: 'local-test-' + Date.now(),
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: 'local',
  time: new Date().toISOString(),
  region: 'local',
  resources: [],
  detail: {}
};

/**
 * Invoke a Lambda function locally
 */
async function invokeLambda(functionName) {
  console.log('\n================================================');
  console.log(`🚀 Invoking Lambda: ${functionName}`);
  console.log('================================================\n');
  
  const startTime = Date.now();
  
  try {
    // Validate function exists
    if (!LAMBDA_FUNCTIONS[functionName]) {
      console.error(`❌ Unknown Lambda function: ${functionName}`);
      console.log('\nAvailable functions:');
      Object.keys(LAMBDA_FUNCTIONS).forEach(name => {
        console.log(`  - ${name}`);
      });
      process.exit(1);
    }
    
    // Import the Lambda handler
    const lambdaPath = LAMBDA_FUNCTIONS[functionName];
    const lambdaModule = await import(lambdaPath);
    
    if (!lambdaModule.handler) {
      throw new Error(`Lambda function ${functionName} does not export a handler`);
    }
    
    // Invoke the handler
    console.log('📦 Event:', JSON.stringify(mockEvent, null, 2));
    console.log('\n⏳ Executing Lambda function...\n');
    
    const result = await lambdaModule.handler(mockEvent);
    
    const duration = Date.now() - startTime;
    
    // Parse and display result
    console.log('\n================================================');
    console.log('✅ Lambda Execution Completed');
    console.log('================================================\n');
    
    console.log('📊 Status Code:', result.statusCode);
    console.log('⏱️  Duration:', duration + 'ms');
    
    if (result.body) {
      try {
        const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        console.log('\n📄 Response Body:');
        console.log(JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('\n📄 Response Body:', result.body);
      }
    }
    
    // Exit with appropriate code
    process.exit(result.statusCode === 200 ? 0 : 1);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log('\n================================================');
    console.log('❌ Lambda Execution Failed');
    console.log('================================================\n');
    
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('🔥 Error:', error.message);
    console.log('\n📚 Stack Trace:');
    console.log(error.stack);
    
    process.exit(1);
  }
}

// Get function name from command line arguments
const functionName = process.argv[2];

if (!functionName) {
  console.error('❌ Usage: node invoke-local.js <function-name>');
  console.log('\nAvailable functions:');
  Object.keys(LAMBDA_FUNCTIONS).forEach(name => {
    console.log(`  - ${name}`);
  });
  process.exit(1);
}

// Invoke the Lambda
invokeLambda(functionName);
