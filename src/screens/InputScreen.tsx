import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { AlcoholInput, AlcoholItem, AlcoholType, ExerciseInput, ExerciseType, RootStackParamList, SleepInput } from '../types';
import {
  generateId,
  getDailyLog,
  getFoodEntriesByDate,
  getMorningBS,
  getTodayKey,
  getUserProfile,
  saveDailyLog,
  sumFoodEntries,
} from '../utils/storage';
import {
  ALCOHOL_CAL_PER_UNIT,
  ALCOHOL_EMOJI,
  ALCOHOL_LABELS,
  ALCOHOL_UNITS,
  EXERCISE_LABELS,
  EXERCISE_MET,
  calculateScore,
  calculateStats,
  calcAlcoholCalories,
  calcExerciseCalories,
} from '../utils/scoreCalculator';

type Nav = StackNavigationProp<RootStackParamList>;

const EXERCISE_OPTIONS: ExerciseType[] = ['walk', 'run', 'cycling', 'gym', 'swim', 'hiking', 'yoga', 'pilates', 'tennis', 'soccer'];
const ALCOHOL_TYPES: AlcoholType[] = ['beer_can', 'beer_bottle', 'soju', 'makgeolli', 'whiskey', 'wine', 'highball', 'bomb'];
const DURATION_OPTIONS = [30, 40, 50, 60, 70, 80, 90];

function ChoiceBtn({ label, selected, onPress, color = COLORS.purple, sub }: {
  label: string; selected: boolean; onPress: () => void; color?: string; sub?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, selected && { borderColor: color, backgroundColor: color + '22' }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.7}
    >
      <Text style={[styles.btnText, selected && { color }]}>{label}</Text>
      {sub && <Text style={styles.btnSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

function Section({ title, emoji, children, badge }: { title: string; emoji: string; children: React.ReactNode; badge?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{emoji}  {title}</Text>
        {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      </View>
      {children}
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

  // 운동 토글
  const toggleExercise = (type: ExerciseType) => {
    setSelectedExercises(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type);
      return [...prev, type];
    });
  };

  // 운동 소모 칼로리 미리보기
  const previewExercise: ExerciseInput = { types: selectedExercises, minutes: duration };
  const burnCalPreview = calcExerciseCalories(previewExercise, 70);

  // 음주 처리
  const toggleAlcohol = (type: AlcoholType) => {
    setAlcohol(prev => {
      const exists = prev.items.find(i => i.type === type);
      if (exists) {
        const items = prev.items.filter(i => i.type !== type);
        return { consumed: items.length > 0, items };
      } else {
        const items = [...prev.items, { type, amount: 1 }];
        return { consumed: true, items };
      }
    });
  };

  const adjustAmount = (type: AlcoholType, delta: number) => {
    setAlcohol(prev => {
      const items = prev.items.map(i => {
        if (i.type !== type) return i;
        const newAmount = Math.max(0.5, i.amount + delta);
        return { ...i, amount: Math.round(newAmount * 2) / 2 }; // 0.5 단위
      }).filter(i => i.amount > 0);
      return { consumed: items.length > 0, items };
    });
  };

  const alcoholTotalCal = calcAlcoholCalories(alcohol);

  const handleSave = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const exercise: ExerciseInput = selectedExercises.length > 0
      ? { types: selectedExercises, minutes: duration }
      : { types: [], minutes: 0 };

    const [morningBS, foodEntries, profile, existingLog] = await Promise.all([
      getMorningBS(today),
      getFoodEntriesByDate(today),
      getUserProfile(),
      getDailyLog(today),
    ]);

    const foodSum = sumFoodEntries(foodEntries);
    const targetCal = profile?.targetCalories ?? 2000;
    const weightKg = profile?.weightKg ?? 70;

    const breakdown = calculateScore(sleep, exercise, alcohol, morningBS, foodSum.calories, targetCal);
    const stats = calculateStats(breakdown, exercise, sleep, morningBS);
    const exerciseCalories = calcExerciseCalories(exercise, weightKg);
    const now = new Date().toISOString();

    const log = {
      id: existingLog?.id ?? generateId(),
      date: today,
      alcohol,
      exercise,
      sleep,
      conditionScore: breakdown.total,
      scoreBreakdown: breakdown,
      stats,
      exerciseCalories,
      alcoholCalories: alcoholTotalCal,
      createdAt: existingLog?.createdAt ?? now,
      updatedAt: now,
    };

    await saveDailyLog(log);
    setSaving(false);
    navigation.navigate('Result', { log });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>오늘 기록</Text>
        <Text style={styles.subtitle}>탭만으로 간편 입력!</Text>

        {/* ── 수면 ── */}
        <Section title="수면" emoji="😴">
          <View style={styles.grid}>
            {[4, 5, 6, 7, 8, 9, 10].map(h => (
              <ChoiceBtn
                key={h}
                label={`${h}시간`}
                selected={sleep.hours === h}
                onPress={() => setSleep({ hours: h })}
                color={h >= 7 && h <= 8 ? COLORS.teal : COLORS.gold}
              />
            ))}
          </View>
        </Section>

        {/* ── 운동 (다중 선택) ── */}
        <Section
          title="운동"
          emoji="💪"
          badge={selectedExercises.length > 0 ? `🔥 ${burnCalPreview} kcal` : undefined}
        >
          <Text style={styles.subLabel}>운동 종류 (복수 선택 가능)</Text>
          <View style={styles.grid}>
            {EXERCISE_OPTIONS.map(type => (
              <ChoiceBtn
                key={type}
                label={EXERCISE_LABELS[type]}
                selected={selectedExercises.includes(type)}
                onPress={() => toggleExercise(type)}
                color={COLORS.gold}
                sub={type !== 'none' ? `MET ${EXERCISE_MET[type]}` : undefined}
              />
            ))}
          </View>

          {selectedExercises.length > 0 && (
            <>
              <Text style={styles.subLabel}>운동 시간</Text>
              <View style={styles.grid}>
                {DURATION_OPTIONS.map(m => (
                  <ChoiceBtn
                    key={m}
                    label={`${m}분`}
                    selected={duration === m}
                    onPress={() => setDuration(m)}
                    color={COLORS.gold}
                  />
                ))}
              </View>
              <View style={styles.calBadge}>
                <Text style={styles.calBadgeText}>
                  예상 소모: <Text style={{ color: COLORS.gold, fontWeight: '900' }}>{calcExerciseCalories({ types: selectedExercises, minutes: duration }, 70)} kcal</Text>
                  {'  '}({duration}분 기준 70kg)
                </Text>
              </View>
            </>
          )}
        </Section>

        {/* ── 음주 (주종별 선택) ── */}
        <Section
          title="음주"
          emoji="🍺"
          badge={alcoholTotalCal > 0 ? `🍺 ${alcoholTotalCal} kcal` : undefined}
        >
          <View style={styles.grid}>
            <ChoiceBtn
              label="안 마심"
              selected={!alcohol.consumed}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAlcohol({ consumed: false, items: [] }); }}
              color={COLORS.teal}
            />
          </View>

          <Text style={styles.subLabel}>마신 술 선택 (복수 가능)</Text>
          <View style={styles.grid}>
            {ALCOHOL_TYPES.map(type => {
              const isSelected = alcohol.items.some(i => i.type === type);
              return (
                <ChoiceBtn
                  key={type}
                  label={`${ALCOHOL_EMOJI[type]} ${ALCOHOL_LABELS[type]}`}
                  selected={isSelected}
                  onPress={() => toggleAlcohol(type)}
                  color={COLORS.red}
                  sub={`${ALCOHOL_CAL_PER_UNIT[type]}kcal/${ALCOHOL_UNITS[type]}`}
                />
              );
            })}
          </View>

          {alcohol.items.length > 0 && (
            <View style={styles.alcoholDetail}>
              {alcohol.items.map(item => (
                <View key={item.type} style={styles.alcoholRow}>
                  <Text style={styles.alcoholLabel}>
                    {ALCOHOL_EMOJI[item.type]} {ALCOHOL_LABELS[item.type]}
                  </Text>
                  <View style={styles.amountControl}>
                    <TouchableOpacity
                      style={styles.amountBtn}
                      onPress={() => adjustAmount(item.type, -0.5)}
                    >
                      <Text style={styles.amountBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.amountValue}>
                      {item.amount}{ALCOHOL_UNITS[item.type]}
                    </Text>
                    <TouchableOpacity
                      style={styles.amountBtn}
                      onPress={() => adjustAmount(item.type, 0.5)}
                    >
                      <Text style={styles.amountBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alcoholCal}>
                    {Math.round(ALCOHOL_CAL_PER_UNIT[item.type] * item.amount)} kcal
                  </Text>
                </View>
              ))}
              <View style={styles.alcoholTotal}>
                <Text style={styles.alcoholTotalLabel}>총 음주 칼로리</Text>
                <Text style={styles.alcoholTotalVal}>{alcoholTotalCal} kcal</Text>
              </View>
              <View style={styles.alcoholWarning}>
                <Text style={styles.alcoholWarningText}>
                  ⚠️ 음주는 수면 질과 다음날 컨디션에 영향을 줍니다
                </Text>
              </View>
            </View>
          )}
        </Section>

        {/* 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            식단·칼로리는 하단 "식단" 탭에서 입력해요{'\n'}
            공복혈당은 홈 화면에서 바로 기록할 수 있어요
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '계산 중...' : '오늘 점수 확인 →'}</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  title: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: FONTS.sm, marginBottom: SPACING.lg },
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: '700', color: COLORS.text },
  badge: {
    backgroundColor: COLORS.gold + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
  },
  badgeText: { color: COLORS.gold, fontSize: FONTS.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    minWidth: 72,
  },
  btnText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  btnSub: { color: COLORS.textDisabled, fontSize: 9, marginTop: 2 },
  subLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 12, marginBottom: 8 },
  calBadge: {
    backgroundColor: COLORS.gold + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
  },
  calBadgeText: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
  alcoholDetail: {
    marginTop: 12,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 8,
  },
  alcoholRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alcoholLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  amountControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBtnText: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', lineHeight: 20 },
  amountValue: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  alcoholCal: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  alcoholTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  alcoholTotalLabel: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  alcoholTotalVal: { color: COLORS.red, fontSize: FONTS.md, fontWeight: '900' },
  alcoholWarning: {
    backgroundColor: COLORS.red + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.red + '44',
  },
  alcoholWarningText: { color: COLORS.red, fontSize: FONTS.xs },
  infoBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: { color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 22, textAlign: 'center' },
  saveBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: FONTS.lg, fontWeight: '900' },
});
