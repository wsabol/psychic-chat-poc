import { tarotDeck } from './tarotDeck.js';

function selectTarotCards(numCards) {
    const selected = [];
    console.log(`Selecting ${numCards} tarot cards...`);  // Debug log
    for (let i = 0; i < numCards; i++) {
        const randomIndex = Math.floor(Math.random() * tarotDeck.length);
        const card = { ...tarotDeck[randomIndex] };  // Clone the card
        selected.push(card);
        console.log(`Selected card: ${card.name}`);  // Log each selected card
    }
    console.log('Selected cards:', selected);  // Log the full array
    return selected;
}

export { selectTarotCards };  // Export the function