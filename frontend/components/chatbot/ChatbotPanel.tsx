import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { semanticColors } from '@/constants/colors';
import colorsBase from '@/constants/colors';
import { IconSymbol } from '@/components/IconSymbol';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { useChatbot } from '@/hooks/useChatbot';

type ChatbotPanelProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ChatbotPanel({ visible, onClose }: ChatbotPanelProps) {
  const { messages, loading, sendMessage, resetMessages } = useChatbot();
  const [inputText, setInputText] = React.useState('');
  const scrollRef = useRef<ScrollView>(null);
  const prevVisible = useRef(false);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      resetMessages();
    }
    prevVisible.current = visible;
  }, [visible, resetMessages]);

  useEffect(() => {
    if (visible && messages.length === 1) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText('');
    sendMessage(text);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>B</Text>
            </View>
            <Text style={styles.headerTitle}>Blood Assistant</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={resetMessages} style={styles.headerActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.headerActionText}>New Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <IconSymbol name="xmark" size={26} color={semanticColors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} timestamp={m.timestamp} />
            ))}
            {loading && <TypingIndicator />}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={semanticColors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !inputText.trim()}
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            >
              <IconSymbol name="paperplane.fill" size={28} color={inputText.trim() && !loading ? colorsBase.palette.brand : semanticColors.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.bgSurface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.borderSubtle,
    backgroundColor: semanticColors.bgElevated,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  headerActionText: {
    fontSize: 14,
    color: colorsBase.palette.brand,
    fontWeight: '600',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colorsBase.palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    color: semanticColors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: semanticColors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    borderTopColor: semanticColors.borderSubtle,
    backgroundColor: semanticColors.bgSurface,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: semanticColors.bgAlt,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    color: semanticColors.textPrimary,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {},
});
