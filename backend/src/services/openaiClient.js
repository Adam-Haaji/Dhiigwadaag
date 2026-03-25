/**
 * OpenAI client for chatbot. API key from process.env.OPENAI_API_KEY only.
 * Never expose the key to frontend. Do not hardcode.
 */

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const hasKey = apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;

if (!hasKey) {
  console.warn('[Chatbot] OPENAI_API_KEY missing');
}

const client = hasKey ? new OpenAI({ apiKey: apiKey.trim() }) : null;

export function isOpenAIAvailable() {
  return client !== null;
}

export function getOpenAIClient() {
  return client;
}

export default getOpenAIClient;
