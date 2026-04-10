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
    setWeeklyAvg(calcWeeklyAvgBloodSugar(all));
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
          <Text style={styles.sectionTitle}>혈당 관리 팁</Text>
          {[
            { emoji: '🚶', tip: '식후 10분 산책이 혈당을 15-20 낮춥니다.' },
            { emoji: '🥗', tip: '채소 → 단백질 → 탄수화물 순서로 먹으면 혈당 스파이크 줄어요.' },
            { emoji: '💧', tip: '식사 전 물 한 컵이 혈당 조절을 도와줘요.' },
            { emoji: '🚫', tip: '흰쌀밥 대신 잡곡밥으로 GI를 낮춰보세요.' },
            { emoji: '😴', tip: '수면 부족은 혈당 조절 호르몬을 방해해요.' },
            { emoji: '📊', tip: '식후 2시간 혈당이 140 이하면 좋은 식단이에요.' },
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipEmoji}>{t.emoji}</Text>
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
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
  // 팁
  tipRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 20 },
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
