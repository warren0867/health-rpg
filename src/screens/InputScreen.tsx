import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { AlcoholInput, AlcoholType, BP_STATUS_COLOR, BP_STATUS_LABEL, DailyLog, ExerciseInput, ExerciseType, getBPStatus, MedLog, Medication, MED_TIME_LABEL, MOOD_EMOJI, MOOD_LABEL, MoodLevel, RootStackParamList, SleepInput } from '../types';
import {
  addXP, generateId, getDailyLog, getFoodEntriesByDate,
  getMedications, getMedLog, toggleMedTaken,
  getMorningBS, getStreak, getTodayKey, getUserProfile, saveDailyLog, saveMedication, deleteMedication, sumFoodEntries,
} from '../utils/storage';
import { calcXPGain } from '../utils/levelSystem';
import {
  ALCOHOL_CAL_PER_UNIT, ALCOHOL_EMOJI, ALCOHOL_LABELS, ALCOHOL_UNITS,
  EXERCISE_LABELS, EXERCISE_MET,
  calculateScore, calculateStats, calcAlcoholCalories, calcExerciseCalories,
} from '../utils/scoreCalculator';

type Nav = StackNavigationProp<RootStackParamList>;

const EXERCISE_OPTIONS: ExerciseType[] = ['walk', 'run', 'cycling', 'gym', 'swim', 'hiking', 'yoga', 'pilates', 'tennis', 'soccer'];
const ALCOHOL_TYPES: AlcoholType[] = ['beer_can', 'beer_bottle', 'soju', 'makgeolli', 'whiskey', 'wine', 'highball', 'bomb'];
const DURATION_OPTIONS = [30, 40, 50, 60, 70, 80, 90];

// 최근 N일 날짜 배열 (오늘 포함, 최신 순)
function getDateOptions(n = 7): string[] {
  const opts: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    opts.push(d.toISOString().split('T')[0]);
  }
  return opts;
}

function dateLabel(dateStr: string, todayStr: string): string {
  const diff = Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

// ─── RPG 선택 버튼 (컴팩트) ───────────────────────────────
function ChipBtn({ label, sub, selected, onPress, color = COLORS.purple }: {
  label: string; sub?: string; selected: boolean; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[c.chip, selected && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.75}
    >
      <Text style={[c.chipText, selected && { color }]}>{label}</Text>
      {sub && <Text style={c.chipSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

// ─── 섹션 (퀘스트 패널) ──────────────────────────────────
function QuestPanel({ icon, title, badge, children }: {
  icon: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <View style={c.panel}>
      <View style={c.panelHeader}>
        <View style={c.panelTitleRow}>
          <Text style={c.panelIcon}>{icon}</Text>
          <Text style={c.panelTitle}>{title}</Text>
        </View>
        {badge && (
          <View style={c.effectBadge}>
            <Text style={c.effectText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── 효과 미리보기 태그 ───────────────────────────────────
function EffectTag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[c.effectTag, { backgroundColor: color + '18', borderColor: color + '44' }]}>
      <Text style={[c.effectTagText, { color }]}>{label}</Text>
    </View>
  );
}

export default function InputScreen() {
  const navigation = useNavigation<Nav>();
  const today = getTodayKey();
  const dateOptions = getDateOptions(7);

  const [selectedDate, setSelectedDate] = useState(today);
  const [sleep, setSleep] = useState<SleepInput>({ hours: 7 });
  const [selectedExercises, setSelectedExercises] = useState<ExerciseType[]>([]);
  const [duration, setDuration] = useState(30);
  const [alcohol, setAlcohol] = useState<AlcoholInput>({ consumed: false, items: [] });
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [bpPulse, setBpPulse] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // 약 복용
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medLog, setMedLog] = useState<MedLog>({ date: today, taken: [] });
  const [showMedModal, setShowMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedTimes, setNewMedTimes] = useState<string[]>(['morning']);

  // 약 목록 + 당일 복용 로그 로드
  const loadMeds = useCallback(async (date: string) => {
    const [meds, log] = await Promise.all([getMedications(), getMedLog(date)]);
    setMedications(meds);
    setMedLog(log);
  }, []);

  // 선택한 날짜의 기존 데이터 불러와서 폼에 채우기
  const loadDate = useCallback(async (date: string) => {
    loadMeds(date);
    const existing = await getDailyLog(date);
    if (existing) {
      setHasExisting(true);
      setSleep(existing.sleep ?? { hours: 7 });
      const exTypes = existing.exercise?.types?.filter(t => t !== 'none') ?? [];
      const legacyType = existing.exercise?.type;
      const activeTypes = exTypes.length > 0 ? exTypes : (legacyType && legacyType !== 'none' ? [legacyType] : []);
      setSelectedExercises(activeTypes as ExerciseType[]);
      setDuration(existing.exercise?.minutes > 0 ? existing.exercise.minutes : 30);
      setAlcohol(existing.alcohol ?? { consumed: false, items: [] });
      setMood(existing.mood ?? null);
      setBpSys(existing.bloodPressure?.systolic ? String(existing.bloodPressure.systolic) : '');
      setBpDia(existing.bloodPressure?.diastolic ? String(existing.bloodPressure.diastolic) : '');
      setBpPulse(existing.bloodPressure?.pulse ? String(existing.bloodPressure.pulse) : '');
    } else {
      setHasExisting(false);
      setSleep({ hours: 7 });
      setSelectedExercises([]);
      setDuration(30);
      setAlcohol({ consumed: false, items: [] });
      setMood(null);
      setBpSys(''); setBpDia(''); setBpPulse('');
    }
  }, []);

  // 날짜 변경 시 데이터 로드
  useEffect(() => { loadDate(selectedDate); }, [selectedDate, loadDate]);

  // 화면 포커스될 때마다 현재 날짜 데이터 새로고침
  useFocusEffect(useCallback(() => { loadDate(selectedDate); }, [selectedDate, loadDate]));

  const toggleExercise = (type: ExerciseType) => {
    setSelectedExercises(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const burnCal = calcExerciseCalories({ types: selectedExercises, minutes: duration }, 70);
  const alcoholCal = calcAlcoholCalories(alcohol);

  const toggleAlcohol = (type: AlcoholType) => {
    setAlcohol(prev => {
      const exists = prev.items.find(i => i.type === type);
      if (exists) {
        const items = prev.items.filter(i => i.type !== type);
        return { consumed: items.length > 0, items };
      }
      return { consumed: true, items: [...prev.items, { type, amount: 1 }] };
    });
  };

  const adjustAmount = (type: AlcoholType, delta: number) => {
    setAlcohol(prev => {
      const items = prev.items.map(i => {
        if (i.type !== type) return i;
        return { ...i, amount: Math.max(0.5, Math.round((i.amount + delta) * 2) / 2) };
      }).filter(i => i.amount > 0);
      return { consumed: items.length > 0, items };
    });
  };

  const buildLog = async (goToResult: boolean) => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const exercise: ExerciseInput = selectedExercises.length > 0
      ? { types: selectedExercises, minutes: duration }
      : { types: [], minutes: 0 };

    const [morningBS, foodEntries, profile, existingLog, streak] = await Promise.all([
      getMorningBS(selectedDate), getFoodEntriesByDate(selectedDate),
      getUserProfile(), getDailyLog(selectedDate), getStreak(),
    ]);

    const foodSum = sumFoodEntries(foodEntries);
    const targetCal = profile?.targetCalories ?? 2000;
    const weightKg = profile?.weightKg ?? 70;

    const breakdown = calculateScore(sleep, exercise, alcohol, morningBS, foodSum.calories, targetCal);
    const stats = calculateStats(breakdown, exercise, sleep, morningBS);
    const exerciseCalories = calcExerciseCalories(exercise, weightKg);
    const xpGained = calcXPGain(breakdown.total, streak);
    const now = new Date().toISOString();

    const sys = parseInt(bpSys);
    const dia = parseInt(bpDia);
    const pulse = parseInt(bpPulse);
    const bloodPressure = sys > 0 && dia > 0
      ? { systolic: sys, diastolic: dia, ...(pulse > 0 ? { pulse } : {}) }
      : undefined;

    const log: DailyLog = {
      id: existingLog?.id ?? generateId(),
      date: selectedDate, alcohol, exercise, sleep,
      conditionScore: breakdown.total,
      scoreBreakdown: breakdown, stats, exerciseCalories,
      alcoholCalories: alcoholCal,
      mood: mood ?? undefined,
      bloodPressure,
      xpGained,
      createdAt: existingLog?.createdAt ?? now, updatedAt: now,
    };

    await saveDailyLog(log);
    if (!existingLog) await addXP(xpGained); // 첫 저장 시만 XP 지급

    setSaving(false);
    setHasExisting(true);

    if (goToResult) {
      navigation.navigate('Result', { log });
    }
  };

  // 약 추가 저장
  const handleSaveMed = async () => {
    if (!newMedName.trim()) { Alert.alert('오류', '약 이름을 입력해주세요'); return; }
    if (newMedTimes.length === 0) { Alert.alert('오류', '복용 시간을 하나 이상 선택해주세요'); return; }
    const colors = [COLORS.purple, COLORS.teal, COLORS.gold, COLORS.red, COLORS.blue];
    const med: Medication = {
      id: generateId(), name: newMedName.trim(),
      dose: newMedDose.trim() || '1정',
      times: newMedTimes,
      color: colors[medications.length % colors.length],
      createdAt: new Date().toISOString(),
    };
    await saveMedication(med);
    setNewMedName(''); setNewMedDose(''); setNewMedTimes(['morning']);
    setShowMedModal(false);
    loadMeds(selectedDate);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteMed = (id: string) => {
    Alert.alert('삭제', '이 약을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await deleteMedication(id); loadMeds(selectedDate); } },
    ]);
  };

  const handleToggleMed = async (medId: string, time: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleMedTaken(selectedDate, `${medId}_${time}`);
    setMedLog(updated);
  };

  // 수면 효과
  const sleepEffect = sleep.hours >= 7 && sleep.hours <= 8 ? { label: '최적', color: COLORS.teal }
    : sleep.hours >= 6 ? { label: '양호', color: COLORS.gold }
    : sleep.hours <= 5 ? { label: '부족', color: COLORS.red }
    : { label: '과수면', color: COLORS.textMuted };

  const isToday = selectedDate === today;

  return (
    <SafeAreaView style={c.safe}>
      <ScrollView contentContainerStyle={c.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 날짜 선택 ── */}
        <View style={c.dateSection}>
          <Text style={c.dateSectionLabel}>📅 날짜 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {dateOptions.map(date => {
                const isSelected = date === selectedDate;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[c.dateChip, isSelected && c.dateChipSelected]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(date); }}
                  >
                    <Text style={[c.dateChipLabel, isSelected && c.dateChipLabelSelected]}>
                      {dateLabel(date, today)}
                    </Text>
                    <Text style={[c.dateChipDate, isSelected && { color: COLORS.purple }]}>
                      {date.slice(5).replace('-', '/')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={c.pageHeader}>
          <Text style={c.pageTitle}>{dateLabel(selectedDate, today)} 기록</Text>
          <Text style={c.pageSub}>
            {hasExisting ? '저장된 기록 있음 — 수정 후 다시 저장하세요' : '기록하면 캐릭터 스탯이 올라갑니다'}
          </Text>
        </View>

        {/* ── 기분 ── */}
        <QuestPanel icon="💭" title="기분">
          <View style={c.moodRow}>
            {([1, 2, 3, 4, 5] as MoodLevel[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[c.moodBtn, mood === m && { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMood(m); }}
              >
                <Text style={c.moodEmoji}>{MOOD_EMOJI[m]}</Text>
                <Text style={[c.moodLabel, mood === m && { color: COLORS.purple }]}>{MOOD_LABEL[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </QuestPanel>

        {/* ── 수면 ── */}
        <QuestPanel icon="😴" title="수면" badge={sleepEffect.label}>
          <View style={c.chips}>
            {[4, 5, 6, 7, 8, 9, 10].map(h => (
              <ChipBtn
                key={h} label={`${h}h`}
                selected={sleep.hours === h}
                onPress={() => setSleep({ hours: h })}
                color={h >= 7 && h <= 8 ? COLORS.teal : h === 6 ? COLORS.gold : COLORS.red}
              />
            ))}
          </View>
          <View style={c.effectRow}>
            <EffectTag label={sleepEffect.label} color={sleepEffect.color} />
            <EffectTag
              label={sleep.hours >= 7 ? 'HP 회복 +15' : sleep.hours >= 6 ? 'HP 회복 +8' : 'HP 회복 -10'}
              color={sleep.hours >= 7 ? COLORS.teal : sleep.hours >= 6 ? COLORS.gold : COLORS.red}
            />
          </View>
        </QuestPanel>

        {/* ── 운동 ── */}
        <QuestPanel
          icon="🏃"
          title="운동"
          badge={selectedExercises.length > 0 ? `${burnCal}kcal 소모` : undefined}
        >
          <Text style={c.subLabel}>종류 선택 (다중)</Text>
          <View style={c.chips}>
            {EXERCISE_OPTIONS.map(type => (
              <ChipBtn
                key={type}
                label={EXERCISE_LABELS[type]}
                sub={`MET ${EXERCISE_MET[type]}`}
                selected={selectedExercises.includes(type)}
                onPress={() => toggleExercise(type)}
                color={COLORS.gold}
              />
            ))}
          </View>

          {selectedExercises.length > 0 && (
            <>
              <Text style={c.subLabel}>훈련 시간</Text>
              <View style={c.chips}>
                {DURATION_OPTIONS.map(m => (
                  <ChipBtn key={m} label={`${m}분`} selected={duration === m}
                    onPress={() => setDuration(m)} color={COLORS.gold} />
                ))}
              </View>
              <View style={c.calPreview}>
                <Text style={c.calPreviewLabel}>예상 소모 칼로리</Text>
                <Text style={[c.calPreviewVal, { color: COLORS.gold }]}>−{burnCal} kcal</Text>
                <Text style={c.calPreviewSub}>(70kg 기준)</Text>
              </View>
              <View style={c.effectRow}>
                <EffectTag label={`STR +${Math.round(burnCal / 15)}`} color={COLORS.gold} />
                <EffectTag label={`AGI +${selectedExercises.length > 1 ? 5 : 3}`} color={COLORS.str} />
                {selectedExercises.length > 1 && <EffectTag label="복합훈련 보너스" color={COLORS.purple} />}
              </View>
            </>
          )}
        </QuestPanel>

        {/* ── 음주 ── */}
        <QuestPanel
          icon="🍺"
          title="음주"
          badge={alcoholCal > 0 ? `${alcoholCal}kcal` : undefined}
        >
          <TouchableOpacity
            style={[c.chip, !alcohol.consumed && { borderColor: COLORS.teal, backgroundColor: COLORS.teal + '18' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAlcohol({ consumed: false, items: [] }); }}
          >
            <Text style={[c.chipText, !alcohol.consumed && { color: COLORS.teal }]}>✅ 금주</Text>
          </TouchableOpacity>

          <Text style={c.subLabel}>마신 주종 (다중 선택)</Text>
          <View style={c.chips}>
            {ALCOHOL_TYPES.map(type => {
              const sel = alcohol.items.some(i => i.type === type);
              return (
                <ChipBtn
                  key={type}
                  label={`${ALCOHOL_EMOJI[type]} ${ALCOHOL_LABELS[type]}`}
                  sub={`${ALCOHOL_CAL_PER_UNIT[type]}kcal`}
                  selected={sel}
                  onPress={() => toggleAlcohol(type)}
                  color={COLORS.red}
                />
              );
            })}
          </View>

          {alcohol.items.length > 0 && (
            <View style={c.alcoholTable}>
              {alcohol.items.map(item => (
                <View key={item.type} style={c.alcoholTableRow}>
                  <Text style={c.alcoholTableLabel}>
                    {ALCOHOL_EMOJI[item.type]} {ALCOHOL_LABELS[item.type]}
                  </Text>
                  <View style={c.amountCtrl}>
                    <TouchableOpacity style={c.amountMinus} onPress={() => adjustAmount(item.type, -0.5)}>
                      <Text style={c.amountBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={c.amountVal}>{item.amount}{ALCOHOL_UNITS[item.type]}</Text>
                    <TouchableOpacity style={c.amountPlus} onPress={() => adjustAmount(item.type, 0.5)}>
                      <Text style={c.amountBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={c.alcoholCal}>{Math.round(ALCOHOL_CAL_PER_UNIT[item.type] * item.amount)}kcal</Text>
                </View>
              ))}
              <View style={c.alcoholSummary}>
                <View style={c.effectRow}>
                  <EffectTag label={`HP −${Math.min(30, Math.round(alcoholCal / 15))}`} color={COLORS.red} />
                  <EffectTag label={`STR −${Math.min(20, Math.round(alcoholCal / 20))}`} color={COLORS.red} />
                  <EffectTag label="수면질 저하" color={COLORS.red} />
                </View>
                <Text style={c.alcoholTotal}>총 {alcoholCal} kcal</Text>
              </View>
            </View>
          )}
        </QuestPanel>

        {/* ── 혈압 (선택) ── */}
        <QuestPanel icon="🩺" title="혈압 기록 (선택)">
          <View style={c.bpRow}>
            <View style={c.bpField}>
              <Text style={c.bpFieldLabel}>수축기 (위)</Text>
              <TextInput
                style={c.bpInput}
                value={bpSys} onChangeText={setBpSys}
                keyboardType="numeric" placeholder="120" placeholderTextColor={COLORS.textDisabled}
                maxLength={3}
              />
              <Text style={c.bpUnit}>mmHg</Text>
            </View>
            <Text style={c.bpSlash}>/</Text>
            <View style={c.bpField}>
              <Text style={c.bpFieldLabel}>이완기 (아래)</Text>
              <TextInput
                style={c.bpInput}
                value={bpDia} onChangeText={setBpDia}
                keyboardType="numeric" placeholder="80" placeholderTextColor={COLORS.textDisabled}
                maxLength={3}
              />
              <Text style={c.bpUnit}>mmHg</Text>
            </View>
            <View style={c.bpField}>
              <Text style={c.bpFieldLabel}>맥박</Text>
              <TextInput
                style={c.bpInput}
                value={bpPulse} onChangeText={setBpPulse}
                keyboardType="numeric" placeholder="72" placeholderTextColor={COLORS.textDisabled}
                maxLength={3}
              />
              <Text style={c.bpUnit}>bpm</Text>
            </View>
          </View>
          {bpSys.length > 0 && bpDia.length > 0 && !isNaN(parseInt(bpSys)) && !isNaN(parseInt(bpDia)) && (() => {
            const st = getBPStatus(parseInt(bpSys), parseInt(bpDia));
            const col = BP_STATUS_COLOR[st];
            return (
              <View style={[c.bpStatusBox, { backgroundColor: col + '18' }]}>
                <Text style={[c.bpStatusText, { color: col }]}>
                  {bpSys}/{bpDia} — {BP_STATUS_LABEL[st]}
                </Text>
              </View>
            );
          })()}
        </QuestPanel>

        {/* ── 약 복용 ── */}
        <QuestPanel icon="💊" title="약 복용">
          {medications.length === 0 ? (
            <TouchableOpacity style={c.medEmptyBtn} onPress={() => setShowMedModal(true)}>
              <Text style={c.medEmptyText}>+ 복용 중인 약 등록</Text>
            </TouchableOpacity>
          ) : (
            <>
              {medications.map(med => (
                <View key={med.id} style={c.medItem}>
                  <View style={[c.medDot, { backgroundColor: med.color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={c.medNameRow}>
                      <Text style={c.medName}>{med.name}</Text>
                      <Text style={c.medDose}>{med.dose}</Text>
                      <TouchableOpacity onPress={() => handleDeleteMed(med.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: COLORS.textDisabled, fontSize: FONTS.xs }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={c.medTimeRow}>
                      {med.times.map(time => {
                        const key = `${med.id}_${time}`;
                        const taken = medLog.taken.includes(key);
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[c.medTimeChip, taken && { backgroundColor: med.color + '30', borderColor: med.color }]}
                            onPress={() => handleToggleMed(med.id, time)}
                          >
                            <Text style={[c.medTimeText, taken && { color: med.color, fontWeight: '700' }]}>
                              {taken ? '✓ ' : ''}{MED_TIME_LABEL[time]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={c.medAddMore} onPress={() => setShowMedModal(true)}>
                <Text style={c.medAddMoreText}>+ 약 추가</Text>
              </TouchableOpacity>
            </>
          )}
        </QuestPanel>

        {/* 안내 */}
        <View style={c.infoBox}>
          <Text style={c.infoText}>식단은 하단 "식단" 탭에서 입력 · 공복혈당은 홈 화면에서 기록</Text>
        </View>

        {/* ── 버튼 영역 ── */}
        <View style={c.btnGroup}>
          <TouchableOpacity
            style={[c.saveOnlyBtn, saving && { opacity: 0.5 }]}
            onPress={() => buildLog(false)} disabled={saving}
          >
            <Text style={c.saveOnlyText}>{saving ? '저장 중...' : '저장'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[c.submitBtn, saving && { opacity: 0.5 }]}
            onPress={() => buildLog(true)} disabled={saving}
          >
            <Text style={c.submitText}>{saving ? '계산 중...' : '결과 확인 →'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 약 등록 모달 ── */}
        <Modal visible={showMedModal} animationType="slide" transparent>
          <View style={c.modalOverlay}>
            <View style={c.modalSheet}>
              <Text style={c.modalTitle}>💊 약 등록</Text>
              <Text style={c.modalSub}>매일 복용하는 약을 추가하면 체크리스트로 관리할 수 있어요</Text>

              <Text style={c.fieldLabel}>약 이름</Text>
              <TextInput
                style={c.fieldInput}
                value={newMedName} onChangeText={setNewMedName}
                placeholder="예: 메트포르민, 혈압약" placeholderTextColor={COLORS.textDisabled}
                autoFocus
              />

              <Text style={c.fieldLabel}>용량 (선택)</Text>
              <TextInput
                style={c.fieldInput}
                value={newMedDose} onChangeText={setNewMedDose}
                placeholder="예: 1정, 500mg" placeholderTextColor={COLORS.textDisabled}
              />

              <Text style={c.fieldLabel}>복용 시간</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: SPACING.md }}>
                {Object.entries(MED_TIME_LABEL).map(([key, label]) => {
                  const sel = newMedTimes.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[c.timeChip, sel && { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '20' }]}
                      onPress={() => setNewMedTimes(prev => sel ? prev.filter(t => t !== key) : [...prev, key])}
                    >
                      <Text style={[c.timeChipText, sel && { color: COLORS.purple, fontWeight: '700' }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={c.modalBtns}>
                <TouchableOpacity style={c.modalCancel} onPress={() => setShowMedModal(false)}>
                  <Text style={c.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={c.modalConfirm} onPress={handleSaveMed}>
                  <Text style={c.modalConfirmText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const c = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },

  // 날짜 선택
  dateSection: { marginBottom: SPACING.sm },
  dateSectionLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700', letterSpacing: 1 },
  dateChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bgCard,
    alignItems: 'center', minWidth: 60,
  },
  dateChipSelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '18' },
  dateChipLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '700' },
  dateChipLabelSelected: { color: COLORS.purple },
  dateChipDate: { color: COLORS.textDisabled, fontSize: FONTS.xxs, marginTop: 2 },

  pageHeader: { marginBottom: SPACING.md },
  pageTitle: { color: COLORS.text, fontSize: FONTS.xl, fontWeight: '900' },
  pageSub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },

  // 퀘스트 패널
  panel: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelIcon: { fontSize: 16 },
  panelTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '800' },
  effectBadge: { backgroundColor: COLORS.gold + '20', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.gold + '44' },
  effectText: { color: COLORS.gold, fontSize: FONTS.xxs, fontWeight: '700' },

  // 칩 버튼 (컴팩트)
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.bgInput, alignItems: 'center' },
  chipText: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '600' },
  chipSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },

  subLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 8, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },

  // 효과 태그
  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  effectTag: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  effectTagText: { fontSize: FONTS.xs, fontWeight: '700' },

  // 칼로리 미리보기
  calPreview: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: COLORS.gold + '10', borderRadius: RADIUS.sm, padding: 8, marginBottom: 6 },
  calPreviewLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, flex: 1 },
  calPreviewVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  calPreviewSub: { color: COLORS.textDisabled, fontSize: FONTS.xxs },

  // 음주 테이블
  alcoholTable: { backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: 6, gap: 6 },
  alcoholTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  alcoholTableLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.xs, fontWeight: '600' },
  amountCtrl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountMinus: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  amountPlus: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.purple + '33', borderWidth: 1, borderColor: COLORS.purple + '66', alignItems: 'center', justifyContent: 'center' },
  amountBtnText: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '900', lineHeight: 20 },
  amountVal: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  alcoholCal: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '700', minWidth: 54, textAlign: 'right' },
  alcoholSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  alcoholTotal: { color: COLORS.red, fontSize: FONTS.xs, fontWeight: '900' },

  // 기분
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgInput },
  moodEmoji: { fontSize: 22, marginBottom: 3 },
  moodLabel: { color: COLORS.textMuted, fontSize: 9, textAlign: 'center' },

  // 혈압
  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpField: { flex: 1, alignItems: 'center' },
  bpFieldLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 4 },
  bpInput: { width: '100%', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: FONTS.lg, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
  bpUnit: { color: COLORS.textDisabled, fontSize: 10, marginTop: 2 },
  bpSlash: { color: COLORS.textMuted, fontSize: FONTS.xxl, fontWeight: '300', marginTop: 14 },
  bpStatusBox: { borderRadius: RADIUS.sm, padding: 8, alignItems: 'center', marginTop: 8 },
  bpStatusText: { fontSize: FONTS.sm, fontWeight: '700' },

  // 안내 + 버튼
  infoBox: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  infoText: { color: COLORS.textMuted, fontSize: FONTS.xs, lineHeight: 20, textAlign: 'center' },

  btnGroup: { flexDirection: 'row', gap: 10, marginBottom: SPACING.sm },
  saveOnlyBtn: {
    flex: 0, paddingHorizontal: 20, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  saveOnlyText: { color: COLORS.textSub, fontSize: FONTS.sm, fontWeight: '700' },
  submitBtn: {
    flex: 1, backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  submitText: { color: '#fff', fontSize: FONTS.md, fontWeight: '900', letterSpacing: 0.5 },

  // 약 복용
  medEmptyBtn: { borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  medEmptyText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  medItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub, alignItems: 'flex-start' },
  medDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  medName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600', flex: 1 },
  medDose: { color: COLORS.textMuted, fontSize: FONTS.xs, backgroundColor: COLORS.bgHighlight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  medTimeRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  medTimeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bgInput },
  medTimeText: { color: COLORS.textMuted, fontSize: FONTS.xs },
  medAddMore: { marginTop: 8, alignItems: 'center', paddingVertical: 8 },
  medAddMoreText: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '600' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: FONTS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, marginBottom: SPACING.sm },
  timeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.bgInput },
  timeChipText: { color: COLORS.textSub, fontSize: FONTS.xs },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: { flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  modalConfirm: { flex: 2, backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },
});
