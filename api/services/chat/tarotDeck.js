/**
 * TAROT DECK - Complete 78-card deck organized by arcana and suit
 * 
 * This file imports and combines all tarot cards from organized modules:
 * - Major Arcana (0-21) - includes Hebrew correspondences
 * - Cups (22-35)
 * - Pentacles (36-49)
 * - Swords (50-63)
 * - Wands (64-77)
 * 
 * All imports use the same structure as before, maintaining backward compatibility
 * with tarotUtils.js and oracleProcessor.js
 */

import { majorArcana } from './tarot/majorArcana.js';
import { cups } from './tarot/cups.js';
import { pentacles } from './tarot/pentacles.js';
import { swords } from './tarot/swords.js';
import { wands } from './tarot/wands.js';

/**
 * Complete tarot deck - all 78 cards
 * Organized as: Major Arcana + Cups + Pentacles + Swords + Wands
 */
export const tarotDeck = [
    ...majorArcana,
    ...cups,
    ...pentacles,
    ...swords,
    ...wands
];
