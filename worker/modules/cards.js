/**
 * Card Extraction - Match only cards in "The Cards Drawn" section
 * 
 * CRITICAL: Extract cards ONLY from the dedicated "The Cards Drawn" section.
 * Stop extracting when we reach the next section header (Card Reading Summary, Deeper Interpretation, etc).
 * This prevents picking up card names mentioned in later interpretation sections.
 * 
 * Uses word boundaries and strict matching to avoid false positives.
 */

export function extractCardsFromResponse(responseText, deck) {
    let searchText = responseText;
    
    // Find "The Cards Drawn" section specifically
    const cardsDrawnStart = responseText.toLowerCase().indexOf('<h3>the cards drawn</h3>');
    
    if (cardsDrawnStart !== -1) {
        // Found the cards section - now find where it ends
        const searchFromIndex = cardsDrawnStart + 24; // skip past the opening tag
        
        // Look for the next section header (this marks the end of cards section)
        const nextSectionPatterns = [
            '<h3>card reading summary</h3>',
            '<h3>deeper interpretation</h3>',
            '<h3>astrological alignment</h3>',
            '<h3>crystal guidance</h3>',
            '<h3>path forward</h3>',
            '<h3>aromatherapy',
        ];
        
        let sectionEnd = responseText.length; // default to end of text
        
        for (const pattern of nextSectionPatterns) {
            const idx = responseText.toLowerCase().indexOf(pattern, searchFromIndex);
            if (idx !== -1 && idx < sectionEnd) {
                sectionEnd = idx;
            }
        }
        
        // Extract ONLY the "The Cards Drawn" section
        searchText = responseText.substring(searchFromIndex, sectionEnd);
    } else {
        // Fallback: no dedicated cards section header found
        // Use conservative approach - cut at first major section header
        const endMarkers = [
            '<h3>',
        ];
        
        let firstHeaderIndex = responseText.toLowerCase().indexOf('<h3>');
        if (firstHeaderIndex !== -1) {
            // Find the second h3 tag (skip the first one if it's the cards section)
            let secondHeaderIndex = responseText.toLowerCase().indexOf('<h3>', firstHeaderIndex + 4);
            if (secondHeaderIndex !== -1) {
                searchText = responseText.substring(firstHeaderIndex, secondHeaderIndex);
            }
        }
    }
    
    const allMatches = [];
    
    for (const card of deck) {
        const baseName = card.name.replace(/^The\s+/i, '');
        
        // Pattern 1: Reversals (explicit with parentheses)
        const reversePattern = new RegExp(
            `\\b(The\\s+)?${escapeRegex(baseName)}\\s*\\((?:Reversed|Inverted|reversed|inverted)\\)`,
            'i'
        );
        
        const reverseMatch = reversePattern.exec(searchText);
        if (reverseMatch) {
            allMatches.push({
                position: reverseMatch.index,
                card: card,
                inverted: true
            });
            continue;
        }
        
        // Pattern 2: Upright cards with word boundary enforcement
        const uprightPattern = new RegExp(
            `\\b(?:The\\s+)?${escapeRegex(baseName)}\\b(?=\\s|[,.:;!?<]|$)`,
            'i'
        );
        
        const uprightMatch = uprightPattern.exec(searchText);
        if (uprightMatch) {
            allMatches.push({
                position: uprightMatch.index,
                card: card,
                inverted: false
            });
        }
    }
    
    // Sort by position in text to maintain order
    allMatches.sort((a, b) => a.position - b.position);
    
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
        }
    }
    
    return extractedCards;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatCardsForStorage(cards) {
    return cards.map(card => ({
        id: card.id,
        name: card.name,
        inverted: card.inverted
    }));
}
