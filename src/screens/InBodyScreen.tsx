import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { useRefresh } from '../context/RefreshContext';
import { InBodyRecord } from '../types';
import {
  deleteInBodyRecord, generateId, getInBodyRecords, getTodayKey,
  recalcAndSavePermanentStats, saveInBodyRecord,
} from '../utils/storage';

type Form = {
  date: string;
  score: string;
  weight: string;
  skeletalMuscleMass: string;
  bodyFatMass: string;
  bodyFatPercentage: string;
  bmi: string;
  note: string;
};

const EMPTY_FORM: Form = {
  date: '', score: '', weight: '', skeletalMuscleMass: '',
  bodyFatMass: '', bodyFatPercentage: '', bmi: '', note: '',
};

export default function InBodyScreen() {
  const { triggerRefresh } = useRefresh();
  const [records, setRecords] = useState<InBodyRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ ...EMPTY_FORM, date: getTodayKey() });

  const load = useCallback(async () => {
    setRecords(await getInBodyRecords());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: getTodayKey() });
    setShowForm(true);
  };

  const openEdit = (r: InBodyRecord) => {
    setEditingId(r.id);
    setForm({
      date: r.date,
      score: String(r.score),
      weight: String(r.weight),
      skeletalMuscleMass: String(r.skeletalMuscleMass),
      bodyFatMass: String(r.bodyFatMass),
      bodyFatPercentage: String(r.bodyFatPercentage),
      bmi: String(r.bmi),
      note: r.note ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const score = parseFloat(form.score);
    const weight = parseFloat(form.weight);
    const smm = parseFloat(form.skeletalMuscleMass);
    const bfm = parseFloat(form.bodyFatMass);
    const bfp = parseFloat(form.bodyFatPercentage);
    const bmi = parseFloat(form.bmi);

    if (!form.date) { Alert.alert('오류', '측정일을 입력해주세요'); return; }
    if (isNaN(score) || score < 0 || score > 100) { Alert.alert('오류', '인바디 점수(0~100)'); return; }
    if (isNaN(weight) || weight < 20 || weight > 300) { Alert.alert('오류', '체중(20~300kg)'); return; }
    if (isNaN(smm) || smm < 5 || smm > 80) { Alert.alert('오류', '골격근량(5~80kg)'); return; }
    if (isNaN(bfm) || bfm < 0 || bfm > 100) { Alert.alert('오류', '체지방량(0~100kg)'); return; }
    if (isNaN(bfp) || bfp < 0 || bfp > 70) { Alert.alert('오류', '체지방률(0~70%)'); return; }
    if (isNaN(bmi) || bmi < 10 || bmi > 60) { Alert.alert('오류', 'BMI(10~60)'); return; }

    const now = new Date().toISOString();
    const rec: InBodyRecord = {
      id: editingId ?? generateId(),
      date: form.date,
      score, weight,
      skeletalMuscleMass: smm,
      bodyFatMass: bfm,
      bodyFatPercentage: bfp,
      bmi,
      note: form.note.trim() || undefined,
      createdAt: now,
    };
    await saveInBodyRecord(rec);
    await recalcAndSavePermanentStats();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
    setEditingId(null);
    load();
    triggerRefresh();
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제', '이 인바디 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await deleteInBodyRecord(id);
          await recalcAndSavePermanentStats();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          load();
          triggerRefresh();
        }
      }
    ]);
  };

  // 변화량 계산 (최신 vs 첫 측정)
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const hasDelta = sorted.length >= 2;
  const dSmm = hasDelta ? +(latest.skeletalMuscleMass - first.skeletalMuscleMass).toFixed(1) : 0;
  const dFat = hasDelta ? +(latest.bodyFatPercentage - first.bodyFatPercentage).toFixed(1) : 0;
  const dScore = hasDelta ? +(latest.score - first.score).toFixed(1) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.title}>인바디</Text>
          <Text style={s.sub}>측정 결과를 직접 입력하면 영구 스탯에 반영돼요</Text>

          {hasDelta && (
            <View style={s.deltaCard}>
              <Text style={s.deltaTitle}>전체 변화 (첫 측정 → 최근)</Text>
              <View style={s.deltaRow}>
                <DeltaPill label="골격근" value={dSmm} unit="kg" good={dSmm > 0} />
                <DeltaPill label="체지방률" value={dFat} unit="%p" good={dFat < 0} />
                <DeltaPill label="점수" value={dScore} unit="" good={dScore > 0} />
              </View>
              <Text style={s.deltaHint}>
                골격근↑ STR·VIT · 체지방↓ AGI·END · 점수↑ 전체 보너스
              </Text>
            </View>
          )}

          {records.length === 0 && !showForm && (
            <View style={s.emptyBox}>
              <Ionicons name="body-outline" size={40} color={COLORS.textDisabled} />
              <Text style={s.emptyText}>아직 인바디 기록이 없어요</Text>
              <Text style={s.emptyHint}>최소 2회 측정 시 변화량에 따라 영구 스탯이 누적됩니다</Text>
            </View>
          )}

          {records.map(r => (
            <TouchableOpacity key={r.id} style={s.recordCard} onPress={() => openEdit(r)}>
              <View style={s.recordTop}>
                <Text style={s.recordDate}>{r.date}</Text>
                <Text style={s.recordScore}>{r.score}점</Text>
                <TouchableOpacity onPress={() => handleDelete(r.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={s.recordDelete}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={s.recordGrid}>
                <RecordItem label="체중" value={`${r.weight}kg`} />
                <RecordItem label="골격근" value={`${r.skeletalMuscleMass}kg`} />
                <RecordItem label="체지방" value={`${r.bodyFatPercentage}%`} />
                <RecordItem label="BMI" value={`${r.bmi}`} />
              </View>
              {r.note && <Text style={s.recordNote}>{r.note}</Text>}
            </TouchableOpacity>
          ))}

          {showForm ? (
            <View style={s.form}>
              <Text style={s.formTitle}>{editingId ? '인바디 수정' : '인바디 입력'}</Text>

              <FieldRow label="측정일 (YYYY-MM-DD)" value={form.date}
                onChange={(v) => setForm(f => ({ ...f, date: v }))} placeholder="2026-05-11" />
              <View style={s.row2}>
                <FieldRow label="인바디 점수" value={form.score} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, score: v }))} placeholder="85" />
                <FieldRow label="체중 (kg)" value={form.weight} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, weight: v }))} placeholder="70.5" />
              </View>
              <View style={s.row2}>
                <FieldRow label="골격근량 (kg)" value={form.skeletalMuscleMass} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, skeletalMuscleMass: v }))} placeholder="32.1" />
                <FieldRow label="체지방량 (kg)" value={form.bodyFatMass} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, bodyFatMass: v }))} placeholder="15.3" />
              </View>
              <View style={s.row2}>
                <FieldRow label="체지방률 (%)" value={form.bodyFatPercentage} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, bodyFatPercentage: v }))} placeholder="21.8" />
                <FieldRow label="BMI" value={form.bmi} keyboardType="numeric"
                  onChange={(v) => setForm(f => ({ ...f, bmi: v }))} placeholder="23.4" />
              </View>
              <FieldRow label="메모 (선택)" value={form.note}
                onChange={(v) => setForm(f => ({ ...f, note: v }))} placeholder="아침 공복 측정 등" />

              <View style={s.formBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => { setShowForm(false); setEditingId(null); }}>
                  <Text style={s.btnCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSave} onPress={handleSave}>
                  <Text style={s.btnSaveText}>{editingId ? '수정 저장' : '저장'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addBtn} onPress={openNew}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addBtnText}>인바디 측정 추가</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldRow({ label, value, onChange, placeholder, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDisabled}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

function RecordItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.recordItem}>
      <Text style={s.recordItemLabel}>{label}</Text>
      <Text style={s.recordItemVal}>{value}</Text>
    </View>
  );
}

function DeltaPill({ label, value, unit, good }: { label: string; value: number; unit: string; good: boolean }) {
  const color = value === 0 ? COLORS.textMuted : good ? COLORS.good : COLORS.bad;
  const sign = value > 0 ? '+' : '';
  return (
    <View style={[s.pill, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Text style={s.pillLabel}>{label}</Text>
      <Text style={[s.pillVal, { color }]}>{sign}{value}{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  title: { color: COLORS.text, fontSize: FONTS.xl, fontWeight: '900' },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 4, marginBottom: SPACING.md },

  deltaCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  deltaTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700', marginBottom: 10 },
  deltaRow: { flexDirection: 'row', gap: 8 },
  deltaHint: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 10, lineHeight: 16 },
  pill: {
    flex: 1, borderRadius: RADIUS.md, padding: 8,
    borderWidth: 1, alignItems: 'center',
  },
  pillLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600' },
  pillVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace', marginTop: 4 },

  emptyBox: {
    alignItems: 'center', padding: SPACING.lg,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  emptyText: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', marginTop: 10 },
  emptyHint: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 6, textAlign: 'center', lineHeight: 16 },

  recordCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recordTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recordDate: { color: COLORS.textSub, fontSize: FONTS.xs, fontFamily: 'monospace', flex: 1 },
  recordScore: { color: COLORS.amber, fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace', marginRight: 12 },
  recordDelete: { color: COLORS.textDisabled, fontSize: FONTS.md },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recordItem: { width: '47%' },
  recordItemLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  recordItemVal: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', fontFamily: 'monospace' },
  recordNote: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 8, fontStyle: 'italic' },

  form: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  formTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '900', marginBottom: 12 },
  field: { marginBottom: 10, flex: 1 },
  fieldLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700', marginBottom: 4 },
  fieldInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.sm,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'monospace',
  },
  row2: { flexDirection: 'row', gap: 10 },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: {
    flex: 1, backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center',
  },
  btnCancelText: { color: COLORS.textSub, fontWeight: '700', fontSize: FONTS.sm },
  btnSave: {
    flex: 2, backgroundColor: COLORS.primary,
    paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center',
  },
  btnSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: FONTS.sm },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.primary + '55', borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: 14,
    backgroundColor: COLORS.primary + '08',
  },
  addBtnText: { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: '700' },
});
