/**
 * Card Extraction - Match only cards in the Tarot section
 * 
 * CRITICAL: Cards only appear in the initial Tarot section.
 * Once we reach other sections (Astrology, Crystal Guidance, etc.), STOP looking.
 * 
 * Uses word boundaries and strict matching to avoid false positives.
 */

export function extractCardsFromResponse(responseText, deck) {
    let searchText = responseText;
    
    // Find where the TAROT SECTION ENDS - these markers signal we've moved past cards
    const endOfCardSectionMarkers = [
        '<h3>astrology',
        '<h3>crystal',
        '<h3>astrological',
        'astrology reflection',
        'astrology insight',
        'astrological reflection',
        'crystal guidance',
        'crystal insight',
        '<h3>conclusion',
    ];
    
    let cutoffIndex = -1;
    for (const marker of endOfCardSectionMarkers) {
        const idx = responseText.toLowerCase().indexOf(marker);
        if (idx !== -1 && (cutoffIndex === -1 || idx < cutoffIndex)) {
            cutoffIndex = idx;
        }
    }
    
    if (cutoffIndex !== -1) {
        searchText = responseText.substring(0, cutoffIndex);
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
