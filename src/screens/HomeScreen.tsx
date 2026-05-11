import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CharacterCard from '../components/CharacterCard';
import DailyRings from '../components/DailyRings';
import PermanentStatPanel from '../components/PermanentStatPanel';
import QuestList, { Quest } from '../components/QuestList';
import StatGrid from '../components/StatGrid';
import { COLORS, FONTS, RADIUS, SPACING, getRank } from '../constants/theme';
import { useRefresh } from '../context/RefreshContext';
import { EMPTY_PERMANENT_STATS, IllnessEntry, ILLNESS_LABELS, PermanentStats, UserProfile } from '../types';
import { calcMacroGoal } from '../utils/calorieCalculator';
import { checkAchievements, getLevelTitle, getXPProgress } from '../utils/levelSystem';
import { calcExerciseCalories } from '../utils/scoreCalculator';
import {
  addWater, calcImmunity, generateId, getAllDailyLogs, getCurrentIllness,
  getDailyLog, getFoodEntriesByDate, getLatestWeight, getMorningBS,
  getPermanentStats, getRecentDailyLogs, getRecentMorningBS, getStreak,
  getTodayKey, getUnlockedAchievementIds, getUserProfile, getUserXP,
  getWaterLog, getWaterStreak, recalcAndSavePermanentStats, saveMorningBS,
  saveUserProfile, sumFoodEntries, unlockAchievement, updateChallengeProgress,
} from '../utils/storage';

/**
 * 홈 화면 — Vital Quest 디자인 v1
 *
 * 변경점 (v0 → v1):
 *  - 1,284줄 → ~330줄로 축소
 *  - 9개 카드 → 5개 카드 (캐릭터 / 링 / 스탯 / 퀘스트 / 액션)
 *  - 이모지 모두 제거 → Ionicons
 *  - 모달 분리 (NotifModal, ProfileModal 등은 별도 작업 시 분리 예정, 지금은 인라인)
 *  - 데이터 로딩/저장 로직은 기존 그대로 유지 (안전성)
 */
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const today = getTodayKey();

  // ─── 상태 ─────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [foodSummary, setFoodSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [morningBS, setMorningBS] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [exerciseCalToday, setExerciseCalToday] = useState(0);
  const [waterMl, setWaterMl] = useState(0);
  const [xpProgress, setXpProgress] = useState<any>(null);
  const [todayXP, setTodayXP] = useState<number | null>(null);
  const [immunity, setImmunity] = useState<number | null>(null);
  const [currentIllness, setCurrentIllness] = useState<IllnessEntry | null>(null);
  const [permStats, setPermStats] = useState<PermanentStats>(EMPTY_PERMANENT_STATS);

  // 모달
  const [showBSModal, setShowBSModal] = useState(false);
  const [bsInput, setBsInput] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editTargetCal, setEditTargetCal] = useState('');

  const WATER_GOAL = profile?.waterGoalMl ?? 2000;

  // ─── 데이터 로딩 ──────────────────────────────────
  const load = useCallback(async () => {
    // 영구 스탯은 매번 재계산 후 사용 (이력 변경분 즉시 반영)
    const ps = await recalcAndSavePermanentStats();
    setPermStats(ps);

    const [p, log, foods, mbs, recent, str, water, xp, achIds, imm, ill, latestW] = await Promise.all([
      getUserProfile(), getDailyLog(today), getFoodEntriesByDate(today),
      getMorningBS(today), getRecentDailyLogs(7), getStreak(),
      getWaterLog(today), getUserXP(), getUnlockedAchievementIds(),
      calcImmunity(), getCurrentIllness(), getLatestWeight(),
    ]);
    setProfile(p);
    setTodayLog(log);
    setScore(log?.conditionScore ?? null);
    setStats(log?.stats ?? null);
    setFoodSummary(sumFoodEntries(foods));
    setMorningBS(mbs);
    setStreak(str);
    setExerciseCalToday(log?.exerciseCalories ?? (log?.exercise ? calcExerciseCalories(log.exercise, p?.weightKg ?? 70) : 0));
    setWaterMl(water);
    setXpProgress(getXPProgress(xp.totalXP));
    setTodayXP(log?.xpGained ?? null);
    setImmunity(imm);
    setCurrentIllness(ill);

    // 업적 자동 체크 (기존 로직 유지)
    const waterGoal = p?.waterGoalMl ?? 2000;
    if (log && recent.length > 0) {
      const waterStreak = await getWaterStreak(waterGoal);
      const newAch = checkAchievements(recent, str, xp.level, achIds, waterStreak);
      for (const ach of newAch) await unlockAchievement(ach.id as any);
    }
    const allLogs = await getAllDailyLogs();
    await updateChallengeProgress(allLogs, waterGoal);

    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const { refreshKey } = useRefresh();
  useEffect(() => { load(); }, [refreshKey]);

  // ─── 액션 ────────────────────────────────────────
  const handleSaveBS = async () => {
    const v = parseInt(bsInput);
    if (isNaN(v) || v < 40 || v > 600) { Alert.alert('오류', '40~600 사이 값을 입력해주세요'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMorningBS({ id: generateId(), date: today, value: v, timestamp: new Date().toISOString() });
    setBsInput(''); setShowBSModal(false); load();
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('오류', '이름을 입력해주세요'); return; }
    const w = parseFloat(editWeight);
    if (isNaN(w) || w < 30 || w > 300) { Alert.alert('오류', '올바른 체중 (30~300kg)'); return; }
    const cal = parseInt(editTargetCal);
    if (isNaN(cal) || cal < 1000 || cal > 5000) { Alert.alert('오류', '목표 칼로리 (1000~5000)'); return; }
    const p = await getUserProfile();
    if (p) {
      const updated = { ...p, name: editName.trim(), weightKg: w, targetCalories: cal };
      await saveUserProfile(updated);
      setProfile(updated);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProfileModal(false);
  };

  const handleAddWater = async () => {
    const CUP = 250;
    const next = await addWater(today, CUP);
    setWaterMl(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── 파생 데이터 ─────────────────────────────────
  const rank = score !== null ? getRank(score) : null;
  const targetCal = profile?.targetCalories ?? 2000;

  const todayHasExercise = (() => {
    if (!todayLog) return false;
    const types = todayLog.exercise?.types?.filter((t: string) => t !== 'none') ?? [];
    return types.length > 0 || (todayLog.exercise?.type && todayLog.exercise.type !== 'none');
  })();

  // 퀘스트 — 이모지 없는 깔끔한 라벨
  const quests: Quest[] = [
    { label: '일일 체크인 완료', sub: '수면·운동·음주 기록', done: !!todayLog,
      action: () => navigation.navigate('Input'), xp: 50 },
    { label: '식단 기록', sub: '오늘 먹은 것 기록', done: foodSummary.calories > 0,
      action: () => navigation.navigate('Calorie'), xp: 20 },
    { label: '공복 혈당 측정', sub: '기상 후 공복혈당', done: !!morningBS,
      action: () => setShowBSModal(true), xp: 10 },
    { label: '운동 기록', sub: '오늘의 운동', done: todayHasExercise,
      action: () => navigation.navigate('Input'), xp: 25 },
    { label: `물 ${(WATER_GOAL/1000).toFixed(1)}L 마시기`, sub: `${waterMl} / ${WATER_GOAL} ml`,
      done: waterMl >= WATER_GOAL, action: handleAddWater, xp: 15 },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return '늦은 시간이에요';
    if (h < 12) return '좋은 아침';
    if (h < 18) return '오후도 화이팅';
    return '오늘 하루 수고하셨어요';
  })();

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>{getDateLabel(today)}{streak > 1 ? `  ·  ${streak}일 연속` : ''}</Text>
            <Text style={s.title}>
              {greeting}, <Text style={s.titleAccent}>{profile?.name ?? '용사'}</Text>님
            </Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => Alert.alert('알림', '알림 설정은 준비중이에요')}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>

        {/* ── 캐릭터 카드 (RPG 정체성, 절제된 형태) ── */}
        <CharacterCard
          name={profile?.name ?? '용사'}
          score={score}
          rank={rank as any}
          level={xpProgress?.level ?? 1}
          levelTitle={getLevelTitle(xpProgress?.level ?? 1)}
          xpCurrent={xpProgress?.current ?? 0}
          xpNeeded={xpProgress?.needed ?? 100}
          todayXp={todayXP}
          permStats={permStats}
          onEditName={() => {
            setEditName(profile?.name ?? '');
            setEditWeight(String(profile?.weightKg ?? ''));
            setEditTargetCal(String(profile?.targetCalories ?? ''));
            setShowProfileModal(true);
          }}
        />

        {/* ── 앓는 중 배너 (조건부) ── */}
        {currentIllness && (
          <TouchableOpacity
            style={s.illnessBanner}
            onPress={() => navigation.navigate('Illness')}
            activeOpacity={0.8}
          >
            <View style={s.illnessIconBox}>
              <Ionicons name="medkit" size={20} color={COLORS.bad} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.illnessTitle}>{ILLNESS_LABELS[currentIllness.type]} 앓는 중</Text>
              <Text style={s.illnessSub}>HP·VIT 회복 지연 · 탭해서 회복 처리</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.bad} />
          </TouchableOpacity>
        )}

        {/* ── 데일리 링 ── */}
        <DailyRings
          calorie={{ current: foodSummary.calories, goal: targetCal }}
          water={{ currentMl: waterMl, goalMl: WATER_GOAL }}
          quest={{ done: quests.filter(q => q.done).length, total: quests.length }}
        />

        {/* ── 영구 능력치 (누적 성장) ── */}
        <SectionLabel>영구 능력치</SectionLabel>
        <PermanentStatPanel stats={permStats} />

        {/* ── 오늘의 컨디션 (일일 변동) ── */}
        {stats ? (
          <>
            <SectionLabel>오늘의 컨디션</SectionLabel>
            <StatGrid stats={stats} />
          </>
        ) : (
          <TouchableOpacity style={s.emptyCard} onPress={() => navigation.navigate('Input')}>
            <View style={s.emptyIconBox}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>오늘 첫 체크인을 시작해주세요</Text>
            <Text style={s.emptySub}>수면·운동·음주를 기록하면 스탯이 생성돼요</Text>
            <View style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>체크인 시작</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── 오늘의 퀘스트 ── */}
        <QuestList quests={quests} />

        {/* ── 빠른 기록 (액션 그리드) ── */}
        <SectionLabel>빠른 기록</SectionLabel>
        <View style={s.actionGrid}>
          <ActionCard
            label="식단 기록"
            sub="FOOD LOG"
            icon="restaurant-outline"
            color={COLORS.primary}
            tintBg={COLORS.primaryGlow}
            onPress={() => navigation.navigate('Calorie')}
          />
          <ActionCard
            label="체크인"
            sub="DAILY · +50 XP"
            icon="checkmark-done-outline"
            color={COLORS.amber}
            tintBg={COLORS.amberGlow}
            onPress={() => navigation.navigate('Input')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 공복 혈당 입력 모달 ── */}
      <Modal visible={showBSModal} animationType="fade" transparent onRequestClose={() => setShowBSModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>공복 혈당 측정</Text>
            <Text style={s.modalDesc}>기상 후 공복 상태에서 측정한 값을 입력해주세요</Text>
            <View style={s.bsInputRow}>
              <TextInput
                style={s.bsInput}
                value={bsInput}
                onChangeText={setBsInput}
                keyboardType="numeric"
                placeholder="예: 95"
                placeholderTextColor={COLORS.textDisabled}
                autoFocus
              />
              <Text style={s.bsUnit}>mg/dL</Text>
            </View>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalBtnGhost} onPress={() => { setBsInput(''); setShowBSModal(false); }}>
                <Text style={s.modalBtnGhostText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnPrimary} onPress={handleSaveBS}>
                <Text style={s.modalBtnPrimaryText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 프로필 수정 모달 ── */}
      <Modal visible={showProfileModal} animationType="slide" transparent onRequestClose={() => setShowProfileModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>프로필 수정</Text>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>이름</Text>
              <TextInput style={s.formInput} value={editName} onChangeText={setEditName} placeholderTextColor={COLORS.textDisabled} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>체중 (kg)</Text>
              <TextInput style={s.formInput} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" placeholderTextColor={COLORS.textDisabled} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>목표 칼로리 (kcal/일)</Text>
              <TextInput style={s.formInput} value={editTargetCal} onChangeText={setEditTargetCal} keyboardType="numeric" placeholderTextColor={COLORS.textDisabled} />
            </View>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalBtnGhost} onPress={() => setShowProfileModal(false)}>
                <Text style={s.modalBtnGhostText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnPrimary} onPress={handleSaveProfile}>
                <Text style={s.modalBtnPrimaryText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 작은 헬퍼 컴포넌트 ──────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.sectionLabelWrap}>
      <Text style={s.sectionLabel}>{children}</Text>
    </View>
  );
}

function ActionCard({ label, sub, icon, color, tintBg, onPress }: {
  label: string; sub: string; icon: any; color: string; tintBg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.actionIcon, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
      <Text style={s.actionSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function getDateLabel(today: string) {
  const [y, m, d] = today.split('-');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(today).getDay()];
  return `${m}월 ${d}일 ${dayOfWeek}요일`;
}

// ─── 스타일 ─────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: SPACING.sm, paddingBottom: SPACING.xl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md + 4,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: { fontSize: FONTS.xl - 2, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  titleAccent: { color: COLORS.primary },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  illnessBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.badGlow,
    borderRadius: RADIUS.md, padding: SPACING.md - 2,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
  },
  illnessIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  illnessTitle: { color: COLORS.bad, fontSize: FONTS.sm, fontWeight: '700' },
  illnessSub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },

  sectionLabelWrap: {
    paddingHorizontal: SPACING.md + 4,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs + 2,
  },
  sectionLabel: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: FONTS.xxs, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', fontFamily: 'monospace' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  emptyBtnText: { color: '#000', fontSize: FONTS.xs, fontWeight: '800' },

  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 10,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 8,
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  actionSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 0.5 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(2,3,8,0.7)',
    justifyContent: 'center', padding: SPACING.md,
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  modalDesc: { fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },

  bsInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 20,
  },
  bsInput: {
    flex: 1,
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  bsUnit: { fontSize: FONTS.sm, color: COLORS.textMuted, fontFamily: 'monospace' },

  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 },
  formInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text,
    fontSize: FONTS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtnGhost: {
    flex: 1, backgroundColor: COLORS.bgInput,
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalBtnGhostText: { color: COLORS.textSub, fontWeight: '700', fontSize: FONTS.sm },
  modalBtnPrimary: {
    flex: 1, backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalBtnPrimaryText: { color: '#000', fontWeight: '800', fontSize: FONTS.sm },
});
