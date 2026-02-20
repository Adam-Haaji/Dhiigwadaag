import { useState, useCallback } from 'react';
import api from '@/service/api';

const WELCOME_EN = "Hello. I'm your blood donation assistant. I can help you find donors, create a blood request, explain blood compatibility, or guide you in an emergency. What do you need?";
const WELCOME_SO = "Salaam. Waxaan ahay caawiyahaaga dhiiga. Waxaan kuu caawin karaa inaad hesho dhiibayaal, sameysato codsi dhiig, ama degdega. Maxaad u baahan tahay?";

export type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: Date };

const initialMessages: ChatMessage[] = [
  { role: 'assistant', content: WELCOME_EN, timestamp: new Date() },
];

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.chatbotChat({ message: trimmed, history });
      const data = res as { reply?: string; message?: string; status?: string };
      const reply =
        data?.reply ??
        data?.message ??
        (data?.status === 'DB_UNAVAILABLE' ? 'Eligibility check unavailable. Please try again.' : "I couldn't process that. Please try again or use the app menus.");
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e ?? '');
      const friendly =
        typeof raw === 'string' && (raw.trim().startsWith('{') || raw.includes('ENOTFOUND') || raw.includes('getaddrinfo'))
          ? 'Eligibility check unavailable. Please try again.'
          : raw || 'Something went wrong. You can still use "Emergency Alert" or "Search" in the app.';
      setMessages((prev) => [...prev, { role: 'assistant', content: friendly, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const resetMessages = useCallback(() => {
    setMessages([...initialMessages]);
  }, []);

  return { messages, loading, sendMessage, resetMessages };
}
