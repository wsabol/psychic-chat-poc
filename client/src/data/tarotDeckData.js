/**
 * TAROT DECK DATA - Shared data source
 * 
 * This file now imports from the shared tarot data directory.
 * The tarot deck is maintained in one location (shared/tarot/) and used by both:
 * - Worker: for card selection and extraction logic
 * - Client: for display purposes
 * 
 * This eliminates duplicate data and ensures consistency across the application.
 */

import { majorArcana } from '../../../shared/tarot/majorArcana.js';
import { cups } from '../../../shared/tarot/cups.js';
import { pentacles } from '../../../shared/tarot/pentacles.js';
import { swords } from '../../../shared/tarot/swords.js';
import { wands } from '../../../shared/tarot/wands.js';

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

// For backward compatibility, also export as default
export default tarotDeck;
