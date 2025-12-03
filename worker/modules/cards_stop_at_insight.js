/**
 * Card Extraction - Stop before "Astrological Insight" section
 */
export function extractCardsFromResponse(responseText, deck) {
    console.log('[CARDS] Starting extraction...');
    
    // IMPORTANT: Only search for cards BEFORE the "Astrological Insight" section
    // This prevents picking up card names mentioned in astrology/interpretation
    let searchText = responseText;
    const insightIndex = responseText.toLowerCase().indexOf('astrological insight');
    const interpretationIndex = responseText.toLowerCase().indexOf('interpretation:');
    
    // Use whichever comes first
    let cutoffIndex = -1;
    if (insightIndex !== -1 && interpretationIndex !== -1) {
        cutoffIndex = Math.min(insightIndex, interpretationIndex);
    } else if (insightIndex !== -1) {
        cutoffIndex = insightIndex;
    } else if (interpretationIndex !== -1) {
        cutoffIndex = interpretationIndex;
    }
    
    if (cutoffIndex !== -1) {
        searchText = responseText.substring(0, cutoffIndex);
        console.log(`[CARDS] Limiting search to before position ${cutoffIndex}`);
    }
    
    const allMatches = [];
    
    // Search for each card in the deck (only in the card draw section)
    for (const card of deck) {
        const baseName = card.name.replace(/^The\s+/i, '');
        
        // Pattern 1: "Card Name (Reversed)" or "Card Name (Inverted)" - most reliable
        const reversePattern = new RegExp(
            `\\b(The\\s+)?${escapeRegex(baseName)}\\s*\\((?:Reversed|Inverted|reversed|inverted)\\)`,
            'gi'
        );
        
        let match = reversePattern.exec(searchText);
        if (match) {
            allMatches.push({
                position: match.index,
                card: card,
                inverted: true,
                source: 'explicit_reversal'
            });
            continue;
        }
        
        // Pattern 2: "Card N: Card Name" or just "Card Name" at start of line
        const cardPattern = new RegExp(
            `(?:Card\\s*\\d+\\s*:|^)\\s*(?:The\\s+)?${escapeRegex(baseName)}\\b`,
            'gim'
        );
        
        match = cardPattern.exec(searchText);
        if (match) {
            allMatches.push({
                position: match.index,
                card: card,
                inverted: false,
                source: 'card_draw'
            });
        }
    }
    
    // Sort by position
    allMatches.sort((a, b) => a.position - b.position);
    
    // Deduplicate by card ID
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
            
            console.log(`[CARDS] ✓ Found ${match.card.name}${match.inverted ? ' [REVERSED]' : ''} (${match.source})`);
        }
    }
    
    console.log(`[CARDS] ✓ Extraction complete: ${extractedCards.length} cards`);
    console.log(`[CARDS] Result:`, extractedCards.map(c => `${c.name}${c.inverted ? ' [REV]' : ''}`).join(', '));
    
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
