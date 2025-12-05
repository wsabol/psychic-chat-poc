/**
 * Card Extraction - Clean version without debug logs
 */
export function extractCardsFromResponse(responseText, deck) {
    let searchText = responseText;
    const insightIndex = responseText.toLowerCase().indexOf('astrological insight');
    const interpretationIndex = responseText.toLowerCase().indexOf('interpretation:');
    
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
    }
    
    const allMatches = [];
    
    for (const card of deck) {
        const baseName = card.name.replace(/^The\s+/i, '');
        
        const reversePattern = new RegExp(
            `\\b(The\\s+)?${escapeRegex(baseName)}\\s*\\((?:Reversed|Inverted|reversed|inverted)\\)`,
            'gi'
        );
        
        let match = reversePattern.exec(searchText);
        if (match) {
            allMatches.push({
                position: match.index,
                card: card,
                inverted: true
            });
            continue;
        }
        
        const cardPattern = new RegExp(
            `(?:Card\\s*\\d+\\s*:|^)\\s*(?:The\\s+)?${escapeRegex(baseName)}\\b`,
            'gim'
        );
        
        match = cardPattern.exec(searchText);
        if (match) {
            allMatches.push({
                position: match.index,
                card: card,
                inverted: false
            });
        }
    }
    
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
