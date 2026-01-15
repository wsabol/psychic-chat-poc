import OpenAI from "openai";

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
    userLanguage = 'en-US'
}) {

    const languageMap = {
        'en-US': 'English',
        'en-GB': 'English',
        'es-ES': 'Spanish (Spain)',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese (Brazil)',
        'ja-JP': 'Japanese',
        'zh-CN': 'Simplified Chinese'
    };
    
    const languageName = languageMap[userLanguage] || 'English';
    
    let systemPrompt = `You are a psychic giving warm, empathetic, and professional readings. 
Your goal is to create an opening message that welcomes a client and invites them to share what they want guidance about. 
Include the client's name in the message. If recent conversation history is available, reference it naturally to show continuity and connection.
Encourage the client to share their feelings, questions, or concerns. Be adaptable to topics like love, career, life path, or personal growth.
Tone should be friendly, gentle, and intuitive. Keep it 1-3 sentences long.`;
    
    if (userLanguage !== 'en-US') {
        systemPrompt += `\n\nLANGUAGE REQUIREMENT:\nRespond EXCLUSIVELY in ${languageName}. Every word must be in ${languageName}.\nDo NOT include English translations or code-switching.`;
    }

    const userPrompt = `
client_name: ${clientName}
recent_messages: ${recentMessages?.join(" | ") || "None"}

Generate a single opening message for this client.
`;

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
