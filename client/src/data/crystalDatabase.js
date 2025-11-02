// Crystal Database - Contains all crystal information and properties
export const crystalDatabase = [
    {
        name: "Amethyst",
        emoji: "🔮",
        element: "Air",
        chakra: "Crown",
        meaning: "spiritual awakening and inner peace ",
        properties: ["Protection", "Purification", "Divine connection", "Sobriety"],
        healing: "Calms the mind, enhances intuition, promotes restful sleep",
        advice: "Trust your inner wisdom and remain open to spiritual guidance",
        keywords: ["spiritual", "meditation", "intuition", "peace", "calm", "sleep", "anxiety", "stress", "psychic", "divine", "wisdom", "clarity", "protection", "purification"],
        intentions: ["spiritual growth", "meditation", "intuition", "sleep", "stress relief", "protection", "purification"]
      },
      {
        name: "Rose Quartz",
        emoji: "💖",
        element: "Water",
        chakra: "Heart",
        meaning: "unconditional love and emotional healing ",
        properties: ["Love", "Compassion", "Emotional healing", "Self-love"],
        healing: "Opens the heart chakra, promotes self-love and attracts romance",
        advice: "Lead with love and compassion in all your relationships",
        keywords: ["love", "romance", "relationship", "heart", "emotion", "compassion", "self-love", "forgiveness", "healing", "friendship", "family", "partner", "soulmate", "marriage"],
        intentions: ["love", "relationships", "self-love", "emotional healing", "compassion", "romance", "friendship"]
      },
      {
        name: "Citrine",
        emoji: "☀️",
        element: "Fire",
        chakra: "Solar Plexus",
        meaning: "abundance and personal power ",
        properties: ["Abundance", "Manifestation", "Confidence", "Joy"],
        healing: "Attracts wealth, boosts self-esteem, energizes the solar plexus",
        advice: "Embrace your personal power and trust in your ability to manifest abundance",
        keywords: ["money", "wealth", "abundance", "success", "confidence", "power", "manifestation", "prosperity", "career", "business", "job", "promotion", "financial", "abundance", "joy", "optimism"],
        intentions: ["abundance", "career", "success", "confidence", "manifestation", "prosperity", "joy", "personal power"]
      },
      {
        name: "Clear Quartz",
        emoji: "💎",
        element: "All",
        chakra: "Crown",
        meaning: "clarity and amplification of energy ",
        properties: ["Amplification", "Clarity", "Healing", "Programming"],
        healing: "Master healer that amplifies energy and intention",
        advice: "Set clear intentions and trust in the power of focused energy",
        keywords: ["clarity", "focus", "amplify", "healing", "energy", "programming", "intention", "master", "clear", "concentration", "study", "learning", "memory", "purification"],
        intentions: ["clarity", "focus", "healing", "amplification", "study", "learning", "purification", "general healing"]
      },
      {
        name: "Black Tourmaline",
        emoji: "🖤",
        element: "Earth",
        chakra: "Root",
        meaning: "protection and grounding ",
        properties: ["Protection", "Grounding", "EMF shielding", "Negativity removal"],
        healing: "Shields from negative energy and electromagnetic radiation",
        advice: "Stay grounded and protected while releasing what no longer serves you",
        keywords: ["protection", "grounding", "negative", "shield", "safety", "security", "emf", "electromagnetic", "cleansing", "purification", "root", "stability", "fear", "anxiety"],
        intentions: ["protection", "grounding", "security", "cleansing", "stability", "fear relief", "emf protection"]
      },
      {
        name: "Labradorite",
        emoji: "🌙",
        element: "Air",
        chakra: "Third Eye",
        meaning: "transformation and magical awakening ",
        properties: ["Transformation", "Magic", "Intuition", "Protection"],
        healing: "Awakens psychic abilities and protects during spiritual work",
        advice: "Embrace transformation and trust in your magical potential",
        keywords: ["transformation", "magic", "psychic", "intuition", "change", "awakening", "spiritual", "mystical", "dreams", "visions", "third eye", "supernatural", "evolution"],
        intentions: ["transformation", "psychic development", "spiritual awakening", "magic", "intuition", "change", "dreams"]
      },
      {
        name: "Green Aventurine",
        emoji: "🍀",
        element: "Earth",
        chakra: "Heart",
        meaning: "luck and emotional healing ",
        properties: ["Luck", "Opportunity", "Heart healing", "Optimism"],
        healing: "Brings good fortune and soothes emotional wounds",
        advice: "Stay optimistic and open to new opportunities that come your way",
        keywords: ["luck", "fortune", "opportunity", "growth", "heart", "healing", "optimism", "prosperity", "chance", "gambling", "risk", "new beginnings", "fresh start"],
        intentions: ["luck", "opportunity", "emotional healing", "optimism", "new beginnings", "prosperity", "growth"]
      },
      {
        name: "Carnelian",
        emoji: "🔥",
        element: "Fire",
        chakra: "Sacral",
        meaning: "creativity and motivation ",
        properties: ["Creativity", "Motivation", "Courage", "Vitality"],
        healing: "Boosts creativity, motivation, and sexual energy",
        advice: "Channel your creative fire and take bold action toward your goals",
        keywords: ["creativity", "motivation", "courage", "energy", "vitality", "passion", "creative", "art", "inspiration", "drive", "ambition", "sexuality", "confidence", "action"],
        intentions: ["creativity", "motivation", "courage", "passion", "artistic expression", "vitality", "action", "confidence"]
      },
      {
        name: "Sodalite",
        emoji: "🧠",
        element: "Air",
        chakra: "Throat",
        meaning: "wisdom and rational thought ",
        properties: ["Logic", "Communication", "Truth", "Wisdom"],
        healing: "Enhances logical thinking and truthful communication",
        advice: "Speak your truth with wisdom and communicate with clarity",
        keywords: ["logic", "rational", "thinking", "communication", "truth", "wisdom", "study", "learning", "knowledge", "intelligence", "speaking", "writing", "teaching", "understanding"],
        intentions: ["communication", "truth", "wisdom", "learning", "logical thinking", "study", "teaching", "understanding"]
      },
      {
        name: "Moonstone",
        emoji: "🌕",
        element: "Water",
        chakra: "Crown",
        meaning: "divine feminine and intuition ",
        properties: ["Intuition", "Feminine energy", "Cycles", "New beginnings"],
        healing: "Connects with lunar cycles and enhances feminine intuition",
        advice: "Trust your intuitive cycles and embrace the divine feminine within",
        keywords: ["feminine", "intuition", "cycles", "moon", "lunar", "goddess", "women", "menstrual", "pregnancy", "motherhood", "new beginnings", "fresh start", "renewal"],
        intentions: ["intuition", "feminine energy", "new beginnings", "cycles", "renewal", "goddess energy", "divine feminine"]
      }
];

// Helper function to get crystals by element
export const getCrystalsByElement = (element) => {
    return crystalDatabase.filter(crystal => crystal.element === element || crystal.element === 'All');
};

// Helper function to get crystals by chakra
export const getCrystalsByChakra = (chakra) => {
    return crystalDatabase.filter(crystal => crystal.chakra === chakra || crystal.chakra === 'All');
};

// Helper function to get random crystal selection
export const getRandomCrystals = (count = 9) => {
    const shuffled = [...crystalDatabase].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};