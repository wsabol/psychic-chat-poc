/**
 * BULLETPROOF Card Extraction - Preserves Order
 * Handles all formatting variations and maintains card order as they appear in response
 */
export function extractCardsFromResponse(responseText, deck) {
    console.log('[CARDS] Starting extraction with order preservation...');
    const allMatches = [];
    
    // Search for each card in the deck and record its position
    for (const card of deck) {
        // Create multiple search patterns for the card
        const baseName = card.name.replace(/^The\s+/i, '');  // Remove "The " for searching
        const patterns = [
            new RegExp(`\\bThe\\s+${escapeRegex(baseName)}\\b`, 'gi'),  // With "The"
            new RegExp(`\\b${escapeRegex(baseName)}\\b`, 'gi')           // Without "The"
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                // Found this card - check if it's reversed
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;
                
                // Look at surrounding context
                const contextStart = Math.max(0, matchStart - 100);
                const contextEnd = Math.min(responseText.length, matchEnd + 100);
                const context = responseText.substring(contextStart, contextEnd).toLowerCase();
                
                // Check for reversal keywords
                const hasReversed = /\b(?:reversed|inverted|upside[\s-]*down|\(r\)|\(reversed\))\b/.test(context);
                
                allMatches.push({
                    position: matchStart,  // IMPORTANT: record position for sorting
                    card: card,
                    inverted: hasReversed,
                    patternIndex: patterns.indexOf(pattern)
                });
                
                break; // Only take first match for this card name
            }
        }
    }
    
    // Sort by position in text to preserve order
    allMatches.sort((a, b) => a.position - b.position);
    
    // Deduplicate by card ID (keep first occurrence)
    const extractedCards = [];
    const foundCardIds = new Set();
    
    for (const match of allMatches) {
        if (!foundCardIds.has(match.card.id)) {
            extractedCards.push({
                id: match.card.id,
                name: match.card.name,
                suit: match.card.suit,
                inverted: match.inverted
            });
            foundCardIds.add(match.card.id);
            
            console.log(`[CARDS] ✓ Found ${match.card.name}${match.inverted ? ' [REVERSED]' : ''} at position ${match.position}`);
        }
    }
    
    console.log(`[CARDS] ✓ Extraction complete: ${extractedCards.length} cards found`);
    console.log(`[CARDS] Order preserved:`, extractedCards.map(c => `${c.name}${c.inverted ? ' [REV]' : ''}`).join(', '));
    
    return extractedCards;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format cards for storage
 */
export function formatCardsForStorage(cards) {
    return cards.map(card => ({
        id: card.id,
        name: card.name,
        inverted: card.inverted
    }));
}
