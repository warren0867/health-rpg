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
import { DailyLog, FoodEntry, InBodyRecord, PermanentStats, UserProfile } from '../types';
import {
  ChatMessage,
  ParsedMealItem,
  parseMealInput,
  sendChatMessage,
} from '../utils/aiCoach';
import { calcRecentCondition, RecentCondition } from '../utils/permanentStats';
import {
  getAllDailyLogs,
  generateId,
  getInBodyRecords,
  getPermanentStats,
  getTodayKey,
  getUserProfile,
  saveFoodEntry,
  syncDailyLogCalories,
} from '../utils/storage';

// ─── 표시용 메시지 타입 ─────────────────────────────────────

type DisplayMsg =
  | { id: string; kind: 'chat'; role: 'user' | 'assistant'; content: string }
  | { id: string; kind: 'meal_confirm'; items: ParsedMealItem[]; saved: boolean }
  | { id: string; kind: 'meal_saved'; count: number; calories: number };

const MEAL_TIME_LABEL: Record<string, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};

const WELCOME: DisplayMsg = {
  id: 'welcome',
  kind: 'chat',
  role: 'assistant',
  content: '안녕하세요! 저는 건강 코치예요 💪\n\n운동·식단·인바디 상담은 메시지로, 먹은 음식을 바로 기록하려면 아래 🍴 버튼을 눌러주세요!',
};

export default function CoachScreen() {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DisplayMsg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [responding, setResponding] = useState(false);
  const [mealMode, setMealMode] = useState(false);

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

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  // ─── 채팅 전송 ─────────────────────────────────────────
  const sendChat = useCallback(async (text: string) => {
    if (!profile || !permStats) return;

    const userMsg: DisplayMsg = { id: generateId(), kind: 'chat', role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setResponding(true);
    scrollToBottom();

    const chatHistory: ChatMessage[] = messages
      .filter((m): m is DisplayMsg & { kind: 'chat' } => m.kind === 'chat')
      .map(m => ({ role: m.role, content: m.content }));
    chatHistory.push({ role: 'user', content: text });

    try {
      const reply = await sendChatMessage({
        messages: chatHistory,
        profile, recentLogs, inbodyRecords, permStats, conditionInfo,
      });
      setMessages(prev => [...prev, { id: generateId(), kind: 'chat', role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(), kind: 'chat', role: 'assistant',
        content: '잠깐 문제가 생겼어요. 다시 시도해주세요 🙏',
      }]);
    } finally {
      setResponding(false);
      scrollToBottom();
    }
  }, [messages, profile, permStats, recentLogs, inbodyRecords, conditionInfo]);

  // ─── 식단 파싱 전송 ─────────────────────────────────────
  const sendMeal = useCallback(async (text: string) => {
    const userMsg: DisplayMsg = { id: generateId(), kind: 'chat', role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setResponding(true);
    scrollToBottom();

    try {
      const items = await parseMealInput(text);
      setMessages(prev => [...prev, { id: generateId(), kind: 'meal_confirm', items, saved: false }]);
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(), kind: 'chat', role: 'assistant',
        content: '식단 분석에 실패했어요. 좀 더 자세히 설명해줄 수 있어요? 😅',
      }]);
    } finally {
      setResponding(false);
      scrollToBottom();
    }
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || responding) return;
    setInput('');
    if (mealMode) {
      setMealMode(false);
      await sendMeal(text);
    } else {
      await sendChat(text);
    }
  }, [input, responding, mealMode, sendChat, sendMeal]);

  // ─── 식단 저장 ──────────────────────────────────────────
  const saveMeals = useCallback(async (msgId: string, items: ParsedMealItem[]) => {
    const today = getTodayKey();
    for (const item of items) {
      const entry: FoodEntry = {
        id: generateId(),
        date: today,
        timestamp: new Date().toISOString(),
        foodId: `custom_${generateId()}`,
        foodName: item.name,
        servings: item.servings,
        calories: Math.round(item.calories * item.servings),
        carbs: Math.round(item.carbs * item.servings * 10) / 10,
        protein: Math.round(item.protein * item.servings * 10) / 10,
        fat: Math.round(item.fat * item.servings * 10) / 10,
        mealTime: item.mealTime,
      };
      await saveFoodEntry(entry);
    }
    await syncDailyLogCalories(today);

    const totalCal = items.reduce((s, i) => s + Math.round(i.calories * i.servings), 0);

    setMessages(prev => prev.map(m =>
      m.id === msgId && m.kind === 'meal_confirm' ? { ...m, saved: true } : m
    ));
    setMessages(prev => [...prev, {
      id: generateId(),
      kind: 'meal_saved',
      count: items.length,
      calories: totalCal,
    }]);
    scrollToBottom();
  }, []);

  // ─── 렌더 ───────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: DisplayMsg }) => {
    if (item.kind === 'chat') return <ChatBubble msg={item} />;
    if (item.kind === 'meal_confirm') return (
      <MealConfirmCard
        msgId={item.id}
        items={item.items}
        saved={item.saved}
        onSave={saveMeals}
      />
    );
    if (item.kind === 'meal_saved') return <MealSavedBubble count={item.count} calories={item.calories} />;
    return null;
  }, [saveMeals]);

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
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={renderItem}
        ListFooterComponent={responding ? <TypingIndicator /> : null}
      />

      {/* 입력 영역 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {mealMode && (
          <View style={s.mealModeBanner}>
            <Ionicons name="restaurant" size={13} color={COLORS.amber} />
            <Text style={s.mealModeBannerText}>식단 입력 모드 — 드신 것을 자유롭게 설명해주세요</Text>
            <TouchableOpacity onPress={() => setMealMode(false)}>
              <Ionicons name="close" size={15} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[s.inputArea, mealMode && s.inputAreaMeal]}>
          {/* 식단 모드 토글 버튼 */}
          <TouchableOpacity
            style={[s.mealBtn, mealMode && s.mealBtnActive]}
            onPress={() => setMealMode(m => !m)}
            activeOpacity={0.7}
          >
            <Ionicons name="restaurant" size={18} color={mealMode ? '#000' : COLORS.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={mealMode ? '오늘 뭐 드셨는지 얘기해줘...' : '무엇이든 물어보세요...'}
            placeholderTextColor={COLORS.textDisabled}
            multiline
            maxLength={500}
            editable={dataReady && !responding}
          />
          <TouchableOpacity
            style={[s.sendBtn, mealMode && s.sendBtnMeal, (!input.trim() || responding || !dataReady) && s.sendBtnDisabled]}
            onPress={send}
            activeOpacity={0.8}
            disabled={!input.trim() || responding || !dataReady}
          >
            <Ionicons
              name="send"
              size={16}
              color={input.trim() && !responding ? '#000' : COLORS.textDisabled}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────

function ChatBubble({ msg }: { msg: DisplayMsg & { kind: 'chat' } }) {
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

function MealConfirmCard({
  msgId, items, saved, onSave,
}: {
  msgId: string;
  items: ParsedMealItem[];
  saved: boolean;
  onSave: (id: string, items: ParsedMealItem[]) => void;
}) {
  const totalCal = items.reduce((s, i) => s + Math.round(i.calories * i.servings), 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs * i.servings, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein * i.servings, 0);
  const totalFat = items.reduce((s, i) => s + i.fat * i.servings, 0);

  const mealTimeLabel = items[0] ? (MEAL_TIME_LABEL[items[0].mealTime] ?? '') : '';

  return (
    <View style={[s.bubbleWrap]}>
      <View style={s.avatarDot}>
        <Ionicons name="restaurant" size={10} color={COLORS.amber} />
      </View>
      <View style={s.mealCard}>
        <View style={s.mealCardGlow} pointerEvents="none" />

        <View style={s.mealCardHeader}>
          <Text style={s.mealCardTitle}>식단 분석 완료</Text>
          {mealTimeLabel ? <Text style={s.mealTimeTag}>{mealTimeLabel}</Text> : null}
        </View>

        {items.map((item, i) => (
          <View key={i} style={s.mealItemRow}>
            <Text style={s.mealItemName} numberOfLines={1}>
              {item.name}{item.servings !== 1 ? ` ×${item.servings}` : ''}
            </Text>
            <Text style={s.mealItemCal}>{Math.round(item.calories * item.servings)} kcal</Text>
          </View>
        ))}

        <View style={s.mealTotalRow}>
          <Text style={s.mealTotalLabel}>합계</Text>
          <Text style={s.mealTotalCal}>{totalCal} kcal</Text>
        </View>
        <Text style={s.mealMacros}>
          탄 {totalCarbs.toFixed(0)}g · 단 {totalProtein.toFixed(0)}g · 지 {totalFat.toFixed(0)}g
        </Text>

        {!saved ? (
          <TouchableOpacity style={s.saveBtn} onPress={() => onSave(msgId, items)} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={15} color="#000" />
            <Text style={s.saveBtnText}>식단에 저장</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.good} />
            <Text style={s.savedBadgeText}>저장됨</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MealSavedBubble({ count, calories }: { count: number; calories: number }) {
  return (
    <View style={[s.bubbleWrap]}>
      <View style={s.avatarDot}>
        <Ionicons name="sparkles" size={10} color={COLORS.purple} />
      </View>
      <View style={[s.bubble, s.bubbleAI]}>
        <Text style={s.bubbleText}>
          {count}가지 음식({calories}kcal)을 식단에 저장했어요 ✅{'\n'}홈 화면 식단 링에서 확인할 수 있어요!
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={s.bubbleWrap}>
      <View style={s.avatarDot}>
        <Ionicons name="sparkles" size={10} color={COLORS.purple} />
      </View>
      <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
        <ActivityIndicator size="small" color={COLORS.purple} />
        <Text style={s.typingText}>분석 중...</Text>
      </View>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },

  loadingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    backgroundColor: COLORS.purpleGlow,
    borderBottomWidth: 1, borderBottomColor: COLORS.purple + '22',
  },
  loadingBannerText: { fontSize: FONTS.xxs, color: COLORS.purple, fontFamily: 'monospace' },

  messageList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 12,
  },

  // 채팅 버블
  bubbleWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%',
  },
  bubbleWrapUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatarDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.purple + '22',
    borderWidth: 1, borderColor: COLORS.purple + '44',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { borderRadius: RADIUS.lg, padding: SPACING.sm + 2, maxWidth: '90%' },
  bubbleAI: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.purple + '33', borderBottomLeftRadius: 4,
  },
  bubbleUser: { backgroundColor: COLORS.purple, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FONTS.sm, color: COLORS.textSub, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: SPACING.sm },
  typingText: { fontSize: FONTS.xs, color: COLORS.purple, fontFamily: 'monospace' },

  // 식단 확인 카드
  mealCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.amberLine,
    padding: SPACING.md,
    overflow: 'hidden', position: 'relative',
    maxWidth: 280,
  },
  mealCardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.amberGlow,
  },
  mealCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealCardTitle: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.amber, fontFamily: 'monospace', letterSpacing: 0.5 },
  mealTimeTag: {
    fontSize: FONTS.xxs, color: COLORS.amber + 'BB',
    backgroundColor: COLORS.amber + '22',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, fontFamily: 'monospace',
  },
  mealItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSub,
  },
  mealItemName: { fontSize: FONTS.xs, color: COLORS.textSub, flex: 1, marginRight: 8 },
  mealItemCal: { fontSize: FONTS.xs, color: COLORS.text, fontFamily: 'monospace', fontWeight: '700' },
  mealTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 6,
  },
  mealTotalLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  mealTotalCal: { fontSize: FONTS.md, color: COLORS.amber, fontFamily: 'monospace', fontWeight: '800' },
  mealMacros: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2, marginBottom: 10 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.md, paddingVertical: 10,
    marginTop: 4,
  },
  saveBtnText: { fontSize: FONTS.sm, fontWeight: '800', color: '#000' },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, marginTop: 4,
  },
  savedBadgeText: { fontSize: FONTS.xs, color: COLORS.good, fontWeight: '700' },

  // 식단 모드 배너
  mealModeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    backgroundColor: COLORS.amberGlow,
    borderTopWidth: 1, borderTopColor: COLORS.amberLine,
  },
  mealModeBannerText: { flex: 1, fontSize: FONTS.xxs, color: COLORS.amber, fontFamily: 'monospace' },

  // 입력 영역
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  inputAreaMeal: { backgroundColor: COLORS.amberGlow + '88' },
  mealBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  mealBtnActive: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    color: COLORS.text, fontSize: FONTS.sm,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnMeal: { backgroundColor: COLORS.amber },
  sendBtnDisabled: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
});
