import OpenAI from "openai";

// Initialize the OpenAI client with your API key
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePsychicOpening({
                                          clientName,
                                          recentMessages,
                                      }) {

    const systemPrompt = `
You are a psychic giving warm, empathetic, and professional readings. 
Your goal is to create an opening message that welcomes a client and invites them to share what they want guidance about. 
Include the client’s name in the message. If recent conversation history is available, reference it naturally to show continuity and connection.
Encourage the client to share their feelings, questions, or concerns. Be adaptable to topics like love, career, life path, or personal growth.
Tone should be friendly, gentle, and intuitive. Keep it 1-3 sentences long.
`;

    const userPrompt = `
client_name: ${clientName}
recent_messages: ${recentMessages?.join(" | ") || "None"}

Generate a single opening message for this client.
`;

    const response = await client.chat.completions.create({
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
