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
import { useRefresh } from '../context/RefreshContext';
import {
  AlcoholInput, DailyLog, ExerciseInput, ExerciseType,
  FoodEntry, InBodyRecord, MoodLevel, PermanentStats,
  SleepInput, UserProfile,
} from '../types';
import {
  ChatMessage, CheckInData, CheckInTurn, EMPTY_CHECKIN,
  ParsedMealItem, conductCheckIn, parseMealInput, sendChatMessage,
} from '../utils/aiCoach';
import { calcRecentCondition, RecentCondition } from '../utils/permanentStats';
import {
  addXP, generateId, getAllDailyLogs, getDailyLog,
  getFoodEntriesByDate, getInBodyRecords, getMorningBS,
  getPermanentStats, getRecentDailyLogs, getStreak,
  getTodayKey, getUserProfile, getWeightHistory,
  recalcAndSavePermanentStats, saveDailyLog, saveFoodEntry,
  sumFoodEntries, syncDailyLogCalories,
} from '../utils/storage';
import { calcXPGainWithTrends } from '../utils/levelSystem';
import { calculateScore, calculateStats } from '../utils/scoreCalculator';

// ─── 타입 ───────────────────────────────────────────────────

type Mode = 'chat' | 'meal' | 'checkin';

type DisplayMsg =
  | { id: string; kind: 'chat'; role: 'user' | 'assistant'; content: string }
  | { id: string; kind: 'meal_confirm'; items: ParsedMealItem[]; saved: boolean }
  | { id: string; kind: 'meal_saved'; count: number; calories: number }
  | { id: string; kind: 'checkin_confirm'; data: CheckInData; saved: boolean };

const MEAL_TIME_KO: Record<string, string> = {
  breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식',
};

const EXERCISE_KO: Record<string, string> = {
  walk: '걷기', run: '달리기', cycling: '자전거', gym: '헬스', swim: '수영',
  hiking: '등산', yoga: '요가', pilates: '필라테스', tennis: '테니스', soccer: '축구',
};

const WELCOME: DisplayMsg = {
  id: 'welcome', kind: 'chat', role: 'assistant',
  content: '안녕하세요! 저는 건강 코치예요 💪\n\n• 일반 건강 상담 → 그냥 입력\n• 식단 입력 → 🍴 버튼\n• 체크인 대화 → ✏️ 버튼',
};

// ─── 메인 컴포넌트 ──────────────────────────────────────────

export default function CoachScreen() {
  const navigation = useNavigation<any>();
  const { triggerRefresh } = useRefresh();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DisplayMsg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [responding, setResponding] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');

  // 체크인 전용 상태
  const [checkInData, setCheckInData] = useState<CheckInData>(EMPTY_CHECKIN);
  const [checkInHistory, setCheckInHistory] = useState<ChatMessage[]>([]);

  // 건강 데이터
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const [permStats, setPermStats] = useState<PermanentStats | null>(null);
  const [conditionInfo, setConditionInfo] = useState<RecentCondition | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    Promise.all([getUserProfile(), getAllDailyLogs(), getInBodyRecords(), getPermanentStats()])
      .then(([p, logs, inbody, stats]) => {
        const recent = logs.slice(0, 14);
        setProfile(p); setRecentLogs(recent); setInbodyRecords(inbody);
        setPermStats(stats); setConditionInfo(calcRecentCondition(recent));
        setDataReady(true);
      });
  }, []);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const pushMsg = (msg: DisplayMsg) =>
    setMessages(prev => [...prev, msg]);

  // ─── 모드 전환 ─────────────────────────────────────────────
  const switchMode = (next: Mode) => {
    if (mode === next) { setMode('chat'); return; }
    setMode(next);
    if (next === 'checkin') {
      setCheckInData(EMPTY_CHECKIN);
      setCheckInHistory([]);
      pushMsg({
        id: generateId(), kind: 'chat', role: 'assistant',
        content: '오늘 하루 어떠셨어요? 수면·운동·음주 편하게 얘기해주세요 😊\n예) "7시간 자고 헬스 1시간 했어"',
      });
      scrollToBottom();
    }
  };

  // ─── 일반 채팅 ──────────────────────────────────────────────
  const sendChat = useCallback(async (text: string) => {
    if (!profile || !permStats) return;
    pushMsg({ id: generateId(), kind: 'chat', role: 'user', content: text });
    setResponding(true); scrollToBottom();

    const history: ChatMessage[] = messages
      .filter((m): m is DisplayMsg & { kind: 'chat' } => m.kind === 'chat')
      .map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    try {
      const reply = await sendChatMessage({ messages: history, profile, recentLogs, inbodyRecords, permStats, conditionInfo });
      pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: reply });
    } catch {
      pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: '잠깐 문제가 생겼어요. 다시 시도해주세요 🙏' });
    } finally { setResponding(false); scrollToBottom(); }
  }, [messages, profile, permStats, recentLogs, inbodyRecords, conditionInfo]);

  // ─── 식단 파싱 ──────────────────────────────────────────────
  const sendMeal = useCallback(async (text: string) => {
    pushMsg({ id: generateId(), kind: 'chat', role: 'user', content: text });
    setResponding(true); scrollToBottom();
    try {
      const items = await parseMealInput(text);
      pushMsg({ id: generateId(), kind: 'meal_confirm', items, saved: false });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: `식단 분석에 실패했어요 😅\n(${detail})` });
    } finally { setResponding(false); scrollToBottom(); }
  }, []);

  // ─── 체크인 대화 ────────────────────────────────────────────
  const sendCheckIn = useCallback(async (text: string) => {
    pushMsg({ id: generateId(), kind: 'chat', role: 'user', content: text });
    setResponding(true); scrollToBottom();

    const newHistory: ChatMessage[] = [...checkInHistory, { role: 'user', content: text }];
    setCheckInHistory(newHistory);

    try {
      const result: CheckInTurn = await conductCheckIn(newHistory, checkInData);
      setCheckInData(result.data);
      const updatedHistory: ChatMessage[] = [...newHistory, { role: 'assistant', content: result.reply }];
      setCheckInHistory(updatedHistory);

      if (result.complete) {
        setMode('chat');
        pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: result.reply });
        pushMsg({ id: generateId(), kind: 'checkin_confirm', data: result.data, saved: false });
      } else {
        pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: result.reply });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      pushMsg({ id: generateId(), kind: 'chat', role: 'assistant', content: `체크인 중 오류가 발생했어요 🙏\n(${detail})` });
    } finally { setResponding(false); scrollToBottom(); }
  }, [checkInHistory, checkInData]);

  // ─── 전송 디스패치 ──────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || responding) return;
    setInput('');
    const currentMode = mode;
    setMode('chat');
    if (currentMode === 'meal') await sendMeal(text);
    else if (currentMode === 'checkin') { setMode('checkin'); await sendCheckIn(text); }
    else await sendChat(text);
  }, [input, responding, mode, sendChat, sendMeal, sendCheckIn]);

  // ─── 식단 저장 ──────────────────────────────────────────────
  const saveMeals = useCallback(async (msgId: string, items: ParsedMealItem[]) => {
    const today = getTodayKey();
    for (const item of items) {
      const entry: FoodEntry = {
        id: generateId(), date: today, timestamp: new Date().toISOString(),
        foodId: `custom_${generateId()}`, foodName: item.name, servings: item.servings,
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
    setMessages(prev => prev.map(m => m.id === msgId && m.kind === 'meal_confirm' ? { ...m, saved: true } : m));
    pushMsg({ id: generateId(), kind: 'meal_saved', count: items.length, calories: totalCal });
    scrollToBottom();
  }, []);

  // ─── 체크인 저장 ────────────────────────────────────────────
  const saveCheckIn = useCallback(async (msgId: string, data: CheckInData) => {
    if (!profile) return;
    setMessages(prev => prev.map(m => m.id === msgId && m.kind === 'checkin_confirm' ? { ...m, saved: true } : m));

    const today = getTodayKey();
    const sleep: SleepInput = { hours: data.sleep?.hours ?? 6 };
    const exercise: ExerciseInput = data.exercise && data.exercise.types.length > 0
      ? { types: data.exercise.types as ExerciseType[], minutes: data.exercise.minutes }
      : { types: ['none' as ExerciseType], minutes: 0 };
    const alcohol: AlcoholInput = { consumed: data.alcohol?.consumed ?? false, items: [] };

    const [foodEntries, morningBS, streak, recentLogs7, weightLog, existingLog] = await Promise.all([
      getFoodEntriesByDate(today), getMorningBS(today), getStreak(),
      getRecentDailyLogs(7), getWeightHistory(365), getDailyLog(today),
    ]);

    const foodSum = sumFoodEntries(foodEntries);
    const breakdown = calculateScore(sleep, exercise, alcohol, morningBS, foodSum.calories, profile.targetCalories);
    const stats = calculateStats(breakdown, exercise, sleep, morningBS);

    const sortedW = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
    const weightChangeKg = sortedW.length >= 2 ? sortedW[0].weightKg - sortedW[sortedW.length - 1].weightKg : 0;
    const bpStableDays = recentLogs7.filter(l => l.bloodPressure && l.bloodPressure.systolic < 130 && l.bloodPressure.diastolic < 85).length;
    const bsNormalDays = recentLogs7.filter(l => { const bs = l.morningBSValue; return bs != null && bs >= 70 && bs < 100; }).length;
    const xpResult = calcXPGainWithTrends(breakdown.total, streak, {
      weightGoal: profile.goal, weightChangeKg, bpStableDays, bsNormalDays,
      exerciseMinutesThisWeek: exercise.minutes,
    });

    const now = new Date().toISOString();
    const log: DailyLog = {
      id: existingLog?.id ?? generateId(),
      date: today, sleep, exercise, alcohol,
      conditionScore: breakdown.total, scoreBreakdown: breakdown, stats,
      mood: (data.mood as MoodLevel) ?? undefined,
      bloodPressure: data.bloodPressure?.systolic
        ? { systolic: data.bloodPressure.systolic, diastolic: data.bloodPressure.diastolic }
        : undefined,
      morningBSValue: data.morningBS ?? undefined,
      xpGained: xpResult.total,
      caloriesConsumed: foodSum.calories,
      createdAt: existingLog?.createdAt ?? now, updatedAt: now,
    };

    const permStatsBefore = await getPermanentStats();
    await saveDailyLog(log);
    if (!existingLog) await addXP(xpResult.total);
    const permStatsAfter = await recalcAndSavePermanentStats();
    triggerRefresh();
    navigation.navigate('Result', { log, permStatsBefore, permStatsAfter });
  }, [profile, navigation, triggerRefresh]);

  // ─── 렌더 ───────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: DisplayMsg }) => {
    if (item.kind === 'chat') return <ChatBubble msg={item} />;
    if (item.kind === 'meal_confirm') return <MealConfirmCard msgId={item.id} items={item.items} saved={item.saved} onSave={saveMeals} />;
    if (item.kind === 'meal_saved') return <MealSavedBubble count={item.count} calories={item.calories} />;
    if (item.kind === 'checkin_confirm') return <CheckInConfirmCard msgId={item.id} data={item.data} saved={item.saved} onSave={saveCheckIn} />;
    return null;
  }, [saveMeals, saveCheckIn]);

  const modeColor = mode === 'meal' ? COLORS.amber : mode === 'checkin' ? COLORS.primary : COLORS.purple;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={renderItem}
        ListFooterComponent={responding ? <TypingIndicator /> : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 모드 배너 */}
        {mode !== 'chat' && (
          <View style={[s.modeBanner, { borderTopColor: modeColor + '44', backgroundColor: modeColor + '11' }]}>
            <Ionicons name={mode === 'meal' ? 'restaurant' : 'create'} size={13} color={modeColor} />
            <Text style={[s.modeBannerText, { color: modeColor }]}>
              {mode === 'meal' ? '식단 입력 모드 — 드신 것을 자유롭게 설명해주세요' : '체크인 대화 모드 — 오늘 하루를 얘기해주세요'}
            </Text>
            <TouchableOpacity onPress={() => setMode('chat')}>
              <Ionicons name="close" size={15} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.inputArea}>
          {/* 식단 버튼 */}
          <TouchableOpacity style={[s.modeBtn, mode === 'meal' && { backgroundColor: COLORS.amber, borderColor: COLORS.amber }]} onPress={() => switchMode('meal')} activeOpacity={0.7}>
            <Ionicons name="restaurant" size={17} color={mode === 'meal' ? '#000' : COLORS.textMuted} />
          </TouchableOpacity>

          {/* 체크인 버튼 */}
          <TouchableOpacity style={[s.modeBtn, mode === 'checkin' && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={() => switchMode('checkin')} activeOpacity={0.7}>
            <Ionicons name="create" size={17} color={mode === 'checkin' ? '#000' : COLORS.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={mode === 'meal' ? '오늘 뭐 드셨는지 얘기해줘...' : mode === 'checkin' ? '오늘 하루를 얘기해줘...' : '무엇이든 물어보세요...'}
            placeholderTextColor={COLORS.textDisabled}
            multiline maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={send}
            editable={dataReady && !responding}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: input.trim() && !responding ? modeColor : COLORS.bgCard }, (!input.trim() || responding) && s.sendBtnDisabled]}
            onPress={send} activeOpacity={0.8}
            disabled={!input.trim() || responding || !dataReady}
          >
            <Ionicons name="send" size={16} color={input.trim() && !responding ? '#000' : COLORS.textDisabled} />
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
      {!isUser && <View style={s.avatarDot}><Ionicons name="sparkles" size={10} color={COLORS.purple} /></View>}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
}

function MealConfirmCard({ msgId, items, saved, onSave }: { msgId: string; items: ParsedMealItem[]; saved: boolean; onSave: (id: string, items: ParsedMealItem[]) => void }) {
  const totalCal = items.reduce((s, i) => s + Math.round(i.calories * i.servings), 0);
  const totalCarbs = items.reduce((s, i) => s + i.carbs * i.servings, 0);
  const totalProtein = items.reduce((s, i) => s + i.protein * i.servings, 0);
  const totalFat = items.reduce((s, i) => s + i.fat * i.servings, 0);
  const mealTimeLabel = items[0] ? (MEAL_TIME_KO[items[0].mealTime] ?? '') : '';

  return (
    <View style={s.bubbleWrap}>
      <View style={[s.avatarDot, { backgroundColor: COLORS.amberGlow, borderColor: COLORS.amberLine }]}>
        <Ionicons name="restaurant" size={10} color={COLORS.amber} />
      </View>
      <View style={s.confirmCard}>
        <View style={[s.confirmCardGlow, { backgroundColor: COLORS.amberGlow }]} pointerEvents="none" />
        <View style={s.confirmCardHeader}>
          <Text style={[s.confirmCardTitle, { color: COLORS.amber }]}>식단 분석 완료</Text>
          {!!mealTimeLabel && <Text style={[s.timeTag, { color: COLORS.amber, backgroundColor: COLORS.amber + '22' }]}>{mealTimeLabel}</Text>}
        </View>
        {items.map((item, i) => (
          <View key={i} style={s.confirmItemRow}>
            <Text style={s.confirmItemName} numberOfLines={1}>{item.name}{item.servings !== 1 ? ` ×${item.servings}` : ''}</Text>
            <Text style={s.confirmItemVal}>{Math.round(item.calories * item.servings)} kcal</Text>
          </View>
        ))}
        <View style={s.confirmTotal}>
          <Text style={s.confirmTotalLabel}>합계</Text>
          <Text style={[s.confirmTotalVal, { color: COLORS.amber }]}>{totalCal} kcal</Text>
        </View>
        <Text style={s.confirmMacros}>탄 {totalCarbs.toFixed(0)}g · 단 {totalProtein.toFixed(0)}g · 지 {totalFat.toFixed(0)}g</Text>
        {!saved
          ? <TouchableOpacity style={[s.confirmSaveBtn, { backgroundColor: COLORS.amber }]} onPress={() => onSave(msgId, items)} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={15} color="#000" /><Text style={s.confirmSaveBtnText}>식단에 저장</Text>
            </TouchableOpacity>
          : <View style={s.savedBadge}><Ionicons name="checkmark-circle" size={14} color={COLORS.good} /><Text style={[s.savedBadgeText, { color: COLORS.good }]}>저장됨</Text></View>
        }
      </View>
    </View>
  );
}

function MealSavedBubble({ count, calories }: { count: number; calories: number }) {
  return (
    <View style={s.bubbleWrap}>
      <View style={s.avatarDot}><Ionicons name="sparkles" size={10} color={COLORS.purple} /></View>
      <View style={[s.bubble, s.bubbleAI]}>
        <Text style={s.bubbleText}>{count}가지 음식({calories}kcal)을 식단에 저장했어요 ✅{'\n'}홈 화면 식단 링에서 확인해보세요!</Text>
      </View>
    </View>
  );
}

function CheckInConfirmCard({ msgId, data, saved, onSave }: { msgId: string; data: CheckInData; saved: boolean; onSave: (id: string, data: CheckInData) => void }) {
  const exerciseLabel = data.exercise && data.exercise.types.length > 0
    ? `${data.exercise.types.map(t => EXERCISE_KO[t] ?? t).join('·')} ${data.exercise.minutes}분`
    : '없음';

  return (
    <View style={s.bubbleWrap}>
      <View style={[s.avatarDot, { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primaryLine }]}>
        <Ionicons name="create" size={10} color={COLORS.primary} />
      </View>
      <View style={s.confirmCard}>
        <View style={[s.confirmCardGlow, { backgroundColor: COLORS.primaryGlow }]} pointerEvents="none" />
        <View style={s.confirmCardHeader}>
          <Text style={[s.confirmCardTitle, { color: COLORS.primary }]}>오늘의 체크인 요약</Text>
        </View>
        <ConfirmRow label="수면" value={data.sleep ? `${data.sleep.hours}시간` : '-'} />
        <ConfirmRow label="운동" value={exerciseLabel} />
        <ConfirmRow label="음주" value={data.alcohol ? (data.alcohol.consumed ? '있음' : '없음') : '-'} />
        {data.mood && <ConfirmRow label="기분" value={`${data.mood}/5`} />}
        {data.bloodPressure && <ConfirmRow label="혈압" value={`${data.bloodPressure.systolic}/${data.bloodPressure.diastolic}`} />}
        {data.morningBS && <ConfirmRow label="공복혈당" value={`${data.morningBS} mg/dL`} />}
        {!saved
          ? <TouchableOpacity style={[s.confirmSaveBtn, { backgroundColor: COLORS.primary }]} onPress={() => onSave(msgId, data)} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={15} color="#000" /><Text style={s.confirmSaveBtnText}>체크인 저장 & 결과 보기</Text>
            </TouchableOpacity>
          : <View style={s.savedBadge}><Ionicons name="checkmark-circle" size={14} color={COLORS.good} /><Text style={[s.savedBadgeText, { color: COLORS.good }]}>저장 중...</Text></View>
        }
      </View>
    </View>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.confirmItemRow}>
      <Text style={[s.confirmItemName, { color: COLORS.textMuted }]}>{label}</Text>
      <Text style={s.confirmItemVal}>{value}</Text>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={s.bubbleWrap}>
      <View style={s.avatarDot}><Ionicons name="sparkles" size={10} color={COLORS.purple} /></View>
      <View style={[s.bubble, s.bubbleAI, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <ActivityIndicator size="small" color={COLORS.purple} />
        <Text style={[s.bubbleText, { color: COLORS.purple, fontFamily: 'monospace' }]}>분석 중...</Text>
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
    backgroundColor: COLORS.purpleGlow, borderBottomWidth: 1, borderBottomColor: COLORS.purple + '22',
  },
  loadingBannerText: { fontSize: FONTS.xxs, color: COLORS.purple, fontFamily: 'monospace' },
  messageList: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, gap: 12 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  bubbleWrapUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatarDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.purple + '22', borderWidth: 1, borderColor: COLORS.purple + '44',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { borderRadius: RADIUS.lg, padding: SPACING.sm + 2, maxWidth: '90%' },
  bubbleAI: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.purple + '33', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.purple, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FONTS.sm, color: COLORS.textSub, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },

  confirmCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, overflow: 'hidden', position: 'relative', maxWidth: 280,
  },
  confirmCardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confirmCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  confirmCardTitle: { fontSize: FONTS.xs, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 0.5 },
  timeTag: { fontSize: FONTS.xxs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'monospace' },
  confirmItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub,
  },
  confirmItemName: { fontSize: FONTS.xs, color: COLORS.textSub, flex: 1, marginRight: 8 },
  confirmItemVal: { fontSize: FONTS.xs, color: COLORS.text, fontFamily: 'monospace', fontWeight: '700' },
  confirmTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6 },
  confirmTotalLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  confirmTotalVal: { fontSize: FONTS.md, fontFamily: 'monospace', fontWeight: '800' },
  confirmMacros: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2, marginBottom: 10 },
  confirmSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: RADIUS.md, paddingVertical: 10, marginTop: 4,
  },
  confirmSaveBtnText: { fontSize: FONTS.sm, fontWeight: '800', color: '#000' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 4 },
  savedBadgeText: { fontSize: FONTS.xs, fontWeight: '700' },

  modeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderTopWidth: 1,
  },
  modeBannerText: { flex: 1, fontSize: FONTS.xxs, fontFamily: 'monospace' },

  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingBottom: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  modeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    color: COLORS.text, fontSize: FONTS.sm,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
});
