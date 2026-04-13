import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MiniGraph from '../components/MiniGraph';
import { COLORS, FONTS, getRank, RADIUS, SPACING } from '../constants/theme';
import { DailyLog, MorningBloodSugar, WeightEntry } from '../types';
import { calcAvgBS, formatDate, generateId, getAllDailyLogs, getRecentMorningBS, getTodayKey, getWeightHistory, saveWeightEntry } from '../utils/storage';
import { EXERCISE_LABELS, calcAlcoholCalories } from '../utils/scoreCalculator';

export default function HistoryScreen() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [recentBS, setRecentBS] = useState<MorningBloodSugar[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const [all, bs, weights] = await Promise.all([getAllDailyLogs(), getRecentMorningBS(7), getWeightHistory(30)]);
        setLogs(all);
        setRecentBS(bs);
        setWeightHistory(weights);
        setLoading(false);
      })();
    }, [])
  );

  const handleSaveWeight = async () => {
    const v = parseFloat(weightInput);
    if (isNaN(v) || v < 20 || v > 300) { Alert.alert('오류', '올바른 체중을 입력해주세요 (20~300kg)'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = getTodayKey();
    await saveWeightEntry({ id: generateId(), date: today, weightKg: v, timestamp: new Date().toISOString() });
    const updated = await getWeightHistory(30);
    setWeightHistory(updated);
    setWeightInput('');
    setShowWeightModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.purple} size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const avg = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + l.conditionScore, 0) / logs.length)
    : null;

  // 주간 리포트 (최근 7일)
  const weekLogs = logs.slice(0, 7);
  const weekReport = calcWeekReport(weekLogs);
  const avgBS = calcAvgBS(recentBS);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>전체 기록</Text>

        {/* 전체 요약 */}
        {avg !== null && (
          <View style={styles.summaryCard}>
            <SummaryItem value={String(logs.length)} label="총 기록일" />
            <View style={styles.divider} />
            <SummaryItem value={String(avg)} label="평균 점수" color={getRank(avg).color} />
            <View style={styles.divider} />
            <SummaryItem value={getRank(avg).rank} label="평균 등급" color={getRank(avg).color} />
            {avgBS !== null && (
              <>
                <View style={styles.divider} />
                <SummaryItem
                  value={String(avgBS)}
                  label="평균 혈당"
                  color={avgBS < 100 ? COLORS.green : avgBS < 126 ? COLORS.gold : COLORS.red}
                  unit="mg/dL"
                />
              </>
            )}
          </View>
        )}

        {/* 주간 리포트 */}
        {weekLogs.length >= 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📊 주간 리포트</Text>
            <View style={styles.reportGrid}>
              <ReportItem emoji="🏆" label="최고 점수" value={`${weekReport.best}점`} color={COLORS.gold} />
              <ReportItem emoji="😔" label="최저 점수" value={`${weekReport.worst}점`} color={COLORS.textMuted} />
              <ReportItem emoji="😴" label="평균 수면" value={`${weekReport.avgSleep}h`} color={COLORS.blue} />
              <ReportItem emoji="💪" label="운동한 날" value={`${weekReport.exerciseDays}일`} color={COLORS.teal} />
              <ReportItem emoji="🍺" label="음주한 날" value={`${weekReport.alcoholDays}일`} color={weekReport.alcoholDays > 2 ? COLORS.red : COLORS.textMuted} />
              <ReportItem emoji="📈" label="7일 추세" value={weekReport.trend} color={weekReport.trend === '상승↑' ? COLORS.teal : weekReport.trend === '하락↓' ? COLORS.red : COLORS.gold} />
            </View>

            {/* 주간 조언 */}
            <View style={styles.weekAdvice}>
              <Text style={styles.weekAdviceText}>{weekReport.advice}</Text>
            </View>
          </View>
        )}

        {/* 체중 그래프 */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Text style={styles.sectionTitle}>⚖️ 체중 변화</Text>
            <TouchableOpacity
              style={styles.addWeightBtn}
              onPress={() => setShowWeightModal(true)}
            >
              <Text style={styles.addWeightBtnText}>+ 기록</Text>
            </TouchableOpacity>
          </View>
          {weightHistory.length === 0 ? (
            <Text style={styles.emptySmall}>아직 체중 기록이 없어요</Text>
          ) : (
            <WeightGraph entries={[...weightHistory].reverse()} />
          )}
        </View>

        {/* 최근 7일 그래프 */}
        {weekLogs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>최근 컨디션 추이</Text>
            <MiniGraph logs={[...weekLogs].reverse()} />
          </View>
        )}

        {/* 전체 로그 리스트 */}
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>아직 기록이 없어요{'\n'}입력 탭에서 첫 기록을 남겨보세요!</Text>
        ) : (
          logs.map(log => {
            const rank = getRank(log.conditionScore);
            return (
              <View key={log.date} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  <View style={[styles.logRankBadge, { backgroundColor: rank.color + '22' }]}>
                    <Text style={[styles.logRank, { color: rank.color }]}>{rank.rank}</Text>
                  </View>
                  <Text style={[styles.logScore, { color: rank.color }]}>{log.conditionScore}점</Text>
                </View>
                <View style={styles.logStats}>
                  <LogStat label="수면" value={`${log.sleep.hours}h`} />
                  <LogStat label="운동" value={(() => {
                    const types = log.exercise.types?.filter(t => t !== 'none') ?? [];
                    const legacyType = log.exercise.type;
                    const active = types.length > 0 ? types : (legacyType && legacyType !== 'none' ? [legacyType] : []);
                    return active.length > 0 ? `${log.exercise.minutes}분` : '없음';
                  })()} />
                  <LogStat label="음주" value={log.alcohol.consumed ? `${calcAlcoholCalories(log.alcohol)}kcal` : '없음'} danger={log.alcohol.consumed} />
                  {log.bloodPressure && (
                    <LogStat label="혈압" value={`${log.bloodPressure.systolic}/${log.bloodPressure.diastolic}`} />
                  )}
                  {log.mood != null && (
                    <LogStat label="기분" value={['', '😩', '😔', '😐', '😊', '🤩'][log.mood]} />
                  )}
                </View>
                <View style={styles.miniStatRow}>
                  {[
                    { label: 'HP', value: log.stats.hp, color: COLORS.teal },
                    { label: '지구력', value: log.stats.stamina, color: COLORS.gold },
                    { label: '회복', value: log.stats.recovery, color: COLORS.blue },
                    { label: '혈당', value: log.stats.bloodSugarControl, color: COLORS.green },
                  ].map(s => (
                    <View key={s.label} style={styles.miniStat}>
                      <Text style={[styles.miniStatVal, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.miniStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* 체중 입력 모달 */}
      <Modal visible={showWeightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>⚖️ 체중 기록</Text>
            <Text style={styles.modalSub}>오늘 측정한 체중을 입력해주세요</Text>
            <TextInput
              style={styles.modalInput}
              value={weightInput} onChangeText={setWeightInput}
              keyboardType="decimal-pad" placeholder="예: 72.5"
              placeholderTextColor={COLORS.textDisabled}
              autoFocus
            />
            <Text style={styles.modalUnit}>kg</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowWeightModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveWeight}>
                <Text style={styles.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── 체중 그래프 ──
function WeightGraph({ entries }: { entries: WeightEntry[] }) {
  const display = entries.slice(-14); // 최근 14일
  if (display.length === 0) return null;
  const weights = display.map(e => e.weightKg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;
  const BAR_H = 60;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_H + 28 }}>
        {display.map((e, i) => {
          const h = Math.max(6, ((e.weightKg - minW) / range) * BAR_H);
          const isLatest = i === display.length - 1;
          return (
            <View key={e.date} style={{ flex: 1, alignItems: 'center' }}>
              {isLatest && (
                <Text style={{ color: COLORS.teal, fontSize: 9, fontWeight: '900', marginBottom: 2 }}>
                  {e.weightKg}
                </Text>
              )}
              <View style={{ width: '100%', height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: 3 }}>
                <View style={{ width: '100%', height: h, backgroundColor: isLatest ? COLORS.teal : COLORS.blue, borderRadius: 3, opacity: 0.85 }} />
              </View>
              {i % 2 === 0 && (
                <Text style={{ color: COLORS.textMuted, fontSize: 9, marginTop: 2 }}>{e.date.slice(5)}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>최소 {Math.min(...weights).toFixed(1)}kg</Text>
        <Text style={{ color: COLORS.teal, fontSize: 10, fontWeight: '700' }}>현재 {display[display.length - 1].weightKg}kg</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>최대 {Math.max(...weights).toFixed(1)}kg</Text>
      </View>
    </View>
  );
}

// ── 주간 리포트 계산 ──
function calcWeekReport(logs: DailyLog[]) {
  if (logs.length === 0) return { best: 0, worst: 0, avgSleep: 0, exerciseDays: 0, alcoholDays: 0, trend: '-', advice: '' };
  const scores = logs.map(l => l.conditionScore);
  const best = Math.max(...scores);
  const worst = Math.min(...scores);
  const avgSleep = Math.round(logs.reduce((s, l) => s + l.sleep.hours, 0) / logs.length * 10) / 10;
  const exerciseDays = logs.filter(l => {
    const types = l.exercise.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise.type && l.exercise.type !== 'none');
  }).length;
  const alcoholDays = logs.filter(l => l.alcohol.consumed).length;

  let trend = '유지→';
  if (logs.length >= 3) {
    const recent = logs.slice(0, 3).reduce((s, l) => s + l.conditionScore, 0) / 3;
    const old = logs.slice(-3).reduce((s, l) => s + l.conditionScore, 0) / 3;
    if (recent - old > 5) trend = '상승↑';
    else if (old - recent > 5) trend = '하락↓';
  }

  let advice = '';
  if (alcoholDays >= 3) advice = '🍺 음주 빈도가 높아요. 혈당 관리에 음주가 가장 큰 영향을 줍니다.';
  else if (exerciseDays <= 1) advice = '🚶 이번 주 운동이 부족했어요. 하루 30분 걷기부터 시작해보세요.';
  else if (avgSleep < 6.5) advice = '😴 평균 수면이 부족해요. 7시간 수면이 혈당 조절에도 중요합니다.';
  else if (trend === '상승↑') advice = '🔥 컨디션이 오르고 있어요! 지금 루틴을 계속 유지하세요.';
  else advice = '✅ 꾸준히 잘 관리하고 있어요. 이번 주도 화이팅!';

  return { best, worst, avgSleep, exerciseDays, alcoholDays, trend, advice };
}

// ── 공통 컴포넌트 ──
function SummaryItem({ value, label, color = COLORS.text, unit }: { value: string; label: string; color?: string; unit?: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.summaryUnit}>{unit}</Text>}
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ReportItem({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.reportItem}>
      <Text style={styles.reportEmoji}>{emoji}</Text>
      <Text style={[styles.reportValue, { color }]}>{value}</Text>
      <Text style={styles.reportLabel}>{label}</Text>
    </View>
  );
}

function LogStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.logStatItem}>
      <Text style={styles.logStatLabel}>{label}</Text>
      <Text style={[styles.logStatValue, danger && { color: COLORS.red }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.md },
  summaryCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap',
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  summaryItem: { alignItems: 'center', minWidth: 60 },
  summaryValue: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text },
  summaryUnit: { color: COLORS.textMuted, fontSize: 9 },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.border },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportItem: {
    width: '30%', backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', gap: 2,
  },
  reportEmoji: { fontSize: 20 },
  reportValue: { fontSize: FONTS.md, fontWeight: '900' },
  reportLabel: { color: COLORS.textMuted, fontSize: 10 },
  weekAdvice: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.sm,
  },
  weekAdviceText: { color: COLORS.text, fontSize: FONTS.sm, lineHeight: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.md, textAlign: 'center', marginTop: SPACING.xl, lineHeight: 24 },
  logCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logDate: { flex: 1, color: COLORS.text, fontWeight: '700', fontSize: FONTS.md },
  logRankBadge: { borderRadius: RADIUS.full, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  logRank: { fontWeight: '900', fontSize: FONTS.sm },
  logScore: { fontSize: FONTS.lg, fontWeight: '900' },
  logStats: { flexDirection: 'row', gap: SPACING.md },
  logStatItem: { alignItems: 'center' },
  logStatLabel: { color: COLORS.textMuted, fontSize: FONTS.xs },
  logStatValue: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  miniStatRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: FONTS.sm, fontWeight: '900' },
  miniStatLabel: { color: COLORS.textDisabled, fontSize: 10 },

  // 체중
  addWeightBtn: { backgroundColor: COLORS.teal + '22', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.teal + '44' },
  addWeightBtnText: { color: COLORS.teal, fontSize: FONTS.xs, fontWeight: '700' },
  emptySmall: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', paddingVertical: SPACING.md },

  // 체중 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md },
  modalInput: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 52, fontWeight: '900', paddingHorizontal: SPACING.md, paddingVertical: 10, textAlign: 'center', fontFamily: 'monospace' },
  modalUnit: { color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  modalConfirm: { flex: 2, backgroundColor: COLORS.teal, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },
});
