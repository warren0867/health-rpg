import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyChest from '../components/DailyChest';
import DailyRings from '../components/DailyRings';
import HeroStage from '../components/HeroStage';
import GachaModal from '../components/GachaModal';
import BrickBreakerModal from '../components/BrickBreakerModal';
import MiniGameModal from '../components/MiniGameModal';
import PermanentStatPanel from '../components/PermanentStatPanel';
import SkillPanel from '../components/SkillPanel';
import QuestList, { Quest } from '../components/QuestList';
import StatGrid from '../components/StatGrid';
import TopStatusBar from '../components/TopStatusBar';
import WeeklyBossCard from '../components/WeeklyBossCard';
import { COLORS, FONTS, RADIUS, SPACING, getRank } from '../constants/theme';
import { useRefresh } from '../context/RefreshContext';
import { EMPTY_PERMANENT_STATS, IllnessEntry, ILLNESS_LABELS, PermanentStats, UserProfile } from '../types';
import { calcMacroGoal } from '../utils/calorieCalculator';
import { checkAchievements, getLevelTitle, getXPProgress } from '../utils/levelSystem';
import { calcExerciseCalories } from '../utils/scoreCalculator';
import {
  addWater, addXP, calcImmunity, generateId, getAllDailyLogs, getCurrentIllness,
  getDailyLog, getFoodEntriesByDate, getLatestWeight, getMorningBS,
  getPermanentStats, getRecentDailyLogs, getRecentMorningBS, getStreak,
  getTodayKey, getUnlockedAchievementIds, getUnlockedAchievements, getUserProfile, getUserXP,
  getWaterLog, getWaterStreak, recalcAndSavePermanentStats, saveMorningBS,
  saveUserProfile, sumFoodEntries, unlockAchievement, updateChallengeProgress,
} from '../utils/storage';
import { RecentCondition, calcRecentCondition } from '../utils/permanentStats';
import { StatusEffect, calcStatusEffects } from '../utils/statusEffects';
import { WeeklyBossState, claimBossReward, updateWeeklyBoss } from '../utils/weeklyBoss';
import { GachaBonus, GachaInventory, ACHIEVEMENT_DEFS, UnlockedAchievement } from '../types';
import { addGold, getGachaInventory } from '../utils/gacha';
import { NotifSettings, getNotifSettings, saveNotifSettings, scheduleAllNotifications, requestPermissions } from '../utils/notifications';
import { ChestReward, isChestClaimedToday } from '../utils/dailyChest';

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
  const [conditionInfo, setConditionInfo] = useState<RecentCondition | null>(null);
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([]);
  const [bossState, setBossState] = useState<WeeklyBossState | null>(null);
  const [gachaInv, setGachaInv] = useState<GachaInventory | null>(null);
  const [showGacha, setShowGacha] = useState(false);
  const [gachaInitialTab, setGachaInitialTab] = useState<'pull' | 'inventory' | 'bonus'>('pull');
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showBrickBreaker, setShowBrickBreaker] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(true);
  const [charTab, setCharTab] = useState<'stats' | 'skills' | 'today'>('stats');

  // 모달
  const [recentAchievements, setRecentAchievements] = useState<UnlockedAchievement[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
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
    setConditionInfo(calcRecentCondition(recent));
    setStatusEffects(calcStatusEffects(recent));
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
    const boss = await updateWeeklyBoss(allLogs);
    setBossState(boss);
    const gacha = await getGachaInventory();
    setGachaInv(gacha);
    const allAch = await getUnlockedAchievements();
    setRecentAchievements([...allAch].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)).slice(0, 3));
    setChestClaimed(await isChestClaimedToday());

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

  const handleClaimBossReward = async () => {
    const { xp, gold } = await claimBossReward(addXP, addGold);
    if (xp > 0) {
      Alert.alert('보스 처치!', `보상 획득!\n⚔️ +${xp} XP\n🪙 +${gold} 골드\n\n골드로 마법 뽑기를 해보세요!`);
      load();
    }
  };

  const handleChestClaimed = async (r: ChestReward) => {
    await addGold(r.gold);
    const xp = await addXP(r.xp);
    setChestClaimed(true);
    setXpProgress(getXPProgress(xp.totalXP));
    setGachaInv(await getGachaInventory());
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
      action: () => navigation.navigate('Input'), xp: 50, gold: 50 },
    { label: '식단 기록', sub: '오늘 먹은 것 기록', done: foodSummary.calories > 0,
      action: () => navigation.navigate('Calorie'), xp: 20, gold: 20 },
    { label: '공복 혈당 측정', sub: '기상 후 공복혈당', done: !!morningBS,
      action: () => setShowBSModal(true), xp: 10, gold: 15 },
    { label: '운동 기록', sub: '오늘의 운동', done: todayHasExercise,
      action: () => navigation.navigate('Input'), xp: 25, gold: 25 },
    { label: `물 ${(WATER_GOAL/1000).toFixed(1)}L 마시기`, sub: `${waterMl} / ${WATER_GOAL} ml`,
      done: waterMl >= WATER_GOAL, action: handleAddWater, xp: 15, gold: 15 },
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
      {/* 배경 비네트 (전체 화면 위 살짝 톤 다운) */}
      <View style={s.bgVignetteTop} pointerEvents="none" />
      <View style={s.bgVignetteBot} pointerEvents="none" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 상단 상태 바 (날짜·스트릭 / 골드·레벨·알림) ── */}
        <TopStatusBar
          gold={gachaInv?.gold ?? 0}
          streak={streak}
          level={xpProgress?.level ?? 1}
          dateLabel={getDateLabel(today)}
          onPressNotif={async () => { const ns = await getNotifSettings(); setNotifSettings(ns); setShowNotifModal(true); }}
          onPressGold={() => { setGachaInitialTab('pull'); setShowGacha(true); }}
        />

        {/* ── 인사 ── */}
        <Text style={s.greetingMain}>
          {greeting}, {profile?.name ?? '용사'}님
        </Text>

        {/* ── 캐릭터 히어로 스테이지 ── */}
        <HeroStage
          name={profile?.name ?? '용사'}
          score={score}
          rank={rank as any}
          level={xpProgress?.level ?? 1}
          levelTitle={getLevelTitle(xpProgress?.level ?? 1)}
          xpCurrent={xpProgress?.current ?? 0}
          xpNeeded={xpProgress?.needed ?? 100}
          todayXp={todayXP}
          permStats={permStats}
          conditionInfo={conditionInfo ?? undefined}
          statusEffects={statusEffects}
          streak={streak}
          questsLeft={quests.filter(q => !q.done).length}
          hasIllness={!!currentIllness}
          onEditName={() => {
            setEditName(profile?.name ?? '');
            setEditWeight(String(profile?.weightKg ?? ''));
            setEditTargetCal(String(profile?.targetCalories ?? ''));
            setShowProfileModal(true);
          }}
        />

        {/* ── 일일 보상 상자 (하루 한 번) ── */}
        {!chestClaimed && (
          <DailyChest streak={streak} onClaimed={handleChestClaimed} />
        )}

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

        {/* ── 오늘의 퀘스트 (메인 루프 — 최상단 배치) ── */}
        <QuestList quests={quests} />

        {/* ── 데일리 링 ── */}
        <DailyRings
          calorie={{ current: foodSummary.calories, goal: targetCal }}
          water={{ currentMl: waterMl, goalMl: WATER_GOAL }}
          quest={{ done: quests.filter(q => q.done).length, total: quests.length }}
        />

        {/* ── 주간 보스전 ── */}
        {bossState && (
          <>
            <SectionLabel>주간 보스전</SectionLabel>
            <WeeklyBossCard
              bossState={bossState}
              onClaimReward={handleClaimBossReward}
            />
          </>
        )}

        {/* ── 내 캐릭터 (능력치 / 스킬 / 오늘 — 탭으로 묶음) ── */}
        <SectionLabel>내 캐릭터</SectionLabel>
        <View style={s.segmentRow}>
          {([
            { key: 'stats',  label: '능력치' },
            { key: 'skills', label: '스킬' },
            { key: 'today',  label: '오늘' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.segmentBtn, charTab === t.key && s.segmentBtnActive]}
              onPress={() => setCharTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.segmentText, charTab === t.key && s.segmentTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {charTab === 'stats' && (
          <PermanentStatPanel stats={permStats} activeBonuses={gachaInv?.activeBonuses ?? []} />
        )}
        {charTab === 'skills' && (
          <SkillPanel level={xpProgress?.level ?? 1} />
        )}
        {charTab === 'today' && (
          stats ? (
            <StatGrid stats={stats} />
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
          )
        )}

        {/* ── 최근 업적 ── */}
        {recentAchievements.length > 0 && (
          <>
            <SectionLabel>최근 업적</SectionLabel>
            <View style={s.achRow}>
              {recentAchievements.map(ua => {
                const def = ACHIEVEMENT_DEFS[ua.id as keyof typeof ACHIEVEMENT_DEFS];
                if (!def) return null;
                return (
                  <View key={ua.id} style={s.achCard}>
                    <Text style={s.achEmoji}>{def.emoji}</Text>
                    <Text style={s.achName}>{def.name}</Text>
                    <Text style={s.achDesc}>{def.desc}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── 빠른 작업 ── */}
        <SectionLabel>빠른 작업</SectionLabel>
        <View style={s.quickRow}>
          {([
            { icon: 'create-outline',     label: '체크인', color: COLORS.amber,   press: () => navigation.navigate('Input') },
            { icon: 'restaurant-outline', label: '식단',   color: COLORS.primary, press: () => navigation.navigate('Calorie') },
            { icon: 'water-outline',      label: '혈당',   color: COLORS.info,    press: () => navigation.navigate('BloodSugar') },
            { icon: 'body-outline',       label: '인바디', color: COLORS.good,    press: () => navigation.navigate('InBody') },
            { icon: 'bar-chart-outline',  label: '기록',   color: COLORS.purple,  press: () => navigation.navigate('History') },
          ] as const).map(({ icon, label, color, press }) => (
            <TouchableOpacity key={label} style={s.quickItem} onPress={press} activeOpacity={0.6}>
              <View style={[s.quickIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={s.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 게임 ── */}
        <SectionLabel>게임</SectionLabel>
        <AppListSection>
          <AppListRow icon="skull-outline" color="#EF4444" title="보스 격파" sub="주간 보스에 도전" onPress={() => setShowMiniGame(true)} />
          <AppListRow icon="game-controller-outline" color={COLORS.primary} title="벽돌깨기" sub="아케이드 미니게임" onPress={() => setShowBrickBreaker(true)} last />
        </AppListSection>

        {/* ── 아이템 & AI ── */}
        <SectionLabel>아이템 & AI</SectionLabel>
        <AppListSection>
          <AppListRow icon="flask-outline" color="#A78BFA" title="마법 뽑기" sub="주문서·강화 아이템" badge={`${gachaInv?.gold ?? 0}G`} onPress={() => { setGachaInitialTab('pull'); setShowGacha(true); }} />
          <AppListRow icon="bag-outline" color="#34D399" title="인벤토리" sub="보유 주문서" badge={`주문서 ${gachaInv?.scrolls?.length ?? 0}개`} onPress={() => { setGachaInitialTab('inventory'); setShowGacha(true); }} />
          <AppListRow icon="star-outline" color={COLORS.amber} title="활성 버프" sub="능력치 강화 버프" badge={gachaInv?.activeBonuses?.length ? `${gachaInv.activeBonuses.length}개` : ''} onPress={() => { setGachaInitialTab('bonus'); setShowGacha(true); }} />
          <AppListRow icon="chatbubble-ellipses-outline" color="#60A5FA" title="AI 코치" sub="건강 조언 & 채팅" onPress={() => navigation.navigate('Coach')} last />
        </AppListSection>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 가챠 모달 ── */}
      <GachaModal
        visible={showGacha}
        onClose={() => setShowGacha(false)}
        addXpFn={addXP}
        onInventoryChanged={() => { getGachaInventory().then(setGachaInv); }}
        initialTab={gachaInitialTab}
        permStats={permStats}
      />

      {/* ── 벽돌깨기 모달 ── */}
      <BrickBreakerModal
        visible={showBrickBreaker}
        onClose={() => setShowBrickBreaker(false)}
        addXpFn={addXP}
        onGoldEarned={() => { getGachaInventory().then(setGachaInv); }}
      />

      {/* ── 미니게임 모달 ── */}
      <MiniGameModal
        visible={showMiniGame}
        onClose={() => setShowMiniGame(false)}
        bossState={bossState}
        addXpFn={addXP}
        onGoldEarned={() => { getGachaInventory().then(setGachaInv); }}
      />

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
      {/* ── 알림 설정 모달 ── */}
      {notifSettings && (
        <Modal visible={showNotifModal} animationType="slide" transparent onRequestClose={() => setShowNotifModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '85%' }]}>
              <Text style={s.modalTitle}>알림 설정</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <NotifToggleRow
                  label="알림 전체 켜기"
                  value={notifSettings.enabled}
                  onToggle={v => setNotifSettings(prev => prev ? { ...prev, enabled: v } : prev)}
                />
                {notifSettings.enabled && (
                  <>
                    <Text style={s.notifSection}>아침</Text>
                    <NotifToggleRow
                      label="공복혈당 알림"
                      sub={`${notifSettings.morningBSHour}:00`}
                      value={notifSettings.morningBS}
                      onToggle={v => setNotifSettings(prev => prev ? { ...prev, morningBS: v } : prev)}
                    />
                    <NotifToggleRow
                      label="아침 식단 기록"
                      sub={`${notifSettings.breakfastLogHour}:00`}
                      value={notifSettings.breakfastLog}
                      onToggle={v => setNotifSettings(prev => prev ? { ...prev, breakfastLog: v } : prev)}
                    />
                    <Text style={s.notifSection}>점심</Text>
                    <NotifToggleRow
                      label="점심 식단 기록"
                      sub="12:30"
                      value={notifSettings.mealLog}
                      onToggle={v => setNotifSettings(prev => prev ? { ...prev, mealLog: v } : prev)}
                    />
                    <Text style={s.notifSection}>저녁</Text>
                    <NotifToggleRow
                      label="저녁 식단 기록"
                      sub={`${notifSettings.dinnerLogHour}:00`}
                      value={notifSettings.dinnerLog}
                      onToggle={v => setNotifSettings(prev => prev ? { ...prev, dinnerLog: v } : prev)}
                    />
                    <NotifToggleRow
                      label="저녁 종합 기록"
                      sub={`${notifSettings.eveningLogHour}:00`}
                      value={notifSettings.eveningLog}
                      onToggle={v => setNotifSettings(prev => prev ? { ...prev, eveningLog: v } : prev)}
                    />
                  </>
                )}
              </ScrollView>
              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.modalBtnGhost} onPress={() => setShowNotifModal(false)}>
                  <Text style={s.modalBtnGhostText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.modalBtnPrimary}
                  onPress={async () => {
                    if (!notifSettings) return;
                    if (notifSettings.enabled) {
                      const granted = await requestPermissions();
                      if (!granted) { Alert.alert('알림 권한', '설정에서 알림 권한을 허용해주세요'); return; }
                    }
                    await saveNotifSettings(notifSettings);
                    await scheduleAllNotifications(notifSettings);
                    setShowNotifModal(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <Text style={s.modalBtnPrimaryText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── 작은 헬퍼 컴포넌트 ──────────────────────────────
function NotifToggleRow({ label, sub, value, onToggle }: { label: string; sub?: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }} onPress={() => onToggle(!value)} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 14 }}>{label}</Text>
        {sub && <Text style={{ color: COLORS.textSub, fontSize: 12, marginTop: 2 }}>{sub}</Text>}
      </View>
      <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: value ? COLORS.primary : COLORS.border, justifyContent: 'center', paddingHorizontal: 2 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }: { children: React.ReactNode; accent?: string }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

function AppListSection({ children }: { children: React.ReactNode }) {
  return <View style={s.listSection}>{children}</View>;
}

function AppListRow({ icon, color, title, sub, badge, last, onPress }: {
  icon: any; color: string; title: string;
  sub?: string; badge?: string; last?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.listRow, last && s.listRowLast]} onPress={onPress} activeOpacity={0.5}>
      <View style={[s.listIconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={s.listText}>
        <Text style={s.listTitle}>{title}</Text>
        {sub && <Text style={s.listSub}>{sub}</Text>}
      </View>
      {!!badge && <Text style={s.listBadge}>{badge}</Text>}
      <Ionicons name="chevron-forward" size={14} color={COLORS.textDisabled} />
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
  scroll: { paddingTop: 0, paddingBottom: SPACING.xl },

  // (배경 비네트는 미니멀 룩을 위해 제거)
  bgVignetteTop: { display: 'none' },
  bgVignetteBot: { display: 'none' },

  // 인사
  greetingMain: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    paddingHorizontal: SPACING.md,
    paddingTop: 6,
    paddingBottom: SPACING.md,
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

  // 내 캐릭터 세그먼트 탭
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm + 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: COLORS.bgHighlight },
  segmentText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
  segmentTextActive: { color: COLORS.text, fontWeight: '800' },

  // 미니멀 — 단순 텍스트 라벨
  sectionLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSub,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg - 4,
    paddingBottom: SPACING.sm + 2,
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

  // 미니멀 빠른 작업 — 깔끔한 5칸
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: 6,
    justifyContent: 'space-between',
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  quickIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    color: COLORS.textSub,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // 미니멀 리스트 카드
  listSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSub,
  },
  listRowLast: { borderBottomWidth: 0 },
  listIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  listText: { flex: 1 },
  listTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600', letterSpacing: -0.1 },
  listSub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },
  listBadge: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginRight: 2,
  },


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

  // 업적
  achRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  achCard: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  achEmoji: { fontSize: 22, marginBottom: 4 },
  achName: { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 2 },
  achDesc: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 13 },

  // 알림 설정
  notifSection: {
    fontSize: FONTS.xs, fontWeight: '700', color: COLORS.textMuted,
    marginTop: 14, marginBottom: 4, letterSpacing: 0.5,
  },
});
