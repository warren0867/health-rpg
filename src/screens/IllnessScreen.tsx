import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import {
  IllnessEntry, IllnessSymptom, IllnessType,
  ILLNESS_EMOJI, ILLNESS_LABELS, SYMPTOM_LABELS,
} from '../types';
import {
  calcImmunity, deleteIllness, generateId, getCurrentIllness,
  getIllnesses, getTodayKey, illnessDuration, saveIllness, syncDailyLogCalories,
} from '../utils/storage';

// 두 날짜 사이의 모든 날짜 생성 (YYYY-MM-DD)
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const ILLNESS_TYPES: IllnessType[] = [
  'cold', 'gastro', 'flu', 'fever', 'headache', 'fatigue', 'allergy', 'covid', 'injury', 'other',
];
const ALL_SYMPTOMS: IllnessSymptom[] = [
  'fever', 'runny_nose', 'cough', 'sore_throat', 'nausea', 'vomit',
  'diarrhea', 'stomach', 'fatigue', 'muscle', 'headache', 'chills', 'loss_appetite',
];
const SEVERITY_LABELS = ['', '가벼움', '약함', '보통', '심함', '매우 심함'];
const SEVERITY_COLORS = ['', COLORS.teal, COLORS.teal, COLORS.gold, COLORS.orange, COLORS.red];

export default function IllnessScreen() {
  const today = getTodayKey();
  const [illnesses, setIllnesses] = useState<IllnessEntry[]>([]);
  const [current, setCurrent] = useState<IllnessEntry | null>(null);
  const [immunity, setImmunity] = useState(85);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<IllnessEntry | null>(null);

  // 폼 상태
  const [formType, setFormType] = useState<IllnessType>('cold');
  const [formStart, setFormStart] = useState(today);
  const [formEnd, setFormEnd] = useState('');
  const [formSymptoms, setFormSymptoms] = useState<IllnessSymptom[]>([]);
  const [formSeverity, setFormSeverity] = useState<1|2|3|4|5>(2);
  const [formTemp, setFormTemp] = useState('');
  const [formNote, setFormNote] = useState('');

  const load = useCallback(async () => {
    const [all, cur, imm] = await Promise.all([getIllnesses(), getCurrentIllness(), calcImmunity()]);
    setIllnesses(all);
    setCurrent(cur);
    setImmunity(imm);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditEntry(null);
    setFormType('cold'); setFormStart(today); setFormEnd('');
    setFormSymptoms([]); setFormSeverity(2); setFormTemp(''); setFormNote('');
    setShowForm(true);
  };

  const openEdit = (e: IllnessEntry) => {
    setEditEntry(e);
    setFormType(e.type); setFormStart(e.startDate); setFormEnd(e.endDate ?? '');
    setFormSymptoms([...e.symptoms]); setFormSeverity(e.severity);
    setFormTemp(e.temperature ? String(e.temperature) : '');
    setFormNote(e.note ?? '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formStart) { Alert.alert('오류', '시작일을 입력하세요'); return; }
    if (formEnd && formEnd < formStart) { Alert.alert('오류', '종료일은 시작일 이후여야 합니다'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date().toISOString();
    const entry: IllnessEntry = {
      id: editEntry?.id ?? generateId(),
      type: formType,
      startDate: formStart,
      endDate: formEnd || undefined,
      symptoms: formSymptoms,
      severity: formSeverity,
      temperature: formTemp ? parseFloat(formTemp) : undefined,
      note: formNote || undefined,
      createdAt: editEntry?.createdAt ?? now,
      updatedAt: now,
    };
    await saveIllness(entry);
    // 질병 기간 동안의 점수 재계산
    const syncEnd = entry.endDate ?? today;
    const dates = getDatesInRange(entry.startDate, syncEnd);
    await Promise.all(dates.map(d => syncDailyLogCalories(d)));
    setShowForm(false);
    load();
  };

  const handleRecover = async (e: IllnessEntry) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const recovered = { ...e, endDate: today, updatedAt: new Date().toISOString() };
    await saveIllness(recovered);
    // 회복 완료 시 전체 기간 재계산
    const dates = getDatesInRange(e.startDate, today);
    await Promise.all(dates.map(d => syncDailyLogCalories(d)));
    load();
  };

  const handleDelete = (e: IllnessEntry) => {
    Alert.alert('삭제', `${ILLNESS_LABELS[e.type]} 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteIllness(e.id);
        load();
      }},
    ]);
  };

  const toggleSymptom = (s: IllnessSymptom) => {
    setFormSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const immunityColor = immunity >= 75 ? COLORS.teal : immunity >= 50 ? COLORS.gold : COLORS.red;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── 헤더 ── */}
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>🩺 건강 상태</Text>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Text style={s.addBtnText}>+ 기록</Text>
          </TouchableOpacity>
        </View>

        {/* ── 면역력 카드 ── */}
        <View style={[s.card, { borderColor: immunityColor + '44' }]}>
          <View style={s.immunityHeader}>
            <Text style={s.sectionTitle}>🛡️ 면역력</Text>
            <Text style={[s.immunityScore, { color: immunityColor }]}>{immunity}<Text style={s.immunityUnit}> / 100</Text></Text>
          </View>
          <View style={s.immunityTrack}>
            <View style={[s.immunityFill, { width: `${immunity}%` as any, backgroundColor: immunityColor }]} />
          </View>
          <Text style={s.immunityDesc}>
            {immunity >= 80 ? '면역 방어막이 강합니다. 지금 페이스 유지!' :
             immunity >= 60 ? '보통 수준. 수면·영양에 신경 쓰세요.' :
             immunity >= 40 ? '면역력이 약해졌어요. 충분한 휴식이 필요합니다.' :
             '면역력이 매우 낮아요! 무리하지 마세요.'}
          </Text>
        </View>

        {/* ── 현재 앓는 중 ── */}
        {current && (
          <View style={[s.activeCard, { borderColor: COLORS.red + '66' }]}>
            <View style={s.activeTop}>
              <Text style={s.activeEmoji}>{ILLNESS_EMOJI[current.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.activeName}>{ILLNESS_LABELS[current.type]} 앓는 중</Text>
                <Text style={s.activeDays}>시작 {current.startDate}  ·  {illnessDuration(current)}일째</Text>
              </View>
              <View style={[s.severityBadge, { backgroundColor: SEVERITY_COLORS[current.severity] + '22', borderColor: SEVERITY_COLORS[current.severity] + '66' }]}>
                <Text style={[s.severityBadgeText, { color: SEVERITY_COLORS[current.severity] }]}>{SEVERITY_LABELS[current.severity]}</Text>
              </View>
            </View>
            {current.temperature && (
              <Text style={s.tempText}>🌡️ 체온 {current.temperature}°C</Text>
            )}
            {current.symptoms.length > 0 && (
              <View style={s.symptomChips}>
                {current.symptoms.map(sym => (
                  <View key={sym} style={s.symptomChip}>
                    <Text style={s.symptomChipText}>{SYMPTOM_LABELS[sym]}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={s.activeActions}>
              <TouchableOpacity style={s.editSmallBtn} onPress={() => openEdit(current)}>
                <Text style={s.editSmallBtnText}>편집</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.recoverBtn} onPress={() => handleRecover(current)}>
                <Text style={s.recoverBtnText}>✓ 회복 완료</Text>
              </TouchableOpacity>
            </View>
            {/* HP 디버프 안내 */}
            <Text style={s.debuffNote}>
              ⚠️ 앓는 동안 HP·회복력·컨디션이 자동으로 감소합니다
            </Text>
          </View>
        )}

        {/* ── 기록 폼 ── */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>{editEntry ? '기록 수정' : '질병 기록 추가'}</Text>

            {/* 종류 선택 */}
            <Text style={s.formLabel}>종류</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ILLNESS_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, formType === t && s.typeBtnActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFormType(t); }}
                  >
                    <Text style={s.typeEmoji}>{ILLNESS_EMOJI[t]}</Text>
                    <Text style={[s.typeLabel, formType === t && { color: COLORS.purple }]}>{ILLNESS_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* 날짜 */}
            <View style={s.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>시작일</Text>
                <TextInput
                  style={s.formInput}
                  value={formStart}
                  onChangeText={setFormStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textDisabled}
                />
              </View>
              <Text style={s.dateSep}>→</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>종료일 (완쾌 시)</Text>
                <TextInput
                  style={s.formInput}
                  value={formEnd}
                  onChangeText={setFormEnd}
                  placeholder="비우면 진행 중"
                  placeholderTextColor={COLORS.textDisabled}
                />
              </View>
            </View>

            {/* 심각도 */}
            <Text style={s.formLabel}>심각도</Text>
            <View style={s.severityRow}>
              {([1,2,3,4,5] as const).map(sv => (
                <TouchableOpacity
                  key={sv}
                  style={[s.svBtn, formSeverity === sv && { borderColor: SEVERITY_COLORS[sv], backgroundColor: SEVERITY_COLORS[sv] + '22' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFormSeverity(sv); }}
                >
                  <Text style={[s.svBtnNum, formSeverity === sv && { color: SEVERITY_COLORS[sv] }]}>{sv}</Text>
                  <Text style={[s.svBtnLabel, formSeverity === sv && { color: SEVERITY_COLORS[sv] }]}>{SEVERITY_LABELS[sv]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 증상 */}
            <Text style={s.formLabel}>증상 (복수 선택)</Text>
            <View style={s.symptomGrid}>
              {ALL_SYMPTOMS.map(sym => (
                <TouchableOpacity
                  key={sym}
                  style={[s.symptomPick, formSymptoms.includes(sym) && s.symptomPickActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSymptom(sym); }}
                >
                  <Text style={[s.symptomPickText, formSymptoms.includes(sym) && { color: COLORS.purple }]}>
                    {SYMPTOM_LABELS[sym]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 체온 */}
            <Text style={s.formLabel}>체온 (°C, 선택)</Text>
            <TextInput
              style={s.formInput}
              value={formTemp}
              onChangeText={setFormTemp}
              placeholder="예: 38.2"
              placeholderTextColor={COLORS.textDisabled}
              keyboardType="decimal-pad"
            />

            {/* 메모 */}
            <Text style={s.formLabel}>메모 (선택)</Text>
            <TextInput
              style={[s.formInput, { height: 60 }]}
              value={formNote}
              onChangeText={setFormNote}
              placeholder="증상, 복용한 약 등"
              placeholderTextColor={COLORS.textDisabled}
              multiline
            />

            <View style={s.formBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 질병 타임라인 ── */}
        <Text style={s.timelineTitle}>기록 타임라인</Text>
        {illnesses.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>💪</Text>
            <Text style={s.emptyText}>아직 질병 기록이 없어요{'\n'}건강하게 지내고 계시군요!</Text>
          </View>
        ) : (
          illnesses.map((e, idx) => {
            const isActive = !e.endDate;
            const dur = illnessDuration(e);
            return (
              <View key={e.id} style={[s.timelineItem, idx < illnesses.length - 1 && s.timelineItemBorder]}>
                {/* 타임라인 선 */}
                <View style={s.timelineDotCol}>
                  <View style={[s.timelineDot, { backgroundColor: isActive ? COLORS.red : COLORS.teal }]} />
                  {idx < illnesses.length - 1 && <View style={s.timelineLine} />}
                </View>

                <View style={s.timelineContent}>
                  <View style={s.timelineTopRow}>
                    <Text style={s.timelineEmoji}>{ILLNESS_EMOJI[e.type]}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.timelineName}>{ILLNESS_LABELS[e.type]}</Text>
                        {isActive && (
                          <View style={s.activePill}>
                            <Text style={s.activePillText}>앓는 중</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.timelineDates}>
                        {e.startDate}  {e.endDate ? `→ ${e.endDate}` : '→ 진행 중'}
                        {'  ·  '}{dur}일
                      </Text>
                    </View>
                    <View style={[s.severityDot, { backgroundColor: SEVERITY_COLORS[e.severity] }]}>
                      <Text style={s.severityDotText}>{e.severity}</Text>
                    </View>
                  </View>

                  {e.temperature && (
                    <Text style={s.timelineTemp}>🌡️ {e.temperature}°C</Text>
                  )}
                  {e.symptoms.length > 0 && (
                    <View style={s.symptomChips}>
                      {e.symptoms.map(sym => (
                        <View key={sym} style={s.symptomChipSmall}>
                          <Text style={s.symptomChipSmallText}>{SYMPTOM_LABELS[sym]}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {e.note && <Text style={s.timelineNote}>"{e.note}"</Text>}

                  <View style={s.timelineActions}>
                    {isActive && (
                      <TouchableOpacity style={s.recoverSmallBtn} onPress={() => handleRecover(e)}>
                        <Text style={s.recoverSmallBtnText}>회복 완료</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.editSmallBtn} onPress={() => openEdit(e)}>
                      <Text style={s.editSmallBtnText}>편집</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteSmallBtn} onPress={() => handleDelete(e)}>
                      <Text style={s.deleteSmallBtnText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.purple,
  },
  addBtnText: { color: COLORS.purple, fontSize: FONTS.sm, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '800', letterSpacing: 0.5 },

  // 면역력
  immunityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  immunityScore: { fontSize: FONTS.xxl, fontWeight: '900', fontFamily: 'monospace' },
  immunityUnit: { fontSize: FONTS.sm, color: COLORS.textMuted },
  immunityTrack: { height: 10, backgroundColor: COLORS.bgHighlight, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  immunityFill: { height: '100%', borderRadius: 5 },
  immunityDesc: { color: COLORS.textSub, fontSize: FONTS.xs, lineHeight: 18 },

  // 현재 앓는 중
  activeCard: {
    backgroundColor: COLORS.red + '0D', borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  activeEmoji: { fontSize: 32 },
  activeName: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800' },
  activeDays: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  severityBadge: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  severityBadgeText: { fontSize: FONTS.xs, fontWeight: '800' },
  tempText: { color: COLORS.textSub, fontSize: FONTS.xs, marginBottom: 6 },
  symptomChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  symptomChip: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  symptomChipText: { color: COLORS.textSub, fontSize: FONTS.xxs },
  activeActions: { flexDirection: 'row', gap: 8 },
  recoverBtn: {
    flex: 1, backgroundColor: COLORS.teal, borderRadius: RADIUS.md,
    paddingVertical: 10, alignItems: 'center',
  },
  recoverBtnText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '800' },
  debuffNote: { color: COLORS.red, fontSize: FONTS.xxs, marginTop: 8, opacity: 0.8 },

  // 폼
  formCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.purple + '44',
  },
  formTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800', marginBottom: 14 },
  formLabel: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  formInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.border, color: COLORS.text, fontSize: FONTS.sm,
    padding: SPACING.sm, marginBottom: 4,
  },
  typeBtn: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput, minWidth: 60,
  },
  typeBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  typeEmoji: { fontSize: 20, marginBottom: 2 },
  typeLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 4 },
  dateSep: { color: COLORS.textMuted, fontSize: FONTS.md, marginBottom: 10 },
  severityRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  svBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bgInput,
  },
  svBtnNum: { color: COLORS.textMuted, fontSize: FONTS.md, fontWeight: '900' },
  svBtnLabel: { color: COLORS.textDisabled, fontSize: 9 },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  symptomPick: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 5, backgroundColor: COLORS.bgInput,
  },
  symptomPickActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  symptomPickText: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600' },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xl,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  saveBtn: {
    flex: 2, backgroundColor: COLORS.purple, borderRadius: RADIUS.xl,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },

  // 타임라인
  timelineTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineItemBorder: {},
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  timelineEmoji: { fontSize: 22 },
  timelineName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700' },
  timelineDates: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },
  activePill: {
    backgroundColor: COLORS.red + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.red + '55',
  },
  activePillText: { color: COLORS.red, fontSize: 9, fontWeight: '800' },
  severityDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  severityDotText: { color: '#fff', fontSize: FONTS.xxs, fontWeight: '900' },
  timelineTemp: { color: COLORS.textSub, fontSize: FONTS.xxs, marginBottom: 4 },
  symptomChipSmall: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  symptomChipSmallText: { color: COLORS.textDisabled, fontSize: 9 },
  timelineNote: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontStyle: 'italic', marginTop: 4 },
  timelineActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  recoverSmallBtn: {
    backgroundColor: COLORS.teal + '22', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.teal + '55',
  },
  recoverSmallBtnText: { color: COLORS.teal, fontSize: FONTS.xxs, fontWeight: '700' },
  editSmallBtn: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  editSmallBtnText: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700' },
  deleteSmallBtn: {
    backgroundColor: COLORS.red + '11', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  deleteSmallBtnText: { color: COLORS.red, fontSize: FONTS.xxs, fontWeight: '700' },

  // 비어있을 때
  emptyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', lineHeight: 22 },
});
