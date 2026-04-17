import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, getAvatar, getRank, RADIUS, SPACING } from '../constants/theme';
import { ACHIEVEMENT_DEFS, AchievementId, UserProfile } from '../types';
import { getTodayFortune, SajuFortune } from '../utils/feedback';
import { calcMacroGoal } from '../utils/calorieCalculator';
import { BS_STATUS_COLOR, getBSStatus, getBSStatusLabel, calcExerciseCalories } from '../utils/scoreCalculator';
import {
  addWater, calcAvgBS, calcImmunity, claimChallengeReward, generateId, getDailyLog, getFoodEntriesByDate,
  getCurrentIllness, getLatestWeight, getMorningBS, getRecentDailyLogs, getRecentMorningBS, getStreak,
  getTodayKey, getUserProfile, getUserXP, getUnlockedAchievementIds,
  getWaterLog, getWaterStreak, saveMorningBS, saveUserProfile, sumFoodEntries, getBSTrend,
  unlockAchievement, updateChallengeProgress, getAllDailyLogs,
} from '../utils/storage';
import { CHALLENGE_DEFS, IllnessEntry, ILLNESS_EMOJI, ILLNESS_LABELS, SYMPTOM_LABELS, WeeklyChallenge } from '../types';
import {
  getNotifSettings, saveNotifSettings, scheduleAllNotifications,
  cancelAllNotifications, requestPermissions, NotifSettings,
} from '../utils/notifications';
import { getXPProgress, getLevelTitle, checkAchievements } from '../utils/levelSystem';

// ─── RPG 스탯 바 ──────────────────────────────────────────
function StatBar({ label, value, max = 100, color, abbr }: {
  label: string; value: number; max?: number; color: string; abbr: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={sb.row}>
      <Text style={sb.abbr}>{abbr}</Text>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        <View style={[sb.glow, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[sb.val, { color }]}>{value}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  abbr: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700', width: 28, fontFamily: 'monospace' },
  track: { flex: 1, height: 6, backgroundColor: COLORS.bgHighlight, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  glow: { position: 'absolute', height: '100%', borderRadius: 3, opacity: 0.3, top: 0 },
  val: { fontSize: FONTS.xxs, fontWeight: '900', width: 28, textAlign: 'right', fontFamily: 'monospace' },
});

// ─── 알림 설정 모달 ───────────────────────────────────────
function NotifModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<NotifSettings>({
    enabled: false, morningBS: true, morningBSHour: 7,
    breakfastLog: true, breakfastLogHour: 8,
    mealLog: true, dinnerLog: true, dinnerLogHour: 18,
    eveningLog: true, eveningLogHour: 21,
  });
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (visible && !loaded) {
      getNotifSettings().then(s => { setSettings(s); setLoaded(true); });
    }
  }, [visible]);

  const handleSave = async () => {
    await saveNotifSettings(settings);
    if (settings.enabled) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요.');
        return;
      }
      await scheduleAllNotifications(settings);
    } else {
      await cancelAllNotifications();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const toggle = (key: keyof NotifSettings, val: boolean) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={nm.overlay}>
        <ScrollView>
          <View style={nm.sheet}>
            <Text style={nm.title}>🔔 알림 설정</Text>
            <Text style={nm.sub}>퀘스트 알림으로 던전을 잊지 마세요</Text>

            <Row label="알림 활성화" value={settings.enabled} onChange={v => toggle('enabled', v)} />
            {settings.enabled && (
              <>
                <Row label={`⏰ 공복혈당 알림 (${settings.morningBSHour}시)`} value={settings.morningBS} onChange={v => toggle('morningBS', v)} />
                <Row label={`🌅 아침 식단 알림 (${settings.breakfastLogHour}시)`} value={settings.breakfastLog} onChange={v => toggle('breakfastLog', v)} />
                <Row label="🍱 점심 식단 알림 (12:30)" value={settings.mealLog} onChange={v => toggle('mealLog', v)} />
                <Row label={`🌙 저녁 식단 알림 (${settings.dinnerLogHour}시)`} value={settings.dinnerLog} onChange={v => toggle('dinnerLog', v)} />
                <Row label={`📊 저녁 기록 알림 (${settings.eveningLogHour}시)`} value={settings.eveningLog} onChange={v => toggle('eveningLog', v)} />
              </>
            )}

            <View style={nm.btns}>
              <TouchableOpacity style={nm.cancel} onPress={onClose}>
                <Text style={nm.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={nm.save} onPress={handleSave}>
                <Text style={nm.saveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={nm.row}>
      <Text style={nm.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.bgHighlight, true: COLORS.purple }} thumbColor="#fff" />
    </View>
  );
}
const nm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900', marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontSize: FONTS.sm, marginBottom: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub },
  rowLabel: { color: COLORS.text, fontSize: FONTS.sm },
  btns: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  cancel: { flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONTS.sm },
  save: { flex: 2, backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },
});

// ─── 메인 ─────────────────────────────────────────────────
export default function HomeScreen() {
  const today = getTodayKey();
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [foodSummary, setFoodSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [morningBS, setMorningBS] = useState<any>(null);
  const [recentBS, setRecentBS] = useState<any[]>([]);
  const [showBSModal, setShowBSModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editTargetCal, setEditTargetCal] = useState('');
  const [bsInput, setBsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [exerciseCalToday, setExerciseCalToday] = useState(0);
  const [fortune, setFortune] = useState<SajuFortune>(getTodayFortune(today));
  const [todayLog, setTodayLog] = useState<any>(null);
  const [immunity, setImmunity] = useState<number | null>(null);
  const [currentIllness, setCurrentIllness] = useState<IllnessEntry | null>(null);
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [xpProgress, setXpProgress] = useState<ReturnType<typeof getXPProgress> | null>(null);
  const [todayXP, setTodayXP] = useState<number | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [showWaterGoalModal, setShowWaterGoalModal] = useState(false);
  const [waterGoalInput, setWaterGoalInput] = useState('');
  // 업적 진행도용 통계
  const [bestScore, setBestScore] = useState(0);
  const [noAlcoholStreak, setNoAlcoholStreak] = useState(0);
  const [exerciseStreakCount, setExerciseStreakCount] = useState(0);

  const WATER_GOAL = profile?.waterGoalMl ?? 1500;
  const CUP_ML = 250;

  const load = useCallback(async () => {
    const [p, log, foods, mbs, recentMbs, recent, str, water, xp, achIds, imm, ill, latestW] = await Promise.all([
      getUserProfile(), getDailyLog(today), getFoodEntriesByDate(today),
      getMorningBS(today), getRecentMorningBS(7), getRecentDailyLogs(7), getStreak(),
      getWaterLog(today), getUserXP(), getUnlockedAchievementIds(),
      calcImmunity(), getCurrentIllness(), getLatestWeight(),
    ]);
    setImmunity(imm);
    setCurrentIllness(ill);
    setLatestWeightKg(latestW?.weightKg ?? null);
    setProfile(p);
    setTodayLog(log);
    setScore(log?.conditionScore ?? null);
    setStats(log?.stats ?? null);
    setFoodSummary(sumFoodEntries(foods));
    setMorningBS(mbs);
    setRecentBS(recentMbs);
    const reversed = [...recent].reverse();
    setRecentLogs(reversed);
    setStreak(str);
    setFortune(getTodayFortune(today, p?.birthDate));
    setExerciseCalToday(log?.exerciseCalories ?? (log?.exercise ? calcExerciseCalories(log.exercise, p?.weightKg ?? 70) : 0));
    setWaterMl(water);
    setXpProgress(getXPProgress(xp.totalXP));
    setTodayXP(log?.xpGained ?? null);
    setUnlockedIds(achIds);

    // 업적 진행도 통계
    const allScores = recent.map(l => l.conditionScore);
    setBestScore(allScores.length ? Math.max(...allScores) : 0);
    // 연속 금주일 수
    let noAlc = 0;
    for (const l of recent) { if (!l.alcohol.consumed) noAlc++; else break; }
    setNoAlcoholStreak(noAlc);
    // 연속 운동일 수
    let exStreak = 0;
    for (const l of recent) {
      const types = l.exercise.types?.filter((t: string) => t !== 'none') ?? [];
      if (types.length > 0 || (l.exercise.type && l.exercise.type !== 'none')) exStreak++;
      else break;
    }
    setExerciseStreakCount(exStreak);

    // 업적 체크
    const waterGoal = p?.waterGoalMl ?? 1500;
    if (log && recent.length > 0) {
      const waterStreak = await getWaterStreak(waterGoal);
      const newAch = checkAchievements(recent, str, xp.level, achIds, waterStreak);
      for (const ach of newAch) {
        await unlockAchievement(ach.id as any);
      }
      if (newAch.length > 0) setUnlockedIds([...achIds, ...newAch.map(a => a.id)]);
    }

    // 주간 챌린지 업데이트
    const allLogs = await getAllDailyLogs();
    const challenge = await updateChallengeProgress(allLogs, waterGoal);
    setWeeklyChallenge(challenge);

    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleSaveBS = async () => {
    const v = parseInt(bsInput);
    if (isNaN(v) || v < 40 || v > 600) { Alert.alert('오류', '40~600 사이 값을 입력해주세요'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMorningBS({ id: generateId(), date: today, value: v, timestamp: new Date().toISOString() });
    setBsInput(''); setShowBSModal(false); load();
  };

  const handleSaveBirth = async () => {
    if (!birthYear || !birthMonth || !birthDay) { Alert.alert('오류', '생년월일을 모두 입력해주세요'); return; }
    const y = parseInt(birthYear), m = parseInt(birthMonth), d = parseInt(birthDay);
    if (isNaN(y) || y < 1900 || y > 2010) { Alert.alert('오류', '올바른 연도를 입력해주세요'); return; }
    if (isNaN(m) || m < 1 || m > 12)      { Alert.alert('오류', '올바른 월을 입력해주세요'); return; }
    if (isNaN(d) || d < 1 || d > 31)      { Alert.alert('오류', '올바른 일을 입력해주세요'); return; }
    const bd = `${birthYear}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const p = await getUserProfile();
    if (p) {
      await saveUserProfile({ ...p, birthDate: bd });
      setProfile({ ...p, birthDate: bd });
      setFortune(getTodayFortune(today, bd));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowBirthModal(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('오류', '이름을 입력해주세요'); return; }
    const w = parseFloat(editWeight);
    if (isNaN(w) || w < 30 || w > 300) { Alert.alert('오류', '올바른 체중을 입력해주세요 (30~300kg)'); return; }
    const cal = parseInt(editTargetCal);
    if (isNaN(cal) || cal < 1000 || cal > 5000) { Alert.alert('오류', '올바른 목표 칼로리를 입력해주세요 (1000~5000)'); return; }
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
    const next = await addWater(today, CUP_ML);
    setWaterMl(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveWater = async () => {
    if (waterMl <= 0) return;
    const next = await addWater(today, -CUP_ML);
    setWaterMl(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveWaterGoal = async () => {
    const v = parseInt(waterGoalInput);
    if (isNaN(v) || v < 500 || v > 5000) {
      Alert.alert('오류', '500~5000ml 사이로 입력해주세요'); return;
    }
    if (profile) {
      const updated = { ...profile, waterGoalMl: v };
      await saveUserProfile(updated);
      setProfile(updated);
    }
    setWaterGoalInput('');
    setShowWaterGoalModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClaimChallenge = async (id: any) => {
    const xp = await claimChallengeReward(id);
    if (xp > 0) {
      Alert.alert('보상 수령!', `+${xp} XP 획득했어요! 🎉`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    }
  };

  const rank = score !== null ? getRank(score) : null;
  const avatar = score !== null ? getAvatar(score) : '🧑‍🌾';
  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = profile ? calcMacroGoal(targetCal) : { carbs: 200, protein: 150, fat: 67 };
  const netCalories = foodSummary.calories - exerciseCalToday;
  const bsTrend = getBSTrend(recentBS);
  const avgBS = calcAvgBS(recentBS);

  // 퀘스트 완료 여부
  const todayHasExercise = (() => {
    if (!todayLog) return false;
    const types = todayLog.exercise?.types?.filter((t: string) => t !== 'none') ?? [];
    return types.length > 0 || (todayLog.exercise?.type && todayLog.exercise.type !== 'none');
  })();
  const quests = [
    { label: '⚔️ 일일 던전 클리어', sub: '수면·운동·음주 기록', done: !!todayLog, action: () => navigation.navigate('Input'), xp: 50 },
    { label: '🍱 식량 보급 완료', sub: '오늘 먹은 것 기록', done: foodSummary.calories > 0, action: () => navigation.navigate('Calorie'), xp: 20 },
    { label: '💧 HP 아침 체크', sub: '기상 후 공복혈당 측정', done: !!morningBS, action: () => setShowBSModal(true), xp: 10 },
    { label: '🏋️ 전투 훈련 완료', sub: '오늘의 전투 기록', done: todayHasExercise, action: () => navigation.navigate('Input'), xp: 25 },
    { label: '🚰 물 포션 보충', sub: `${waterMl}ml / 2000ml`, done: waterMl >= 2000, action: () => {}, xp: 15 },
  ];
  const questDone = quests.filter(q => q.done).length;
  const questPct = Math.round((questDone / quests.length) * 100);

  if (loading) return <SafeAreaView style={s.safe}><View style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={s.header}>
          <View>
            <Text style={s.appTitle}>⚔ HEALTH RPG</Text>
            <Text style={s.dateText}>{today.replace(/-/g, '.')}</Text>
          </View>
          <View style={s.headerActions}>
            {streak > 1 && (
              <View style={s.streakChip}>
                <Text style={s.streakText}>🔥 {streak}일 연속</Text>
              </View>
            )}
            <TouchableOpacity style={s.notifBtn} onPress={() => setShowNotifModal(true)}>
              <Text style={s.notifIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 캐릭터 카드 ── */}
        <View style={[s.characterCard, { borderColor: (rank?.color ?? COLORS.border) + '55' }]}>
          {/* 배경 글로우 */}
          <View style={[s.cardGlow, { backgroundColor: (rank?.glow ?? COLORS.purpleGlow) }]} />

          <View style={s.characterLeft}>
            <View style={[s.avatarBox, { borderColor: rank?.color ?? COLORS.textMuted, shadowColor: rank?.color ?? 'transparent' }]}>
              <Text style={s.avatarEmoji}>{avatar}</Text>
            </View>
            <View>
              <TouchableOpacity
                onPress={() => {
                  setEditName(profile?.name ?? '');
                  setEditWeight(String(profile?.weightKg ?? ''));
                  setEditTargetCal(String(profile?.targetCalories ?? ''));
                  setShowProfileModal(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={s.charName}>{profile?.name ?? '용사'}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>✏️</Text>
              </TouchableOpacity>
              <View style={[s.rankBadge, { backgroundColor: (rank?.glow ?? COLORS.purpleGlow) }]}>
                <Text style={[s.rankText, { color: rank?.color ?? COLORS.textMuted }]}>
                  {rank ? `${rank.rank}  ${rank.label}` : '미탐험'}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.characterRight}>
            <Text style={[s.scoreNum, { color: rank?.color ?? COLORS.textMuted }]}>
              {score ?? '--'}
            </Text>
            <Text style={s.scoreLabel}>SCORE</Text>
            {latestWeightKg !== null && (
              <TouchableOpacity onPress={() => navigation.navigate('History')} activeOpacity={0.7}>
                <Text style={s.weightChip}>⚖️ {latestWeightKg}kg</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── XP / 레벨 카드 ── */}
        {xpProgress && (
          <View style={[s.xpCard, { borderColor: (rank?.color ?? COLORS.purple) + '44' }]}>
            <View style={s.xpCardTop}>
              <View>
                <Text style={s.xpLevelBig}>
                  Lv.{xpProgress.level}
                </Text>
                <Text style={[s.xpTitleBig, { color: rank?.color ?? COLORS.purple }]}>
                  {getLevelTitle(xpProgress.level)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {todayXP != null && (
                  <View style={s.xpTodayBadge}>
                    <Text style={s.xpTodayText}>오늘 +{todayXP} XP</Text>
                  </View>
                )}
                {!xpProgress.isMax && (
                  <Text style={s.xpRemain}>
                    다음 레벨까지 {xpProgress.needed - xpProgress.current} XP
                  </Text>
                )}
              </View>
            </View>
            <View style={s.xpTrack}>
              <View style={[s.xpFill, {
                width: `${xpProgress.pct}%` as any,
                backgroundColor: rank?.color ?? COLORS.purple,
              }]} />
            </View>
            <View style={s.xpBottomRow}>
              <Text style={s.xpCurrent}>{xpProgress.current} XP</Text>
              <Text style={s.xpNeeded}>{xpProgress.needed} XP</Text>
            </View>
          </View>
        )}

        {/* ── 앓는 중 배너 ── */}
        {currentIllness && (
          <TouchableOpacity
            style={s.illnessBanner}
            onPress={() => (navigation as any).navigate('Illness')}
            activeOpacity={0.8}
          >
            <Text style={s.illnessBannerEmoji}>{ILLNESS_EMOJI[currentIllness.type]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.illnessBannerTitle}>{ILLNESS_LABELS[currentIllness.type]} 앓는 중  ·  HP·VIT 감소 중</Text>
              <Text style={s.illnessBannerSub}>시작일: {currentIllness.startDate}  →  탭해서 회복 완료 처리</Text>
            </View>
            <Text style={{ color: COLORS.red, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── 면역력 ── */}
        {immunity !== null && (
          <TouchableOpacity
            style={s.immunityCard}
            onPress={() => (navigation as any).navigate('Illness')}
            activeOpacity={0.85}
          >
            <View style={s.immunityLeft}>
              <Text style={s.immunityLabel}>🛡️ 면역력</Text>
              <View style={s.immunityTrack}>
                <View style={[s.immunityFill, {
                  width: `${immunity}%` as any,
                  backgroundColor: immunity >= 75 ? COLORS.teal : immunity >= 50 ? COLORS.gold : COLORS.red,
                }]} />
              </View>
            </View>
            <Text style={[s.immunityScore, {
              color: immunity >= 75 ? COLORS.teal : immunity >= 50 ? COLORS.gold : COLORS.red,
            }]}>{immunity}</Text>
          </TouchableOpacity>
        )}

        {/* ── 캐릭터 스탯 ── */}
        {stats && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>⚡ 캐릭터 스탯</Text>
            <StatBar label="체력"    abbr="HP"  value={stats.hp}                color={COLORS.hp}  />
            <StatBar label="지구력"  abbr="STR" value={stats.stamina}           color={COLORS.str} />
            <StatBar label="회복력"  abbr="VIT" value={stats.recovery}          color={COLORS.vit} />
            <StatBar label="혈당조절" abbr="MP"  value={stats.bloodSugarControl} color={COLORS.mp}  />
            <StatBar label="컨디션"  abbr="CON" value={stats.condition}         color={COLORS.agi} />
          </View>
        )}
        {!stats && (
          <TouchableOpacity style={[s.card, s.emptyCard]} onPress={() => navigation.navigate('Input')}>
            <Text style={s.emptyCardIcon}>⚔️</Text>
            <Text style={s.emptyStatText}>던전에 입장하지 않았어요</Text>
            <Text style={s.emptyStatSub}>던전을 클리어하면 스탯이 올라가요</Text>
            <View style={s.startBtn}>
              <Text style={s.startBtnText}>⚔️ 던전 입장</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 오늘의 퀘스트 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>오늘의 퀘스트</Text>
            <View style={[s.questProgressPill, { backgroundColor: questDone === quests.length ? COLORS.gold + '22' : COLORS.bgHighlight }]}>
              <Text style={[s.questCount, { color: questDone === quests.length ? COLORS.gold : COLORS.textMuted }]}>
                {questDone}/{quests.length} 완료
              </Text>
            </View>
          </View>
          <View style={s.questBar}>
            <View style={[s.questBarFill, {
              width: `${questPct}%` as any,
              backgroundColor: questDone === quests.length ? COLORS.gold : COLORS.purple,
            }]} />
          </View>
          <View style={{ height: 6 }} />
          {quests.map((q, i) => (
            <TouchableOpacity key={i} style={s.questRow} onPress={q.action} activeOpacity={0.7}>
              <Text style={s.questIcon}>{q.done ? '✅' : '⬜'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.questLabel, q.done && s.questDone]}>{q.label}</Text>
                <Text style={s.questSub}>{q.done ? '✨ 클리어!' : q.sub}</Text>
              </View>
              <View style={[s.questXpBadge, q.done && { backgroundColor: COLORS.gold + '20' }]}>
                <Text style={[s.questXpText, q.done && { color: COLORS.gold }]}>+{q.xp} XP</Text>
              </View>
              {!q.done && <Text style={s.questArrow}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 칼로리 현황 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>🍱 오늘의 식량</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calorie')}>
              <Text style={s.link}>+ 식단 추가</Text>
            </TouchableOpacity>
          </View>
          <View style={s.calTriple}>
            <CalCell label="섭취" value={foodSummary.calories} unit="kcal" color={COLORS.teal} />
            <View style={s.calSep} />
            <CalCell label="소모" value={exerciseCalToday} unit="kcal" color={COLORS.gold} sign="-" />
            <View style={s.calSep} />
            <CalCell
              label="순 칼로리"
              value={netCalories}
              unit="kcal"
              color={netCalories > targetCal * 1.15 ? COLORS.red : COLORS.blue}
            />
          </View>
          <View style={s.calBar}>
            <View style={[s.calBarFill, {
              width: `${Math.min(100, Math.round((foodSummary.calories / targetCal) * 100))}%` as any,
              backgroundColor: foodSummary.calories > targetCal * 1.1 ? COLORS.red : COLORS.teal,
            }]} />
          </View>
          <View style={s.rowBetween}>
            <Text style={s.calBarLabel}>목표 {targetCal} kcal</Text>
            <Text style={s.calBarLabel}>{Math.round((foodSummary.calories / targetCal) * 100)}%</Text>
          </View>
          <View style={s.macroRow}>
            <Macro label="탄" value={Math.round(foodSummary.carbs)} goal={macroGoal.carbs} color={COLORS.teal} />
            <Macro label="단" value={Math.round(foodSummary.protein)} goal={macroGoal.protein} color={COLORS.gold} />
            <Macro label="지" value={Math.round(foodSummary.fat)} goal={macroGoal.fat} color={COLORS.red} />
          </View>
        </View>

        {/* ── 물 섭취 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>💧 수분 섭취</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.waterTotal, { color: waterMl >= WATER_GOAL ? COLORS.teal : COLORS.textMuted }]}>
                {waterMl}ml / {WATER_GOAL}ml
              </Text>
              <TouchableOpacity
                onPress={() => { setWaterGoalInput(String(WATER_GOAL)); setShowWaterGoalModal(true); }}
                style={{ backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>목표 설정</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* 물 게이지 바 */}
          <View style={s.waterBar}>
            <View style={[s.waterBarFill, {
              width: `${Math.min(100, Math.round((waterMl / WATER_GOAL) * 100))}%` as any,
              backgroundColor: waterMl >= WATER_GOAL ? COLORS.teal : COLORS.blue,
            }]} />
          </View>
          {/* 컵 그리드 */}
          <View style={s.cupGrid}>
            {Array.from({ length: 8 }).map((_, i) => {
              const filled = waterMl >= (i + 1) * CUP_ML;
              return (
                <TouchableOpacity key={i} onPress={handleAddWater} activeOpacity={0.7} style={s.cupBtn}>
                  <Text style={[s.cupEmoji, { opacity: filled ? 1 : 0.25 }]}>🥤</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.rowBetween}>
            <TouchableOpacity onPress={handleRemoveWater} style={s.waterAdjBtn}>
              <Text style={s.waterAdjText}>−  한 잔 취소</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddWater} style={[s.waterAdjBtn, s.waterAdjBtnAdd]}>
              <Text style={[s.waterAdjText, { color: COLORS.blue }]}>+ 한 잔 추가 (250ml)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 혈당 ── */}
        <TouchableOpacity style={s.card} onPress={() => setShowBSModal(true)} activeOpacity={0.85}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>💧 공복혈당</Text>
            {morningBS && (
              <Text style={[s.bsTrend, { color: bsTrend === 'up' ? COLORS.red : bsTrend === 'down' ? COLORS.teal : COLORS.textMuted }]}>
                {bsTrend === 'up' ? '↑ 상승' : bsTrend === 'down' ? '↓ 하락' : '→ 유지'}
              </Text>
            )}
          </View>
          {morningBS ? (
            <View style={s.bsRow}>
              <Text style={[s.bsValue, { color: BS_STATUS_COLOR[getBSStatus(morningBS.value)] }]}>
                {morningBS.value}
              </Text>
              <View>
                <Text style={s.bsUnit}>mg/dL</Text>
                <View style={[s.bsStatusBadge, { backgroundColor: BS_STATUS_COLOR[getBSStatus(morningBS.value)] + '22' }]}>
                  <Text style={[s.bsStatusText, { color: BS_STATUS_COLOR[getBSStatus(morningBS.value)] }]}>
                    {getBSStatusLabel(getBSStatus(morningBS.value))}
                  </Text>
                </View>
              </View>
              {avgBS && <Text style={s.bsAvg}>7일 평균 {avgBS}</Text>}
            </View>
          ) : (
            <Text style={s.emptyAction}>+ 탭하여 입력</Text>
          )}
          {recentBS.length > 0 && <BSSparkline entries={recentBS} />}
        </TouchableOpacity>

        {/* ── 오늘의 운세 (사주 기반) ── */}
        <View style={[s.card, { borderColor: fortune.color + '55' }]}>
          <View style={s.rowBetween}>
            <Text style={[s.sectionTitle, { color: fortune.color }]}>✨ 오늘의 운세</Text>
            {profile?.birthDate ? (
              <TouchableOpacity onPress={() => setShowBirthModal(true)}>
                <Text style={[s.luckyPillText, { color: fortune.color }]}>{fortune.zodiac}  ✏️</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.birthInputBtn, { borderColor: fortune.color + '66' }]}
                onPress={() => setShowBirthModal(true)}
              >
                <Text style={[s.birthInputBtnText, { color: fortune.color }]}>🎂 생년월일 입력</Text>
              </TouchableOpacity>
            )}
          </View>

          {!profile?.birthDate && (
            <Text style={s.birthHint}>생년월일을 입력하면 사주 기반 맞춤 운세를 받아볼 수 있어요</Text>
          )}

          {/* 사주 정보 칩 */}
          <View style={s.sajuRow}>
            <View style={[s.sajuChip, { backgroundColor: fortune.color + '18', borderColor: fortune.color + '44' }]}>
              <Text style={[s.sajuChipText, { color: fortune.color }]}>나의 일간  {fortune.ohaeng}</Text>
            </View>
            <Text style={s.sajuArrow}>→</Text>
            <View style={[s.sajuChip, { backgroundColor: COLORS.bgHighlight }]}>
              <Text style={s.sajuChipText}>오늘  {fortune.todayPillar}</Text>
            </View>
          </View>

          {/* 관계 뱃지 */}
          <View style={[s.relationBadge, { backgroundColor: fortune.color + '15' }]}>
            <Text style={[s.relationText, { color: fortune.color }]}>{fortune.relation}</Text>
          </View>

          <Text style={s.fortuneText}>{fortune.text}</Text>

          {/* 오늘의 조언 */}
          <View style={s.adviceRow}>
            <Text style={s.adviceIcon}>💡</Text>
            <Text style={s.adviceText}>{fortune.advice}</Text>
          </View>

          {/* 행운 아이템 */}
          <View style={s.rowBetween}>
            <Text style={s.luckyLabel}>오늘의 행운</Text>
            <View style={[s.luckyPill, { backgroundColor: fortune.color + '20' }]}>
              <Text style={[s.luckyPillText, { color: fortune.color }]}>🍀 {fortune.lucky}</Text>
            </View>
          </View>
        </View>

        {/* ── 주간 챌린지 ── */}
        {weeklyChallenge && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>⚔️ 주간 챌린지</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.sm }}>매주 새로운 챌린지가 갱신됩니다</Text>
            {weeklyChallenge.challengeIds.map(id => {
              const def = CHALLENGE_DEFS[id];
              const progress = weeklyChallenge.progress[id] ?? 0;
              const isCompleted = weeklyChallenge.completed.includes(id);
              const isClaimed = weeklyChallenge.rewardClaimed.includes(id);
              const pct = Math.min(100, Math.round((progress / def.target) * 100));
              return (
                <View key={id} style={{ marginBottom: SPACING.sm, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: isCompleted ? COLORS.gold + '44' : COLORS.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 18 }}>{def.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isCompleted ? COLORS.gold : COLORS.text, fontWeight: '700', fontSize: FONTS.sm }}>{def.name}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>{def.desc}</Text>
                      </View>
                    </View>
                    {isCompleted && !isClaimed ? (
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.gold, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 }}
                        onPress={() => handleClaimChallenge(id)}
                      >
                        <Text style={{ color: '#000', fontWeight: '900', fontSize: FONTS.xs }}>+{def.xpReward}XP</Text>
                      </TouchableOpacity>
                    ) : isClaimed ? (
                      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>수령완료</Text>
                    ) : (
                      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>{progress}/{def.target}</Text>
                    )}
                  </View>
                  <View style={{ height: 4, backgroundColor: COLORS.bgCard, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: isCompleted ? COLORS.gold : COLORS.purple, borderRadius: 2 }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 업적 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>업적</Text>
            <Text style={s.achieveCount}>{unlockedIds.length} / {Object.keys(ACHIEVEMENT_DEFS).length}</Text>
          </View>
          {/* 달성 업적 */}
          {unlockedIds.length > 0 && (
            <View style={s.achieveGrid}>
              {(Object.keys(ACHIEVEMENT_DEFS) as AchievementId[]).filter(id => unlockedIds.includes(id)).map(id => {
                const def = ACHIEVEMENT_DEFS[id];
                return (
                  <View key={id} style={s.achieveItem}>
                    <Text style={s.achieveEmoji}>{def.emoji}</Text>
                    <Text style={s.achieveName}>{def.name}</Text>
                    <Text style={s.achieveDone}>달성</Text>
                  </View>
                );
              })}
            </View>
          )}
          {/* 진행 중 업적 */}
          <View style={s.achieveProgressList}>
            {[
              { id: 'streak_3', label: '3일 연속 기록', cur: Math.min(streak, 3), max: 3 },
              { id: 'streak_7', label: '7일 연속 기록', cur: Math.min(streak, 7), max: 7 },
              { id: 'no_alcohol_7', label: '7일 연속 금주', cur: Math.min(noAlcoholStreak, 7), max: 7 },
              { id: 'exercise_7', label: '7일 연속 운동', cur: Math.min(exerciseStreakCount, 7), max: 7 },
              { id: 'score_90', label: '90점 달성', cur: Math.min(bestScore, 90), max: 90 },
            ].filter(a => !unlockedIds.includes(a.id)).map(a => (
              <View key={a.id} style={s.achieveProgressRow}>
                <Text style={s.achieveProgressLabel}>{a.label}</Text>
                <View style={s.achieveProgressTrack}>
                  <View style={[s.achieveProgressFill, { width: `${Math.round((a.cur / a.max) * 100)}%` as any }]} />
                </View>
                <Text style={s.achieveProgressNum}>{a.cur}/{a.max}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 최근 7일 ── */}
        {recentLogs.length > 1 && (
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>📈 최근 7일</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={s.link}>전체 보기</Text>
              </TouchableOpacity>
            </View>
            <ScoreSparkline logs={recentLogs.slice(-7)} />
          </View>
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* ── 혈당 입력 모달 ── */}
      <Modal visible={showBSModal} animationType="slide" transparent>
        <View style={bsm.overlay}>
          <View style={bsm.sheet}>
            <Text style={bsm.title}>💧 공복혈당 입력</Text>
            <Text style={bsm.sub}>기상 직후, 식사 전 측정값</Text>
            <TextInput
              style={bsm.input}
              value={bsInput} onChangeText={setBsInput}
              keyboardType="numeric" placeholder="예: 95"
              placeholderTextColor={COLORS.textDisabled} maxLength={3} autoFocus
            />
            <Text style={bsm.unit}>mg/dL</Text>
            {bsInput.length > 0 && !isNaN(parseInt(bsInput)) && (() => {
              const v = parseInt(bsInput);
              const st = getBSStatus(v);
              const col = BS_STATUS_COLOR[st];
              return (
                <View style={[bsm.live, { backgroundColor: col + '18' }]}>
                  <Text style={{ color: col, fontWeight: '700', fontSize: FONTS.sm }}>{getBSStatusLabel(st)}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>
                    {v < 100 ? '👍 정상 범위예요!' : v < 126 ? '⚠️ 식단에 주의하세요' : '🚨 의사 상담을 권장해요'}
                  </Text>
                </View>
              );
            })()}
            <View style={bsm.btns}>
              <TouchableOpacity style={bsm.cancel} onPress={() => setShowBSModal(false)}>
                <Text style={bsm.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={bsm.confirm} onPress={handleSaveBS}>
                <Text style={bsm.confirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 생년월일 입력 모달 ── */}
      <Modal visible={showBirthModal} animationType="slide" transparent>
        <View style={bsm.overlay}>
          <View style={bsm.sheet}>
            <Text style={bsm.title}>🎂 생년월일 입력</Text>
            <Text style={bsm.sub}>사주 기반 맞춤 운세를 위해 필요해요</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[bsm.input, { flex: 2, fontSize: FONTS.xl }]}
                value={birthYear} onChangeText={setBirthYear}
                keyboardType="numeric" placeholder="1990" placeholderTextColor={COLORS.textDisabled}
                maxLength={4} autoFocus
              />
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.md, fontWeight: '600' }}>년</Text>
              <TextInput
                style={[bsm.input, { flex: 1, fontSize: FONTS.xl }]}
                value={birthMonth} onChangeText={setBirthMonth}
                keyboardType="numeric" placeholder="05" placeholderTextColor={COLORS.textDisabled}
                maxLength={2}
              />
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.md, fontWeight: '600' }}>월</Text>
              <TextInput
                style={[bsm.input, { flex: 1, fontSize: FONTS.xl }]}
                value={birthDay} onChangeText={setBirthDay}
                keyboardType="numeric" placeholder="15" placeholderTextColor={COLORS.textDisabled}
                maxLength={2}
              />
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.md, fontWeight: '600' }}>일</Text>
            </View>
            <View style={bsm.btns}>
              <TouchableOpacity style={bsm.cancel} onPress={() => setShowBirthModal(false)}>
                <Text style={bsm.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={bsm.confirm} onPress={handleSaveBirth}>
                <Text style={bsm.confirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 프로필 편집 모달 ── */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={bsm.overlay}>
          <View style={bsm.sheet}>
            <Text style={bsm.title}>⚙️ 프로필 편집</Text>
            <Text style={bsm.sub}>이름, 체중, 목표 칼로리를 수정할 수 있어요</Text>
            <View style={{ gap: 10, marginBottom: SPACING.md }}>
              <View>
                <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs, marginBottom: 4 }}>이름</Text>
                <TextInput
                  style={[bsm.input, { fontSize: FONTS.lg, paddingVertical: 8 }]}
                  value={editName} onChangeText={setEditName}
                  placeholder="이름 입력" placeholderTextColor={COLORS.textDisabled}
                  autoCapitalize="none" returnKeyType="next"
                />
              </View>
              <View>
                <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs, marginBottom: 4 }}>체중 (kg)</Text>
                <TextInput
                  style={[bsm.input, { fontSize: FONTS.lg, paddingVertical: 8 }]}
                  value={editWeight} onChangeText={setEditWeight}
                  keyboardType="decimal-pad" placeholder="70.0" placeholderTextColor={COLORS.textDisabled}
                  returnKeyType="next"
                />
              </View>
              <View>
                <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs, marginBottom: 4 }}>목표 칼로리 (kcal)</Text>
                <TextInput
                  style={[bsm.input, { fontSize: FONTS.lg, paddingVertical: 8 }]}
                  value={editTargetCal} onChangeText={setEditTargetCal}
                  keyboardType="numeric" placeholder="2000" placeholderTextColor={COLORS.textDisabled}
                  returnKeyType="done"
                />
              </View>
            </View>
            <View style={bsm.btns}>
              <TouchableOpacity style={bsm.cancel} onPress={() => setShowProfileModal(false)}>
                <Text style={bsm.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={bsm.confirm} onPress={handleSaveProfile}>
                <Text style={bsm.confirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotifModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />

      {/* 물 목표량 설정 모달 */}
      <Modal visible={showWaterGoalModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900', marginBottom: 4 }}>💧 물 목표량 설정</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md }}>하루 목표 물 섭취량을 ml로 입력하세요 (500~5000ml)</Text>
            <TextInput
              style={{ backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 40, fontWeight: '900', padding: SPACING.md, textAlign: 'center', fontFamily: 'monospace', marginBottom: 4 }}
              value={waterGoalInput}
              onChangeText={setWaterGoalInput}
              keyboardType="numeric"
              placeholder="1500"
              placeholderTextColor={COLORS.textDisabled}
              autoFocus
            />
            <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center', marginBottom: SPACING.md }}>ml</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' }} onPress={() => setShowWaterGoalModal(false)}>
                <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 2, backgroundColor: COLORS.blue, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' }} onPress={handleSaveWaterGoal}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: FONTS.sm }}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────

function CalCell({ label, value, unit, color, sign = '' }: { label: string; value: number; unit: string; color: string; sign?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color, fontSize: FONTS.lg, fontWeight: '900', fontFamily: 'monospace' }}>
        {sign}{value}
      </Text>
      <Text style={{ color: COLORS.textDisabled, fontSize: FONTS.xxs }}>{unit}</Text>
    </View>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>{label}</Text>
      <Text style={{ color, fontSize: FONTS.sm, fontWeight: '900' }}>{value}g</Text>
      <View style={{ width: '80%', height: 4, backgroundColor: COLORS.bgHighlight, borderRadius: 2, marginTop: 3 }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function BSSparkline({ entries }: { entries: any[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const BAR_H = 32;
  const BAR_W = 8;
  const maxVal = 180;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10, height: BAR_H + 18 }}>
      {sorted.map(e => {
        const col = BS_STATUS_COLOR[getBSStatus(e.value)];
        const h = Math.max(4, (e.value / maxVal) * BAR_H);
        return (
          <View key={e.date} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: col, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>{e.value}</Text>
            <View style={{ width: BAR_W, height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: BAR_W / 2 }}>
              <View style={{ width: BAR_W, height: h, backgroundColor: col, borderRadius: BAR_W / 2, opacity: 0.9 }} />
            </View>
            <Text style={{ color: COLORS.textSub, fontSize: 11, marginTop: 2 }}>{e.date.slice(5)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ScoreSparkline({ logs }: { logs: any[] }) {
  const BAR_H = 56;
  const BAR_W = 10;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, height: BAR_H + 38 }}>
      {logs.map((log, i) => {
        const rank = getRank(log.conditionScore);
        const h = Math.max(6, (log.conditionScore / 100) * BAR_H);
        const dateStr = (log.date ?? '').slice(5);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = log.date ? dayNames[new Date(log.date).getDay()] : '';
        const isWeekend = log.date ? (new Date(log.date).getDay() === 0 || new Date(log.date).getDay() === 6) : false;
        return (
          <View key={log.date ?? i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: rank.color, fontSize: 11, fontWeight: '900', marginBottom: 3, fontFamily: 'monospace' }}>
              {log.conditionScore}
            </Text>
            {/* 배경 트랙 */}
            <View style={{ width: BAR_W, height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: BAR_W / 2 }}>
              <View style={{ width: BAR_W, height: h, backgroundColor: rank.color, borderRadius: BAR_W / 2, opacity: 0.9 }} />
            </View>
            <Text style={{ color: isWeekend ? COLORS.purple : COLORS.textSub, fontSize: 11, marginTop: 4 }}>{dayName}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1 }}>{dateStr}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingTop: SPACING.sm },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  appTitle: { color: COLORS.purple, fontSize: FONTS.md, fontWeight: '900', letterSpacing: 2 },
  dateText: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakChip: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
  },
  streakText: { color: COLORS.gold, fontSize: FONTS.xs, fontWeight: '900' },
  notifBtn: { padding: 4 },
  notifIcon: { fontSize: 16 },

  // 캐릭터 카드
  characterCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  characterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    backgroundColor: COLORS.bgHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarEmoji: { fontSize: 28 },
  charName: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '900', marginBottom: 4 },
  rankBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2 },
  rankText: { fontSize: FONTS.xxs, fontWeight: '700' },
  characterRight: { alignItems: 'center' },
  scoreNum: { fontSize: 32, fontWeight: '900', fontFamily: 'monospace', lineHeight: 36 },
  scoreLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, letterSpacing: 2 },
  weightChip: { color: COLORS.textSub, fontSize: FONTS.xxs, fontWeight: '700', marginTop: 4 },

  // 공통 카드
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  link: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '600' },

  // 면역력 / 질병
  illnessBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.red + '15', borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.red + '44',
  },
  illnessBannerEmoji: { fontSize: 26 },
  illnessBannerTitle: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '800' },
  illnessBannerSub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },
  immunityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  immunityLeft: { flex: 1 },
  immunityLabel: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700', marginBottom: 5 },
  immunityTrack: { height: 6, backgroundColor: COLORS.bgHighlight, borderRadius: 3, overflow: 'hidden' },
  immunityFill: { height: '100%', borderRadius: 3 },
  immunityScore: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', minWidth: 40, textAlign: 'right' },

  // 빈 스탯 카드
  emptyCard: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 6 },
  emptyCardIcon: { fontSize: 36 },
  emptyStatText: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', textAlign: 'center' },
  emptyStatSub: { color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center' },
  startBtn: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 8, marginTop: 4 },
  startBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },

  // 퀘스트
  questBar: { height: 5, backgroundColor: COLORS.bgHighlight, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  questBarFill: { height: '100%', borderRadius: 2 },
  questProgressPill: { backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  questRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub, gap: 10 },
  questIcon: { fontSize: 14 },
  questLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.sm },
  questDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  questArrow: { color: COLORS.purple, fontWeight: '700' },
  questCount: { fontSize: FONTS.xs, fontWeight: '900' },
  questSub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 1 },
  questXpBadge: { backgroundColor: COLORS.purple + '18', borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  questXpText: { color: COLORS.purple, fontSize: FONTS.xxs, fontWeight: '900' },

  // 칼로리
  calTriple: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  calSep: { width: 1, height: 36, backgroundColor: COLORS.border },
  calBar: { height: 7, backgroundColor: COLORS.bgHighlight, borderRadius: 4, marginBottom: 5, overflow: 'hidden' },
  calBarFill: { height: '100%', borderRadius: 3 },
  calBarLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  macroRow: { flexDirection: 'row', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.borderSub },

  // 혈당
  bsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bsValue: { fontSize: 36, fontWeight: '900', fontFamily: 'monospace' },
  bsUnit: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  bsStatusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  bsStatusText: { fontSize: FONTS.xxs, fontWeight: '700' },
  bsAvg: { flex: 1, textAlign: 'right', color: COLORS.textMuted, fontSize: FONTS.xs },
  bsTrend: { fontSize: FONTS.xs, fontWeight: '700' },
  emptyAction: { color: COLORS.purple, fontSize: FONTS.sm, fontWeight: '600' },

  // 생년월일 입력
  birthInputBtn: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  birthInputBtnText: { fontSize: FONTS.xxs, fontWeight: '700' },
  birthHint: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: 8, fontStyle: 'italic' },

  // XP 카드
  xpCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1 },
  xpCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  xpLevelBig: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  xpTitleBig: { fontSize: FONTS.lg, fontWeight: '900', letterSpacing: 0.5 },
  xpTodayBadge: { backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  xpTodayText: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '900' },
  xpRemain: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  xpTrack: { height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  xpFill: { height: '100%', borderRadius: 4 },
  xpBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpCurrent: { color: COLORS.textSub, fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },
  xpNeeded: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace' },
  // Legacy XP bar (unused but kept to avoid ref errors)
  xpBar: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1 },
  xpTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  xpLevel: { color: COLORS.textSub, fontSize: FONTS.xxs, fontWeight: '900' },
  xpTitle: { color: COLORS.textMuted, fontWeight: '400' },
  xpNext: { color: COLORS.textMuted, fontSize: FONTS.xxs },

  // 물 섭취
  waterTotal: { fontSize: FONTS.xs, fontWeight: '700', fontFamily: 'monospace' },
  waterBar: { height: 6, backgroundColor: COLORS.bgHighlight, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  waterBarFill: { height: '100%', borderRadius: 3 },
  cupGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cupBtn: { flex: 1, alignItems: 'center' },
  cupEmoji: { fontSize: 22 },
  waterAdjBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  waterAdjBtnAdd: { backgroundColor: COLORS.blue + '15', borderRadius: RADIUS.sm },
  waterAdjText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },

  // 업적
  achieveCount: { color: COLORS.textMuted, fontWeight: '400', fontSize: FONTS.xs },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 },
  achieveItem: { alignItems: 'center', width: '18%', gap: 3 },
  achieveLocked: {},
  achieveEmoji: { fontSize: 24 },
  achieveName: { color: COLORS.textSub, fontSize: FONTS.xxs, textAlign: 'center' },
  achieveDone: { color: COLORS.gold, fontSize: FONTS.xxs, fontWeight: '900' },
  achieveProgressList: { gap: 8, marginTop: 4 },
  achieveProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  achieveProgressLabel: { color: COLORS.textSub, fontSize: FONTS.xxs, width: 100 },
  achieveProgressTrack: { flex: 1, height: 6, backgroundColor: COLORS.bgHighlight, borderRadius: 3, overflow: 'hidden' },
  achieveProgressFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 3 },
  achieveProgressNum: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', width: 32, textAlign: 'right' },

  // 운세 (사주)
  sajuRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sajuChip: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  sajuChipText: { color: COLORS.textSub, fontSize: FONTS.xxs, fontWeight: '700' },
  sajuArrow: { color: COLORS.textMuted, fontSize: FONTS.sm },
  relationBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10, alignSelf: 'flex-start' },
  relationText: { fontSize: FONTS.xs, fontWeight: '900', letterSpacing: 0.5 },
  fortuneText: { color: COLORS.text, fontSize: FONTS.sm, lineHeight: 22, marginBottom: 10 },
  adviceRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.sm, padding: 8, marginBottom: 10 },
  adviceIcon: { fontSize: 13 },
  adviceText: { flex: 1, color: COLORS.textSub, fontSize: FONTS.xs, lineHeight: 18 },
  luckyLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  luckyPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  luckyPillText: { fontSize: FONTS.xxs, fontWeight: '700' },
});

const bsm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900' },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md },
  input: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 52, fontWeight: '900', paddingHorizontal: SPACING.md, paddingVertical: 10, textAlign: 'center', fontFamily: 'monospace' },
  unit: { color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center', marginTop: 4 },
  live: { borderRadius: RADIUS.sm, padding: 10, alignItems: 'center', marginTop: 8, gap: 2 },
  btns: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  cancel: { flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  confirm: { flex: 2, backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },
});
