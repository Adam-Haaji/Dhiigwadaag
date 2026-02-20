# Chatbot (Requester Assistant) — Setup & Testing

## API Key Setup

1. **OpenAI API key** (required for AI layer; fallback works without it):
   - Get a key from https://platform.openai.com/api-keys
   - In the backend project root, create or edit `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
   - Restart the backend server after adding the key.

2. **If `OPENAI_API_KEY` is not set** (or OpenAI fails):
   - The chatbot automatically uses the **rule-based fallback** assistant.
   - Fallback supports: blood compatibility, request guidance, emergency steps, and navigation help.

## Backend Routes

- `POST /api/chatbot/chat` — Requires auth. Body: `{ message: string, history?: { role, content }[] }`. Returns `{ reply, source: 'openai'|'fallback', toolUsed? }`.

## Testing Checklist

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| A | Requester: "I need O+ blood emergency in Hodan" | Open Requester Dashboard → tap floating chat button → send message | Bot extracts bloodType=O+, location=Hodan, urgency=emergency; checks donors; offers to create request or confirms. |
| B | "Who can donate to B+?" | Send in chat | Compatibility explanation: B+ can receive from O-, O+, B-, B+. |
| C | Emergency help | Ask e.g. "Emergency help" or "What do I do in emergency?" | Bot returns emergency steps (call 911, get to hospital, create request, contact donors). |
| D | OpenAI fails / no key | Disable network or leave `OPENAI_API_KEY` unset, send any message | Fallback assistant responds (compatibility, guidance, or generic help). No crash. |
| E | Create request via bot | Provide all required info in conversation; bot calls `createBloodRequest` | Request is created; bot confirms. |
| F | Somali language | Send message in Somali (e.g. "Waan u baahan dhiig" or "Maxaa ku dhiidi kara B+?") | Bot detects Somali and responds in Somali (AI or fallback). |

## Logging

- **AI responses / tool usage**: Set `NODE_ENV !== 'test'` to avoid logging in tests. Controller logs `[Chatbot] Tool: <name>` when a tool is used.
- **Failover**: When fallback is used, controller logs `[Chatbot] Fallback used: <error>`.

## Files Reference

- **Backend**: `src/services/chatbotService.js`, `src/controllers/chatbotController.js`, `src/routes/chatbot.js`
- **Frontend**: `components/chatbot/ChatbotButton.tsx`, `ChatbotPanel.tsx`, `ChatMessage.tsx`, `TypingIndicator.tsx`; `app/requesterDashboard.tsx` (integration)
