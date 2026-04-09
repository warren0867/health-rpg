import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { ActivityLevel, Gender, Goal, RootStackParamList, UserProfile } from '../types';
import {
  ACTIVITY_LABELS,
  calcBMI,
  calcTargetCalories,
  GOAL_LABELS,
} from '../utils/calorieCalculator';
import { generateId, saveUserProfile } from '../utils/storage';

type Nav = StackNavigationProp<RootStackParamList>;

const STEPS = ['이름', '신체 정보', '활동량 & 목표', '칼로리 확인'];

function ChoiceBtn({ label, sub, selected, onPress, color = COLORS.purple }: {
  label: string; sub?: string; selected: boolean; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.choiceBtn, selected && { borderColor: color, backgroundColor: color + '22' }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.8}
    >
      <Text style={[styles.choiceBtnText, selected && { color }]}>{label}</Text>
      {sub && <Text style={styles.choiceBtnSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goal, setGoal] = useState<Goal>('lose');

  const targetCalories =
    age && height && weight
      ? calcTargetCalories(gender, parseInt(age), parseInt(height), parseFloat(weight), activity, goal)
      : 0;

  const bmi = height && weight
    ? calcBMI(parseFloat(weight), parseInt(height))
    : null;

  const canNext = () => {
    if (step === 0) return name.trim().length >= 1;
    if (step === 1) return age && height && weight;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile: UserProfile = {
      name: name.trim(),
      gender,
      age: parseInt(age),
      heightCm: parseInt(height),
      weightKg: parseFloat(weight),
      activityLevel: activity,
      goal,
      targetCalories,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(profile);
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* 진행 바 */}
          <View style={styles.progressRow}>
            {STEPS.map((s, i) => (
              <View key={i} style={[styles.progressDot, i <= step && { backgroundColor: COLORS.purple }]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>STEP {step + 1} / {STEPS.length} — {STEPS[step]}</Text>

          {/* ─ Step 0: 이름 ─ */}
          {step === 0 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>안녕하세요!</Text>
              <Text style={styles.stepSubtitle}>당신의 이름을 알려주세요{'\n'}매일 아침 인사해드릴게요</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="이름 입력"
                placeholderTextColor={COLORS.textDisabled}
                autoFocus
                maxLength={10}
              />
              <Text style={styles.diabetesNote}>
                당뇨 전단계 관리 모드로 설정돼있어요{'\n'}혈당 + 칼로리를 함께 추적합니다
              </Text>
            </View>
          )}

          {/* ─ Step 1: 신체 정보 ─ */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>신체 정보</Text>
              <Text style={styles.stepSubtitle}>하루 권장 칼로리 계산에 사용돼요</Text>

              <Text style={styles.fieldLabel}>성별</Text>
              <View style={styles.row}>
                {(['male', 'female'] as Gender[]).map(g => (
                  <ChoiceBtn
                    key={g}
                    label={g === 'male' ? '남성' : '여성'}
                    selected={gender === g}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>나이</Text>
              <TextInput
                style={styles.textInput}
                value={age}
                onChangeText={setAge}
                placeholder="예: 35"
                placeholderTextColor={COLORS.textDisabled}
                keyboardType="numeric"
                maxLength={3}
              />

              <Text style={styles.fieldLabel}>키 (cm)</Text>
              <TextInput
                style={styles.textInput}
                value={height}
                onChangeText={setHeight}
                placeholder="예: 175"
                placeholderTextColor={COLORS.textDisabled}
                keyboardType="numeric"
                maxLength={3}
              />

              <Text style={styles.fieldLabel}>체중 (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="예: 78.5"
                placeholderTextColor={COLORS.textDisabled}
                keyboardType="decimal-pad"
                maxLength={5}
              />

              {bmi && (
                <View style={styles.bmiCard}>
                  <Text style={styles.bmiText}>BMI: {bmi}</Text>
                </View>
              )}
            </View>
          )}

          {/* ─ Step 2: 활동량 & 목표 ─ */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>활동량과 목표</Text>

              <Text style={styles.fieldLabel}>평소 활동량</Text>
              <View style={styles.colButtons}>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(al => (
                  <ChoiceBtn
                    key={al}
                    label={ACTIVITY_LABELS[al]}
                    selected={activity === al}
                    onPress={() => setActivity(al)}
                    color={COLORS.teal}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>목표</Text>
              <View style={styles.row}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                  <ChoiceBtn
                    key={g}
                    label={GOAL_LABELS[g]}
                    selected={goal === g}
                    onPress={() => setGoal(g)}
                    color={g === 'lose' ? COLORS.teal : g === 'maintain' ? COLORS.blue : COLORS.gold}
                  />
                ))}
              </View>
              <Text style={styles.hint}>당뇨 전단계에는 체중 감량이 혈당 개선에 효과적이에요</Text>
            </View>
          )}

          {/* ─ Step 3: 확인 ─ */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>준비 완료!</Text>
              <Text style={styles.stepSubtitle}>{name}님의 건강 여정을 시작합니다</Text>

              <View style={styles.summaryCard}>
                <SummaryRow label="하루 권장 칼로리" value={`${targetCalories} kcal`} color={COLORS.teal} />
                <SummaryRow label="목표" value={GOAL_LABELS[goal]} color={COLORS.gold} />
                <SummaryRow label="활동량" value={ACTIVITY_LABELS[activity]} />
                {bmi && <SummaryRow label="BMI" value={String(bmi)} />}
              </View>

              <View style={styles.diabetesInfoCard}>
                <Text style={styles.diabetesInfoTitle}>혈당 관리 안내</Text>
                <Text style={styles.diabetesInfoText}>
                  • 매일 아침 공복혈당을 기록하세요{'\n'}
                  • 목표: 공복혈당 100 mg/dL 미만{'\n'}
                  • 탄수화물 섭취는 하루 {Math.round((targetCalories * 0.4) / 4)}g 이하 권장{'\n'}
                  • 식후 10분 산책이 혈당을 낮춰요
                </Text>
              </View>
            </View>
          )}

          {/* 다음 버튼 */}
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === STEPS.length - 1 ? '시작하기!' : '다음 →'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color = COLORS.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.md },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  progressDot: {
    flex: 1, height: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.bgHighlight
  },
  stepLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.lg },
  stepContainer: { gap: SPACING.sm, marginBottom: SPACING.lg },
  stepTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  stepSubtitle: { color: COLORS.textMuted, fontSize: FONTS.md, lineHeight: 22 },
  fieldLabel: { color: COLORS.textMuted, fontSize: FONTS.sm, marginTop: SPACING.sm },
  textInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONTS.xl,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colButtons: { gap: 8 },
  choiceBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    minWidth: 80,
  },
  choiceBtnText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  choiceBtnSub: { color: COLORS.textDisabled, fontSize: 10 },
  bmiCard: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  bmiText: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.md },
  hint: { color: COLORS.textMuted, fontSize: FONTS.xs, fontStyle: 'italic' },
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONTS.sm },
  summaryValue: { fontWeight: '700', fontSize: FONTS.sm },
  diabetesNote: {
    backgroundColor: COLORS.orange + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.orange,
    fontSize: FONTS.sm,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: COLORS.orange + '44',
  },
  diabetesInfoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.orange + '44',
    gap: 8,
  },
  diabetesInfoTitle: { color: COLORS.orange, fontWeight: '700', fontSize: FONTS.md },
  diabetesInfoText: { color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 22 },
  nextBtn: {
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
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: FONTS.lg, fontWeight: '900' },
});
