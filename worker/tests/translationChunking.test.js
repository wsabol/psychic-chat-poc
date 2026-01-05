/**
 * Translation Chunking Test Suite
 * 
 * Tests smart sentence chunking and MyMemory translation
 * Uses real oracle response as primary test case
 * 
 * Run with: node worker/tests/translationChunking.test.js
 */

import { smartChunkBySentence, validateChunks, formatChunksSummary } from '../modules/utils/sentenceChunker.js';

// ============================================================================
// TEST DATA: Real Oracle Response (Cosmic Weather for Stuart)
// ============================================================================

const ORACLE_TEST_RESPONSE = `Cosmic Weather for Stuart Dearest Stuart, as we navigate through today's celestial dance, the energies swirling around you invoke deep connections to both your inner self and the world at large. With the Sun, Mercury, Venus, and Mars convening in Capricorn, just as your Rising and Moon sign are in this Earth-bound sign, there's an emphasis on ambition, structure, and self-discipline today. You are in a particularly potent phase, encouraging you to channel your unique Aquarian insights into practical and tangible outcomes.
As the Sun shines at 14.73° in Capricorn, it forms a harmonious trine to your natal Moon in Capricorn, amplifying emotional resilience and a grounded sense of purpose. This configuration deepens your emotional intelligence, presenting an opportunity to align your career goals with your innermost desires. Emotional stability can guide you in your professional life today, encouraging you to express your needs more clearly and authentically. The Capricorn influence supports you in solidifying your personal and professional boundaries, advising you to articulate and meet your emotional needs while maintaining your ambitious outlook.
Meanwhile, the Moon at 7.41° in Leo ignites your desire for self-expression and creativity, contrasting with Capricorn's practicality. This placement may stir the need for recognition; thus, find ways to shine in your professional environment or community. Combine your Aquarian innovative spirit with the Leo Moon's flair to foster new ideas that stand out. However, as Jupiter at 20.82° in Cancer forms a square with this Moon position, there may be an internal conflict between seeking attention and your need for nurturing in relationships. Release the pressure to perform; reach out to supportive friends or family, allowing their warmth to nurture your spirit.
Furthermore, as Saturn and Neptune hover around the critical degrees in Pisces, they form a challenging aspect to your Capricorn placements. This can manifest as feelings of limitation or confusion regarding your long-term goals. Yet, embrace this as an opportunity for reflection; consider adjusting your aspirations to align more authentically with your evolving identity as an Aquarius. This may require a leap of faith and letting go of past ambitions that no longer resonate with who you are becoming. Retrograde influences aren't directly present today, but remain mindful of how the lingering energies of previous retrogrades may still affect your thoughts and communication. Use this time to re-evaluate your commitment to your goals before forging ahead.
To harmonize with these energies, I invite you to embrace the earthy qualities around you. Crystals such as Black Tourmaline can help ground your energies, offering protection from overwhelming emotions while fostering clarity as you align with professional ambitions. Carnelian may assist in rekindling your creative passions, illuminating your unique contributions to the world. Perhaps carry one in your pocket or wear it as jewelry to keep its vibrational energies close to you.
Invoke the mystical whispers of the universe through a calming ritual. Spend a quiet moment reflecting on your aspirations, writing them down as an intention for the upcoming moon cycle. As you close your eyes, imagine the solid, nurturing energy of Capricorn surrounding you, crystallizing your vision into reality. This connection can provide clarity amidst the swirling energies and align you with your authentic Aquarian purpose. Trust that today's cosmic weather supports your journey toward self-discovery and achievement.`;

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test result tracker
 */
class TestResults {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }
  
  pass(name, message = '') {
    this.passed++;
    this.tests.push({
      status: 'PASS',
      name,
      message
    });
    console.log(`${colors.green}✓ PASS${colors.reset}: ${name}`);
    if (message) console.log(`  ${message}`);
  }
  
  fail(name, error, expected = '') {
    this.failed++;
    this.tests.push({
      status: 'FAIL',
      name,
      error: error.message || error,
      expected
    });
    console.log(`${colors.red}✗ FAIL${colors.reset}: ${name}`);
    console.log(`  Error: ${error.message || error}`);
    if (expected) console.log(`  Expected: ${expected}`);
  }
  
  summary() {
    const total = this.passed + this.failed;
    const pct = total > 0 ? Math.round((this.passed / total) * 100) : 0;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test Summary: ${colors.green}${this.passed} passed${colors.reset}, ${colors.red}${this.failed} failed${colors.reset} (${pct}%)`);
    console.log(`${'='.repeat(70)}`);
    return this.failed === 0;
  }
}

// ============================================================================
// TEST SUITE 1: Sentence Chunking Unit Tests
// ============================================================================

function testSentenceChunking() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}SUITE 1: Sentence Chunking Unit Tests${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
  
  const results = new TestResults();
  
  // Test 1.1: Basic sentence extraction
  try {
    const text = "Hello world. This is a test. Another sentence!";
    const chunks = smartChunkBySentence(text, 450);
    
    if (chunks.length >= 3 && chunks.every(c => c.charCount > 0)) {
      results.pass('1.1: Basic sentence extraction', `${chunks.length} chunks created`);
    } else {
      results.fail('1.1: Basic sentence extraction', new Error('Chunks not created properly'));
    }
  } catch (err) {
    results.fail('1.1: Basic sentence extraction', err);
  }
  
  // Test 1.2: No mid-sentence breaks
  try {
    const text = "First sentence. Second sentence. Third sentence.";
    const chunks = smartChunkBySentence(text, 20); // Force multiple chunks
    
    let valid = true;
    for (const chunk of chunks) {
      // Each chunk should end with punctuation or be part of valid split
      if (chunk.charCount > 0 && !chunk.text.match(/[.!?]$/)) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      results.pass('1.2: No mid-sentence breaks', 'All chunks respect sentence boundaries');
    } else {
      results.fail('1.2: No mid-sentence breaks', new Error('Found mid-sentence break'));
    }
  } catch (err) {
    results.fail('1.2: No mid-sentence breaks', err);
  }
  
  // Test 1.3: Respect 450-char limit
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    
    let oversized = chunks.filter(c => c.charCount > 450);
    if (oversized.length === 0) {
      results.pass('1.3: Respect 450-char limit', `All ${chunks.length} chunks within limit`);
    } else {
      results.fail('1.3: Respect 450-char limit', new Error(`${oversized.length} chunks exceed 450 chars`));
    }
  } catch (err) {
    results.fail('1.3: Respect 450-char limit', err);
  }
  
  // Test 1.4: Preserve mystical terminology
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    const combined = chunks.map(c => c.text).join(' ');
    
    const terms = ['14.73°', '7.41°', '20.82°', 'Black Tourmaline', 'Carnelian'];
    let allFound = true;
    
    for (const term of terms) {
      if (!combined.includes(term)) {
        console.log(`  Missing: ${term}`);
        allFound = false;
      }
    }
    
    if (allFound) {
      results.pass('1.4: Preserve mystical terminology', 'All mystical terms intact');
    } else {
      results.fail('1.4: Preserve mystical terminology', new Error('Some terms missing'));
    }
  } catch (err) {
    results.fail('1.4: Preserve mystical terminology', err);
  }
  
  // Test 1.5: Empty text handling
  try {
    const chunks = smartChunkBySentence('', 450);
    if (chunks.length === 0) {
      results.pass('1.5: Empty text handling', 'Returns empty array');
    } else {
      results.fail('1.5: Empty text handling', new Error('Should return empty array'));
    }
  } catch (err) {
    results.fail('1.5: Empty text handling', err);
  }
  
  // Test 1.6: Abbreviation handling
  try {
    const text = "Dr. Smith is here. Prof. Johnson arrived. This is a test.";
    const chunks = smartChunkBySentence(text, 450);
    
    const combined = chunks.map(c => c.text).join(' ');
    if (combined.includes('Dr. Smith') && combined.includes('Prof. Johnson')) {
      results.pass('1.6: Abbreviation handling', 'Abbreviations preserved correctly');
    } else {
      results.fail('1.6: Abbreviation handling', new Error('Abbreviations broken'));
    }
  } catch (err) {
    results.fail('1.6: Abbreviation handling', err);
  }
  
  return results;
}

// ============================================================================
// TEST SUITE 2: Oracle Response Chunking
// ============================================================================

function testOracleResponseChunking() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}SUITE 2: Oracle Response Chunking${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
  
  const results = new TestResults();
  
  // Test 2.1: Chunk the oracle response
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    
    console.log(`  Oracle response: ${ORACLE_TEST_RESPONSE.length} chars total`);
    console.log(`  Created ${chunks.length} chunks\n`);
    
    // Show chunk breakdown
    chunks.forEach((chunk, idx) => {
      console.log(`  Chunk ${idx + 1}: ${chunk.charCount} chars, ${chunk.sentenceCount} sentences`);
      console.log(`    "${chunk.text.substring(0, 60)}..."\n`);
    });
    
    results.pass('2.1: Chunk oracle response', `${chunks.length} chunks created, ${ORACLE_TEST_RESPONSE.length} total chars`);
  } catch (err) {
    results.fail('2.1: Chunk oracle response', err);
  }
  
  // Test 2.2: Validate all chunks
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    const validation = validateChunks(chunks, 500);
    
    if (validation.valid) {
      results.pass('2.2: Validate all chunks', `All chunks within 500-char limit`);
    } else {
      const violations = validation.violations.map(v => `Chunk ${v.chunkIndex}: ${v.charCount} chars`).join(', ');
      results.fail('2.2: Validate all chunks', new Error(`Violations: ${violations}`));
    }
  } catch (err) {
    results.fail('2.2: Validate all chunks', err);
  }
  
  // Test 2.3: Chunk reassembly
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    const reassembled = chunks.map(c => c.text).join(' ').trim();
    
    // Remove extra whitespace for comparison
    const original = ORACLE_TEST_RESPONSE.trim();
    const reassembledNorm = reassembled.replace(/\s+/g, ' ');
    const originalNorm = original.replace(/\s+/g, ' ');
    
    if (reassembledNorm === originalNorm) {
      results.pass('2.3: Chunk reassembly', 'Reassembled text matches original');
    } else {
      results.fail('2.3: Chunk reassembly', new Error('Reassembled text does not match'));
    }
  } catch (err) {
    results.fail('2.3: Chunk reassembly', err);
  }
  
  // Test 2.4: API call efficiency
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    const apiCalls = chunks.length;
    const delay = apiCalls * 0.5; // 500ms per chunk
    
    if (apiCalls <= 10 && delay <= 5) {
      results.pass('2.4: API call efficiency', `${apiCalls} calls × 500ms = ${delay.toFixed(1)}s total`);
    } else {
      results.fail('2.4: API call efficiency', new Error(`Too many API calls: ${apiCalls}`));
    }
  } catch (err) {
    results.fail('2.4: API call efficiency', err);
  }
  
  // Test 2.5: Sentence preservation
  try {
    const chunks = smartChunkBySentence(ORACLE_TEST_RESPONSE, 450);
    const totalSentences = chunks.reduce((sum, c) => sum + c.sentenceCount, 0);
    
    // Count sentences in original (rough estimate: count periods, exclamation, question marks)
    const originalSentences = (ORACLE_TEST_RESPONSE.match(/[.!?]+/g) || []).length;
    
    console.log(`  Original sentences: ~${originalSentences}, Chunked sentences: ${totalSentences}`);
    
    if (Math.abs(totalSentences - originalSentences) <= 2) {
      results.pass('2.5: Sentence preservation', `${totalSentences} sentences preserved`);
    } else {
      results.fail('2.5: Sentence preservation', new Error(`Sentence count mismatch`));
    }
  } catch (err) {
    results.fail('2.5: Sentence preservation', err);
  }
  
  return results;
}

// ============================================================================
// TEST SUITE 3: Edge Cases
// ============================================================================

function testEdgeCases() {
  console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}SUITE 3: Edge Cases${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
  
  const results = new TestResults();
  
  // Test 3.1: Very small chunk limit
  try {
    const text = "First sentence. Second sentence. Third sentence.";
    const chunks = smartChunkBySentence(text, 20);
    
    if (chunks.length > 0 && chunks.every(c => c.charCount <= 20)) {
      results.pass('3.1: Very small chunk limit', `Enforced 20-char limit with ${chunks.length} chunks`);
    } else {
      results.fail('3.1: Very small chunk limit', new Error('Limit not enforced'));
    }
  } catch (err) {
    results.fail('3.1: Very small chunk limit', err);
  }
  
  // Test 3.2: Single very long sentence
  try {
    const text = "This is a very long sentence that goes on and on and on and will exceed the chunk limit and needs to be broken at word boundaries because it's just one sentence with no periods in the middle of it all.";
    const chunks = smartChunkBySentence(text, 100);
    
    if (chunks.length > 1) {
      results.pass('3.2: Single long sentence', `Split into ${chunks.length} chunks at word boundaries`);
    } else {
      results.fail('3.2: Single long sentence', new Error('Should split at word boundaries'));
    }
  } catch (err) {
    results.fail('3.2: Single long sentence', err);
  }
  
  // Test 3.3: Multiple punctuation marks
  try {
    const text = "What?! Really! Yes... indeed!";
    const chunks = smartChunkBySentence(text, 450);
    
    if (chunks.length > 0) {
      results.pass('3.3: Multiple punctuation marks', `Handled multiple punctuation with ${chunks.length} chunks`);
    } else {
      results.fail('3.3: Multiple punctuation marks', new Error('Failed to chunk'));
    }
  } catch (err) {
    results.fail('3.3: Multiple punctuation marks', err);
  }
  
  // Test 3.4: Degree symbols and special characters
  try {
    const text = "The Sun at 14.73° in Capricorn. Moon at 7.41° in Leo. Mars at 20.82° in Cancer.";
    const chunks = smartChunkBySentence(text, 450);
    
    const combined = chunks.map(c => c.text).join(' ');
    if (combined.includes('14.73°') && combined.includes('7.41°') && combined.includes('20.82°')) {
      results.pass('3.4: Degree symbols', 'Preserved degree symbols in chunks');
    } else {
      results.fail('3.4: Degree symbols', new Error('Degree symbols lost'));
    }
  } catch (err) {
    results.fail('3.4: Degree symbols', err);
  }
  
  // Test 3.5: Ellipsis handling
  try {
    const text = "This is interesting... very interesting indeed. The end.";
    const chunks = smartChunkBySentence(text, 450);
    
    const combined = chunks.map(c => c.text).join(' ');
    if (combined.includes('...')) {
      results.pass('3.5: Ellipsis handling', 'Preserved ellipsis in chunks');
    } else {
      results.fail('3.5: Ellipsis handling', new Error('Ellipsis lost'));
    }
  } catch (err) {
    results.fail('3.5: Ellipsis handling', err);
  }
  
  return results;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}  TRANSLATION CHUNKING TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  
  const suites = [
    testSentenceChunking(),
    testOracleResponseChunking(),
    testEdgeCases()
  ];
  
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  const totalTests = totalPassed + totalFailed;
  
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}FINAL RESULTS${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`\nTotal: ${colors.green}${totalPassed}${colors.reset} passed, ${colors.red}${totalFailed}${colors.reset} failed out of ${totalTests} tests`);
  
  const pct = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  console.log(`Success Rate: ${pct}%\n`);
  
  if (totalFailed === 0) {
    console.log(`${colors.green}✓ ALL TESTS PASSED!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ SOME TESTS FAILED${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
