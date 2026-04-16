import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { BloodSugarEntry, BloodSugarStatus, BloodSugarTiming } from '../types';
import { getBloodSugarAdvice } from '../utils/feedback';
import {
  calcWeeklyAvgBloodSugar,
  deleteBloodSugarEntry,
  generateId,
  getAllBloodSugar,
  getBloodSugarByDate,
  getBloodSugarWeekly,
  getTodayKey,
  saveBloodSugarEntry,
} from '../utils/storage';
import { getBloodSugarStatus, getBloodSugarStatusLabel } from '../utils/scoreCalculator';

const TIMING_ORDER: BloodSugarTiming[] = [
  'fasting', 'before_meal', 'after_meal_1h', 'after_meal_2h', 'bedtime', 'random',
];

// ADAG 공식: HbA1c 추정 (mg/dL 평균 기반)
function estimateHbA1c(avgBS: number): number {
  return Math.round(((avgBS + 46.7) / 28.7) * 10) / 10;
}

// 전체 측정값 정상범위 내 비율
function calcTimeInRange(entries: BloodSugarEntry[]) {
  if (entries.length === 0) return null;
  const counts = { low: 0, normal: 0, warning: 0, danger: 0 };
  entries.forEach(e => { counts[getBloodSugarStatus(e.value, e.timing)]++; });
  const total = entries.length;
  return {
    low:     Math.round(counts.low     / total * 100),
    normal:  Math.round(counts.normal  / total * 100),
    warning: Math.round(counts.warning / total * 100),
    danger:  Math.round(counts.danger  / total * 100),
    total,
  };
}

// 측정 시간대별 평균
function calcTimingAvgs(entries: BloodSugarEntry[]) {
  const byTiming: Record<string, number[]> = {};
  entries.forEach(e => {
    if (!byTiming[e.timing]) byTiming[e.timing] = [];
    byTiming[e.timing].push(e.value);
  });
  return TIMING_ORDER
    .filter(t => byTiming[t])
    .map(t => ({
      timing: t,
      avg: Math.round(byTiming[t].reduce((s, v) => s + v, 0) / byTiming[t].length),
      count: byTiming[t].length,
    }));
}

// GL 기반 식후 혈당 예상 (CalorieScreen에서도 사용)
export const GI_NUM: Record<string, number> = { low: 40, medium: 60, high: 80 };
export function estimateBGRise(carbs: number, gi: string): { min: number; max: number; gl: number } {
  const gl = Math.round((GI_NUM[gi] ?? 60) * carbs / 100);
  return { gl, min: Math.round(gl * 1.5), max: Math.round(gl * 3.5) };
}

// ─────────────────────────────────────────────
//  상수
// ─────────────────────────────────────────────

const TIMING_OPTIONS: { value: BloodSugarTiming; label: string; desc: string }[] = [
  { value: 'fasting',       label: '공복',      desc: '기상 직후' },
  { value: 'before_meal',   label: '식전',      desc: '식사 30분 전' },
  { value: 'after_meal_1h', label: '식후 1시간', desc: '식사 시작 후 1hr' },
  { value: 'after_meal_2h', label: '식후 2시간', desc: '식사 시작 후 2hr' },
  { value: 'bedtime',       label: '취침 전',   desc: '잠자리 들기 전' },
  { value: 'random',        label: '기타',      desc: '임의 측정' },
];

const STATUS_COLOR: Record<BloodSugarStatus, string> = {
  low: COLORS.blue,
  normal: COLORS.green,
  warning: COLORS.gold,
  danger: COLORS.red,
};

// 정상 범위 안내
const REFERENCE = [
  { label: '공복 (정상)',     range: '70–99 mg/dL',   color: COLORS.green },
  { label: '공복 (전당뇨)',   range: '100–125 mg/dL', color: COLORS.gold },
  { label: '공복 (당뇨 의심)', range: '126+ mg/dL',   color: COLORS.red },
  { label: '식후 2h (정상)',   range: '< 140 mg/dL',  color: COLORS.green },
  { label: '식후 2h (주의)',   range: '140–199 mg/dL', color: COLORS.gold },
  { label: '식후 2h (위험)',   range: '200+ mg/dL',   color: COLORS.red },
];

// ─────────────────────────────────────────────
//  메인 화면
// ─────────────────────────────────────────────

export default function BloodSugarScreen() {
  const today = getTodayKey();

  const [todayEntries, setTodayEntries] = useState<BloodSugarEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<BloodSugarEntry[]>([]);
  const [weeklyAvg, setWeeklyAvg] = useState<number | null>(null);
  const [allEntries, setAllEntries] = useState<BloodSugarEntry[]>([]);
  const [hbA1c, setHbA1c] = useState<number | null>(null);
  const [timeInRange, setTimeInRange] = useState<ReturnType<typeof calcTimeInRange>>(null);
  const [timingAvgs, setTimingAvgs] = useState<{ timing: BloodSugarTiming; avg: number; count: number }[]>([]);
  const [showModal, setShowModal] = useState(false);

  // 입력 상태
  const [inputValue, setInputValue] = useState('');
  const [inputTiming, setInputTiming] = useState<BloodSugarTiming>('fasting');
  const [inputNote, setInputNote] = useState('');

  const load = useCallback(async () => {
    const [td, weekly, all] = await Promise.all([
      getBloodSugarByDate(today),
      getBloodSugarWeekly(),
      getAllBloodSugar(),
    ]);
    setTodayEntries(td);
    setWeeklyEntries(weekly);
    setAllEntries(all);
    setWeeklyAvg(calcWeeklyAvgBloodSugar(all));
    setTimeInRange(calcTimeInRange(all));
    setTimingAvgs(calcTimingAvgs(all));
    // HbA1c: 공복 30일 이상 데이터 있으면 추정
    const fastingAll = all.filter(e => e.timing === 'fasting');
    if (fastingAll.length >= 10) {
      const avg = Math.round(fastingAll.reduce((s, e) => s + e.value, 0) / fastingAll.length);
      setHbA1c(estimateHbA1c(avg));
    }
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    const v = parseInt(inputValue, 10);
    if (isNaN(v) || v < 20 || v > 600) {
      Alert.alert('입력 오류', '혈당값을 올바르게 입력해주세요 (20–600 mg/dL)');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: BloodSugarEntry = {
      id: generateId(),
      date: today,
      timestamp: new Date().toISOString(),
      value: v,
      timing: inputTiming,
      note: inputNote || undefined,
    };
    await saveBloodSugarEntry(entry);
    setInputValue('');
    setInputNote('');
    setInputTiming('fasting');
    setShowModal(false);
    load();
  };

  const handleDelete = (entry: BloodSugarEntry) => {
    Alert.alert('삭제', `${entry.value} mg/dL 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteBloodSugarEntry(entry.id);
        load();
      }},
    ]);
  };

  // 최근 7일 공복 평균 트렌드 (날짜별)
  const fastingByDay = weeklyEntries
    .filter(e => e.timing === 'fasting')
    .reduce<Record<string, number[]>>((acc, e) => {
      if (!acc[e.date]) acc[e.date] = [];
      acc[e.date].push(e.value);
      return acc;
    }, {});

  const trendDays = Object.entries(fastingByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>혈당 관리</Text>
            <View style={styles.diabetesTag}>
              <Text style={styles.diabetesTagText}>혈당 관리</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ 입력</Text>
          </TouchableOpacity>
        </View>

        {/* 주간 평균 요약 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>주간 공복 평균</Text>
          {weeklyAvg !== null ? (
            <View style={styles.avgRow}>
              <Text style={[styles.avgValue, {
                color: weeklyAvg < 100 ? COLORS.green : weeklyAvg < 126 ? COLORS.gold : COLORS.red
              }]}>
                {weeklyAvg}
              </Text>
              <View>
                <Text style={styles.avgUnit}>mg/dL</Text>
                <Text style={[styles.avgStatus, {
                  color: weeklyAvg < 100 ? COLORS.green : weeklyAvg < 126 ? COLORS.gold : COLORS.red
                }]}>
                  {weeklyAvg < 100 ? '정상' : weeklyAvg < 126 ? '전당뇨 범위 주의' : '당뇨 의심 — 상담 필요'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.mutedText}>아직 공복 혈당 기록이 없어요</Text>
          )}
        </View>

        {/* ── HbA1c 추정 + 정상범위 비율 ── */}
        {(hbA1c !== null || timeInRange !== null) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📊 혈당 분석</Text>

            {/* HbA1c 추정 */}
            {hbA1c !== null && (
              <View style={styles.hbRow}>
                <View style={styles.hbLeft}>
                  <Text style={styles.hbLabel}>당화혈색소 추정 (HbA1c)</Text>
                  <Text style={styles.hbDesc}>공복 혈당 평균으로 계산한 대략적 추정치</Text>
                </View>
                <View style={[styles.hbBadge, {
                  backgroundColor: hbA1c < 5.7 ? COLORS.green + '22' : hbA1c < 6.5 ? COLORS.gold + '22' : COLORS.red + '22',
                  borderColor: hbA1c < 5.7 ? COLORS.green + '66' : hbA1c < 6.5 ? COLORS.gold + '66' : COLORS.red + '66',
                }]}>
                  <Text style={[styles.hbValue, {
                    color: hbA1c < 5.7 ? COLORS.green : hbA1c < 6.5 ? COLORS.gold : COLORS.red,
                  }]}>{hbA1c}%</Text>
                  <Text style={[styles.hbStatus, {
                    color: hbA1c < 5.7 ? COLORS.green : hbA1c < 6.5 ? COLORS.gold : COLORS.red,
                  }]}>
                    {hbA1c < 5.7 ? '정상' : hbA1c < 6.5 ? '전당뇨 의심' : '당뇨 범위'}
                  </Text>
                </View>
              </View>
            )}

            {/* 정상범위 비율 (Time-in-Range) */}
            {timeInRange !== null && (
              <View style={[styles.tirSection, hbA1c !== null && { marginTop: 14 }]}>
                <View style={styles.tirHeader}>
                  <Text style={styles.tirTitle}>정상 범위 내 비율 (TIR)</Text>
                  <Text style={styles.tirCount}>{timeInRange.total}회 측정</Text>
                </View>
                <View style={styles.tirBar}>
                  {timeInRange.normal  > 0 && <View style={[styles.tirSeg, { flex: timeInRange.normal,  backgroundColor: COLORS.green }]} />}
                  {timeInRange.warning > 0 && <View style={[styles.tirSeg, { flex: timeInRange.warning, backgroundColor: COLORS.gold  }]} />}
                  {timeInRange.danger  > 0 && <View style={[styles.tirSeg, { flex: timeInRange.danger,  backgroundColor: COLORS.red   }]} />}
                  {timeInRange.low     > 0 && <View style={[styles.tirSeg, { flex: timeInRange.low,     backgroundColor: COLORS.blue  }]} />}
                </View>
                <View style={styles.tirLegend}>
                  {[
                    { label: `정상 ${timeInRange.normal}%`,   color: COLORS.green },
                    { label: `주의 ${timeInRange.warning}%`,  color: COLORS.gold  },
                    { label: `위험 ${timeInRange.danger}%`,   color: COLORS.red   },
                    ...(timeInRange.low > 0 ? [{ label: `저혈당 ${timeInRange.low}%`, color: COLORS.blue }] : []),
                  ].map((l, i) => (
                    <View key={i} style={styles.tirLegItem}>
                      <View style={[styles.tirDot, { backgroundColor: l.color }]} />
                      <Text style={styles.tirLegText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
                {timeInRange.normal >= 70 ? (
                  <Text style={styles.tirAdvice}>🎯 정상범위 {timeInRange.normal}% — 훌륭한 혈당 조절이에요!</Text>
                ) : timeInRange.normal >= 50 ? (
                  <Text style={styles.tirAdvice}>📈 정상범위 {timeInRange.normal}% — 조금 더 개선이 필요해요.</Text>
                ) : (
                  <Text style={styles.tirAdvice}>⚠️ 정상범위 {timeInRange.normal}% — 의사 상담을 권장합니다.</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── 시간대별 평균 ── */}
        {timingAvgs.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>⏰ 측정 시간대별 평균</Text>
            {timingAvgs.map(({ timing, avg, count }) => {
              const status = getBloodSugarStatus(avg, timing);
              const color = STATUS_COLOR[status];
              const label = TIMING_OPTIONS.find(t => t.value === timing)?.label ?? timing;
              const pct = Math.min(100, Math.round(avg / 250 * 100));
              return (
                <View key={timing} style={styles.timingRow}>
                  <Text style={styles.timingLabel}>{label}</Text>
                  <View style={styles.timingTrack}>
                    <View style={[styles.timingFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    {/* 정상 상한선 */}
                    <View style={[styles.timingThreshold, {
                      left: `${Math.round((timing === 'fasting' ? 100 : timing === 'after_meal_2h' ? 140 : 120) / 250 * 100)}%` as any,
                    }]} />
                  </View>
                  <Text style={[styles.timingAvgVal, { color }]}>{avg}</Text>
                  <Text style={styles.timingCount}>{count}회</Text>
                </View>
              );
            })}
            <Text style={styles.timingNote}>
              공복 &lt;100  ·  식후1h &lt;180  ·  식후2h &lt;140  mg/dL 목표
            </Text>
          </View>
        )}

        {/* 7일 트렌드 바 */}
        {trendDays.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>최근 7일 공복 혈당 추이</Text>
            <View style={styles.trendContainer}>
              {trendDays.map(({ date, avg }) => {
                const barH = Math.max(8, Math.min(80, (avg / 200) * 80));
                const color = avg < 100 ? COLORS.green : avg < 126 ? COLORS.gold : COLORS.red;
                return (
                  <View key={date} style={styles.trendCol}>
                    <Text style={[styles.trendVal, { color }]}>{avg}</Text>
                    <View style={styles.trendTrack}>
                      <View style={[styles.trendBar, { height: barH, backgroundColor: color }]} />
                      {/* 전당뇨 경계선 (100) */}
                      <View style={[styles.thresholdLine, { bottom: (100 / 200) * 80 }]} />
                    </View>
                    <Text style={styles.trendDate}>{date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.thresholdLabel}>— 100 mg/dL (정상 상한)</Text>
          </View>
        )}

        {/* 오늘 기록 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>오늘 기록 ({today})</Text>
          {todayEntries.length === 0 ? (
            <Text style={styles.mutedText}>오늘 측정한 혈당이 없어요</Text>
          ) : (
            todayEntries.map(entry => {
              const status = getBloodSugarStatus(entry.value, entry.timing);
              const color = STATUS_COLOR[status];
              const timingLabel = TIMING_OPTIONS.find(t => t.value === entry.timing)?.label ?? entry.timing;
              const advice = getBloodSugarAdvice(entry.value, entry.timing);
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.entryCard, { borderLeftColor: color }]}
                  onLongPress={() => handleDelete(entry)}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTiming}>{timingLabel}</Text>
                    <Text style={[styles.entryStatus, { color }]}>
                      {getBloodSugarStatusLabel(status)}
                    </Text>
                  </View>
                  <Text style={[styles.entryValue, { color }]}>{entry.value} mg/dL</Text>
                  <Text style={styles.entryAdvice}>{advice}</Text>
                  <Text style={styles.entryTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </Text>
                  <Text style={styles.longPressHint}>길게 누르면 삭제</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 정상 범위 안내 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>정상 범위 안내</Text>
          {REFERENCE.map((r, i) => (
            <View key={i} style={styles.refRow}>
              <View style={[styles.refDot, { backgroundColor: r.color }]} />
              <Text style={styles.refLabel}>{r.label}</Text>
              <Text style={[styles.refRange, { color: r.color }]}>{r.range}</Text>
            </View>
          ))}
          <Text style={styles.disclaimerText}>
            * 전당뇨 진단: 공복 100–125 mg/dL 또는 식후 2h 140–199 mg/dL{'\n'}
            * 본 앱은 참고용이며 의사 상담을 대체하지 않습니다.
          </Text>
        </View>

        {/* 혈당 관리 팁 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💡 혈당 관리 가이드</Text>
          {[
            { emoji: '🚶', tip: '식후 10분 산책이 혈당을 15–20 mg/dL 낮춥니다. 근육이 포도당을 소비하기 때문이에요.', tag: '운동' },
            { emoji: '🥗', tip: '채소 → 단백질 → 탄수화물 순서로 먹으면 혈당 스파이크가 줄어요. 섬유질이 당 흡수를 늦춥니다.', tag: '식사순서' },
            { emoji: '💧', tip: '식사 전 물 200ml가 혈당 조절을 도와줍니다. 수분 부족 시 혈당 농도가 올라가요.', tag: '수분' },
            { emoji: '🌾', tip: '흰쌀(GI 80) → 잡곡밥(GI 55)으로 교체하면 식후 혈당 스파이크를 30% 줄일 수 있어요.', tag: 'GI 조절' },
            { emoji: '😴', tip: '수면 6시간 이하 시 인슐린 저항성이 증가해 공복 혈당이 10–15 높아집니다.', tag: '수면' },
            { emoji: '📏', tip: '식후 2h 혈당이 140 이하면 좋은 식단이에요. 140–199는 내당능 장애 범위입니다.', tag: '기준' },
            { emoji: '🥜', tip: '견과류·아보카도 등 건강지방은 혈당 상승을 완만하게 해요. 식전 소량 섭취를 권장해요.', tag: '지방' },
            { emoji: '🍎', tip: '당도 높은 과일(포도·망고)보다 베리류·사과가 혈당에 유리해요. 과일도 양이 중요합니다.', tag: '과일' },
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.tipTagRow}>
                  <View style={styles.tipTag}><Text style={styles.tipTagText}>{t.tag}</Text></View>
                </View>
                <Text style={styles.tipText}>{t.tip}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 혈당 스파이크 메커니즘 설명 */}
        <View style={[styles.card, { borderColor: COLORS.orange + '44' }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.orange }]}>🔬 혈당 스파이크란?</Text>
          <Text style={styles.spikeDesc}>
            식사 후 혈당이 급격히 오르고 빠르게 떨어지는 현상을 혈당 스파이크라 합니다. 스파이크가 반복되면 인슐린 저항성이 높아지고 혈관에 부담을 줍니다.
          </Text>
          <View style={styles.spikeChart}>
            {/* 간단한 스파이크 시각화 */}
            {[
              { label: '식전', height: 20, color: COLORS.green,  val: '~95' },
              { label: '30분', height: 55, color: COLORS.gold,   val: '~160' },
              { label: '1시간', height: 75, color: COLORS.orange, val: '~180' },
              { label: '2시간', height: 35, color: COLORS.teal,   val: '~130' },
              { label: '3시간', height: 15, color: COLORS.green,  val: '~90' },
            ].map((p, i) => (
              <View key={i} style={styles.spikeCol}>
                <Text style={[styles.spikeVal, { color: p.color }]}>{p.val}</Text>
                <View style={styles.spikeBarTrack}>
                  <View style={[styles.spikeBar, { height: p.height, backgroundColor: p.color }]} />
                </View>
                <Text style={styles.spikeLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.spikeNote}>
            정상인 기준 예시 (개인차 있음) · 목표: 식후 2h &lt; 140 mg/dL
          </Text>
        </View>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* 혈당 입력 모달 */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>혈당 입력</Text>

            {/* 수치 입력 */}
            <Text style={styles.modalLabel}>혈당값 (mg/dL)</Text>
            <TextInput
              style={styles.numberInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="예: 95"
              placeholderTextColor={COLORS.textDisabled}
              maxLength={3}
              autoFocus
            />

            {/* 실시간 상태 표시 */}
            {inputValue.length > 0 && !isNaN(parseInt(inputValue)) && (
              <View style={[styles.liveStatus, {
                backgroundColor: STATUS_COLOR[getBloodSugarStatus(parseInt(inputValue), inputTiming)] + '22',
              }]}>
                <Text style={{ color: STATUS_COLOR[getBloodSugarStatus(parseInt(inputValue), inputTiming)], fontWeight: '700' }}>
                  {getBloodSugarStatusLabel(getBloodSugarStatus(parseInt(inputValue), inputTiming))}
                </Text>
              </View>
            )}

            {/* 측정 시점 */}
            <Text style={styles.modalLabel}>측정 시점</Text>
            <View style={styles.timingGrid}>
              {TIMING_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.timingBtn, inputTiming === opt.value && styles.timingBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setInputTiming(opt.value);
                  }}
                >
                  <Text style={[styles.timingBtnText, inputTiming === opt.value && { color: COLORS.purple }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.timingBtnDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 메모 (선택) */}
            <Text style={styles.modalLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.numberInput, { height: 60, textAlignVertical: 'top' }]}
              value={inputNote}
              onChangeText={setInputNote}
              placeholder="식사 메뉴 등 자유롭게"
              placeholderTextColor={COLORS.textDisabled}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
                <Text style={styles.confirmBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  diabetesTag: {
    backgroundColor: COLORS.orange + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.orange + '66',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  diabetesTagText: { color: COLORS.orange, fontSize: FONTS.xs, fontWeight: '700' },
  addBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sm },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  mutedText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avgValue: { fontSize: 56, fontWeight: '900' },
  avgUnit: { color: COLORS.textMuted, fontSize: FONTS.sm },
  avgStatus: { fontSize: FONTS.sm, fontWeight: '700', marginTop: 2 },
  // 트렌드
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 110,
  },
  trendCol: { flex: 1, alignItems: 'center', gap: 4 },
  trendVal: { fontSize: FONTS.xs, fontWeight: '700' },
  trendTrack: {
    width: '100%',
    height: 80,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  trendBar: { width: '100%', borderRadius: RADIUS.sm },
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.gold + '88',
  },
  trendDate: { fontSize: 10, color: COLORS.textMuted },
  thresholdLabel: { color: COLORS.gold, fontSize: FONTS.xs, marginTop: 4 },
  // 오늘 기록
  entryCard: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  entryTiming: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  entryStatus: { fontSize: FONTS.xs, fontWeight: '700' },
  entryValue: { fontSize: FONTS.xxl, fontWeight: '900', marginVertical: 2 },
  entryAdvice: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: 2 },
  entryTime: { color: COLORS.textDisabled, fontSize: FONTS.xs },
  longPressHint: { color: COLORS.textDisabled, fontSize: 10, marginTop: 2 },
  // 정상 범위
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  refDot: { width: 8, height: 8, borderRadius: 4 },
  refLabel: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.xs },
  refRange: { fontSize: FONTS.xs, fontWeight: '700' },
  disclaimerText: { color: COLORS.textDisabled, fontSize: FONTS.xs, marginTop: 8, lineHeight: 16 },
  // HbA1c
  hbRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hbLeft: { flex: 1 },
  hbLabel: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  hbDesc: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },
  hbBadge: { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  hbValue: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace' },
  hbStatus: { fontSize: FONTS.xxs, fontWeight: '800', marginTop: 2 },
  // Time-in-Range
  tirSection: {},
  tirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tirTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  tirCount: { color: COLORS.textMuted, fontSize: FONTS.xs },
  tirBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 1 },
  tirSeg: { height: '100%' },
  tirLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tirLegItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tirDot: { width: 8, height: 8, borderRadius: 4 },
  tirLegText: { color: COLORS.textMuted, fontSize: FONTS.xs },
  tirAdvice: { color: COLORS.textSub, fontSize: FONTS.xs, marginTop: 8, fontStyle: 'italic' },
  // 시간대별 평균
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timingLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600', width: 55 },
  timingTrack: { flex: 1, height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'visible', position: 'relative' },
  timingFill: { height: '100%', borderRadius: 4 },
  timingThreshold: { position: 'absolute', top: -3, bottom: -3, width: 1.5, backgroundColor: COLORS.border },
  timingAvgVal: { fontSize: FONTS.sm, fontWeight: '900', width: 36, textAlign: 'right', fontFamily: 'monospace' },
  timingCount: { color: COLORS.textDisabled, fontSize: FONTS.xxs, width: 24, textAlign: 'right' },
  timingNote: { color: COLORS.textDisabled, fontSize: FONTS.xxs, marginTop: 6 },
  // 팁
  tipRow: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  tipEmoji: { fontSize: 18, marginTop: 2 },
  tipTagRow: { flexDirection: 'row', marginBottom: 2 },
  tipTag: { backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 1 },
  tipTagText: { color: COLORS.purple, fontSize: 10, fontWeight: '700' },
  tipText: { color: COLORS.textMuted, fontSize: FONTS.xs, lineHeight: 18 },
  // 스파이크 설명
  spikeDesc: { color: COLORS.textMuted, fontSize: FONTS.xs, lineHeight: 18, marginBottom: 14 },
  spikeChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110, marginBottom: 8 },
  spikeCol: { flex: 1, alignItems: 'center' },
  spikeVal: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  spikeBarTrack: { width: '80%', height: 80, justifyContent: 'flex-end', alignItems: 'center' },
  spikeBar: { width: '100%', borderRadius: 3, opacity: 0.85 },
  spikeLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 4, textAlign: 'center' },
  spikeNote: { color: COLORS.textDisabled, fontSize: FONTS.xxs, textAlign: 'center' },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
    marginBottom: 6,
    marginTop: 12,
  },
  numberInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONTS.xxl,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  liveStatus: {
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    marginTop: 6,
  },
  timingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
  },
  timingBtnActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple + '22',
  },
  timingBtnText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  timingBtnDesc: { color: COLORS.textDisabled, fontSize: 10 },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.bgHighlight,
  },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.md },
  confirmBtn: {
    flex: 2,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
});
