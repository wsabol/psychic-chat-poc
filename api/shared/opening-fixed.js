import OpenAI from "openai";
import { getLanguageNameForOracle } from "./languageMapper.js";

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
    oracleLanguage = 'en-US'
}) {
    // Use shared language mapper - supports all regional variants (es-MX, fr-CA, es-DO, etc.)
    const languageName = getLanguageNameForOracle(oracleLanguage);
    
    // Mystical system prompt - oracle generates varied, authentic greetings
    let systemPrompt = `You are a mystical oracle welcoming a seeker to a sacred reading space.
Your opening message should:
- Be warm, enigmatic, and spiritually attuned
- Include the client's name as a way to honor their presence
- Reference the moment (time of day, cosmic energy) if it feels natural
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
Recent context: ${recentMessages?.join(" | ") || "New seeker, no prior history"}

Generate a mystical, warm, and unique opening message. Make it feel like an authentic oracle speaking, not a greeting template.`;

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
