/**
 * Extract tarot cards from Oracle response
 * Looks for bolded card names in **Card Name** format
 */
export function extractCardsFromResponse(responseText, deck) {
    const extractedCards = [];
    const foundCardIds = new Set();
    
    const boldCardPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [];
    let match;
    
    // Find all bolded text patterns
    while ((match = boldCardPattern.exec(responseText)) !== null) {
        const boldedText = match[1].trim();
        
        // Skip position labels (Past, Present, Future, etc.)
        if (/^(past|present|future|position|spread|card\s*\d+)$/i.test(boldedText)) {
            continue;
        }
        
        // Strip (Reversed)/(Inverted) and "Card" suffix for matching
        const cleanedText = boldedText
            .replace(/\s*\([^)]*\)\s*$/g, '')
            .replace(/\s+card\s*$/i, '')
            .trim();
        
        if (!cleanedText) continue;
        
        // Check if this bolded text is an actual card name
        for (const card of deck) {
            const cardNameLower = card.name.toLowerCase();
            const cleanedLower = cleanedText.toLowerCase();
            
            if (cardNameLower === cleanedLower || 
                cardNameLower === cleanedLower.replace(/^the\s+/, '') ||
                cardNameLower.replace(/^the\s+/, '') === cleanedLower ||
                cardNameLower.replace(/^the\s+/, '') === cleanedLower.replace(/^the\s+/, '')) {
                boldMatches.push({
                    position: match.index,
                    cardName: boldedText,
                    card: card
                });
                break;
            }
        }
    }
    
    // Process matched cards and check for reversals
    if (boldMatches.length > 0) {
        boldMatches.sort((a, b) => a.position - b.position);
        
        for (const boldMatch of boldMatches) {
            if (!foundCardIds.has(boldMatch.card.id)) {
                const contextEnd = Math.min(responseText.length, boldMatch.position + 40);
                const contextAfter = responseText.substring(boldMatch.position, contextEnd).toLowerCase();
                const hasReversedPattern = /\b(?:reversed|inverted|upside[\s-]*down)\b/.test(contextAfter);
                
                extractedCards.push({
                    ...boldMatch.card,
                    inverted: hasReversedPattern
                });
                foundCardIds.add(boldMatch.card.id);
            }
        }
    }
    
    return extractedCards;
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
