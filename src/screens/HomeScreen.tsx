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
import { UserProfile } from '../types';
import { getTodayFortune } from '../utils/feedback';
import { calcGaugeData, calcMacroGoal } from '../utils/calorieCalculator';
import { BS_STATUS_COLOR, getBSStatus, getBSStatusLabel, calcExerciseCalories } from '../utils/scoreCalculator';
import {
  calcAvgBS, generateId, getDailyLog, getFoodEntriesByDate,
  getMorningBS, getRecentDailyLogs, getRecentMorningBS, getStreak,
  getTodayKey, getUserProfile, saveMorningBS, sumFoodEntries, getBSTrend,
} from '../utils/storage';
import {
  getNotifSettings, saveNotifSettings, scheduleAllNotifications,
  cancelAllNotifications, requestPermissions, NotifSettings,
} from '../utils/notifications';

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

// ─── RPG 수정 바 (큰 버전) ────────────────────────────────
function HeroBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const pct = Math.min(100, value);
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600' }}>{icon} {label}</Text>
        <Text style={{ color, fontSize: FONTS.xxs, fontWeight: '900', fontFamily: 'monospace' }}>{value} / 100</Text>
      </View>
      <View style={{ height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── 알림 설정 모달 ───────────────────────────────────────
function NotifModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<NotifSettings>({
    enabled: false, morningBS: true, morningBSHour: 7,
    mealLog: true, eveningLog: true, eveningLogHour: 21,
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
        <View style={nm.sheet}>
          <Text style={nm.title}>🔔 알림 설정</Text>
          <Text style={nm.sub}>퀘스트 알림으로 기록을 잊지 마세요</Text>

          <Row label="알림 활성화" value={settings.enabled} onChange={v => toggle('enabled', v)} />
          {settings.enabled && (
            <>
              <Row label={`⏰ 공복혈당 알림 (${settings.morningBSHour}시)`} value={settings.morningBS} onChange={v => toggle('morningBS', v)} />
              <Row label="🍱 점심 식단 알림 (12:30)" value={settings.mealLog} onChange={v => toggle('mealLog', v)} />
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
  const [bsInput, setBsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [exerciseCalToday, setExerciseCalToday] = useState(0);
  const [fortune, setFortune] = useState(getTodayFortune(today));
  const [todayLog, setTodayLog] = useState<any>(null);

  const load = useCallback(async () => {
    const [p, log, foods, mbs, recentMbs, recent, str] = await Promise.all([
      getUserProfile(), getDailyLog(today), getFoodEntriesByDate(today),
      getMorningBS(today), getRecentMorningBS(7), getRecentDailyLogs(7), getStreak(),
    ]);
    setProfile(p);
    setTodayLog(log);
    setScore(log?.conditionScore ?? null);
    setStats(log?.stats ?? null);
    setFoodSummary(sumFoodEntries(foods));
    setMorningBS(mbs);
    setRecentBS(recentMbs);
    setRecentLogs([...recent].reverse());
    setStreak(str);
    setFortune(getTodayFortune(today, p?.birthDate));
    setExerciseCalToday(log?.exerciseCalories ?? (log?.exercise ? calcExerciseCalories(log.exercise, p?.weightKg ?? 70) : 0));
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

  const rank = score !== null ? getRank(score) : null;
  const avatar = score !== null ? getAvatar(score) : '🧑‍🌾';
  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = profile ? calcMacroGoal(targetCal) : { carbs: 200, protein: 150, fat: 67 };
  const netCalories = foodSummary.calories - exerciseCalToday;
  const bsTrend = getBSTrend(recentBS);
  const avgBS = calcAvgBS(recentBS);

  // 오늘의 퀘스트 체크
  const quests = [
    { label: '공복혈당 기록', done: !!morningBS, screen: 'Home', action: () => setShowBSModal(true) },
    { label: '식단 입력', done: foodSummary.calories > 0, screen: 'Calorie', action: () => navigation.navigate('Calorie') },
    { label: '오늘 기록 완료', done: !!todayLog, screen: 'Input', action: () => navigation.navigate('Input') },
  ];
  const questDone = quests.filter(q => q.done).length;

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
                <Text style={s.streakText}>🔥{streak}</Text>
              </View>
            )}
            <TouchableOpacity style={s.notifBtn} onPress={() => setShowNotifModal(true)}>
              <Text style={s.notifIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 캐릭터 카드 ── */}
        <View style={s.characterCard}>
          <View style={s.characterLeft}>
            <View style={[s.avatarBox, { borderColor: rank?.color ?? COLORS.textMuted }]}>
              <Text style={s.avatarEmoji}>{avatar}</Text>
            </View>
            <View>
              <Text style={s.charName}>{profile?.name ?? '용사'}</Text>
              <View style={[s.rankBadge, { backgroundColor: (rank?.glow ?? COLORS.purpleGlow) }]}>
                <Text style={[s.rankText, { color: rank?.color ?? COLORS.textMuted }]}>
                  {rank ? `${rank.rank} · ${rank.label}` : '기록 없음'}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.characterRight}>
            <Text style={[s.scoreNum, { color: rank?.color ?? COLORS.textMuted }]}>
              {score ?? '--'}
            </Text>
            <Text style={s.scoreLabel}>SCORE</Text>
          </View>
        </View>

        {/* ── HP/MP 바 ── */}
        {stats && (
          <View style={s.card}>
            <HeroBar label="HP  체력" value={stats.hp}               color={COLORS.hp}  icon="❤️" />
            <HeroBar label="MP  혈당제어" value={stats.bloodSugarControl} color={COLORS.mp}  icon="💧" />
            <View style={{ height: 6 }} />
            <StatBar label="힘"   abbr="STR" value={stats.stamina}  color={COLORS.str} />
            <StatBar label="생명" abbr="VIT" value={stats.recovery} color={COLORS.vit} />
            <StatBar label="민첩" abbr="AGI" value={stats.condition} color={COLORS.agi} />
            <StatBar label="지력" abbr="INT" value={stats.bloodSugarControl} color={COLORS.int} />
          </View>
        )}
        {!stats && (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Input')}>
            <Text style={s.emptyStatText}>⚔️ 오늘의 퀘스트를 시작하세요{'\n'}기록하면 캐릭터 스탯이 올라가요!</Text>
          </TouchableOpacity>
        )}

        {/* ── 오늘의 퀘스트 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>📋 오늘의 퀘스트</Text>
            <Text style={[s.questCount, { color: questDone === 3 ? COLORS.gold : COLORS.textMuted }]}>
              {questDone}/3 완료
            </Text>
          </View>
          {quests.map((q, i) => (
            <TouchableOpacity key={i} style={s.questRow} onPress={q.action} activeOpacity={0.7}>
              <Text style={s.questIcon}>{q.done ? '✅' : '⬜'}</Text>
              <Text style={[s.questLabel, q.done && s.questDone]}>{q.label}</Text>
              {!q.done && <Text style={s.questArrow}>→</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 칼로리 전투 현황 ── */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>🍺 포션 / 소모</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calorie')}>
              <Text style={s.link}>+ 포션 추가</Text>
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

        {/* ── 운세 ── */}
        <View style={[s.card, { borderColor: fortune.color + '44' }]}>
          <View style={s.rowBetween}>
            <Text style={[s.sectionTitle, { color: fortune.color }]}>✨ 오늘의 운세</Text>
            <View style={[s.luckyPill, { backgroundColor: fortune.color + '20' }]}>
              <Text style={[s.luckyPillText, { color: fortune.color }]}>🍀 {fortune.lucky}</Text>
            </View>
          </View>
          <Text style={s.fortuneText}>{fortune.text}</Text>
        </View>

        {/* ── 최근 기록 스파크 ── */}
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

      <NotifModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
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
      <View style={{ width: '80%', height: 3, backgroundColor: COLORS.bgHighlight, borderRadius: 2, marginTop: 2 }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function BSSparkline({ entries }: { entries: any[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const BAR_H = 32;
  const maxVal = 160;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_H + 14, marginTop: 10 }}>
      {sorted.map(e => {
        const col = BS_STATUS_COLOR[getBSStatus(e.value)];
        const h = Math.max(4, (e.value / maxVal) * BAR_H);
        return (
          <View key={e.date} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '100%', height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: 3 }}>
              <View style={{ width: '100%', height: h, backgroundColor: col, borderRadius: 3, opacity: 0.9 }} />
            </View>
            <Text style={{ color: COLORS.textDisabled, fontSize: 8, marginTop: 2 }}>{e.date.slice(5)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ScoreSparkline({ logs }: { logs: any[] }) {
  const BAR_H = 36;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_H + 20, marginTop: 6 }}>
      {logs.map((log, i) => {
        const rank = getRank(log.conditionScore);
        const h = Math.max(4, (log.conditionScore / 100) * BAR_H);
        return (
          <View key={log.date ?? i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: rank.color, fontSize: 8, fontWeight: '900', marginBottom: 2 }}>{log.conditionScore}</Text>
            <View style={{ width: '100%', height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: 3 }}>
              <View style={{ width: '100%', height: h, backgroundColor: rank.color, borderRadius: 3, opacity: 0.8 }} />
            </View>
            <Text style={{ color: COLORS.textDisabled, fontSize: 8, marginTop: 2 }}>{(log.date ?? '').slice(5)}</Text>
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
  streakChip: { backgroundColor: COLORS.goldGlow, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.gold + '44' },
  streakText: { color: COLORS.gold, fontSize: FONTS.xs, fontWeight: '900' },
  notifBtn: { padding: 4 },
  notifIcon: { fontSize: 16 },

  // 캐릭터 카드
  characterCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  characterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 52, height: 52, borderRadius: RADIUS.md, borderWidth: 2, backgroundColor: COLORS.bgHighlight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 26 },
  charName: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '900', marginBottom: 4 },
  rankBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2 },
  rankText: { fontSize: FONTS.xxs, fontWeight: '700' },
  characterRight: { alignItems: 'center' },
  scoreNum: { fontSize: FONTS.xxxl, fontWeight: '900', fontFamily: 'monospace', lineHeight: 42 },
  scoreLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, letterSpacing: 2 },

  // 공통 카드
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  link: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '600' },

  emptyStatText: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', lineHeight: 22 },

  // 퀘스트
  questRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub, gap: 10 },
  questIcon: { fontSize: 14 },
  questLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.sm },
  questDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  questArrow: { color: COLORS.purple, fontWeight: '700' },
  questCount: { fontSize: FONTS.xs, fontWeight: '700' },

  // 칼로리
  calTriple: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  calSep: { width: 1, height: 36, backgroundColor: COLORS.border },
  calBar: { height: 5, backgroundColor: COLORS.bgHighlight, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
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

  // 운세
  luckyPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  luckyPillText: { fontSize: FONTS.xxs, fontWeight: '700' },
  fortuneText: { color: COLORS.text, fontSize: FONTS.sm, lineHeight: 22 },
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
