/**
 * Scent Recommendation Engine
 * Maps tarot cards, emotional states, and astrological energies to appropriate scents
 * Provides optional aromatherapy guidance for oracle readings
 */

// Map tarot cards to complementary scents
const cardScentMap = {
    // MAJOR ARCANA
    "The Fool": {
        scents: ["bergamot", "lemon", "neroli"],
        theme: "New beginnings, youthful energy, fresh starts"
    },
    "The Magician": {
        scents: ["peppermint", "eucalyptus", "ginger"],
        theme: "Mental clarity, manifestation, focused intention"
    },
    "The High Priestess": {
        scents: ["moonflower", "jasmine", "sandalwood"],
        theme: "Intuition, mystery, deep inner knowing"
    },
    "The Empress": {
        scents: ["rose", "geranium", "ylang ylang"],
        theme: "Nurturing abundance, creative flow, sensuality"
    },
    "The Emperor": {
        scents: ["cedarwood", "frankincense", "vetiver"],
        theme: "Authority, grounding, protective strength"
    },
    "The Hierophant": {
        scents: ["myrrh", "oud", "patchouli"],
        theme: "Spiritual wisdom, sacred tradition, inner teacher"
    },
    "The Lovers": {
        scents: ["rose absolute", "jasmine", "sandalwood"],
        theme: "Love, harmony, alignment with values"
    },
    "The Chariot": {
        scents: ["black pepper", "cardamom", "ginger"],
        theme: "Willpower, momentum, focused drive"
    },
    "The Strength": {
        scents: ["frankincense", "helichrysum", "amber"],
        theme: "Inner courage, gentle strength, compassion"
    },
    "The Hermit": {
        scents: ["cedarwood", "frankincense", "juniper"],
        theme: "Introspection, spiritual wisdom, solitude"
    },
    "The Wheel of Fortune": {
        scents: ["bergamot", "juniper", "cypress"],
        theme: "Cosmic timing, destiny, positive cycles"
    },
    "The Justice": {
        scents: ["lemongrass", "geranium", "palmarosa"],
        theme: "Truth, clarity, balanced perspective"
    },
    "The Hanged Man": {
        scents: ["vetiver", "sandalwood", "patchouli"],
        theme: "Letting go, perspective shift, surrender"
    },
    "Death": {
        scents: ["myrrh", "patchouli", "cedarwood"],
        theme: "Transformation, release, new beginnings"
    },
    "Temperance": {
        scents: ["chamomile", "lavender", "ylang ylang"],
        theme: "Balance, moderation, inner harmony"
    },
    "The Devil": {
        scents: ["black pepper", "patchouli", "oud"],
        theme: "Shadow work, grounding, authentic power"
    },
    "The Tower": {
        scents: ["frankincense", "myrrh", "helichrysum"],
        theme: "Grounding through upheaval, resilience, clarity"
    },
    "The Star": {
        scents: ["neroli", "lavender", "chamomile"],
        theme: "Hope, inspiration, divine guidance"
    },
    "The Moon": {
        scents: ["lavender", "chamomile", "sandalwood"],
        theme: "Intuition, inner vision, emotional release"
    },
    "The Sun": {
        scents: ["citrus blend", "neroli", "sunflower"],
        theme: "Joy, vitality, radiant happiness"
    },
    "Judgment": {
        scents: ["frankincense", "bergamot", "galbanum"],
        theme: "Spiritual awakening, calling, rebirth"
    },
    "The World": {
        scents: ["cedarwood", "sandalwood", "vetiver"],
        theme: "Completion, fulfillment, wholeness"
    },

    // CUPS (Water, Emotions, Relationships)
    "Ace of Cups": {
        scents: ["rose", "geranium", "jasmine"],
        theme: "New emotional openings, compassion, divine love"
    },
    "Two of Cups": {
        scents: ["rose absolute", "ylang ylang", "jasmine"],
        theme: "Partnership, mutual affection, sacred union"
    },
    "Three of Cups": {
        scents: ["bergamot", "lavender", "rose"],
        theme: "Celebration, community joy, creative flow"
    },
    "Four of Cups": {
        scents: ["sandalwood", "chamomile", "vetiver"],
        theme: "Contemplation, introspection, inner stillness"
    },
    "Five of Cups": {
        scents: ["myrrh", "patchouli", "helichrysum"],
        theme: "Emotional healing, grief processing, compassion"
    },
    "Six of Cups": {
        scents: ["chamomile", "lavender", "rose"],
        theme: "Nostalgia, innocence, inner child joy"
    },
    "Seven of Cups": {
        scents: ["lavender", "jasmine", "ylang ylang"],
        theme: "Clarity among options, discernment, focus"
    },
    "Eight of Cups": {
        scents: ["cedarwood", "myrrh", "frankincense"],
        theme: "Moving forward, releasing attachment, new paths"
    },
    "Nine of Cups": {
        scents: ["jasmine", "rose", "sandalwood"],
        theme: "Gratitude, contentment, emotional fulfillment"
    },
    "Ten of Cups": {
        scents: ["rose", "geranium", "neroli"],
        theme: "Harmony, family bliss, unconditional love"
    },

    // PENTACLES (Earth, Material, Career)
    "Ace of Pentacles": {
        scents: ["patchouli", "vetiver", "ginger"],
        theme: "Opportunity, manifestation, grounded prosperity"
    },
    "Two of Pentacles": {
        scents: ["ginger", "black pepper", "cardamom"],
        theme: "Balance, adaptability, skillful navigation"
    },
    "Three of Pentacles": {
        scents: ["cedarwood", "frankincense", "myrrh"],
        theme: "Collaboration, mastery, shared vision"
    },
    "Four of Pentacles": {
        scents: ["patchouli", "vetiver", "sandalwood"],
        theme: "Stability, security, grounded abundance"
    },
    "Five of Pentacles": {
        scents: ["myrrh", "frankincense", "helichrysum"],
        theme: "Support during hardship, trust, resilience"
    },
    "Six of Pentacles": {
        scents: ["bergamot", "geranium", "lavender"],
        theme: "Generosity, balance, abundant sharing"
    },
    "Seven of Pentacles": {
        scents: ["vetiver", "patchouli", "cypress"],
        theme: "Patience, long-term vision, grounded perseverance"
    },
    "Eight of Pentacles": {
        scents: ["rosemary", "eucalyptus", "frankincense"],
        theme: "Mastery, skill development, dedicated focus"
    },
    "Nine of Pentacles": {
        scents: ["sandalwood", "rose", "ylang ylang"],
        theme: "Luxury, independence, graceful abundance"
    },
    "Ten of Pentacles": {
        scents: ["cedarwood", "vetiver", "sandalwood"],
        theme: "Legacy, family wealth, lasting security"
    },

    // SWORDS (Air, Thoughts, Communication)
    "Ace of Swords": {
        scents: ["peppermint", "eucalyptus", "lemongrass"],
        theme: "Mental clarity, breakthrough insight, sharp thinking"
    },
    "Two of Swords": {
        scents: ["frankincense", "chamomile", "lavender"],
        theme: "Clarity for decisions, balanced perspective, calm choice"
    },
    "Three of Swords": {
        scents: ["helichrysum", "rose", "chamomile"],
        theme: "Emotional healing, sorrow processing, compassionate release"
    },
    "Four of Swords": {
        scents: ["lavender", "chamomile", "sandalwood"],
        theme: "Rest, mental peace, restorative silence"
    },
    "Five of Swords": {
        scents: ["ginger", "black pepper", "lemongrass"],
        theme: "Conflict resolution, boundary clarity, assertiveness"
    },
    "Six of Swords": {
        scents: ["cypress", "juniper", "lemongrass"],
        theme: "Moving forward, transition support, travel clarity"
    },
    "Seven of Swords": {
        scents: ["black pepper", "ginger", "patchouli"],
        theme: "Truth seeking, strategic clarity, honest navigation"
    },
    "Eight of Swords": {
        scents: ["lemongrass", "bergamot", "peppermint"],
        theme: "Breaking free, mental clarity, empowering perspective shift"
    },
    "Nine of Swords": {
        scents: ["lavender", "chamomile", "frankincense"],
        theme: "Anxiety relief, mental peace, calming presence"
    },
    "Ten of Swords": {
        scents: ["myrrh", "frankincense", "helichrysum"],
        theme: "Release, transformation through ending, resilient recovery"
    },

    // WANDS (Fire, Passion, Action)
    "Ace of Wands": {
        scents: ["ginger", "cinnamon", "cardamom"],
        theme: "Creative spark, passionate inspiration, dynamic energy"
    },
    "Two of Wands": {
        scents: ["black pepper", "ginger", "frankincense"],
        theme: "Vision, personal power, bold planning"
    },
    "Three of Wands": {
        scents: ["bergamot", "cypress", "juniper"],
        theme: "Expansion, foresight, adventurous momentum"
    },
    "Four of Wands": {
        scents: ["neroli", "rose", "geranium"],
        theme: "Celebration, harmony, joyful community"
    },
    "Five of Wands": {
        scents: ["ginger", "black pepper", "frankincense"],
        theme: "Healthy competition, conflict clarity, passionate engagement"
    },
    "Six of Wands": {
        scents: ["bergamot", "neroli", "ylang ylang"],
        theme: "Confidence, recognition, radiant success"
    },
    "Seven of Wands": {
        scents: ["ginger", "cardamom", "black pepper"],
        theme: "Resilience, standing firm, courageous perseverance"
    },
    "Eight of Wands": {
        scents: ["lemongrass", "ginger", "peppermint"],
        theme: "Swift progress, momentum, dynamic movement"
    },
    "Nine of Wands": {
        scents: ["frankincense", "myrrh", "cedarwood"],
        theme: "Inner strength, resilience, protective boundaries"
    },
    "Ten of Wands": {
        scents: ["patchouli", "vetiver", "frankincense"],
        theme: "Grounding heavy loads, sustainable effort, wise delegation"
    }
};

// Map emotional/energetic states to scents
const emotionalStateScentMap = {
    anxiety: {
        scents: ["lavender", "chamomile", "bergamot"],
        guidance: "Grounding and calming"
    },
    grief: {
        scents: ["myrrh", "rose", "helichrysum"],
        guidance: "Compassionate processing"
    },
    uncertainty: {
        scents: ["frankincense", "cedarwood", "sandalwood"],
        guidance: "Inner knowing and clarity"
    },
    stagnation: {
        scents: ["ginger", "lemongrass", "peppermint"],
        guidance: "Revitalizing momentum"
    },
    overwhelm: {
        scents: ["chamomile", "lavender", "sandalwood"],
        guidance: "Centering and peace"
    },
    creative_block: {
        scents: ["jasmine", "neroli", "ylang ylang"],
        guidance: "Unlocking creative flow"
    },
    disconnection: {
        scents: ["rose", "geranium", "jasmine"],
        guidance: "Heart opening and presence"
    },
    transformation: {
        scents: ["myrrh", "patchouli", "frankincense"],
        guidance: "Supporting meaningful change"
    },
    celebration: {
        scents: ["bergamot", "neroli", "citrus blend"],
        guidance: "Amplifying joy"
    },
    protection: {
        scents: ["frankincense", "myrrh", "cedarwood"],
        guidance: "Grounding and boundaries"
    }
};

// Map zodiac signs to complementary scents
const zodiacScentMap = {
    Aries: {
        scents: ["ginger", "black pepper", "frankincense"],
        theme: "Channeling fiery courage with grounded intention"
    },
    Taurus: {
        scents: ["rose", "sandalwood", "patchouli"],
        theme: "Sensory grounding and earthy stability"
    },
    Gemini: {
        scents: ["peppermint", "bergamot", "lemongrass"],
        theme: "Mental clarity and communicative flow"
    },
    Cancer: {
        scents: ["chamomile", "jasmine", "sandalwood"],
        theme: "Emotional nurturing and sacred home"
    },
    Leo: {
        scents: ["neroli", "frankincense", "ylang ylang"],
        theme: "Radiant confidence and creative expression"
    },
    Virgo: {
        scents: ["eucalyptus", "rosemary", "lavender"],
        theme: "Clarity, organization, and refined discernment"
    },
    Libra: {
        scents: ["rose", "geranium", "lavender"],
        theme: "Harmony, balance, and graceful presence"
    },
    Scorpio: {
        scents: ["oud", "patchouli", "myrrh"],
        theme: "Deep transformation and hidden depths"
    },
    Sagittarius: {
        scents: ["frankincense", "cypress", "juniper"],
        theme: "Spiritual expansion and distant horizons"
    },
    Capricorn: {
        scents: ["cedarwood", "vetiver", "patchouli"],
        theme: "Grounded ambition and enduring strength"
    },
    Aquarius: {
        scents: ["galbanum", "neroli", "bergamot"],
        theme: "Innovative clarity and future vision"
    },
    Pisces: {
        scents: ["jasmine", "lavender", "sandalwood"],
        theme: "Intuitive depth and mystical connection"
    }
};

/**
 * Get scent recommendations for a specific tarot card
 * @param {string} cardName - Name of the tarot card
 * @returns {object} Scent recommendations or null
 */
export function getScentsByCard(cardName) {
    return cardScentMap[cardName] || null;
}

/**
 * Get scent recommendations for an emotional state
 * @param {string} emotionalState - Emotional state (e.g., "anxiety", "grief")
 * @returns {object} Scent recommendations or null
 */
export function getScentsByEmotionalState(emotionalState) {
    return emotionalStateScentMap[emotionalState.toLowerCase()] || null;
}

/**
 * Get scent recommendations for a zodiac sign
 * @param {string} zodiacSign - Zodiac sign (e.g., "Aries", "Pisces")
 * @returns {object} Scent recommendations or null
 */
export function getScentsByZodiac(zodiacSign) {
    if (!zodiacSign) return null;
    return zodiacScentMap[zodiacSign.charAt(0).toUpperCase() + zodiacSign.slice(1).toLowerCase()] || null;
}

/**
 * Get multiple scent recommendations from cards
 * Useful when oracle draws multiple cards
 * @param {array} cardNames - Array of card names
 * @returns {array} Array of scent recommendations
 */
export function getScentsByCards(cardNames) {
    const allScents = new Set();
    const recommendations = [];

    for (const cardName of cardNames) {
        const scent = getScentsByCard(cardName);
        if (scent) {
            recommendations.push({
                card: cardName,
                scents: scent.scents,
                theme: scent.theme
            });
            scent.scents.forEach(s => allScents.add(s));
        }
    }

    return {
        scents: Array.from(allScents),
        recommendations: recommendations
    };
}

/**
 * Format scent recommendation for HTML response
 * @param {string} scentsString - Comma-separated or array of scent names
 * @param {string} guidance - Optional guidance text
 * @returns {string} HTML-formatted scent section
 */
export function formatScentRecommendation(scentsString, guidance = null) {
    if (!scentsString) return '';

    const scents = Array.isArray(scentsString) 
        ? scentsString.join(", ")
        : scentsString;

    let html = `<h3>Aromatherapy Support</h3>\n`;
    html += `<p>To deepen this reading, consider <em>${scents}</em>`;

    if (guidance) {
        html += ` — ${guidance}`;
    }

    html += `.</p>`;

    return html;
}

/**
 * Get a poetic scent recommendation based on reading context
 * Can be called by oracle when appropriate
 * @param {object} context - Reading context { cards: [], emotionalState: '', zodiacSign: '' }
 * @returns {string|null} Formatted scent recommendation or null
 */
export function getPoeticScentGuidance(context) {
    if (!context) return null;

    const { cards = [], emotionalState = '', zodiacSign = '' } = context;

    // Try to get scents from cards first
    if (cards && cards.length > 0) {
        const cardScents = getScentsByCards(cards);
        if (cardScents.scents.length > 0) {
            const scentsText = cardScents.scents.slice(0, 3).join(", ");
            return formatScentRecommendation(scentsText);
        }
    }

    // Try emotional state
    if (emotionalState) {
        const emotionalScents = getScentsByEmotionalState(emotionalState);
        if (emotionalScents) {
            const scentsText = emotionalScents.scents.join(", ");
            return formatScentRecommendation(scentsText, emotionalScents.guidance);
        }
    }

    // Try zodiac
    if (zodiacSign) {
        const zodiacScents = getScentsByZodiac(zodiacSign);
        if (zodiacScents) {
            const scentsText = zodiacScents.scents.join(", ");
            return formatScentRecommendation(scentsText, zodiacScents.theme);
        }
    }

    return null;
}

export default {
    getScentsByCard,
    getScentsByEmotionalState,
    getScentsByZodiac,
    getScentsByCards,
    formatScentRecommendation,
    getPoeticScentGuidance
};
