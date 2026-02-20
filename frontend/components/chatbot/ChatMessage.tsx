import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { semanticColors } from '@/constants/colors';
import colorsBase from '@/constants/colors';

export type ChatMessageProps = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>B</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]} selectable>
          {content}
        </Text>
        {timestamp && (
          <Text style={[styles.time, isUser ? styles.userTime : styles.assistantTime]}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colorsBase.palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    color: semanticColors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: colorsBase.palette.brand,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  assistantBubble: {
    backgroundColor: semanticColors.bgAlt,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: semanticColors.textInverse,
  },
  assistantText: {
    color: semanticColors.textPrimary,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.8,
  },
  userTime: {
    color: semanticColors.textInverse,
  },
  assistantTime: {
    color: semanticColors.textMuted,
  },
});
