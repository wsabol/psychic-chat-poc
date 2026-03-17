/**
 * Card Extraction - Match only cards in the first section of the oracle response.
 *
 * CRITICAL: Extract cards ONLY from the dedicated cards section (the first <h3> block).
 * The oracle's first section is always "The Cards Drawn" (or its translated equivalent).
 * We detect the section boundary purely by HTML structure (<h3> tags) so this works
 * regardless of the response language.
 *
 * Uses word boundaries and strict matching to avoid false positives.
 */

export function extractCardsFromResponse(responseText, deck) {
    let searchText = responseText;
    const lowerText = responseText.toLowerCase();

    // The oracle response always starts with the cards-drawn section as the first <h3>.
    // Find where the first heading ends, then extract up to the start of the second <h3>.
    // This is fully language-agnostic — no English heading text is required.
    const firstH3Start = lowerText.indexOf('<h3>');

    if (firstH3Start !== -1) {
        // Advance past the closing </h3> of the first heading
        const firstH3End = lowerText.indexOf('</h3>', firstH3Start);
        const searchFromIndex = firstH3End !== -1 ? firstH3End + 5 : firstH3Start + 4;

        // The next <h3> marks the end of the cards section
        const nextH3Index = lowerText.indexOf('<h3>', searchFromIndex);
        const sectionEnd = nextH3Index !== -1 ? nextH3Index : responseText.length;

        // Extract ONLY the first section (cards drawn)
        searchText = responseText.substring(searchFromIndex, sectionEnd);
    }
    // If no <h3> tags are found, fall through and search the full response text as a last resort.
    
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
