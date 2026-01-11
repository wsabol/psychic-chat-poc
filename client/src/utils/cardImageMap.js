/**
 * Card Image Mapper - Maps card IDs to image filenames
 * 
 * This uses the card ID from the extracted cards data (which comes from tarotDeck.js)
 * to reliably find the correct image file. This ensures we're using the exact same
 * deck structure as the backend extraction logic.
 * 
 * The extraction logic in worker/modules/cards.js uses sophisticated regex patterns
 * to handle various card name formats ("The Fool", "Fool", "Eight of Swords", 
 * "The Eight of Swords", etc.) and correctly identifies the card object from tarotDeck,
 * so we can rely on the card.id being correct.
 */

const cardIdToImageMap = {
  // Major Arcana (0-21)
  0: 'thefool.jpeg',
  1: 'themagician.jpeg',
  2: 'thehighpriestess.jpeg',
  3: 'theempress.jpeg',
  4: 'theemperor.jpeg',
  5: 'thehierophant.jpeg',
  6: 'thelovers.jpeg',
  7: 'thechariot.jpeg',
  8: 'thestrength.jpeg',
  9: 'thehermit.jpeg',
  10: 'thewheeloffortune.jpeg',
  11: 'thejustice.jpeg',
  12: 'thehangedman.jpeg',
  13: 'death.jpeg',
  14: 'temperance.jpeg',
  15: 'thedevil.jpeg',
  16: 'thetower.jpeg',
  17: 'thestar.jpeg',
  18: 'themoon.jpeg',
  19: 'thesun.jpeg',
  20: 'thejudgment.jpeg',
  21: 'theworld.jpeg',

  // Cups (22-35)
  22: 'aceofcups.jpeg',
  23: 'twoofcups.jpeg',
  24: 'threeofcups.jpeg',
  25: 'fourofcups.jpeg',
  26: 'fiveofcups.jpeg',
  27: 'sixofcups.jpeg',
  28: 'thesevenofcups.jpeg',
  29: 'eightofcups.jpeg',
  30: 'nineofcups.jpeg',
  31: 'thetenofcups.jpeg',
  32: 'pageofcups.jpeg',
  33: 'knightofcups.jpeg',
  34: 'queenofcups.jpeg',
  35: 'kingofcups.jpeg',

  // Pentacles (36-49)
  36: 'aceofpentacles.jpeg',
  37: 'twoofpentacles.jpeg',
  38: 'thethreeofpentacles.jpeg',
  39: 'fourofpentacles.jpeg',
  40: 'fiveofpentacles.jpeg',
  41: 'sixofpentacles.jpeg',
  42: 'sevenofpentacles.jpeg',
  43: 'theeightofpentacles.jpeg',
  44: 'nineofpentacles.jpeg',
  45: 'tenofpentacles.jpeg',
  46: 'pageofpentacles.jpeg',
  47: 'knightofpentacles.jpeg',
  48: 'queenofpentacles.jpeg',
  49: 'kingofpentacles.jpeg',

  // Swords (50-63)
  50: 'theaceofwands.jpeg',
  51: 'twoofswords.jpeg',
  52: 'threeofswords.jpeg',
  53: 'thefourofswords.jpeg',
  54: 'fiveofswords.jpeg',
  55: 'sixofswords.jpeg',
  56: 'sevenofswords.jpeg',
  57: 'eightofswords.jpeg',
  58: 'nineofswords.jpeg',
  59: 'tenofswords.jpeg',
  60: 'pageofswords.jpeg',
  61: 'theknightofswords.jpeg',
  62: 'queenofswords.jpeg',
  63: 'kingofswords.jpeg',

  // Wands (64-77)
  64: 'theaceofwands.jpeg',
  65: 'twoofwands.jpeg',
  66: 'threeofwands.jpeg',
  67: 'fourofwands.jpeg',
  68: 'thefiveofwands.jpeg',
  69: 'sixofwands.jpeg',
  70: 'thesevenofwands.jpeg',
  71: 'eightofwands.jpeg',
  72: 'nineofwands.jpeg',
  73: 'tenofwands.jpeg',
  74: 'pageofwands.jpeg',
  75: 'knightofwands.jpeg',
  76: 'queenofwands.jpeg',
  77: 'kingofwands.jpeg',
};

/**
 * Get image filename for a card by ID
 * Uses card ID from the extraction logic (which maps to tarotDeck.js IDs)
 * 
 * @param {number|string} cardId - The card ID from extracted card data
 * @returns {string|null} - The image filename or null if not found
 */
export function getCardImageByID(cardId) {
  const id = Number(cardId);
  
  if (cardIdToImageMap[id]) {
    return cardIdToImageMap[id];
  }
  
  return null;
}

/**
 * Fallback: Get image filename by card name
 * Only used if card data doesn't have an ID. Handles name variations
 * using the same logic as the backend extraction.
 * 
 * @param {string} cardName - The card name 
 * @returns {string|null} - The image filename or null if not found
 */
export function getCardImageByName(cardName) {
  if (!cardName) return null;
  
  // Normalize the name: remove "The" prefix and convert to lowercase
  const normalized = cardName
    .replace(/^The\s+/i, '')
    .toLowerCase()
    .replace(/\s+/g, '');

  // Build a simple lookup for normalized names
  const nameToFilename = {
    // Major
    fool: 'thefool.jpeg',
    magician: 'themagician.jpeg',
    highpriestess: 'thehighpriestess.jpeg',
    empress: 'theempress.jpeg',
    emperor: 'theemperor.jpeg',
    hierophant: 'thehierophant.jpeg',
    lovers: 'thelovers.jpeg',
    chariot: 'thechariot.jpeg',
    strength: 'thestrength.jpeg',
    hermit: 'thehermit.jpeg',
    wheeloffortune: 'thewheeloffortune.jpeg',
    justice: 'thejustice.jpeg',
    hangedman: 'thehangedman.jpeg',
    death: 'death.jpeg',
    temperance: 'temperance.jpeg',
    devil: 'thedevil.jpeg',
    tower: 'thetower.jpeg',
    star: 'thestar.jpeg',
    moon: 'themoon.jpeg',
    sun: 'thesun.jpeg',
    judgment: 'thejudgment.jpeg',
    world: 'theworld.jpeg',
    
    // Cups
    aceofcups: 'aceofcups.jpeg',
    twoofcups: 'twoofcups.jpeg',
    threeofcups: 'threeofcups.jpeg',
    fourofcups: 'fourofcups.jpeg',
    fiveofcups: 'fiveofcups.jpeg',
    sixofcups: 'sixofcups.jpeg',
    sevenofcups: 'thesevenofcups.jpeg',
    eightofcups: 'eightofcups.jpeg',
    nineofcups: 'nineofcups.jpeg',
    tenofcups: 'thetenofcups.jpeg',
    pageofcups: 'pageofcups.jpeg',
    knightofcups: 'knightofcups.jpeg',
    queenofcups: 'queenofcups.jpeg',
    kingofcups: 'kingofcups.jpeg',
    
    // Pentacles
    aceofpentacles: 'aceofpentacles.jpeg',
    twoofpentacles: 'twoofpentacles.jpeg',
    threeofpentacles: 'thethreeofpentacles.jpeg',
    fourofpentacles: 'fourofpentacles.jpeg',
    fiveofpentacles: 'fiveofpentacles.jpeg',
    sixofpentacles: 'sixofpentacles.jpeg',
    sevenofpentacles: 'sevenofpentacles.jpeg',
    eightofpentacles: 'theeightofpentacles.jpeg',
    nineofpentacles: 'nineofpentacles.jpeg',
    tenofpentacles: 'tenofpentacles.jpeg',
    pageofpentacles: 'pageofpentacles.jpeg',
    knightofpentacles: 'knightofpentacles.jpeg',
    queenofpentacles: 'queenofpentacles.jpeg',
    kingofpentacles: 'kingofpentacles.jpeg',
    
    // Swords
    aceofswords: 'theaceofwands.jpeg',
    twoofswords: 'twoofswords.jpeg',
    threeofswords: 'threeofswords.jpeg',
    fourofswords: 'thefourofswords.jpeg',
    fiveofswords: 'fiveofswords.jpeg',
    sixofswords: 'sixofswords.jpeg',
    sevenofswords: 'sevenofswords.jpeg',
    eightofswords: 'eightofswords.jpeg',
    nineofswords: 'nineofswords.jpeg',
    tenofswords: 'tenofswords.jpeg',
    pageofswords: 'pageofswords.jpeg',
    knightofswords: 'theknightofswords.jpeg',
    queenofswords: 'queenofswords.jpeg',
    kingofswords: 'kingofswords.jpeg',
    
    // Wands
    aceofwands: 'theaceofwands.jpeg',
    twoofwands: 'twoofwands.jpeg',
    threeofwands: 'threeofwands.jpeg',
    fourofwands: 'fourofwands.jpeg',
    fiveofwands: 'thefiveofwands.jpeg',
    sixofwands: 'sixofwands.jpeg',
    sevenofwands: 'thesevenofwands.jpeg',
    eightofwands: 'eightofwands.jpeg',
    nineofwands: 'nineofwands.jpeg',
    tenofwands: 'tenofwands.jpeg',
    pageofwands: 'pageofwands.jpeg',
    knightofwands: 'knightofwands.jpeg',
    queenofwands: 'queenofwands.jpeg',
    kingofwands: 'kingofwands.jpeg',
  };

  return nameToFilename[normalized] || null;
}

export default getCardImageByID;

