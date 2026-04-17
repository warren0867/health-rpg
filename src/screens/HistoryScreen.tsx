import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MiniGraph from '../components/MiniGraph';
import { COLORS, FONTS, getRank, RADIUS, SPACING } from '../constants/theme';
import { DailyLog, IllnessEntry, MorningBloodSugar, WeightEntry, ILLNESS_EMOJI, ILLNESS_LABELS } from '../types';
import { calcAvgBS, exportAllData, formatDate, generateId, getAllDailyLogs, getIllnesses, getRecentMorningBS, getTodayKey, getUserProfile, getWeightHistory, importAllData, saveWeightEntry } from '../utils/storage';
import { UserProfile } from '../types';
import { EXERCISE_LABELS, calcAlcoholCalories } from '../utils/scoreCalculator';

function calcBMI(weightKg: number, heightCm: number): number {
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
}

function getBMILabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: '저체중', color: COLORS.blue };
  if (bmi < 23)   return { label: '정상', color: COLORS.teal };
  if (bmi < 25)   return { label: '과체중', color: COLORS.gold };
  return { label: '비만', color: COLORS.red };
}

// 로컬 타임존 기준 날짜 문자열 (UTC 혼용 버그 방지)
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 수면 패턴 바 차트 (연속 날짜 보장, v2)
function SleepChart({ logs }: { logs: DailyLog[] }) {
  if (logs.length === 0) return null;

  // 날짜→로그 맵
  const logMap: Record<string, DailyLog> = {};
  logs.forEach(l => { logMap[l.date] = l; });

  // 로컬 타임존 기준으로 연속 날짜 생성 (toISOString은 UTC라 한국에서 날짜 어긋남)
  const today = localDateStr(new Date());
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[Math.max(0, sorted.length - 14)].date;
  const days: string[] = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const d = new Date(sy, sm - 1, sd); // 로컬 자정 — UTC 파싱 금지
  while (localDateStr(d) <= today) {
    days.push(localDateStr(d));
    d.setDate(d.getDate() + 1);
  }

  const CHART_H = 52;
  const BAR_W = 8;
  const MAX_H = 10;
  const logsWithData = days.filter(date => logMap[date]);
  if (logsWithData.length === 0) return null;
  const avg = logsWithData.reduce((s, date) => s + logMap[date].sleep.hours, 0) / logsWithData.length;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 28 }}>
        {days.map((date, i) => {
          const log = logMap[date];
          const labelStep = days.length <= 5 ? 1 : days.length <= 10 ? 2 : 3;
          const showLabel = i === 0 || i === days.length - 1 || i % labelStep === 0;
          if (!log) {
            // 기록 없는 날 — 빈 칸 표시
            return (
              <View key={date} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ height: 14 }} />
                <View style={{ width: BAR_W, height: CHART_H, backgroundColor: COLORS.bgHighlight, borderRadius: BAR_W / 2, opacity: 0.3 }} />
                {showLabel
                  ? <Text style={{ color: COLORS.textDisabled, fontSize: 11, marginTop: 2 }}>{date.slice(5)}</Text>
                  : <View style={{ height: 14 }} />}
              </View>
            );
          }
          const h = log.sleep.hours;
          const barH = Math.max(4, Math.min(CHART_H, (h / MAX_H) * CHART_H));
          const isGood = h >= 7 && h <= 8;
          const color = isGood ? COLORS.teal : h >= 6 ? COLORS.gold : COLORS.red;
          return (
            <View key={date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>{h}h</Text>
              <View style={{ width: BAR_W, height: CHART_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: BAR_W / 2 }}>
                <View style={{ width: BAR_W, height: barH, backgroundColor: color, borderRadius: BAR_W / 2, opacity: 0.9 }} />
              </View>
              {showLabel
                ? <Text style={{ color: COLORS.textSub, fontSize: 11, marginTop: 2 }}>{date.slice(5)}</Text>
                : <View style={{ height: 14 }} />}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: COLORS.textSub, fontSize: FONTS.xs }}>7h 이상 권장  ·  기록 없는 날은 흐리게 표시</Text>
        <Text style={{ color: COLORS.teal, fontSize: FONTS.xs, fontWeight: '700' }}>평균 {avg.toFixed(1)}h</Text>
      </View>
    </View>
  );
}

// ── 월별 달력 컴포넌트 ──
function MonthCalendar({ logMap, year, month, onPrev, onNext }: {
  logMap: Record<string, DailyLog>;
  year: number; month: number;
  onPrev: () => void; onNext: () => void;
}) {
  const today = getTodayKey();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month, 0).getDate();
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      {/* 월 네비게이션 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity onPress={onPrev} style={cal.navBtn}>
          <Text style={cal.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.monthTitle}>{year}년 {month}월</Text>
        <TouchableOpacity onPress={onNext} style={cal.navBtn}>
          <Text style={cal.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={cal.weekRow}>
        {WEEK.map(w => (
          <Text key={w} style={[cal.weekLabel, w === '일' && { color: COLORS.red }, w === '토' && { color: COLORS.blue }]}>{w}</Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={cal.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={cal.cell} />;
            const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
            const log = logMap[dateStr];
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            const rank = log ? getRank(log.conditionScore) : null;

            return (
              <View key={col} style={[cal.cell, isToday && cal.cellToday]}>
                <Text style={[
                  cal.dayNum,
                  col === 0 && { color: COLORS.red + 'cc' },
                  col === 6 && { color: COLORS.blue + 'cc' },
                  isToday && { color: COLORS.purple, fontWeight: '900' },
                  isFuture && { color: COLORS.textDisabled },
                ]}>{day}</Text>
                {log ? (
                  <View style={[cal.dot, { backgroundColor: rank!.color }]}>
                    <Text style={cal.dotScore}>{log.conditionScore}</Text>
                  </View>
                ) : !isFuture ? (
                  <View style={cal.dotEmpty} />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {/* 범례 */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[{ label: '90+ 전설', color: '#FFD700' }, { label: '75+ 우수', color: '#9B6DFF' }, { label: '60+ 보통', color: '#56B4F5' }, { label: '60미만', color: '#FF5370' }].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
            <Text style={{ color: COLORS.textSub, fontSize: FONTS.xs }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  navBtn: { padding: 8 },
  navText: { color: COLORS.textSub, fontSize: 22, fontWeight: '300' },
  monthTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600', paddingVertical: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 48 },
  cellToday: { backgroundColor: COLORS.purple + '12', borderRadius: 8 },
  dayNum: { color: COLORS.textSub, fontSize: FONTS.xxs, marginBottom: 3 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotScore: { color: '#fff', fontSize: FONTS.xxs, fontWeight: '900' },
  dotEmpty: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.bgHighlight, marginTop: 4 },
});

export default function HistoryScreen() {
  const today = getTodayKey();
  const now = new Date();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [logMap, setLogMap] = useState<Record<string, DailyLog>>({});
  const [recentBS, setRecentBS] = useState<MorningBloodSugar[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [illnessMap, setIllnessMap] = useState<Record<string, IllnessEntry>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const [all, bs, weights, illnesses, prof] = await Promise.all([getAllDailyLogs(), getRecentMorningBS(7), getWeightHistory(30), getIllnesses(), getUserProfile()]);
        setLogs(all);
        const map: Record<string, DailyLog> = {};
        all.forEach(l => { map[l.date] = l; });
        setLogMap(map);
        setRecentBS(bs);
        setWeightHistory(weights);
        setProfile(prof);
        // 질병 날짜 맵 구성 (각 날짜 → 해당 질병)
        const imap: Record<string, IllnessEntry> = {};
        illnesses.forEach(ill => {
          const end = ill.endDate ?? getTodayKey();
          const cur = new Date(ill.startDate + 'T00:00:00');
          const last = new Date(end + 'T00:00:00');
          while (cur <= last) {
            imap[cur.toISOString().slice(0, 10)] = ill;
            cur.setDate(cur.getDate() + 1);
          }
        });
        setIllnessMap(imap);
        setLoading(false);
      })();
    }, [])
  );

  const handleExportData = async () => {
    try {
      const json = await exportAllData();
      Clipboard.setString(json);
      Alert.alert('백업 완료', '데이터가 클립보드에 복사됐어요.\n메모장에 붙여넣어 저장하세요.');
    } catch {
      Alert.alert('오류', '백업에 실패했습니다.');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      '데이터 복구',
      '클립보드의 백업 데이터를 불러옵니다.\n현재 데이터가 덮어씌워질 수 있어요. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복구',
          style: 'destructive',
          onPress: async () => {
            try {
              const text = await Clipboard.getString();
              await importAllData(text);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('복구 완료', '데이터를 성공적으로 불러왔어요. 앱을 재시작해주세요.');
            } catch {
              Alert.alert('오류', '올바른 백업 데이터가 아닙니다.');
            }
          },
        },
      ]
    );
  };

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth() + 1)) return;
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  };

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

        {/* 월별 달력 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📅 월별 기록 달력</Text>
          <MonthCalendar
            logMap={logMap}
            year={calYear} month={calMonth}
            onPrev={prevMonth} onNext={nextMonth}
          />
        </View>

        {/* 체중 + BMI */}
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
            <>
              <WeightGraph entries={[...weightHistory].reverse()} />
              {profile && weightHistory.length > 0 && (() => {
                const latestW = weightHistory[0].weightKg;
                const bmi = calcBMI(latestW, profile.heightCm);
                const { label, color } = getBMILabel(bmi);
                const targetW = profile.targetWeightKg;
                return (
                  <View style={{ marginTop: SPACING.sm, flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: color + '18', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: color + '44', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Text style={{ color, fontWeight: '900', fontSize: FONTS.sm }}>BMI {bmi}</Text>
                      <Text style={{ color, fontSize: FONTS.xxs }}>{label}</Text>
                    </View>
                    {targetW && (
                      <View style={{ backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>목표</Text>
                        <Text style={{ color: COLORS.purple, fontWeight: '900', fontSize: FONTS.sm }}>{targetW}kg</Text>
                        <Text style={{ color: latestW <= targetW ? COLORS.teal : COLORS.gold, fontSize: FONTS.xxs, fontWeight: '700' }}>
                          {latestW <= targetW ? '✓ 달성' : `−${(latestW - targetW).toFixed(1)}kg`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </>
          )}
        </View>

        {/* 수면 패턴 */}
        {logs.length >= 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>😴 수면 패턴</Text>
            <SleepChart logs={logs.slice(0, 14)} />
          </View>
        )}

        {/* 최근 7일 그래프 */}
        {weekLogs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>최근 컨디션 추이</Text>
            <MiniGraph logs={[...weekLogs].reverse()} />
          </View>
        )}

        {/* 데이터 백업/복구 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💾 데이터 관리</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.sm, lineHeight: 18 }}>
            백업: 모든 기록을 클립보드에 복사해서 메모장에 저장하세요.{'\n'}
            복구: 저장해둔 백업 텍스트를 클립보드에 복사한 후 복구 버튼을 누르세요.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.backupBtn} onPress={handleExportData}>
              <Text style={styles.backupBtnText}>📤 백업</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restoreBtn} onPress={handleImportData}>
              <Text style={styles.restoreBtnText}>📥 복구</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 전체 로그 리스트 */}
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>아직 기록이 없어요{'\n'}입력 탭에서 첫 기록을 남겨보세요!</Text>
        ) : (
          logs.map(log => {
            const rank = getRank(log.conditionScore);
            return (
              <View key={log.date} style={styles.logCard}>
                {/* 헤더: 날짜 + 등급 + 점수 */}
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  {illnessMap[log.date] && (
                    <View style={styles.illnessPill}>
                      <Text style={styles.illnessPillText}>
                        {ILLNESS_EMOJI[illnessMap[log.date].type]} {ILLNESS_LABELS[illnessMap[log.date].type]}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.logRankBadge, { backgroundColor: rank.color + '22' }]}>
                    <Text style={[styles.logRank, { color: rank.color }]}>{rank.rank}</Text>
                  </View>
                  <Text style={[styles.logScore, { color: rank.color }]}>{log.conditionScore}점</Text>
                </View>

                {/* 행동 통계 */}
                <View style={styles.logStats}>
                  <LogStat label="수면" value={`${log.sleep.hours}h`} />
                  <LogStat label="운동" value={(() => {
                    const types = log.exercise.types?.filter(t => t !== 'none') ?? [];
                    const legacyType = log.exercise.type;
                    const active = types.length > 0 ? types : (legacyType && legacyType !== 'none' ? [legacyType] : []);
                    return active.length > 0 ? `${log.exercise.minutes}분` : '없음';
                  })()} />
                  <LogStat label="음주" value={log.alcohol.consumed ? `${calcAlcoholCalories(log.alcohol)}kcal` : '없음'} danger={log.alcohol.consumed} />
                  {log.mood != null && (
                    <LogStat label="기분" value={['', '😩', '😔', '😐', '😊', '🤩'][log.mood]} />
                  )}
                  {log.steps != null && (
                    <LogStat label="걸음" value={`${log.steps.toLocaleString()}보`} />
                  )}
                </View>

                {/* 칼로리 + 혈당 행 */}
                {(() => {
                  const profile_ = profile;
                  const targetCal = profile_?.targetCalories ?? 2000;
                  const consumed = log.caloriesConsumed;
                  const alcoholCal_ = log.alcoholCalories ?? 0;
                  const totalCal = (consumed ?? 0) + alcoholCal_;
                  const calDiff = consumed != null ? Math.round(totalCal - targetCal) : null;
                  const bs = log.morningBSValue;
                  const bpStr = log.bloodPressure ? `${log.bloodPressure.systolic}/${log.bloodPressure.diastolic}` : null;
                  if (calDiff === null && !bs && !bpStr) return null;
                  return (
                    <View style={styles.logExtraRow}>
                      {calDiff !== null && (
                        <View style={styles.logExtraItem}>
                          <Text style={styles.logExtraLabel}>🍽 칼로리</Text>
                          <Text style={[styles.logExtraVal, { color: calDiff > 200 ? COLORS.red : calDiff < -200 ? COLORS.blue : COLORS.teal }]}>
                            {totalCal}kcal{' '}
                            <Text style={{ fontSize: FONTS.xs }}>
                              ({calDiff > 0 ? '+' : ''}{calDiff})
                            </Text>
                          </Text>
                        </View>
                      )}
                      {bs != null && (
                        <View style={styles.logExtraItem}>
                          <Text style={styles.logExtraLabel}>💉 공복혈당</Text>
                          <Text style={[styles.logExtraVal, { color: bs < 100 ? COLORS.teal : bs < 126 ? COLORS.gold : COLORS.red }]}>
                            {bs} mg/dL
                          </Text>
                        </View>
                      )}
                      {bpStr && (
                        <View style={styles.logExtraItem}>
                          <Text style={styles.logExtraLabel}>🩺 혈압</Text>
                          <Text style={styles.logExtraVal}>{bpStr}</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* RPG 스탯 */}
                <View style={styles.miniStatRow}>
                  {[
                    { label: 'HP', value: log.stats.hp, color: COLORS.hp },
                    { label: '지구력', value: log.stats.stamina, color: COLORS.str },
                    { label: '회복력', value: log.stats.recovery, color: COLORS.vit },
                    { label: '혈당조절', value: log.stats.bloodSugarControl, color: COLORS.mp },
                    { label: '컨디션', value: log.stats.condition, color: COLORS.agi },
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

  const BAR_W = 7;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H + 28 }}>
        {display.map((e, i) => {
          const h = Math.max(6, ((e.weightKg - minW) / range) * BAR_H);
          const isLatest = i === display.length - 1;
          const showLabel = i === 0 || i === display.length - 1 || i % 3 === 0;
          return (
            <View key={e.date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: isLatest ? COLORS.teal : COLORS.textSub, fontSize: 11, fontWeight: isLatest ? '900' : '400', marginBottom: 2 }}>
                {e.weightKg}
              </Text>
              <View style={{ width: BAR_W, height: BAR_H, justifyContent: 'flex-end', backgroundColor: COLORS.bgHighlight, borderRadius: BAR_W / 2 }}>
                <View style={{ width: BAR_W, height: h, backgroundColor: isLatest ? COLORS.teal : COLORS.blue, borderRadius: BAR_W / 2, opacity: 0.85 }} />
              </View>
              {showLabel
                ? <Text style={{ color: COLORS.textSub, fontSize: 11, marginTop: 2 }}>{e.date.slice(5)}</Text>
                : <View style={{ height: 14 }} />
              }
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: COLORS.textSub, fontSize: FONTS.xs }}>최소 {Math.min(...weights).toFixed(1)}kg</Text>
        <Text style={{ color: COLORS.teal, fontSize: FONTS.xs, fontWeight: '700' }}>현재 {display[display.length - 1].weightKg}kg</Text>
        <Text style={{ color: COLORS.textSub, fontSize: FONTS.xs }}>최대 {Math.max(...weights).toFixed(1)}kg</Text>
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
  summaryUnit: { color: COLORS.textMuted, fontSize: 11 },
  summaryLabel: { color: COLORS.textSub, fontSize: FONTS.xs, marginTop: 2 },
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
  reportLabel: { color: COLORS.textSub, fontSize: FONTS.xs },
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
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  logDate: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.md },
  illnessPill: {
    backgroundColor: COLORS.red + '18', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.red + '44',
    flexShrink: 1,
  },
  illnessPillText: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '700' },
  logRankBadge: { borderRadius: RADIUS.full, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  logRank: { fontWeight: '900', fontSize: FONTS.sm },
  logScore: { fontSize: FONTS.lg, fontWeight: '900' },
  logStats: { flexDirection: 'row', gap: SPACING.md },
  logStatItem: { alignItems: 'center' },
  logStatLabel: { color: COLORS.textSub, fontSize: FONTS.xs },
  logStatValue: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  miniStatRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: FONTS.sm, fontWeight: '900' },
  miniStatLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs },

  // 칼로리 / 혈당 추가 행
  logExtraRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  logExtraItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logExtraLabel: { color: COLORS.textSub, fontSize: FONTS.xs },
  logExtraVal: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', fontFamily: 'monospace' },

  // 체중
  addWeightBtn: { backgroundColor: COLORS.teal + '22', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.teal + '44' },
  addWeightBtnText: { color: COLORS.teal, fontSize: FONTS.xs, fontWeight: '700' },
  emptySmall: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', paddingVertical: SPACING.md },

  // 백업/복구
  backupBtn: { flex: 1, backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.purple + '44' },
  backupBtnText: { color: COLORS.purple, fontWeight: '700', fontSize: FONTS.sm },
  restoreBtn: { flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  restoreBtnText: { color: COLORS.textSub, fontWeight: '700', fontSize: FONTS.sm },

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
