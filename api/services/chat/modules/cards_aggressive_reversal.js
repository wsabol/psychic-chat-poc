/**
 * Extract tarot cards from Oracle response
 * AGGRESSIVE REVERSAL DETECTION - checks multiple patterns
 */
export function extractCardsFromResponse(responseText, deck) {
    const extractedCards = [];
    const foundCardIds = new Set();
    
    // Find all card mentions in the text (both plain and structured)
    const allMatches = [];
    
    // Pattern 1: Look for card names in the deck
    for (const card of deck) {
        // Create patterns that match card names with optional "The" prefix
        const patterns = [
            new RegExp(`\\b${escapeRegex(card.name)}\\b`, 'gi'),  // Exact match
            new RegExp(`\\bThe\\s+${escapeRegex(card.name)}\\b`, 'gi'),  // With "The"
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                // Get surrounding context to check for reversals
                const contextStart = Math.max(0, match.index - 50);
                const contextEnd = Math.min(responseText.length, match.index + match[0].length + 50);
                const fullContext = responseText.substring(contextStart, contextEnd);
                
                // Check if reversed/inverted is mentioned nearby
                const hasReversed = /\b(?:reversed|inverted|upside[\s-]*down|\(r\)|\(reversed\))\b/i.test(fullContext);
                
                allMatches.push({
                    position: match.index,
                    card: card,
                    cardName: match[0],
                    inverted: hasReversed,
                    context: fullContext
                });
            }
        }
    }
    
    // Sort by position
    allMatches.sort((a, b) => a.position - b.position);
    
    // Deduplicate (keep first occurrence of each card)
    for (const match of allMatches) {
        if (!foundCardIds.has(match.card.id)) {
            extractedCards.push({
                ...match.card,
                inverted: match.inverted
            });
            foundCardIds.add(match.card.id);
            

        }
    }
    
    return extractedCards;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format cards for storage - keep only essential metadata
 */
export function formatCardsForStorage(cards) {
    return cards.map(card => ({
        id: card.id,
        name: card.name,
        inverted: card.inverted
    }));
}
