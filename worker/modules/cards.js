/**
 * Extract tarot cards from Oracle response
 * Looks for both bolded (**Card Name**) and plain text card names
 */
export function extractCardsFromResponse(responseText, deck) {
    const extractedCards = [];
    const foundCardIds = new Set();
    
    // Step 1: Find bolded card patterns
    const boldCardPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [];
    let match;

    
    while ((match = boldCardPattern.exec(responseText)) !== null) {
        const boldedText = match[1].trim();
        
        if (/^(past|present|future|position|spread|card\s*\d+)$/i.test(boldedText)) {
            continue;
        }
        
        // Clean: remove (Upright)/(Reversed), colons, "Card" suffix
        const cleanedText = boldedText
            .replace(/\s*\([^)]*\)\s*$/g, '')  // Remove (Upright), (Reversed), etc.
            .replace(/:\s*$/g, '')              // Remove trailing colon
            .replace(/\s+card\s*$/i, '')        // Remove "Card" suffix
            .trim();
        
        console.log('Processing bolded text:', boldedText, '-> cleaned:', cleanedText);

        if (!cleanedText) continue;
        
        for (const card of deck) {
            if (cardNameMatches(card.name, cleanedText)) {
                boldMatches.push({
                    position: match.index,
                    cardName: boldedText,
                    card: card,
                    source: 'bold'
                });
                break;
            }
        }
    }
    
    // Step 2: Find plain text card names (for cards not found in bold)
    for (const card of deck) {
        if (foundCardIds.has(card.id)) continue;
        
        // Create a pattern to find the card name in the text
        const cardPattern = new RegExp(`\\b${escapeRegex(card.name)}\\b`, 'gi');
        let plainMatch;
        
        while ((plainMatch = cardPattern.exec(responseText)) !== null) {
            // Skip if this is part of a bold match we already found
            const isBoldMatch = boldMatches.some(bm => 
                plainMatch.index >= bm.position && plainMatch.index < bm.position + 60
            );
            
            if (!isBoldMatch && !foundCardIds.has(card.id)) {
                // Check context for reversal indicator
                const contextStart = Math.max(0, plainMatch.index - 30);
                const contextEnd = Math.min(responseText.length, plainMatch.index + 60);
                const context = responseText.substring(contextStart, contextEnd).toLowerCase();
                const hasReversedPattern = /\b(?:reversed|inverted|upside[\s-]*down|\(r\))\b/.test(context);
                
                boldMatches.push({
                    position: plainMatch.index,
                    cardName: card.name,
                    card: card,
                    source: 'plain',
                    inverted: hasReversedPattern
                });
                foundCardIds.add(card.id);
                break;
            }
        }
    }
    
    // Step 3: Process and sort all matches
    boldMatches.sort((a, b) => a.position - b.position);
    
    for (const boldMatch of boldMatches) {
        if (!foundCardIds.has(boldMatch.card.id) || boldMatch.source === 'bold') {
            const contextEnd = Math.min(responseText.length, boldMatch.position + 60);
            const contextAfter = responseText.substring(boldMatch.position, contextEnd).toLowerCase();
            const hasReversedPattern = /\b(?:reversed|inverted|upside[\s-]*down|\(r\)|\(reversed\))\b/.test(contextAfter);
            
            extractedCards.push({
                ...boldMatch.card,
                inverted: boldMatch.inverted || hasReversedPattern
            });
            foundCardIds.add(boldMatch.card.id);
        }
    }
    
    return extractedCards;
}

/**
 * Check if a card name matches (accounting for "The" prefix)
 */
function cardNameMatches(cardName, text) {
    const cardNameLower = cardName.toLowerCase();
    const textLower = text.toLowerCase();

    const result = cardNameLower === textLower || 
           cardNameLower === textLower.replace(/^the\s+/, '') ||
           cardNameLower.replace(/^the\s+/, '') === textLower ||
           cardNameLower.replace(/^the\s+/, '') === textLower.replace(/^the\s+/, '');

    console.log(`Comparing card name "${cardName}" with text "${text}": ${result}`);
    
    return result;
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
