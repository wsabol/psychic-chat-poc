/**
 * Test file for Scent Utilities
 * Demonstrates the scent recommendation engine functionality
 * 
 * Run with: node --experimental-modules worker/tests/scentUtils.test.js
 */

import {
    getScentsByCard,
    getScentsByEmotionalState,
    getScentsByZodiac,
    getScentsByCards,
    formatScentRecommendation,
    getPoeticScentGuidance
} from '../modules/scentUtils.js';

console.log('🌸 SCENT UTILS TEST SUITE\n');

// Test 1: Get scents for individual cards
console.log('--- Test 1: Individual Card Scent Mapping ---');
const theTower = getScentsByCard('The Tower');
console.log('The Tower:', theTower);
// Expected: { scents: ["frankincense", "myrrh", "helichrysum"], theme: "Grounding through upheaval, resilience, clarity" }

const theLovers = getScentsByCard('The Lovers');
console.log('The Lovers:', theLovers);
// Expected: rose absolute, jasmine, sandalwood

console.log('\n--- Test 2: Multiple Cards ---');
const cardNames = ['The Chariot', 'The Sun', 'The World'];
const multiCard = getScentsByCards(cardNames);
console.log('Multiple Cards (Chariot, Sun, World):', multiCard);
// Expected: Combined scents from all three cards

console.log('\n--- Test 3: Emotional States ---');
const anxietyScents = getScentsByEmotionalState('anxiety');
console.log('Anxiety scents:', anxietyScents);
// Expected: lavender, chamomile, bergamot with grounding guidance

const griefScents = getScentsByEmotionalState('grief');
console.log('Grief scents:', griefScents);
// Expected: myrrh, rose, helichrysum with compassionate guidance

console.log('\n--- Test 4: Zodiac Signs ---');
const ariesScents = getScentsByZodiac('Aries');
console.log('Aries scents:', ariesScents);
// Expected: ginger, black pepper, frankincense

const piscesScents = getScentsByZodiac('Pisces');
console.log('Pisces scents:', piscesScents);
// Expected: jasmine, lavender, sandalwood

console.log('\n--- Test 5: Format Scent Recommendation ---');
const formatted1 = formatScentRecommendation(['frankincense', 'myrrh']);
console.log('Formatted (array):\n', formatted1);

const formatted2 = formatScentRecommendation('rose, geranium, jasmine', 'for heart opening and love');
console.log('\nFormatted (string with guidance):\n', formatted2);

console.log('\n--- Test 6: Poetic Scent Guidance by Context ---');
const context1 = {
    cards: ['The Strength', 'The Star'],
    emotionalState: '',
    zodiacSign: 'Leo'
};
const poeticGuidance1 = getPoeticScentGuidance(context1);
console.log('Context 1 (with cards and zodiac):\n', poeticGuidance1);

const context2 = {
    cards: [],
    emotionalState: 'transformation',
    zodiacSign: 'Scorpio'
};
const poeticGuidance2 = getPoeticScentGuidance(context2);
console.log('\nContext 2 (emotional state first):\n', poeticGuidance2);

const context3 = {
    cards: [],
    emotionalState: '',
    zodiacSign: 'Aquarius'
};
const poeticGuidance3 = getPoeticScentGuidance(context3);
console.log('\nContext 3 (zodiac only):\n', poeticGuidance3);

console.log('\n--- Test 7: Edge Cases ---');
const nullCard = getScentsByCard('Invalid Card Name');
console.log('Invalid card:', nullCard); // Should be null

const nullState = getScentsByEmotionalState('nonexistent_state');
console.log('Invalid emotional state:', nullState); // Should be null

const nullZodiac = getScentsByZodiac('');
console.log('Empty zodiac:', nullZodiac); // Should be null

console.log('\n✨ All tests complete!');
