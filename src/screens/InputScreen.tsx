import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { AlcoholInput, ExerciseInput, ExerciseType, RootStackParamList, SleepInput } from '../types';
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
import { calculateScore, calculateStats } from '../utils/scoreCalculator';

type Nav = StackNavigationProp<RootStackParamList>;

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

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{emoji}  {title}</Text>
      {children}
    </View>
  );
}

export default function InputScreen() {
  const navigation = useNavigation<Nav>();
  const today = getTodayKey();

  const [sleep, setSleep] = useState<SleepInput>({ hours: 7 });
  const [exercise, setExercise] = useState<ExerciseInput>({ type: 'none', minutes: 0 });
  const [alcohol, setAlcohol] = useState<AlcoholInput>({ consumed: false, liters: 0 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const [morningBS, foodEntries, profile, existingLog] = await Promise.all([
      getMorningBS(today),
      getFoodEntriesByDate(today),
      getUserProfile(),
      getDailyLog(today),
    ]);

    const foodSum = sumFoodEntries(foodEntries);
    const targetCal = profile?.targetCalories ?? 2000;

    const breakdown = calculateScore(sleep, exercise, alcohol, morningBS, foodSum.calories, targetCal);
    const stats = calculateStats(breakdown, exercise, sleep, morningBS);
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
        <Text style={styles.subtitle}>버튼 탭만으로 5초 완성!</Text>

        {/* 수면 */}
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

        {/* 운동 */}
        <Section title="운동" emoji="💪">
          <View style={styles.grid}>
            {[
              { value: 'none' as ExerciseType, label: '안 함' },
              { value: 'walk' as ExerciseType, label: '걷기·산책' },
              { value: 'cycling' as ExerciseType, label: '자전거' },
              { value: 'gym' as ExerciseType, label: '헬스' },
              { value: 'both' as ExerciseType, label: '복합 운동' },
            ].map(opt => (
              <ChoiceBtn
                key={opt.value}
                label={opt.label}
                selected={exercise.type === opt.value}
                onPress={() => setExercise(prev => ({
                  ...prev,
                  type: opt.value,
                  minutes: opt.value === 'none' ? 0 : (prev.minutes || 30),
                }))}
                color={COLORS.gold}
              />
            ))}
          </View>

          {exercise.type !== 'none' && (
            <>
              <Text style={styles.subLabel}>운동 시간</Text>
              <View style={styles.grid}>
                {[30, 60, 90, 120].map(m => (
                  <ChoiceBtn
                    key={m}
                    label={`${m}분`}
                    selected={exercise.minutes === m}
                    onPress={() => setExercise(prev => ({ ...prev, minutes: m }))}
                    color={COLORS.gold}
                  />
                ))}
              </View>
            </>
          )}
        </Section>

        {/* 음주 */}
        <Section title="음주" emoji="🍺">
          <View style={styles.grid}>
            <ChoiceBtn
              label="안 마심"
              selected={!alcohol.consumed}
              onPress={() => setAlcohol({ consumed: false, liters: 0 })}
              color={COLORS.teal}
            />
            <ChoiceBtn
              label="마심"
              selected={alcohol.consumed}
              onPress={() => setAlcohol(prev => ({ consumed: true, liters: prev.liters || 0.5 }))}
              color={COLORS.red}
            />
          </View>
          {alcohol.consumed && (
            <>
              <Text style={styles.subLabel}>음주량</Text>
              <View style={styles.grid}>
                {[0.5, 1.0, 1.5, 2.0].map(l => (
                  <ChoiceBtn
                    key={l}
                    label={l < 2 ? `${l}L` : '2L+'}
                    selected={alcohol.liters === l}
                    onPress={() => setAlcohol(prev => ({ ...prev, liters: l }))}
                    color={COLORS.red}
                  />
                ))}
              </View>
              <View style={styles.alcoholWarning}>
                <Text style={styles.alcoholWarningText}>
                  ⚠️ 음주는 공복혈당을 상승시킬 수 있어요
                </Text>
              </View>
            </>
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
  sectionTitle: { fontSize: FONTS.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
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
  btnSub: { color: COLORS.textDisabled, fontSize: 10, marginTop: 2 },
  subLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 10, marginBottom: 6 },
  alcoholWarning: {
    backgroundColor: COLORS.red + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 8,
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
