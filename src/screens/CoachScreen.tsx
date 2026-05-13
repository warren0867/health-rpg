import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { DailyLog, InBodyRecord, PermanentStats, UserProfile } from '../types';
import { ChatMessage, sendChatMessage } from '../utils/aiCoach';
import { calcRecentCondition, RecentCondition } from '../utils/permanentStats';
import {
  getAllDailyLogs,
  getInBodyRecords,
  getPermanentStats,
  getUserProfile,
} from '../utils/storage';

const WELCOME_MSG: ChatMessage = {
  role: 'assistant',
  content: '안녕하세요! 저는 당신의 건강 코치예요 💪\n\n운동 계획, 식단, 인바디 분석, 목표 달성 방법 — 무엇이든 물어보세요. 데이터를 기반으로 구체적인 조언을 드릴게요!',
};

export default function CoachScreen() {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [responding, setResponding] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const [permStats, setPermStats] = useState<PermanentStats | null>(null);
  const [conditionInfo, setConditionInfo] = useState<RecentCondition | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    Promise.all([
      getUserProfile(),
      getAllDailyLogs(),
      getInBodyRecords(),
      getPermanentStats(),
    ]).then(([p, logs, inbody, stats]) => {
      const recent = logs.slice(0, 14);
      setProfile(p);
      setRecentLogs(recent);
      setInbodyRecords(inbody);
      setPermStats(stats);
      setConditionInfo(calcRecentCondition(recent));
      setDataReady(true);
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || responding || !profile || !permStats) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setResponding(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await sendChatMessage({
        messages: nextMessages,
        profile,
        recentLogs,
        inbodyRecords,
        permStats,
        conditionInfo,
      });
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: '죄송해요, 잠깐 문제가 있었어요. 다시 물어봐 주세요 🙏',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setResponding(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, responding, messages, profile, permStats, recentLogs, inbodyRecords, conditionInfo]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textSub} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="sparkles" size={14} color={COLORS.purple} />
          <Text style={s.headerTitle}>AI 건강 코치</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 데이터 로딩 배너 */}
      {!dataReady && (
        <View style={s.loadingBanner}>
          <ActivityIndicator size="small" color={COLORS.purple} />
          <Text style={s.loadingBannerText}>건강 데이터 불러오는 중...</Text>
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        ListFooterComponent={responding ? <TypingIndicator /> : null}
      />

      {/* 입력 영역 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inputArea}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="무엇이든 물어보세요..."
            placeholderTextColor={COLORS.textDisabled}
            multiline
            maxLength={500}
            editable={dataReady && !responding}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || responding || !dataReady) && s.sendBtnDisabled]}
            onPress={send}
            activeOpacity={0.8}
            disabled={!input.trim() || responding || !dataReady}
          >
            <Ionicons name="send" size={16} color={input.trim() && !responding ? '#000' : COLORS.textDisabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.bubbleWrap, isUser && s.bubbleWrapUser]}>
      {!isUser && (
        <View style={s.avatarDot}>
          <Ionicons name="sparkles" size={10} color={COLORS.purple} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[s.bubbleWrap]}>
      <View style={s.avatarDot}>
        <Ionicons name="sparkles" size={10} color={COLORS.purple} />
      </View>
      <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
        <ActivityIndicator size="small" color={COLORS.purple} />
        <Text style={s.typingText}>답변 생성 중...</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.text,
  },

  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.purpleGlow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple + '22',
  },
  loadingBannerText: {
    fontSize: FONTS.xxs,
    color: COLORS.purple,
    fontFamily: 'monospace',
  },

  messageList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 12,
  },

  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '88%',
  },
  bubbleWrapUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarDot: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.purple + '22',
    borderWidth: 1,
    borderColor: COLORS.purple + '44',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
    maxWidth: '90%',
  },
  bubbleAI: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.purple + '33',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: COLORS.purple,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: FONTS.sm,
    color: COLORS.textSub,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: SPACING.sm,
  },
  typingText: {
    fontSize: FONTS.xs,
    color: COLORS.purple,
    fontFamily: 'monospace',
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: FONTS.sm,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
