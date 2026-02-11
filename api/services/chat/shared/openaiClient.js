/**
 * OpenAI Client Singleton Factory
 * Ensures only one OpenAI client instance exists across the app
 * Reuses connection pooling and auth tokens
 * Available to both api/ and worker/ modules
 */

import OpenAI from 'openai';

let client = null;

export function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
