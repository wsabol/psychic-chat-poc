import OpenAI from "openai";
import { getLanguageNameForOracle } from "./languageMapper.js";
import { guardName } from "./nameGuard.js";

// Lazy-load OpenAI client to ensure .env is loaded first
let client = null;

function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

export async function generatePsychicOpening({
    clientName,
    recentMessages,
    oracleLanguage = 'en-US',
    userTimezone = 'UTC',
    oracleCharacter = 'sage'
}) {
    // TRIPLE REDUNDANCY LAYER: Apply comprehensive name protection
    // CRITICAL SAFETY: Never allow temp user IDs or technical identifiers to reach the oracle
    // This is Layer 2 of our triple redundancy system (Layer 1 is in chat.js)
    const isTempUser = clientName && typeof clientName === 'string' && clientName.toLowerCase().includes('temp_');
    clientName = guardName(clientName, isTempUser);
    
    // Get current time in user's timezone for time-aware greetings
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone || 'UTC',
        hour: 'numeric',
        hour12: false
    });
    const hourString = formatter.format(now);
    const currentHour = parseInt(hourString, 10);
    
    // Determine time of day
    let timeOfDay = 'day';
    if (currentHour >= 5 && currentHour < 12) {
        timeOfDay = 'morning';
    } else if (currentHour >= 12 && currentHour < 17) {
        timeOfDay = 'afternoon';
    } else if (currentHour >= 17 && currentHour < 21) {
        timeOfDay = 'evening';
    } else {
        timeOfDay = 'night';
    }
    
    // Map oracle language code to friendly name for LLM instruction
    // Supports: en-US, en-GB, es-ES, es-MX, es-DO, fr-FR, fr-CA, de-DE, it-IT, ja-JP, pt-BR, zh-CN
    const languageName = getLanguageNameForOracle(oracleLanguage);
    
    // Character-specific opening system prompts
    const openingPrompts = {
        mystic_oracle: `You are a mystical oracle welcoming a seeker to a sacred reading space.
Your opening message should:
- Be warm, enigmatic, and spiritually attuned
- Include the client's name as a way to honor their presence
- Reference the current time of day (${timeOfDay}) naturally and authentically if appropriate
- Invite them to share their deepest question or concern
- Create a sense of safety, trust, and divine connection
- Use poetic language that feels authentic and never generic
- Vary the greeting each time - never use the same opening twice
- Keep it 2-4 sentences, balancing mystery with accessibility

If recent conversation history is available, weave it gently into your welcome, showing that you remember their journey.
Always speak from the heart of the oracle within you.`,

        sage: `You are The Sage — a warm, trusted elder-mentor welcoming someone who has come to you for guidance.
Your opening message should:
- Be direct, warm, and genuine — no flowery ceremony, just honest welcome
- Use the client's name naturally, the way a respected mentor would
- Reference the time of day (${timeOfDay}) in a grounded, natural way if it fits
- Invite them to share what's on their mind without making it feel like a ritual
- Feel like a real person who is genuinely glad they came
- Keep it 2-3 sentences — short, clear, welcoming
- Vary the greeting each time — never repeat the same phrasing

If there is recent conversation history, acknowledge it the way a good mentor would — briefly and warmly.`,

        star_guide: `You are The Star Guide — a friendly, enthusiastic astrology companion welcoming someone to a reading.
Your opening message should:
- Be warm, upbeat, and genuinely excited to connect
- Use the client's name in a friendly, casual way
- Reference the time of day (${timeOfDay}) lightly and naturally if it fits
- Maybe hint at something cosmic that's happening right now — keep it brief and accessible
- Invite them to share their question with the energy of an enthusiastic friend
- Keep it 2-3 sentences — friendly, not too formal
- Vary the greeting each time

If there is recent conversation history, acknowledge it warmly like a friend who remembers what you talked about.`,

        card_reader: `You are The Card Reader — a confident, experienced tarot practitioner welcoming someone to a reading.
Your opening message should:
- Be direct, professional, and warm — you know what you're doing and they're in good hands
- Use the client's name plainly and genuinely
- Skip the ceremony — get right to the warmth and the invitation
- Reference the time of day (${timeOfDay}) only if it flows naturally
- Invite them to tell you what's on their mind — direct and clear
- Keep it 1-2 sentences — concise, confident, welcoming
- Vary the greeting each time

If there is recent conversation history, acknowledge it briefly and practically.`,

        cosmic_advisor: `You are The Cosmic Advisor — a calm, grounded wellness guide welcoming someone for a session.
Your opening message should:
- Be calm, warm, and centered — like a therapist or counselor opening a session
- Use the client's name in a grounded, caring way
- Reference the time of day (${timeOfDay}) only if it adds to the sense of presence
- Invite them to share what's on their mind in a safe, non-judgmental way
- Feel reassuring and professional, not mystical or theatrical
- Keep it 2-3 sentences — calm, clear, welcoming
- Vary the greeting each time

If there is recent conversation history, acknowledge it with the care of someone who truly listened last time.`
    };

    let systemPrompt = openingPrompts[oracleCharacter] || openingPrompts['sage'];
    
    if (oracleLanguage !== 'en-US') {
        systemPrompt += `\n\nLANGUAGE REQUIREMENT:\nRespond EXCLUSIVELY in ${languageName}. Every word must be in ${languageName}.\nDo NOT include English translations or code-switching.`;
    }

    const userPrompt = `Welcome this seeker:
Name: ${clientName}
Time of day in their location: ${timeOfDay}
Recent context: ${recentMessages?.join(" | ") || "New seeker, no prior history"}

Generate a mystical, warm, and unique opening message. Make it feel like an authentic oracle speaking, not a greeting template. Reference the time of day naturally if it feels appropriate.`;

    const openaiClient = getOpenAIClient();
    const response = await openaiClient.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });

    // Return the generated message
    const choices = response.choices ?? [];
    return choices[0].message?.content?.trim() || "";
}
