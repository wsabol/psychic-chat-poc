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
    userTimezone = 'UTC'
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
    
    // Mystical system prompt - oracle generates varied, authentic greetings
    let systemPrompt = `You are a mystical oracle welcoming a seeker to a sacred reading space.
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
Always speak from the heart of the oracle within you.`;
    
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
