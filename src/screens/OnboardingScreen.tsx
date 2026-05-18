import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { ActivityLevel, Gender, Goal, RootStackParamList, UserProfile } from '../types';
import { calcBMI, calcTargetCalories, getBMILabel } from '../utils/calorieCalculator';
import { saveUserProfile } from '../utils/storage';

type Nav = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const STEPS = ['intro', 'name', 'body', 'activity', 'goal', 'target', 'review'] as const;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goal, setGoal] = useState<Goal>('lose');
  const [targetWeight, setTargetWeight] = useState('');

  const targetCalories =
    age && height && weight
      ? calcTargetCalories(gender, parseInt(age), parseInt(height), parseFloat(weight), activity, goal)
      : 0;

  const bmiRaw = height && weight ? calcBMI(parseFloat(weight), parseInt(height)) : null;
  const bmi = bmiRaw !== null && isFinite(bmiRaw)
    ? (() => { const b = getBMILabel(bmiRaw); return { value: bmiRaw, category: b.label, color: b.color }; })()
    : null;
  const birthDate = birthYear && birthMonth && birthDay
    ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    : undefined;

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return name.trim().length >= 1;
    if (step === 2) return age && height && weight;
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

  const handleBack = () => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(s => s - 1);
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile: UserProfile = {
      name: name.trim(), gender, age: parseInt(age),
      heightCm: parseInt(height), weightKg: parseFloat(weight),
      activityLevel: activity, goal, targetCalories, birthDate,
      targetWeightKg: targetWeight ? parseFloat(targetWeight) : undefined,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(profile);
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* 헤더 (뒤로가기 + 프로그레스) */}
        {step > 0 && (
          <View style={s.topBar}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color={COLORS.textSub} />
            </TouchableOpacity>
            <View style={s.stepper}>
              {STEPS.slice(1).map((_, i) => (
                <View key={i} style={[
                  s.stepDot,
                  i + 1 < step && s.stepDotDone,
                  i + 1 === step && s.stepDotActive,
                ]} />
              ))}
            </View>
            <View style={{ width: 40 }} />
          </View>
        )}

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {step === 0 && <IntroStep />}
          {step === 1 && <NameStep name={name} setName={setName}
            birthYear={birthYear} setBirthYear={setBirthYear}
            birthMonth={birthMonth} setBirthMonth={setBirthMonth}
            birthDay={birthDay} setBirthDay={setBirthDay} />}
          {step === 2 && <BodyStep
            gender={gender} setGender={setGender}
            age={age} setAge={setAge}
            height={height} setHeight={setHeight}
            weight={weight} setWeight={setWeight}
            bmi={bmi} />}
          {step === 3 && <ActivityStep activity={activity} setActivity={setActivity} />}
          {step === 4 && <GoalStep goal={goal} setGoal={setGoal} />}
          {step === 5 && <TargetStep
            targetWeight={targetWeight} setTargetWeight={setTargetWeight}
            currentWeight={weight} goal={goal} height={height} />}
          {step === 6 && <ReviewStep
            name={name} age={age} height={height} weight={weight}
            activity={activity} goal={goal} targetCalories={targetCalories} bmi={bmi}
            targetWeight={targetWeight} />}

        </ScrollView>

        <View style={s.cta}>
          <TouchableOpacity
            style={[s.primaryBtn, !canNext() && s.primaryBtnDisabled]}
            onPress={handleNext}
            disabled={!canNext()}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>
              {step === 0 ? '모험 시작하기' : step === STEPS.length - 1 ? '완료' : '다음'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step 0: Intro ────────────────────────────────
function IntroStep() {
  return (
    <View style={s.introWrap}>
      <View style={s.glyph}>
        <Ionicons name="pulse" size={56} color="#fff" />
      </View>
      <Text style={s.eyebrow}>VITAL QUEST</Text>
      <Text style={s.heroTitle}>건강이{'\n'}모험이 된다</Text>
      <Text style={s.heroDesc}>
        매일의 식단·혈당·운동을 기록하면{'\n'}당신의 캐릭터가 성장합니다.
      </Text>

      <View style={s.featureList}>
        <FeatureRow icon="pulse" tint={COLORS.primary} tintBg={COLORS.primaryGlow}
          title="정확한 헬스 트래킹" sub="CALORIE · BLOOD SUGAR · WATER" />
        <FeatureRow icon="star" tint={COLORS.amber} tintBg={COLORS.amberGlow}
          title="레벨업 보상 시스템" sub="XP · RANKS · ACHIEVEMENTS" />
        <FeatureRow icon="checkmark-done" tint={COLORS.good} tintBg={COLORS.goodGlow}
          title="데일리 퀘스트" sub="5 QUESTS · DAILY · STREAK" />
      </View>
    </View>
  );
}

function FeatureRow({ icon, tint, tintBg, title, sub }: any) {
  return (
    <View style={s.featureRow}>
      <View style={[s.featureIcon, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ─── Step 1: Name ────────────────────────────────
function NameStep({ name, setName, birthYear, setBirthYear, birthMonth, setBirthMonth, birthDay, setBirthDay }: any) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 1 OF 6</Text>
      <Text style={s.stepTitle}>이름과 생년월일을{'\n'}알려주세요</Text>
      <Text style={s.stepDesc}>이름은 캐릭터에 표시됩니다. 생일은 선택입니다.</Text>

      <View style={s.formGroup}>
        <Text style={s.formLabel}>이름</Text>
        <TextInput style={s.formInput} value={name} onChangeText={setName}
          placeholder="이름 또는 닉네임" placeholderTextColor={COLORS.textDisabled} maxLength={20} />
      </View>

      <View style={s.formGroup}>
        <Text style={s.formLabel}>생년월일 (선택)</Text>
        <View style={s.dateRow}>
          <TextInput style={[s.formInput, { flex: 1.4 }]} value={birthYear} onChangeText={setBirthYear}
            keyboardType="numeric" placeholder="YYYY" placeholderTextColor={COLORS.textDisabled} maxLength={4} />
          <TextInput style={[s.formInput, { flex: 1 }]} value={birthMonth} onChangeText={setBirthMonth}
            keyboardType="numeric" placeholder="MM" placeholderTextColor={COLORS.textDisabled} maxLength={2} />
          <TextInput style={[s.formInput, { flex: 1 }]} value={birthDay} onChangeText={setBirthDay}
            keyboardType="numeric" placeholder="DD" placeholderTextColor={COLORS.textDisabled} maxLength={2} />
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: Body ────────────────────────────────
function BodyStep({ gender, setGender, age, setAge, height, setHeight, weight, setWeight, bmi }: any) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 2 OF 6</Text>
      <Text style={s.stepTitle}>신체 정보</Text>
      <Text style={s.stepDesc}>BMR(기초대사량) 계산에 쓰입니다. 정확할수록 추천이 정확해요.</Text>

      <View style={s.formGroup}>
        <Text style={s.formLabel}>성별</Text>
        <View style={s.choiceRow}>
          <ChoicePill active={gender === 'male'} onPress={() => setGender('male')} icon="male" label="남성" />
          <ChoicePill active={gender === 'female'} onPress={() => setGender('female')} icon="female" label="여성" />
        </View>
      </View>

      <View style={s.formRow}>
        <View style={[s.formGroup, { flex: 1 }]}>
          <Text style={s.formLabel}>나이</Text>
          <TextInput style={s.formInput} value={age} onChangeText={setAge}
            keyboardType="numeric" placeholder="30" placeholderTextColor={COLORS.textDisabled} />
        </View>
        <View style={[s.formGroup, { flex: 1 }]}>
          <Text style={s.formLabel}>키 (cm)</Text>
          <TextInput style={s.formInput} value={height} onChangeText={setHeight}
            keyboardType="numeric" placeholder="170" placeholderTextColor={COLORS.textDisabled} />
        </View>
        <View style={[s.formGroup, { flex: 1 }]}>
          <Text style={s.formLabel}>체중 (kg)</Text>
          <TextInput style={s.formInput} value={weight} onChangeText={setWeight}
            keyboardType="numeric" placeholder="65" placeholderTextColor={COLORS.textDisabled} />
        </View>
      </View>

      {bmi && (
        <View style={s.bmiCard}>
          <Text style={s.bmiLabel}>BMI</Text>
          <Text style={s.bmiValue}>{bmi.value.toFixed(1)}</Text>
          <Text style={[s.bmiCat, { color: bmi.color }]}>{bmi.category}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 3: Activity ────────────────────────────
function ActivityStep({ activity, setActivity }: any) {
  const opts: { v: ActivityLevel; t: string; s: string }[] = [
    { v: 'sedentary', t: '거의 안 움직임', s: 'SEDENTARY · 주로 앉아서 생활' },
    { v: 'light',     t: '가벼운 활동',    s: 'LIGHT · 주 1~3일 운동' },
    { v: 'moderate',  t: '보통 활동',      s: 'MODERATE · 주 3~5일 운동' },
    { v: 'active',    t: '활발한 활동',    s: 'ACTIVE · 주 6~7일 운동' },
  ];
  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 3 OF 6</Text>
      <Text style={s.stepTitle}>활동량을{'\n'}선택해주세요</Text>
      <Text style={s.stepDesc}>일주일 평균 활동 강도</Text>

      <View style={{ marginTop: SPACING.md, gap: 10 }}>
        {opts.map(o => (
          <BigOption key={o.v}
            active={activity === o.v}
            onPress={() => setActivity(o.v)}
            title={o.t} sub={o.s} />
        ))}
      </View>
    </View>
  );
}

// ─── Step 4: Goal ────────────────────────────────
function GoalStep({ goal, setGoal }: any) {
  const opts: { v: Goal; t: string; s: string; icon: any }[] = [
    { v: 'lose',     t: '체중 감량',  s: '-500 KCAL · 목표 -1kg/2주', icon: 'trending-down' },
    { v: 'maintain', t: '현재 유지',  s: 'MAINTAIN · 균형 유지',        icon: 'remove' },
    { v: 'gain',     t: '근육 증량',  s: '+300 KCAL · 단백질 강화',     icon: 'trending-up' },
  ];
  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 4 OF 6</Text>
      <Text style={s.stepTitle}>목표를{'\n'}선택해주세요</Text>
      <Text style={s.stepDesc}>목표에 따라 일일 권장 칼로리가 자동 계산됩니다.</Text>

      <View style={{ marginTop: SPACING.md, gap: 10 }}>
        {opts.map(o => (
          <BigOption key={o.v}
            active={goal === o.v}
            onPress={() => setGoal(o.v)}
            title={o.t} sub={o.s} icon={o.icon} />
        ))}
      </View>
    </View>
  );
}

// ─── Step 5: Target Weight ───────────────────────
function TargetStep({ targetWeight, setTargetWeight, currentWeight, goal, height }: any) {
  const targetBMI = targetWeight && height
    ? calcBMI(parseFloat(targetWeight), parseInt(height))
    : null;
  const targetBMILabel = targetBMI !== null && isFinite(targetBMI)
    ? getBMILabel(targetBMI)
    : null;

  if (goal === 'maintain') {
    return (
      <View style={s.stepContent}>
        <Text style={s.stepEyebrow}>STEP 5 OF 6</Text>
        <Text style={s.stepTitle}>목표 체중 설정</Text>
        <Text style={s.stepDesc}>목표를 설정하면 진행 상황을 추적합니다 (선택)</Text>
        <View style={s.maintainNotice}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.good} />
          <Text style={s.maintainNoticeText}>현재 유지를 선택했습니다. 현재 체중을 목표로 유지합니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 5 OF 6</Text>
      <Text style={s.stepTitle}>목표 체중 설정</Text>
      <Text style={s.stepDesc}>목표를 설정하면 진행 상황을 추적합니다 (선택)</Text>

      <View style={s.formGroup}>
        <Text style={s.formLabel}>목표 체중</Text>
        <TextInput
          style={s.formInput}
          value={targetWeight}
          onChangeText={setTargetWeight}
          keyboardType="numeric"
          placeholder={currentWeight ? `${currentWeight}kg (현재 체중)` : '목표 체중 (kg)'}
          placeholderTextColor={COLORS.textDisabled}
        />
      </View>

      {targetBMILabel && targetBMI !== null && (
        <View style={s.bmiCard}>
          <Text style={s.bmiLabel}>목표 BMI</Text>
          <Text style={s.bmiValue}>{targetBMI.toFixed(1)}</Text>
          <Text style={[s.bmiCat, { color: targetBMILabel.color }]}>{targetBMILabel.label}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 6: Review ──────────────────────────────
function ReviewStep({ name, age, height, weight, activity, goal, targetCalories, bmi, targetWeight }: any) {
  const activityLabels: any = { sedentary: '거의 안 움직임', light: '가벼운 활동', moderate: '보통', active: '활발' };
  const goalLabels: any = { lose: '체중 감량', maintain: '현재 유지', gain: '근육 증량' };

  const targetBMI = targetWeight && height
    ? calcBMI(parseFloat(targetWeight), parseInt(height))
    : null;
  const targetBMIDisplay = targetBMI !== null && isFinite(targetBMI)
    ? targetBMI.toFixed(1)
    : null;

  return (
    <View style={s.stepContent}>
      <Text style={s.stepEyebrow}>STEP 6 OF 6 · REVIEW</Text>
      <Text style={s.stepTitle}>이대로 시작할까요?</Text>
      <Text style={s.stepDesc}>나중에 프로필에서 언제든 수정할 수 있어요.</Text>

      <View style={s.reviewCard}>
        <ReviewRow label="이름" value={name} />
        <ReviewRow label="나이 / 키 / 체중" value={`${age}세 · ${height}cm · ${weight}kg`} />
        {bmi && <ReviewRow label="BMI" value={`${bmi.value.toFixed(1)} (${bmi.category})`} />}
        <ReviewRow label="활동량" value={activityLabels[activity]} />
        <ReviewRow label="목표" value={goalLabels[goal]} />
        <ReviewRow
          label="목표 체중"
          value={targetWeight && targetBMIDisplay
            ? `${targetWeight}kg (BMI ${targetBMIDisplay})`
            : '설정 안 함'} />
      </View>

      <View style={s.targetCard}>
        <Text style={s.targetLabel}>일일 권장 칼로리</Text>
        <Text style={s.targetValue}>{targetCalories.toLocaleString()}<Text style={s.targetUnit}> kcal</Text></Text>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value}</Text>
    </View>
  );
}

function ChoicePill({ active, onPress, icon, label }: any) {
  return (
    <TouchableOpacity
      style={[s.choicePill, active && s.choicePillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={16} color={active ? '#000' : COLORS.textSub} />
      <Text style={[s.choicePillText, active && s.choicePillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BigOption({ active, onPress, title, sub, icon }: any) {
  return (
    <TouchableOpacity
      style={[s.bigOption, active && s.bigOptionActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.bigOptionLeft}>
        {icon && (
          <View style={[s.bigOptionIcon, active && { backgroundColor: COLORS.primary }]}>
            <Ionicons name={icon} size={20} color={active ? '#000' : COLORS.primary} />
          </View>
        )}
        <View>
          <Text style={s.bigOptionTitle}>{title}</Text>
          <Text style={s.bigOptionSub}>{sub}</Text>
        </View>
      </View>
      <View style={[s.bigOptionCheck, active && s.bigOptionCheckActive]}>
        {active && <Ionicons name="checkmark" size={12} color="#000" />}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepper: { flexDirection: 'row', gap: 6, flex: 1, marginHorizontal: SPACING.md, alignItems: 'center' },
  stepDot: { flex: 1, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)' },
  stepDotDone: { backgroundColor: COLORS.primary },
  stepDotActive: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 6 },
  scroll: { paddingHorizontal: SPACING.md + 4, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl + 60 },

  // Intro
  introWrap: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  glyph: {
    width: 110, height: 110, borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10,
  },
  eyebrow: {
    fontSize: 11, color: COLORS.primary, fontFamily: 'monospace',
    letterSpacing: 3, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32, fontWeight: '900', color: COLORS.text,
    letterSpacing: -1, lineHeight: 38, textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14, color: COLORS.textMuted,
    marginTop: 14, textAlign: 'center', lineHeight: 22,
  },
  featureList: { width: '100%', marginTop: SPACING.xl, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  featureSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace', letterSpacing: 0.5 },

  // Step content
  stepContent: { paddingTop: SPACING.md },
  stepEyebrow: {
    fontSize: 11, color: COLORS.primary, fontFamily: 'monospace',
    letterSpacing: 2, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase',
  },
  stepTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, lineHeight: 34, letterSpacing: -0.5 },
  stepDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 8, lineHeight: 20, marginBottom: SPACING.md },

  formGroup: { marginTop: SPACING.md },
  formLabel: { fontSize: 13, color: COLORS.textSub, fontWeight: '600', marginBottom: 8 },
  formInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 14, color: COLORS.text,
    fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  dateRow: { flexDirection: 'row', gap: 8 },

  choiceRow: { flexDirection: 'row', gap: 10 },
  choicePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  choicePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choicePillText: { fontSize: 14, fontWeight: '700', color: COLORS.textSub },
  choicePillTextActive: { color: '#000' },

  bigOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  bigOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  bigOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  bigOptionIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  bigOptionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  bigOptionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace', letterSpacing: 0.3 },
  bigOptionCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: COLORS.textDisabled,
    alignItems: 'center', justifyContent: 'center',
  },
  bigOptionCheckActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  maintainNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.goodGlow,
    borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.good,
  },
  maintainNoticeText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  bmiCard: {
    flexDirection: 'row', alignItems: 'baseline', gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bmiLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '700' },
  bmiValue: { fontSize: 28, fontWeight: '800', color: COLORS.text, fontFamily: 'monospace', letterSpacing: -1 },
  bmiCat: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

  // Review
  reviewCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub,
  },
  reviewLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 0.5 },
  reviewValue: { fontSize: 14, color: COLORS.text, fontWeight: '700' },

  targetCard: {
    backgroundColor: COLORS.amberGlow,
    borderRadius: RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.amberLine,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11, color: COLORS.amber, fontFamily: 'monospace',
    letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase',
  },
  targetValue: {
    fontSize: 40, color: COLORS.amber, fontWeight: '800',
    fontFamily: 'monospace', letterSpacing: -1, marginTop: 6,
  },
  targetUnit: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },

  // CTA
  cta: {
    paddingHorizontal: SPACING.md + 4,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 16, borderRadius: RADIUS.md,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  primaryBtnDisabled: { backgroundColor: COLORS.bgInput, shadowOpacity: 0 },
  primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
