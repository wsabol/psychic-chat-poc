import { tarotDeck } from './tarotDeck.js';

function selectTarotCards(numCards) {
    const selected = [];
    for (let i = 0; i < numCards; i++) {
        const randomIndex = Math.floor(Math.random() * tarotDeck.length);
        const card = { ...tarotDeck[randomIndex] };  // Clone the card
        selected.push(card);
    }
    return selected;
}

export { selectTarotCards };  // Export the function