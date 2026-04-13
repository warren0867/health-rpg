import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { AlcoholInput, AlcoholType, ExerciseInput, ExerciseType, RootStackParamList, SleepInput } from '../types';
import {
  generateId, getDailyLog, getFoodEntriesByDate,
  getMorningBS, getTodayKey, getUserProfile, saveDailyLog, sumFoodEntries,
} from '../utils/storage';
import {
  ALCOHOL_CAL_PER_UNIT, ALCOHOL_EMOJI, ALCOHOL_LABELS, ALCOHOL_UNITS,
  EXERCISE_LABELS, EXERCISE_MET,
  calculateScore, calculateStats, calcAlcoholCalories, calcExerciseCalories,
} from '../utils/scoreCalculator';

type Nav = StackNavigationProp<RootStackParamList>;

const EXERCISE_OPTIONS: ExerciseType[] = ['walk', 'run', 'cycling', 'gym', 'swim', 'hiking', 'yoga', 'pilates', 'tennis', 'soccer'];
const ALCOHOL_TYPES: AlcoholType[] = ['beer_can', 'beer_bottle', 'soju', 'makgeolli', 'whiskey', 'wine', 'highball', 'bomb'];
const DURATION_OPTIONS = [30, 40, 50, 60, 70, 80, 90];

// ─── RPG 선택 버튼 (컴팩트) ───────────────────────────────
function ChipBtn({ label, sub, selected, onPress, color = COLORS.purple }: {
  label: string; sub?: string; selected: boolean; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[c.chip, selected && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.75}
    >
      <Text style={[c.chipText, selected && { color }]}>{label}</Text>
      {sub && <Text style={c.chipSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

// ─── 섹션 (퀘스트 패널) ──────────────────────────────────
function QuestPanel({ icon, title, badge, children }: {
  icon: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <View style={c.panel}>
      <View style={c.panelHeader}>
        <View style={c.panelTitleRow}>
          <Text style={c.panelIcon}>{icon}</Text>
          <Text style={c.panelTitle}>{title}</Text>
        </View>
        {badge && (
          <View style={c.effectBadge}>
            <Text style={c.effectText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── 효과 미리보기 태그 ───────────────────────────────────
function EffectTag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[c.effectTag, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Text style={[c.effectTagText, { color }]}>{label}</Text>
    </View>
  );
}

export default function InputScreen() {
  const navigation = useNavigation<Nav>();
  const today = getTodayKey();

  const [sleep, setSleep] = useState<SleepInput>({ hours: 7 });
  const [selectedExercises, setSelectedExercises] = useState<ExerciseType[]>([]);
  const [duration, setDuration] = useState(30);
  const [alcohol, setAlcohol] = useState<AlcoholInput>({ consumed: false, items: [] });
  const [saving, setSaving] = useState(false);

  const toggleExercise = (type: ExerciseType) => {
    setSelectedExercises(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const burnCal = calcExerciseCalories({ types: selectedExercises, minutes: duration }, 70);
  const alcoholCal = calcAlcoholCalories(alcohol);

  const toggleAlcohol = (type: AlcoholType) => {
    setAlcohol(prev => {
      const exists = prev.items.find(i => i.type === type);
      if (exists) {
        const items = prev.items.filter(i => i.type !== type);
        return { consumed: items.length > 0, items };
      }
      return { consumed: true, items: [...prev.items, { type, amount: 1 }] };
    });
  };

  const adjustAmount = (type: AlcoholType, delta: number) => {
    setAlcohol(prev => {
      const items = prev.items.map(i => {
        if (i.type !== type) return i;
        return { ...i, amount: Math.max(0.5, Math.round((i.amount + delta) * 2) / 2) };
      }).filter(i => i.amount > 0);
      return { consumed: items.length > 0, items };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const exercise: ExerciseInput = selectedExercises.length > 0
      ? { types: selectedExercises, minutes: duration }
      : { types: [], minutes: 0 };

    const [morningBS, foodEntries, profile, existingLog] = await Promise.all([
      getMorningBS(today), getFoodEntriesByDate(today), getUserProfile(), getDailyLog(today),
    ]);

    const foodSum = sumFoodEntries(foodEntries);
    const targetCal = profile?.targetCalories ?? 2000;
    const weightKg = profile?.weightKg ?? 70;

    const breakdown = calculateScore(sleep, exercise, alcohol, morningBS, foodSum.calories, targetCal);
    const stats = calculateStats(breakdown, exercise, sleep, morningBS);
    const exerciseCalories = calcExerciseCalories(exercise, weightKg);
    const now = new Date().toISOString();

    await saveDailyLog({
      id: existingLog?.id ?? generateId(),
      date: today, alcohol, exercise, sleep,
      conditionScore: breakdown.total,
      scoreBreakdown: breakdown, stats, exerciseCalories,
      alcoholCalories: alcoholCal,
      createdAt: existingLog?.createdAt ?? now, updatedAt: now,
    });
    setSaving(false);
    navigation.navigate('Result', { log: { id: existingLog?.id ?? generateId(), date: today, alcohol, exercise, sleep, conditionScore: breakdown.total, scoreBreakdown: breakdown, stats, exerciseCalories, alcoholCalories: alcoholCal, createdAt: existingLog?.createdAt ?? now, updatedAt: now } });
  };

  // 수면 효과
  const sleepEffect = sleep.hours >= 7 && sleep.hours <= 8 ? { label: '최적 수면 ✓', color: COLORS.teal }
    : sleep.hours >= 6 ? { label: '수면 양호', color: COLORS.gold }
    : sleep.hours <= 5 ? { label: 'HP 회복 ↓', color: COLORS.red }
    : { label: '과수면', color: COLORS.textMuted };

  return (
    <SafeAreaView style={c.safe}>
      <ScrollView contentContainerStyle={c.scroll} showsVerticalScrollIndicator={false}>

        <View style={c.pageHeader}>
          <Text style={c.pageTitle}>⚔️ 오늘의 퀘스트</Text>
          <Text style={c.pageSub}>기록하면 캐릭터 스탯이 변합니다</Text>
        </View>

        {/* ── 수면 (휴식) ── */}
        <QuestPanel icon="😴" title="휴식" badge={`VIT +${sleepEffect.label}`}>
          <View style={c.chips}>
            {[4, 5, 6, 7, 8, 9, 10].map(h => (
              <ChipBtn
                key={h} label={`${h}h`}
                selected={sleep.hours === h}
                onPress={() => setSleep({ hours: h })}
                color={h >= 7 && h <= 8 ? COLORS.teal : h === 6 ? COLORS.gold : COLORS.red}
              />
            ))}
          </View>
          <View style={c.effectRow}>
            <EffectTag label={sleepEffect.label} color={sleepEffect.color} />
            <EffectTag
              label={sleep.hours >= 7 ? 'HP 회복 +15' : sleep.hours >= 6 ? 'HP 회복 +8' : 'HP 회복 -10'}
              color={sleep.hours >= 7 ? COLORS.teal : sleep.hours >= 6 ? COLORS.gold : COLORS.red}
            />
          </View>
        </QuestPanel>

        {/* ── 운동 (훈련) ── */}
        <QuestPanel
          icon="⚔️"
          title="훈련"
          badge={selectedExercises.length > 0 ? `🔥 ${burnCal}kcal 소모` : undefined}
        >
          <Text style={c.subLabel}>종류 선택 (다중)</Text>
          <View style={c.chips}>
            {EXERCISE_OPTIONS.map(type => (
              <ChipBtn
                key={type}
                label={EXERCISE_LABELS[type]}
                sub={`MET ${EXERCISE_MET[type]}`}
                selected={selectedExercises.includes(type)}
                onPress={() => toggleExercise(type)}
                color={COLORS.gold}
              />
            ))}
          </View>

          {selectedExercises.length > 0 && (
            <>
              <Text style={c.subLabel}>훈련 시간</Text>
              <View style={c.chips}>
                {DURATION_OPTIONS.map(m => (
                  <ChipBtn key={m} label={`${m}분`} selected={duration === m}
                    onPress={() => setDuration(m)} color={COLORS.gold} />
                ))}
              </View>
              <View style={c.calPreview}>
                <Text style={c.calPreviewLabel}>예상 소모 칼로리</Text>
                <Text style={[c.calPreviewVal, { color: COLORS.gold }]}>−{burnCal} kcal</Text>
                <Text style={c.calPreviewSub}>(70kg 기준)</Text>
              </View>
              <View style={c.effectRow}>
                <EffectTag label={`STR +${Math.round(burnCal / 15)}`} color={COLORS.gold} />
                <EffectTag label={`AGI +${selectedExercises.length > 1 ? 5 : 3}`} color={COLORS.str} />
                {selectedExercises.length > 1 && <EffectTag label="복합훈련 보너스" color={COLORS.purple} />}
              </View>
            </>
          )}
        </QuestPanel>

        {/* ── 음주 (디버프) ── */}
        <QuestPanel
          icon="🍺"
          title="음주 (디버프)"
          badge={alcoholCal > 0 ? `💀 ${alcoholCal}kcal` : undefined}
        >
          <TouchableOpacity
            style={[c.chip, !alcohol.consumed && { borderColor: COLORS.teal, backgroundColor: COLORS.teal + '18' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAlcohol({ consumed: false, items: [] }); }}
          >
            <Text style={[c.chipText, !alcohol.consumed && { color: COLORS.teal }]}>✅ 금주</Text>
          </TouchableOpacity>

          <Text style={c.subLabel}>마신 주종 (다중 선택)</Text>
          <View style={c.chips}>
            {ALCOHOL_TYPES.map(type => {
              const sel = alcohol.items.some(i => i.type === type);
              return (
                <ChipBtn
                  key={type}
                  label={`${ALCOHOL_EMOJI[type]} ${ALCOHOL_LABELS[type]}`}
                  sub={`${ALCOHOL_CAL_PER_UNIT[type]}kcal`}
                  selected={sel}
                  onPress={() => toggleAlcohol(type)}
                  color={COLORS.red}
                />
              );
            })}
          </View>

          {alcohol.items.length > 0 && (
            <View style={c.alcoholTable}>
              {alcohol.items.map(item => (
                <View key={item.type} style={c.alcoholTableRow}>
                  <Text style={c.alcoholTableLabel}>
                    {ALCOHOL_EMOJI[item.type]} {ALCOHOL_LABELS[item.type]}
                  </Text>
                  <View style={c.amountCtrl}>
                    <TouchableOpacity style={c.amountMinus} onPress={() => adjustAmount(item.type, -0.5)}>
                      <Text style={c.amountBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={c.amountVal}>{item.amount}{ALCOHOL_UNITS[item.type]}</Text>
                    <TouchableOpacity style={c.amountPlus} onPress={() => adjustAmount(item.type, 0.5)}>
                      <Text style={c.amountBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={c.alcoholCal}>{Math.round(ALCOHOL_CAL_PER_UNIT[item.type] * item.amount)}kcal</Text>
                </View>
              ))}
              <View style={c.alcoholSummary}>
                <View style={c.effectRow}>
                  <EffectTag label={`HP −${Math.min(30, Math.round(alcoholCal / 15))}`} color={COLORS.red} />
                  <EffectTag label={`STR −${Math.min(20, Math.round(alcoholCal / 20))}`} color={COLORS.red} />
                  <EffectTag label="수면질 저하" color={COLORS.red} />
                </View>
                <Text style={c.alcoholTotal}>총 {alcoholCal} kcal</Text>
              </View>
            </View>
          )}
        </QuestPanel>

        {/* 안내 */}
        <View style={c.infoBox}>
          <Text style={c.infoText}>🍱 식단 포션은 하단 "식단" 탭에서 추가{'\n'}💧 공복혈당은 홈 화면에서 기록</Text>
        </View>

        <TouchableOpacity
          style={[c.submitBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave} disabled={saving}
        >
          <Text style={c.submitText}>{saving ? '계산 중...' : '⚔️ 오늘 점수 확인 →'}</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const c = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  pageHeader: { marginBottom: SPACING.md },
  pageTitle: { color: COLORS.text, fontSize: FONTS.xl, fontWeight: '900' },
  pageSub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },

  // 퀘스트 패널
  panel: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelIcon: { fontSize: 16 },
  panelTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '800' },
  effectBadge: { backgroundColor: COLORS.gold + '20', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.gold + '44' },
  effectText: { color: COLORS.gold, fontSize: FONTS.xxs, fontWeight: '700' },

  // 칩 버튼 (컴팩트)
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.bgInput, alignItems: 'center' },
  chipText: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '600' },
  chipSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },

  subLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 8, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },

  // 효과 태그
  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  effectTag: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  effectTagText: { fontSize: FONTS.xs, fontWeight: '700' },

  // 칼로리 미리보기
  calPreview: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: COLORS.gold + '10', borderRadius: RADIUS.sm, padding: 8, marginBottom: 6 },
  calPreviewLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, flex: 1 },
  calPreviewVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  calPreviewSub: { color: COLORS.textDisabled, fontSize: FONTS.xxs },

  // 음주 테이블
  alcoholTable: { backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: 6, gap: 6 },
  alcoholTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  alcoholTableLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.xs, fontWeight: '600' },
  amountCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountMinus: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  amountPlus: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.purple + '33', borderWidth: 1, borderColor: COLORS.purple + '66', alignItems: 'center', justifyContent: 'center' },
  amountBtnText: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '900', lineHeight: 20 },
  amountVal: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  alcoholCal: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '700', minWidth: 54, textAlign: 'right' },
  alcoholSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  alcoholTotal: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '900' },

  // 안내 + 제출
  infoBox: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  infoText: { color: COLORS.textMuted, fontSize: FONTS.xs, lineHeight: 20, textAlign: 'center' },
  submitBtn: { backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  submitText: { color: '#fff', fontSize: FONTS.md, fontWeight: '900', letterSpacing: 0.5 },
});
