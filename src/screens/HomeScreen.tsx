import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalorieGauge from '../components/CalorieGauge';
import MiniGraph from '../components/MiniGraph';
import StatBar from '../components/StatBar';
import { COLORS, FONTS, getRank, RADIUS, SPACING } from '../constants/theme';
import { UserProfile } from '../types';
import { getTodayFortune } from '../utils/feedback';
import { calcGaugeData, calcMacroGoal } from '../utils/calorieCalculator';
import { BS_STATUS_COLOR, getBSStatus, getBSStatusLabel } from '../utils/scoreCalculator';
import {
  calcAvgBS,
  generateId,
  getDailyLog,
  getFoodEntriesByDate,
  getMorningBS,
  getRecentDailyLogs,
  getRecentMorningBS,
  getTodayKey,
  getUserProfile,
  saveMorningBS,
  sumFoodEntries,
  getBSTrend,
} from '../utils/storage';

export default function HomeScreen() {
  const today = getTodayKey();
  const fortune = getTodayFortune(today);
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [foodSummary, setFoodSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [morningBS, setMorningBS] = useState<any>(null);
  const [recentBS, setRecentBS] = useState<any[]>([]);
  const [showBSModal, setShowBSModal] = useState(false);
  const [bsInput, setBsInput] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, log, foods, mbs, recentMbs, recent] = await Promise.all([
      getUserProfile(),
      getDailyLog(today),
      getFoodEntriesByDate(today),
      getMorningBS(today),
      getRecentMorningBS(7),
      getRecentDailyLogs(7),
    ]);
    setProfile(p);
    setScore(log?.conditionScore ?? null);
    setStats(log?.stats ?? null);
    setFoodSummary(sumFoodEntries(foods));
    setMorningBS(mbs);
    setRecentBS(recentMbs);
    setRecentLogs([...recent].reverse());
    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleSaveBS = async () => {
    const v = parseInt(bsInput);
    if (isNaN(v) || v < 40 || v > 600) {
      Alert.alert('오류', '올바른 혈당값을 입력해주세요 (40-600)');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMorningBS({ id: generateId(), date: today, value: v, timestamp: new Date().toISOString() });
    setBsInput('');
    setShowBSModal(false);
    load();
  };

  const rank = score !== null ? getRank(score) : null;
  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = profile ? calcMacroGoal(targetCal) : { carbs: 200, protein: 150, fat: 67 };
  const gaugeData = calcGaugeData(foodSummary.calories, targetCal);
  const bsTrend = getBSTrend(recentBS);
  const avgBS = calcAvgBS(recentBS);

  const trendIcon = bsTrend === 'up' ? '↑' : bsTrend === 'down' ? '↓' : '→';
  const trendColor = bsTrend === 'up' ? COLORS.red : bsTrend === 'down' ? COLORS.teal : COLORS.textMuted;

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요, {profile?.name ?? '용사'}님</Text>
            <Text style={styles.dateText}>{today.replace(/-/g, '.')}</Text>
          </View>
          <Text style={styles.appTitle}>HEALTH RPG</Text>
        </View>

        {/* 컨디션 + 혈당 상단 요약 */}
        <View style={styles.topRow}>
          {/* 컨디션 점수 */}
          <View style={[styles.topCard, { flex: 1 }]}>
            <Text style={styles.topCardLabel}>컨디션</Text>
            {score !== null ? (
              <>
                <Text style={[styles.topCardValue, { color: rank!.color }]}>{score}</Text>
                <Text style={[styles.topCardSub, { color: rank!.color }]}>{rank!.rank} {rank!.label}</Text>
              </>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('Input')}>
                <Text style={styles.topCardEmpty}>입력하기 →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 공복혈당 */}
          <TouchableOpacity
            style={[styles.topCard, { flex: 1 }]}
            onPress={() => setShowBSModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.topCardLabel}>공복혈당</Text>
            {morningBS ? (
              <>
                <View style={styles.bsRow}>
                  <Text style={[styles.topCardValue, { color: BS_STATUS_COLOR[getBSStatus(morningBS.value)] }]}>
                    {morningBS.value}
                  </Text>
                  <Text style={[styles.trendIcon, { color: trendColor }]}>{trendIcon}</Text>
                </View>
                <Text style={[styles.topCardSub, { color: BS_STATUS_COLOR[getBSStatus(morningBS.value)] }]}>
                  {getBSStatusLabel(getBSStatus(morningBS.value))}
                </Text>
              </>
            ) : (
              <Text style={styles.topCardEmpty}>+ 입력</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 칼로리 게이지 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>오늘 칼로리</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calorie')}>
              <Text style={styles.seeMore}>음식 추가 →</Text>
            </TouchableOpacity>
          </View>
          <CalorieGauge
            data={gaugeData}
            carbs={Math.round(foodSummary.carbs)}
            protein={Math.round(foodSummary.protein)}
            fat={Math.round(foodSummary.fat)}
            carbsGoal={macroGoal.carbs}
            proteinGoal={macroGoal.protein}
            fatGoal={macroGoal.fat}
            compact
          />
        </View>

        {/* 오늘의 운세 */}
        <View style={[styles.card, styles.fortuneCard]}>
          <Text style={[styles.sectionTitle, { color: COLORS.gold }]}>오늘의 운세</Text>
          <Text style={styles.fortuneText}>{fortune.text}</Text>
          <Text style={styles.fortuneLucky}>행운의 아이템: {fortune.lucky}</Text>
        </View>

        {/* 캐릭터 스탯 */}
        {stats && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>캐릭터 스탯</Text>
            <View style={styles.statsGrid}>
              <StatCard label="HP" value={stats.hp} color={COLORS.teal} />
              <StatCard label="지구력" value={stats.stamina} color={COLORS.gold} />
              <StatCard label="회복력" value={stats.recovery} color={COLORS.blue} />
              <StatCard label="혈당" value={stats.bloodSugarControl} color={COLORS.green} />
            </View>
            <StatBar label="종합 컨디션" value={stats.condition} color={COLORS.purple} />
          </View>
        )}

        {/* 혈당 7일 추이 */}
        {recentBS.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>공복혈당 추이</Text>
              {avgBS && (
                <Text style={[styles.avgBsText, { color: avgBS < 100 ? COLORS.green : COLORS.gold }]}>
                  평균 {avgBS} mg/dL
                </Text>
              )}
            </View>
            <BSMiniGraph entries={recentBS} />
            <View style={styles.bsGuide}>
              <View style={styles.bsGuideItem}>
                <View style={[styles.bsDot, { backgroundColor: COLORS.green }]} />
                <Text style={styles.bsGuideText}>정상 &lt;100</Text>
              </View>
              <View style={styles.bsGuideItem}>
                <View style={[styles.bsDot, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.bsGuideText}>주의 100-125</Text>
              </View>
              <View style={styles.bsGuideItem}>
                <View style={[styles.bsDot, { backgroundColor: COLORS.red }]} />
                <Text style={styles.bsGuideText}>위험 ≥126</Text>
              </View>
            </View>
          </View>
        )}

        {/* 최근 기록 그래프 */}
        {recentLogs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>최근 컨디션 기록</Text>
            <MiniGraph logs={recentLogs.slice(-7)} />
          </View>
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* 공복혈당 입력 모달 */}
      <Modal visible={showBSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>오늘 아침 공복혈당</Text>
            <Text style={styles.modalSub}>기상 직후, 식사 전 측정값</Text>

            <TextInput
              style={styles.bsInput}
              value={bsInput}
              onChangeText={setBsInput}
              keyboardType="numeric"
              placeholder="예: 95"
              placeholderTextColor={COLORS.textDisabled}
              maxLength={3}
              autoFocus
            />
            <Text style={styles.unit}>mg/dL</Text>

            {bsInput.length > 0 && !isNaN(parseInt(bsInput)) && (() => {
              const status = getBSStatus(parseInt(bsInput));
              const color = BS_STATUS_COLOR[status];
              return (
                <View style={[styles.liveStatus, { backgroundColor: color + '22' }]}>
                  <Text style={{ color, fontWeight: '700' }}>{getBSStatusLabel(status)}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>
                    {parseInt(bsInput) < 100 ? '좋아요!' :
                      parseInt(bsInput) < 126 ? '전당뇨 범위 — 식단을 조심하세요' :
                        '위험 — 의사 상담이 필요해요'}
                  </Text>
                </View>
              );
            })()}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBSModal(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveBS}>
                <Text style={styles.confirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function BSMiniGraph({ entries }: { entries: any[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const BAR_H = 60;
  const maxVal = 160;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_H + 24 }}>
      {sorted.map(e => {
        const status = getBSStatus(e.value);
        const color = BS_STATUS_COLOR[status];
        const h = Math.max(6, (e.value / maxVal) * BAR_H);
        return (
          <View key={e.date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{e.value}</Text>
            <View style={{ width: '100%', height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: 6 }}>
              <View style={{ width: '100%', height: h, backgroundColor: color, borderRadius: 6 }} />
              {/* 100 기준선 */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: (100 / maxVal) * BAR_H, height: 1, backgroundColor: COLORS.gold + '66' }} />
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>{e.date.slice(5)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  value: { fontSize: FONTS.xl, fontWeight: '900' },
  label: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  greeting: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '700' },
  dateText: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  appTitle: { color: COLORS.purple, fontSize: FONTS.md, fontWeight: '900', letterSpacing: 1.5 },
  topRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  topCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topCardLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: 4 },
  topCardValue: { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  topCardSub: { fontSize: FONTS.xs, fontWeight: '600', marginTop: 2 },
  topCardEmpty: { color: COLORS.purple, fontSize: FONTS.md, fontWeight: '700', marginTop: 8 },
  bsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendIcon: { fontSize: FONTS.xl, fontWeight: '900' },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700' },
  seeMore: { color: COLORS.purple, fontSize: FONTS.sm, fontWeight: '600' },
  fortuneCard: { borderColor: COLORS.gold + '44' },
  fortuneText: { color: COLORS.text, fontSize: FONTS.md, lineHeight: 22 },
  fortuneLucky: { color: COLORS.gold, fontSize: FONTS.sm, marginTop: 6, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  avgBsText: { fontSize: FONTS.sm, fontWeight: '700' },
  bsGuide: { flexDirection: 'row', gap: 12, marginTop: 8 },
  bsGuideItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bsDot: { width: 8, height: 8, borderRadius: 4 },
  bsGuideText: { color: COLORS.textMuted, fontSize: FONTS.xs },
  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text },
  modalSub: { color: COLORS.textMuted, fontSize: FONTS.sm, marginBottom: SPACING.md },
  bsInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 56,
    fontWeight: '900',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlign: 'center',
  },
  unit: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', marginTop: 4 },
  liveStatus: { borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginTop: 8, gap: 2 },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xl, paddingVertical: 14, alignItems: 'center'
  },
  cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.md },
  confirmBtn: {
    flex: 2, backgroundColor: COLORS.purple, borderRadius: RADIUS.xl, paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  confirmText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
});
