import('./shared/healthGuardrail.js').then(hg => {
  console.log('=== HEALTH GUARDRAIL TESTS ===\n');

  console.log('Test 1: Health keyword detected');
  console.log('Input: I have diabetes');
  console.log('Result:', hg.containsHealthContent('I have diabetes'));
  console.log();

  console.log('Test 2: Multiple health keywords');
  const msg = 'I suffer from cancer and depression';
  console.log('Input:', msg);
  console.log('Detected keywords:', hg.detectHealthKeywords(msg));
  console.log();

  console.log('Test 3: Safe message (no health keywords)');
  const safe = 'Will I find love this year?';
  console.log('Input:', safe);
  console.log('Result:', hg.containsHealthContent(safe));
  console.log();

  console.log('Test 4: Block response');
  console.log(hg.getBlockedResponse());
});
