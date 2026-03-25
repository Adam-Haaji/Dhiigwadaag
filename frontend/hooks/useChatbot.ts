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

    const serviceUnavailable = 'Service temporarily unavailable. Please try again.';
    const dbUnavailable = 'Eligibility check unavailable. Please try again.';
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.chatbotChat({ message: trimmed, history });
      const data = res as { reply?: string; message?: string; status?: string };
      const reply =
        data?.reply ??
        data?.message ??
        (data?.status === 'DB_UNAVAILABLE' ? dbUnavailable : serviceUnavailable);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch (e: unknown) {
      setMessages((prev) => [...prev, { role: 'assistant', content: serviceUnavailable, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const resetMessages = useCallback(() => {
    setMessages([...initialMessages]);
  }, []);

  return { messages, loading, sendMessage, resetMessages };
}
