export const tarotDeck = [
    // MAJOR ARCANA (0-21)
    {
        id: 0, name: "The Fool", suit: "major", number: 0,
        keywords: ["new beginnings", "innocence", "spontaneity", "free spirit"],
        upright: "New beginnings, innocence, spontaneity, a free spirit. The Fool represents new adventures, having faith in the future, being inexperienced, not knowing what to expect. Trust in the universe and believe that everything will work out as it should.",
        reversed: "Holding back, recklessness, risk-taking. When reversed, The Fool suggests you are living life to the extreme, either being completely reckless or overly cautious. Take calculated risks and find balance.",
        element: "Air", astrology: "Uranus"
    },
    {
        id: 1, name: "The Magician", suit: "major", number: 1,
        keywords: ["manifestation", "resourcefulness", "power", "inspired action"],
        upright: "Manifestation, resourcefulness, power, inspired action. The Magician represents having the skill, talent and capabilities to succeed. You have the tools and resources available to manifest your desires.",
        reversed: "Manipulation, poor planning, untapped talents. Reversed suggests you may be struggling to harness your inner power or using your abilities in manipulative ways. Focus your energy constructively.",
        element: "Air", astrology: "Mercury"
    },
    {
        id: 2, name: "The High Priestess", suit: "major", number: 2,
        keywords: ["intuition", "sacred knowledge", "divine feminine", "subconscious mind"],
        upright: "Intuition, sacred knowledge, divine feminine, the subconscious mind. Trust your intuition and go with your gut feeling. Look for the deeper meaning and listen to your inner voice.",
        reversed: "Secrets, disconnected from intuition, withdrawal. When reversed, you may be out of touch with your intuitive side or keeping secrets. Reconnect with your inner wisdom.",
        element: "Water", astrology: "Moon"
    },
    {
        id: 3, name: "The Empress", suit: "major", number: 3,
        keywords: ["femininity", "beauty", "nature", "nurturing", "abundance"],
        upright: "Femininity, beauty, nature, nurturing, abundance. The Empress represents the creation of life, romance, art, or business. She suggests fertility, creative expression, and abundance in all forms.",
        reversed: "Creative block, dependence on others, smothering. Reversed may indicate creative blocks, lack of growth, or being overly dependent on others. Focus on self-care and independence.",
        element: "Earth", astrology: "Venus"
    },
    {
        id: 4, name: "The Emperor", suit: "major", number: 4,
        keywords: ["authority", "establishment", "structure", "fatherly figure"],
        upright: "Authority, establishment, structure, fatherly figure. The Emperor represents authority, structure, control, and fatherly love. Create law and order through discipline and routine.",
        reversed: "Domination, excessive control, lack of discipline. When reversed, The Emperor suggests too much control, being overly rigid, or lack of authority. Find balance between control and flexibility.",
        element: "Fire", astrology: "Aries"
    },
    {
        id: 5, name: "The Hierophant", suit: "major", number: 5,
        keywords: ["spiritual wisdom", "religious beliefs", "conformity", "tradition"],
        upright: "Spiritual wisdom, religious beliefs, conformity, tradition, institutions. Seek guidance from a mentor or spiritual advisor. Follow established traditions and conventional methods.",
        reversed: "Personal beliefs, freedom, challenging tradition. Reversed suggests breaking away from tradition, creating your own path, and following personal beliefs rather than established doctrine.",
        element: "Earth", astrology: "Taurus"
    },
    {
        id: 6, name: "The Lovers", suit: "major", number: 6,
        keywords: ["love", "harmony", "relationships", "values alignment"],
        upright: "Love, harmony, relationships, values alignment. Perfect union, harmony, love, and attraction. Important decisions about relationships, values, and personal beliefs.",
        reversed: "Self-love, disharmony, imbalance, misalignment. When reversed, focus on self-love first, or indicates relationship troubles and conflicts in values.",
        element: "Air", astrology: "Gemini"
    },
    {
        id: 7, name: "The Chariot", suit: "major", number: 7,
        keywords: ["control", "willpower", "success", "determination"],
        upright: "Control, willpower, success, determination. Maintain focus and determination to overcome challenges. Victory through maintaining control of opposing forces.",
        reversed: "Lack of control, lack of direction, aggression. Reversed suggests losing control, lack of direction, or aggressive behavior. Regain focus and find your path forward.",
        element: "Water", astrology: "Cancer"
    },
    {
        id: 8, name: "Strength", suit: "major", number: 8,
        keywords: ["strength", "courage", "persuasion", "influence", "compassion"],
        upright: "Strength, courage, persuasion, influence, compassion. Inner strength, bravery, compassion, and focus. Gentle control and overcoming challenges through love rather than force.",
        reversed: "Self doubt, lack of confidence, lack of self-discipline. When reversed, indicates inner turmoil, self-doubt, or lack of confidence. Build inner strength and self-compassion.",
        element: "Fire", astrology: "Leo"
    },
    {
        id: 9, name: "The Hermit", suit: "major", number: 9,
        keywords: ["soul searching", "introspection", "inner guidance"],
        upright: "Soul searching, introspection, inner guidance. Seek inner guidance and solitude for personal growth. Take time for self-reflection and spiritual enlightenment.",
        reversed: "Isolation, loneliness, withdrawal. Reversed suggests excessive isolation or withdrawal from others. Balance solitude with social connection.",
        element: "Earth", astrology: "Virgo"
    },
    {
        id: 10, name: "Wheel of Fortune", suit: "major", number: 10,
        keywords: ["good luck", "karma", "life cycles", "destiny", "turning point"],
        upright: "Good luck, karma, life cycles, destiny, turning point. Positive change, good fortune, and karmic rewards. Life is cyclical - what goes around comes around.",
        reversed: "Bad luck, lack of control, clinging to control. When reversed, indicates temporary setbacks or feeling like you have no control. Trust that this phase will pass.",
        element: "Fire", astrology: "Jupiter"
    },
    {
        id: 11, name: "Justice", suit: "major", number: 11,
        keywords: ["justice", "fairness", "truth", "cause and effect", "law"],
        upright: "Justice, fairness, truth, cause and effect, law. Seek truth and fairness. Legal matters may be resolved in your favor. Take responsibility for your actions.",
        reversed: "Unfairness, lack of accountability, dishonesty. Reversed suggests injustice, corruption, or avoiding responsibility. Strive for fairness and honesty.",
        element: "Air", astrology: "Libra"
    },
    {
        id: 12, name: "The Hanged Man", suit: "major", number: 12,
        keywords: ["suspension", "restriction", "letting go", "sacrifice"],
        upright: "Suspension, restriction, letting go, sacrifice. Sometimes you need to suspend action and wait. Let go of control and see things from a new perspective.",
        reversed: "Delays, resistance, stalling. When reversed, indicates unnecessary delays or resistance to necessary change. Stop fighting and allow natural flow.",
        element: "Water", astrology: "Neptune"
    },
    {
        id: 13, name: "Death", suit: "major", number: 13,
        keywords: ["endings", "change", "transformation", "transition"],
        upright: "Endings, change, transformation, transition. Major transformation and new beginnings. Release the old to make way for the new. Embrace change.",
        reversed: "Resistance to change, personal transformation, inner purging. Reversed suggests resisting necessary change or going through inner transformation. Embrace the process.",
        element: "Water", astrology: "Scorpio"
    },
    {
        id: 14, name: "Temperance", suit: "major", number: 14,
        keywords: ["balance", "moderation", "patience", "purpose"],
        upright: "Balance, moderation, patience, purpose. Find balance and avoid extremes. Patience and moderation will bring about harmony. Blend opposing forces.",
        reversed: "Imbalance, excess, self-healing, re-alignment. When reversed, suggests imbalance or excess. Take time to realign and find your center.",
        element: "Fire", astrology: "Sagittarius"
    },
    {
        id: 15, name: "The Devil", suit: "major", number: 15,
        keywords: ["shadow self", "attachment", "addiction", "restriction", "sexuality"],
        upright: "Shadow self, attachment, addiction, restriction, sexuality. Feeling trapped by material desires or unhealthy habits. Acknowledge your shadow self and break free from bondage.",
        reversed: "Releasing limiting beliefs, exploring dark thoughts, detachment. Reversed suggests breaking free from restrictions and releasing limiting beliefs. Embrace your authentic self.",
        element: "Earth", astrology: "Capricorn"
    },
    {
        id: 16, name: "The Tower", suit: "major", number: 16,
        keywords: ["sudden change", "upheaval", "chaos", "revelation", "awakening"],
        upright: "Sudden change, upheaval, chaos, revelation, awakening. Dramatic upheaval and sudden change. Destruction of false beliefs and structures. Spiritual awakening through crisis.",
        reversed: "Personal transformation, fear of change, averting disaster. When reversed, suggests avoiding disaster or going through personal transformation. Change is coming whether you resist or not.",
        element: "Fire", astrology: "Mars"
    },
    {
        id: 17, name: "The Star", suit: "major", number: 17,
        keywords: ["hope", "faith", "purpose", "renewal", "spirituality"],
        upright: "Hope, faith, purpose, renewal, spirituality. Renewed hope and faith after hardship. Spiritual guidance and inspiration. Follow your highest purpose.",
        reversed: "Lack of faith, despair, self-trust, disconnection. Reversed suggests losing faith or feeling disconnected from purpose. Reconnect with your inner guidance.",
        element: "Air", astrology: "Aquarius"
    },
    {
        id: 18, name: "The Moon", suit: "major", number: 18,
        keywords: ["illusion", "fear", "anxiety", "subconscious", "intuition"],
        upright: "Illusion, fear, anxiety, subconscious, intuition. Things are not as they seem. Trust your intuition but be aware of illusions and deception. Face your fears.",
        reversed: "Release of fear, repressed emotion, inner confusion. When reversed, suggests releasing fears and confusion. Listen to your inner voice and trust your intuition.",
        element: "Water", astrology: "Pisces"
    },
    {
        id: 19, name: "The Sun", suit: "major", number: 19,
        keywords: ["happiness", "success", "optimism", "vitality", "joy"],
        upright: "Happiness, success, optimism, vitality, joy. Positive energy, success, and happiness. Everything is going well. Share your joy with others.",
        reversed: "Inner child, feeling down, overly optimistic. Reversed suggests temporary setbacks or need to reconnect with your inner child. Stay optimistic.",
        element: "Fire", astrology: "Sun"
    },
    {
        id: 20, name: "Judgment", suit: "major", number: 20,
        keywords: ["judgement", "rebirth", "inner calling", "absolution"],
        upright: "Judgement, rebirth, inner calling, absolution. Spiritual awakening and rebirth. Answer your higher calling. Forgiveness and second chances.",
        reversed: "Self-doubt, inner critic, avoiding the call. When reversed, suggests self-doubt or avoiding your calling. Trust in your abilities and answer the call.",
        element: "Fire", astrology: "Pluto"
    },
    {
        id: 21, name: "The World", suit: "major", number: 21,
        keywords: ["completion", "accomplishment", "travel", "fulfillment"],
        upright: "Completion, accomplishment, travel, fulfillment. Achievement and completion of goals. Success and fulfillment. The end of a cycle and beginning of another.",
        reversed: "Seeking personal closure, short-cut to success, stagnation. Reversed suggests seeking closure or taking shortcuts. Complete what you started before moving on.",
        element: "Earth", astrology: "Saturn"
    },

    // CUPS (Water Element - Emotions, Relationships, Spirituality)
    {
        id: 22, name: "Ace of Cups", suit: "cups", number: 1,
        keywords: ["new relationships", "compassion", "creativity"],
        upright: "New relationships, compassion, creativity. A new emotional beginning or spiritual awakening. Love, joy, and emotional fulfillment are available.",
        reversed: "Self-love, intuition, repressed emotions. Focus on self-love and emotional healing. Listen to your intuition.",
        element: "Water"
    },
    {
        id: 23, name: "Two of Cups", suit: "cups", number: 2,
        keywords: ["unified love", "partnership", "mutual attraction"],
        upright: "Unified love, partnership, mutual attraction. Perfect harmony in relationships. Mutual respect and understanding.",
        reversed: "Self-love, break-ups, disharmony. Focus on self-love or indicates relationship troubles. Work on communication.",
        element: "Water"
    },
    {
        id: 24, name: "Three of Cups", suit: "cups", number: 3,
        keywords: ["celebration", "friendship", "creativity", "community"],
        upright: "Celebration, friendship, creativity, community. Joyful celebrations with friends and family. Creative collaboration and community support.",
        reversed: "Independence, alone time, hardcore partying. Need for solitude or warning against excess. Balance social time with alone time.",
        element: "Water"
    },
    {
        id: 25, name: "Four of Cups", suit: "cups", number: 4,
        keywords: ["meditation", "contemplation", "apathy", "reevaluation"],
        upright: "Meditation, contemplation, apathy, reevaluation. Feeling emotionally distant or bored. Take time to reassess your priorities.",
        reversed: "Retreat, withdrawal, checking in with yourself. Need for introspection and self-reflection. Reconnect with your inner self.",
        element: "Water"
    },
    {
        id: 26, name: "Five of Cups", suit: "cups", number: 5,
        keywords: ["regret", "failure", "disappointment", "pessimism"],
        upright: "Regret, failure, disappointment, pessimism. Dwelling on past failures and disappointments. Focus on what remains, not what is lost.",
        reversed: "Personal setbacks, self-forgiveness, moving on. Learning from past mistakes and moving forward. Forgive yourself and others.",
        element: "Water"
    },
    {
        id: 27, name: "Six of Cups", suit: "cups", number: 6,
        keywords: ["revisiting the past", "childhood memories", "innocence", "joy"],
        upright: "Revisiting the past, childhood memories, innocence, joy. Nostalgia and happy memories from the past. Reconnecting with your inner child.",
        reversed: "Living in the past, forgiveness, lacking playfulness. Need to let go of the past or embrace more playfulness in life.",
        element: "Water"
    },
    {
        id: 28, name: "Seven of Cups", suit: "cups", number: 7,
        keywords: ["opportunities", "choices", "wishful thinking", "illusion"],
        upright: "Opportunities, choices, wishful thinking, illusion. Many options available but beware of illusions. Ground your dreams in reality.",
        reversed: "Alignment, personal values, overwhelmed by choices. Getting clear on your values and making aligned choices. Avoid overwhelm.",
        element: "Water"
    },
    {
        id: 29, name: "Eight of Cups", suit: "cups", number: 8,
        keywords: ["disappointment", "abandonment", "withdrawal", "escapism"],
        upright: "Disappointment, abandonment, withdrawal, escapism. Walking away from a situation that no longer serves you. Seeking deeper meaning.",
        reversed: "Trying one more time, indecision, aimless drifting. Reconsidering a decision to leave or feeling stuck. Make a clear choice.",
        element: "Water"
    },
    {
        id: 30, name: "Nine of Cups", suit: "cups", number: 9,
        keywords: ["contentment", "satisfaction", "gratitude", "wish come true"],
        upright: "Contentment, satisfaction, gratitude, wish come true. Emotional fulfillment and satisfaction. Your wishes are coming true.",
        reversed: "Inner happiness, materialism, dissatisfaction. True happiness comes from within, not from material possessions. Practice gratitude.",
        element: "Water"
    },
    {
        id: 31, name: "Ten of Cups", suit: "cups", number: 10,
        keywords: ["divine love", "blissful relationships", "harmony", "alignment"],
        upright: "Divine love, blissful relationships, harmony, alignment. Perfect emotional fulfillment and harmony in relationships. Family happiness.",
        reversed: "Disconnection, misaligned values, struggling relationships. Work on reconnecting with loved ones and aligning your values.",
        element: "Water"
    },
    {
        id: 32, name: "Page of Cups", suit: "cups", number: 11,
        keywords: ["creative opportunities", "intuitive messages", "curiosity", "possibility"],
        upright: "Creative opportunities, intuitive messages, curiosity, possibility. New creative or emotional opportunities. Trust your intuition and remain open.",
        reversed: "New ideas, doubting intuition, creative blocks. Trust your creative instincts or work through creative blocks. Don't doubt your intuition.",
        element: "Water"
    },
    {
        id: 33, name: "Knight of Cups", suit: "cups", number: 12,
        keywords: ["creativity", "romance", "charm", "imagination"],
        upright: "Creativity, romance, charm, imagination. A romantic and creative person or energy. Follow your heart and creative inspiration.",
        reversed: "Overactive imagination, unrealistic, jealousy. Beware of unrealistic expectations or jealousy. Ground your imagination in reality.",
        element: "Water"
    },
    {
        id: 34, name: "Queen of Cups", suit: "cups", number: 13,
        keywords: ["compassionate", "caring", "emotionally stable", "intuitive"],
        upright: "Compassionate, caring, emotionally stable, intuitive. A nurturing and emotionally mature person. Trust your emotional wisdom.",
        reversed: "Inner compassion, self-care, co-dependency. Need for self-care and emotional boundaries. Practice self-compassion.",
        element: "Water"
    },
    {
        id: 35, name: "King of Cups", suit: "cups", number: 14,
        keywords: ["emotionally balanced", "compassionate", "diplomatic"],
        upright: "Emotionally balanced, compassionate, diplomatic. Mastery over emotions and relationships. Balance logic with intuition.",
        reversed: "Self-compassion, inner feelings, moodiness. Focus on emotional self-care or beware of mood swings. Balance your emotions.",
        element: "Water"
    },

    // PENTACLES (Earth Element - Material, Career, Money)
    {
        id: 36, name: "Ace of Pentacles", suit: "pentacles", number: 1,
        keywords: ["opportunity", "prosperity", "new venture", "manifestation"],
        upright: "Opportunity, prosperity, new venture, manifestation. New financial or career opportunity. Material abundance and prosperity are possible.",
        reversed: "Lost opportunity, lack of planning, poor financial decisions. Missed opportunities or poor planning. Be more practical and grounded.",
        element: "Earth"
    },
    {
        id: 37, name: "Two of Pentacles", suit: "pentacles", number: 2,
        keywords: ["multiple priorities", "time management", "prioritization", "adaptability"],
        upright: "Multiple priorities, time management, prioritization, adaptability. Juggling multiple responsibilities. Stay flexible and prioritize wisely.",
        reversed: "Over-committed, disorganization, reprioritization. Feeling overwhelmed by responsibilities. Simplify and reorganize your priorities.",
        element: "Earth"
    },
    {
        id: 38, name: "Three of Pentacles", suit: "pentacles", number: 3,
        keywords: ["teamwork", "collaboration", "learning", "implementation"],
        upright: "Teamwork, collaboration, learning, implementation. Working together toward a common goal. Learning from others and sharing knowledge.",
        reversed: "Disharmony, misalignment, working alone. Conflicts in teamwork or preference for working alone. Improve communication.",
        element: "Earth"
    },
    {
        id: 39, name: "Four of Pentacles", suit: "pentacles", number: 4,
        keywords: ["conservation", "frugality", "security", "savings"],
        upright: "Conservation, frugality, security, savings. Holding onto resources and being conservative with money. Security through saving.",
        reversed: "Over-spending, greed, self-protection. Excessive spending or hoarding. Find balance between saving and enjoying life.",
        element: "Earth"
    },
    {
        id: 40, name: "Five of Pentacles", suit: "pentacles", number: 5,
        keywords: ["financial loss", "poverty", "lack mindset", "isolation"],
        upright: "Financial loss, poverty, lack mindset, isolation. Financial hardship or feeling left out in the cold. Help is available if you ask.",
        reversed: "Recovery, charity, improvement. Recovery from financial hardship. Accept help from others and have faith in improvement.",
        element: "Earth"
    },
    {
        id: 41, name: "Six of Pentacles", suit: "pentacles", number: 6,
        keywords: ["generosity", "charity", "sharing", "community"],
        upright: "Generosity, charity, sharing, community. Giving and receiving help. Generosity and sharing resources with others.",
        reversed: "Self-care, unpaid debts, one-sided charity. Focus on self-care or beware of one-sided giving. Balance giving and receiving.",
        element: "Earth"
    },
    {
        id: 42, name: "Seven of Pentacles", suit: "pentacles", number: 7,
        keywords: ["long-term view", "sustainable results", "perseverance", "investment"],
        upright: "Long-term view, sustainable results, perseverance, investment. Patience and perseverance in long-term projects. Your efforts will pay off.",
        reversed: "Lack of long-term vision, limited success, lack of reward. Impatience with results or lack of long-term planning. Stay committed.",
        element: "Earth"
    },
    {
        id: 43, name: "The Eight of Pentacles", suit: "pentacles", number: 8,
        keywords: ["apprenticeship", "repetitive tasks", "mastery", "skill development"],
        upright: "Apprenticeship, repetitive tasks, mastery, skill development. Dedication to learning and mastering your craft. Practice makes perfect.",
        reversed: "Lack of focus, perfectionism, misdirected activity. Lack of focus on skill development or excessive perfectionism. Find balance.",
        element: "Earth"
    },
    {
        id: 44, name: "Nine of Pentacles", suit: "pentacles", number: 9,
        keywords: ["abundance", "luxury", "self-reliance", "financial independence"],
        upright: "Abundance, luxury, self-reliance, financial independence. Financial independence and material comfort through your own efforts.",
        reversed: "Self-worth, over-investment in work, hustling. Define self-worth beyond material success. Don't sacrifice everything for money.",
        element: "Earth"
    },
    {
        id: 45, name: "Ten of Pentacles", suit: "pentacles", number: 10,
        keywords: ["wealth", "financial security", "family", "long-term success"],
        upright: "Wealth, financial security, family, long-term success. Lasting financial security and family wealth. Legacy and inheritance.",
        reversed: "The fleeting nature of fame, family financial problems. Temporary financial problems or family conflicts over money. Focus on values.",
        element: "Earth"
    },
    {
        id: 46, name: "Page of Pentacles", suit: "pentacles", number: 11,
        keywords: ["manifestation", "financial opportunity", "skill development"],
        upright: "Manifestation, financial opportunity, skill development. New opportunities for learning and financial growth. Stay curious and practical.",
        reversed: "Lack of progress, procrastination, learn from failure. Procrastination or lack of progress. Learn from mistakes and keep moving forward.",
        element: "Earth"
    },
    {
        id: 47, name: "Knight of Pentacles", suit: "pentacles", number: 12,
        keywords: ["hard work", "productivity", "routine", "conservatism"],
        upright: "Hard work, productivity, routine, conservatism. Steady, reliable progress through hard work. Methodical and conservative approach.",
        reversed: "Self-discipline, boredom, frustration, obstacles. Boredom with routine or frustration with slow progress. Stay disciplined but add variety.",
        element: "Earth"
    },
    {
        id: 48, name: "Queen of Pentacles", suit: "pentacles", number: 13,
        keywords: ["nurturing", "practical", "providing financially", "down-to-earth"],
        upright: "Nurturing, practical, providing financially, down-to-earth. A practical and nurturing person who provides security. Balance work and home.",
        reversed: "Financial independence, self-care, work-home conflict. Focus on financial independence and self-care. Don't neglect yourself for others.",
        element: "Earth"
    },
    {
        id: 49, name: "King of Pentacles", suit: "pentacles", number: 14,
        keywords: ["financial success", "leadership", "security", "discipline"],
        upright: "Financial success, leadership, security, discipline. Mastery over material world through discipline and leadership. Financial abundance.",
        reversed: "Financially inept, obsessed with wealth and status. Poor financial decisions or obsession with material success. Focus on true values.",
        element: "Earth"
    },

    // SWORDS (Air Element - Thoughts, Communication, Conflict)
    {
        id: 50, name: "Ace of Swords", suit: "swords", number: 1,
        keywords: ["breakthrough", "clarity", "sharp mind", "new ideas"],
        upright: "Breakthrough, clarity, sharp mind, new ideas. Mental clarity and breakthrough thinking. Cut through confusion with sharp insight.",
        reversed: "Inner clarity, re-thinking an idea, clouded judgement. Confusion or need to rethink ideas. Seek clarity before acting.",
        element: "Air"
    },
    {
        id: 51, name: "Two of Swords", suit: "swords", number: 2,
        keywords: ["difficult decisions", "weighing options", "indecision", "stalemate"],
        upright: "Difficult decisions, weighing options, indecision, stalemate. Difficult choice between two options. Gather more information before deciding.",
        reversed: "Indecision, confusion, information overload. Analysis paralysis or information overload. Trust your intuition and make a decision.",
        element: "Air"
    },
    {
        id: 52, name: "Three of Swords", suit: "swords", number: 3,
        keywords: ["heartbreak", "emotional pain", "sorrow", "grief"],
        upright: "Heartbreak, emotional pain, sorrow, grief. Painful emotions and heartbreak. Allow yourself to grieve and process the pain.",
        reversed: "Negative self-talk, releasing pain, optimism. Healing from heartbreak and releasing pain. Practice self-compassion and forgiveness.",
        element: "Air"
    },
    {
        id: 53, name: "Four of Swords", suit: "swords", number: 4,
        keywords: ["rest", "relaxation", "meditation", "contemplation"],
        upright: "Rest, relaxation, meditation, contemplation. Need for rest and mental recuperation. Take time for meditation and reflection.",
        reversed: "Exhaustion, burn-out, deep contemplation, stagnation. Mental exhaustion or stagnation. Rest is necessary for recovery.",
        element: "Air"
    },
    {
        id: 54, name: "Five of Swords", suit: "swords", number: 5,
        keywords: ["conflict", "disagreements", "competition", "defeat"],
        upright: "Conflict, disagreements, competition, defeat. Winning at all costs or conflicts with others. Consider if the victory is worth the cost.",
        reversed: "Reconciliation, making amends, past resentment. Making peace after conflict or dealing with past resentments. Forgive and move forward.",
        element: "Air"
    },
    {
        id: 55, name: "Six of Swords", suit: "swords", number: 6,
        keywords: ["transition", "change", "rite of passage", "releasing baggage"],
        upright: "Transition, change, rite of passage, releasing baggage. Moving away from difficult times toward calmer waters. Positive transition.",
        reversed: "Personal transition, resistance to change, unfinished business. Internal change or resistance to necessary transition. Complete unfinished business.",
        element: "Air"
    },
    {
        id: 56, name: "Seven of Swords", suit: "swords", number: 7,
        keywords: ["betrayal", "deception", "getting away with something", "acting strategically"],
        upright: "Betrayal, deception, getting away with something, acting strategically. Deception or betrayal by others. Be strategic but honest.",
        reversed: "Imposter syndrome, self-deceit, keeping secrets. Self-deception or feeling like an imposter. Be honest with yourself and others.",
        element: "Air"
    },
    {
        id: 57, name: "Eight of Swords", suit: "swords", number: 8,
        keywords: ["negative thoughts", "self-imposed restriction", "imprisonment", "victim mentality"],
        upright: "Negative thoughts, self-imposed restriction, imprisonment, victim mentality. Feeling trapped by circumstances or negative thinking. Look for ways to free yourself.",
        reversed: "Self-limiting beliefs, inner critic, releasing negative thoughts. Breaking free from self-imposed limitations. Challenge negative thoughts.",
        element: "Air"
    },
    {
        id: 58, name: "Nine of Swords", suit: "swords", number: 9,
        keywords: ["anxiety", "worry", "fear", "depression", "nightmares"],
        upright: "Anxiety, worry, fear, depression, nightmares. Mental anguish and worry keeping you awake at night. Seek help for anxiety and depression.",
        reversed: "Inner turmoil, deep-seated fears, secrets, releasing worry. Confronting deep fears or releasing worry. Face your fears to overcome them.",
        element: "Air"
    },
    {
        id: 59, name: "Ten of Swords", suit: "swords", number: 10,
        keywords: ["painful endings", "deep wounds", "betrayal", "crisis"],
        upright: "Painful endings, deep wounds, betrayal, crisis. Rock bottom and painful endings. This is the end of a difficult cycle.",
        reversed: "Recovery, regeneration, resisting an inevitable end. Recovery from crisis or resisting inevitable change. Embrace the transformation.",
        element: "Air"
    },
    {
        id: 60, name: "Page of Swords", suit: "swords", number: 11,
        keywords: ["mental curiosity", "communication", "vigilance", "restlessness"],
        upright: "Mental curiosity, communication, vigilance, restlessness. A quick-witted messenger bringing news requiring mental agility. Stay alert and curious.",
        reversed: "Hasty decisions, lack of planning, scattered thoughts. Mental confusion or gossiping. Think before you speak or act.",
        element: "Air"
    },
    {
        id: 61, name: "Knight of Swords", suit: "swords", number: 12,
        keywords: ["swift action", "intellectual pursuit", "direct communication", "aggression"],
        upright: "Swift action, intellectual pursuit, direct communication, aggression. A fierce warrior cutting through obstacles. Act decisively but diplomatically.",
        reversed: "Aggression, lack of diplomacy, rushing into conflict. Verbal attacks or thoughtless actions. Consider others' feelings before acting.",
        element: "Air"
    },
    {
        id: 62, name: "Queen of Swords", suit: "swords", number: 13,
        keywords: ["clear judgment", "independent thinking", "honest communication", "sharp wit"],
        upright: "Clear judgment, independent thinking, honest communication, sharp wit. An independent thinker offering honest counsel. Speak your truth with kindness.",
        reversed: "Harsh criticism, emotional coldness, bitter experiences. Using intellect as a weapon or withdrawing emotionally. Soften your approach.",
        element: "Air"
    },
    {
        id: 63, name: "King of Swords", suit: "swords", number: 14,
        keywords: ["intellectual authority", "strategic thinking", "fair judgment", "clear communication"],
        upright: "Intellectual authority, strategic thinking, fair judgment, clear communication. A fair leader making decisions through logic and wisdom. Lead with justice and truth.",
        reversed: "Abuse of power, manipulation, cruel judgment. Using intellect to manipulate or judge harshly. Temper justice with mercy.",
        element: "Air"
    },

    // WANDS (Fire Element - Passion, Creativity, Action)
    {
        id: 64, name: "Ace of Wands", suit: "wands", number: 1,
        keywords: ["creative spark", "new inspiration", "raw potential", "passionate beginnings"],
        upright: "Creative spark, new inspiration, raw potential, passionate beginnings. A burst of creative energy or new passionate pursuit. Act on your inspiration.",
        reversed: "Lack of energy, missed opportunities, creative blocks. Delays in starting new projects or lack of motivation. Reconnect with your passion.",
        element: "Fire"
    },
    {
        id: 65, name: "Two of Wands", suit: "wands", number: 2,
        keywords: ["future planning", "making decisions", "leaving comfort zone", "personal power"],
        upright: "Future planning, making decisions, leaving comfort zone, personal power. Planning for the future and making important decisions. Step out of your comfort zone.",
        reversed: "Fear of unknown, lack of planning, playing it safe. Avoiding risks or lack of long-term planning. Take calculated risks for growth.",
        element: "Fire"
    },
    {
        id: 66, name: "Three of Wands", suit: "wands", number: 3,
        keywords: ["expansion", "foresight", "overseas opportunities", "leadership"],
        upright: "Expansion, foresight, overseas opportunities, leadership. Expanding horizons and looking toward the future. Leadership and forward thinking.",
        reversed: "Playing it safe, lack of foresight, unexpected delays. Avoiding expansion or unexpected setbacks. Trust in your long-term vision.",
        element: "Fire"
    },
    {
        id: 67, name: "Four of Wands", suit: "wands", number: 4,
        keywords: ["celebration", "harmony", "homecoming", "community"],
        upright: "Celebration, harmony, homecoming, community. Celebration of achievements and milestones. Harmony in home and family life.",
        reversed: "Personal celebration, inner harmony, conflict at home. Need for inner peace or family conflicts. Focus on personal happiness first.",
        element: "Fire"
    },
    {
        id: 68, name: "Five of Wands", suit: "wands", number: 5,
        keywords: ["conflict", "competition", "tension", "diversity"],
        upright: "Conflict, competition, tension, diversity. Conflict and competition with others. Embrace diversity and healthy competition.",
        reversed: "Inner conflict, avoiding conflict, seeking harmony. Internal struggles or avoiding necessary confrontation. Address conflicts constructively.",
        element: "Fire"
    },
    {
        id: 69, name: "Six of Wands", suit: "wands", number: 6,
        keywords: ["public recognition", "progress", "self-confidence", "victory"],
        upright: "Public recognition, progress, self-confidence, victory. Success and recognition for your efforts. Victory and progress toward goals.",
        reversed: "Private achievement, self-doubt, lack of recognition. Personal victories or lack of external recognition. Focus on inner satisfaction.",
        element: "Fire"
    },
    {
        id: 70, name: "Seven of Wands", suit: "wands", number: 7,
        keywords: ["challenge", "competition", "perseverance", "defending position"],
        upright: "Challenge, competition, perseverance, defending position. Standing up for what you believe in. Perseverance in the face of opposition.",
        reversed: "Exhaustion, giving up, overwhelmed. Feeling overwhelmed by challenges or giving up too easily. Reassess your priorities.",
        element: "Fire"
    },
    {
        id: 71, name: "Eight of Wands", suit: "wands", number: 8,
        keywords: ["rapid action", "movement", "progress", "alignment"],
        upright: "Rapid action, movement, progress, alignment. Swift movement and progress. Things are moving quickly in the right direction.",
        reversed: "Delays, frustration, lack of progress. Unexpected delays or feeling stuck. Be patient and maintain your momentum.",
        element: "Fire"
    },
    {
        id: 72, name: "Nine of Wands", suit: "wands", number: 9,
        keywords: ["resilience", "persistence", "test of faith", "boundaries"],
        upright: "Resilience, persistence, test of faith, boundaries. Resilience in the face of adversity. You're stronger than you think.",
        reversed: "Inner resources, struggle, overwhelm. Drawing on inner strength or feeling overwhelmed. Take time to recover and regroup.",
        element: "Fire"
    },
    {
        id: 73, name: "Ten of Wands", suit: "wands", number: 10,
        keywords: ["burden", "extra responsibility", "hard work", "achievement"],
        upright: "Burden, extra responsibility, hard work, achievement. Heavy burdens and responsibilities. Success comes with hard work and sacrifice.",
        reversed: "Doing it all, release, delegate. Taking on too much or need to delegate. Don't carry all the weight yourself.",
        element: "Fire"
    },
    {
        id: 74, name: "Page of Wands", suit: "wands", number: 11,
        keywords: ["enthusiastic beginnings", "inspiration", "adventure", "impulsiveness"],
        upright: "Enthusiastic beginnings, inspiration, adventure, impulsiveness. A free spirit bringing news of exciting opportunities. Take inspired action.",
        reversed: "Lack of direction, procrastination, scattered energy. Missing opportunities through hesitation or poor planning. Focus your energy.",
        element: "Fire"
    },
    {
        id: 75, name: "Knight of Wands", suit: "wands", number: 12,
        keywords: ["impulsive action", "adventure", "passion", "recklessness"],
        upright: "Impulsive action, adventure, passion, recklessness. A fearless adventurer charging toward goals. Take bold action but consider consequences.",
        reversed: "Recklessness, impatience, lack of self-control. Impulsive decisions leading to problems. Slow down and think things through.",
        element: "Fire"
    },
    {
        id: 76, name: "Queen of Wands", suit: "wands", number: 13,
        keywords: ["confident leadership", "charismatic energy", "creative vision", "determination"],
        upright: "Confident leadership, charismatic energy, creative vision, determination. A charismatic leader inspiring others through example. Lead with confidence.",
        reversed: "Selfish ambition, jealousy, demanding behavior. Using power to manipulate or control others. Lead through service, not domination.",
        element: "Fire"
    },
    {
        id: 77, name: "King of Wands", suit: "wands", number: 14,
        keywords: ["visionary leadership", "entrepreneurial spirit", "inspired action", "natural leader"],
        upright: "Visionary leadership, entrepreneurial spirit, inspired action, natural leader. A natural leader inspiring others through vision. Lead by example with integrity.",
        reversed: "Tyrannical behavior, impulsiveness, abuse of power. Using position for personal gain or acting without consideration. Lead through service.",
        element: "Fire"
    }
];
