import {
  DailyLog,
  EMPTY_PERMANENT_STATS,
  EXERCISE_STAT_GAIN_PER_10MIN,
  ExerciseEntry,
  InBodyRecord,
  PermanentStats,
  StatKey,
  WeightEntry,
} from '../types';

// 영구 스탯은 "이력 전체로부터 결정적(deterministic)"으로 도출한다.
// 이렇게 하면 entry가 추가/수정/삭제돼도 동일 입력 → 동일 결과가 보장됨 (멱등).

const STAT_KEYS: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];
const round1 = (n: number) => Math.round(n * 10) / 10;

function emptyAccumulator(): Record<StatKey, number> {
  return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 };
}

// ─── 1) 운동 entries → 스탯 누적 ───────────────────────────
export function gainsFromExerciseEntries(entries: ExerciseEntry[]): Record<StatKey, number> {
  const acc = emptyAccumulator();
  for (const e of entries) {
    if (!e.minutes || e.minutes <= 0) continue;
    const gain = EXERCISE_STAT_GAIN_PER_10MIN[e.type] ?? {};
    const factor = e.minutes / 10;
    // 강도 보정 (옵션). low 0.85, medium 1.0, high 1.2.
    const intensityMul =
      e.intensity === 'high' ? 1.2 :
      e.intensity === 'low' ? 0.85 : 1.0;
    for (const key of STAT_KEYS) {
      const g = gain[key];
      if (g) acc[key] += g * factor * intensityMul;
    }
    // 모든 운동은 vit에 미세 보너스 (활동성)
    acc.vit += 0.05 * factor;
  }
  return acc;
}

// ─── 2) DailyLog로부터 vit/wis 영구 누적 ─────────────────
//    - 7~8h 수면 1회당 vit +0.15
//    - 음주 안 함 1회당 vit +0.05
//    - 혈압 정상(<130/85) 1회당 vit +0.10
//    - 공복혈당 정상(70~99) 1회당 vit +0.10
//    - 점수 70+ 1회당 wis +0.10, 90+ 추가 +0.10
export function gainsFromDailyLogs(logs: DailyLog[]): Record<StatKey, number> {
  const acc = emptyAccumulator();
  for (const l of logs) {
    const h = l.sleep?.hours ?? 0;
    if (h >= 7 && h <= 8) acc.vit += 0.15;
    else if (h >= 6 && h <= 9) acc.vit += 0.07;

    if (!l.alcohol?.consumed) acc.vit += 0.05;

    const bp = l.bloodPressure;
    if (bp && bp.systolic > 0 && bp.systolic < 130 && bp.diastolic < 85) acc.vit += 0.1;

    const bs = l.morningBSValue;
    if (bs && bs >= 70 && bs < 100) acc.vit += 0.1;

    if (l.conditionScore >= 70) acc.wis += 0.1;
    if (l.conditionScore >= 90) acc.wis += 0.1;
  }
  return acc;
}

// ─── 3) Streak 마일스톤 → wis 보너스 ─────────────────────
//    streak 자체는 매일 변하므로, 누적 로그 길이 기준으로 milestone 카운트
//    (3일/7일/30일/100일을 넘긴 적이 있으면 영구 보너스)
export function gainsFromStreakMilestones(maxStreakEverDays: number): Record<StatKey, number> {
  const acc = emptyAccumulator();
  if (maxStreakEverDays >= 3)   acc.wis += 1;
  if (maxStreakEverDays >= 7)   acc.wis += 2;
  if (maxStreakEverDays >= 30)  acc.wis += 5;
  if (maxStreakEverDays >= 100) acc.wis += 10;
  return acc;
}

// ─── 4) 체중 추세 → str/agi 영구 보너스 ──────────────────
//    목표 체중에 가까워진 만큼만 가산 (접근 거리 기반)
//    감량 케이스: 시작체중 - 현재체중 (kg) 만큼 STR/AGI에 영구 가산
//    증량 케이스: 동일하게 STR에 가산
export function gainsFromWeightProgress(
  weightLog: WeightEntry[],
  goal?: 'lose' | 'maintain' | 'gain',
): Record<StatKey, number> {
  const acc = emptyAccumulator();
  if (weightLog.length < 2) return acc;
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0].weightKg;
  const latest = sorted[sorted.length - 1].weightKg;
  const delta = start - latest; // 감량 시 +

  if (goal === 'lose' && delta > 0) {
    acc.str += delta * 1.5;
    acc.agi += delta * 1.5;
  } else if (goal === 'gain' && delta < 0) {
    acc.str += -delta * 2.0;
    acc.vit += -delta * 0.5;
  } else if (goal === 'maintain') {
    // 목표 체중 ±2kg 유지 1회당 vit 미세 보너스 (latest로만 판정)
    if (Math.abs(delta) <= 2) acc.vit += 0.5;
  }
  return acc;
}

// ─── 5) 인바디 향상 → 영구 스탯 ─────────────────────────
//    측정 사이의 변화에 대해 보너스 (최신 - 최초 시점 기준)
//    - 골격근량 +1kg → STR +3, VIT +1
//    - 체지방률 -1%p → AGI +2, END +1
//    - 인바디 점수 +5 → 보너스 분산 (STR/VIT/AGI 각 +0.5)
//    감소 케이스는 보너스 차감하지 않음 (영구 누적 의미를 유지)
export function gainsFromInBody(records: InBodyRecord[]): Record<StatKey, number> {
  const acc = emptyAccumulator();
  if (records.length < 2) return acc;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const smmDelta = latest.skeletalMuscleMass - first.skeletalMuscleMass;
  if (smmDelta > 0) {
    acc.str += smmDelta * 3;
    acc.vit += smmDelta * 1;
  }

  const fatPctDelta = first.bodyFatPercentage - latest.bodyFatPercentage; // 감소가 +
  if (fatPctDelta > 0) {
    acc.agi += fatPctDelta * 2;
    acc.end += fatPctDelta * 1;
  }

  const scoreDelta = latest.score - first.score;
  if (scoreDelta > 0) {
    const each = scoreDelta * 0.1;
    acc.str += each; acc.vit += each; acc.agi += each;
  }

  return acc;
}

// ─── 6) 종합 재계산 ──────────────────────────────────────
export function recalcPermanentStats(opts: {
  exerciseEntries: ExerciseEntry[];
  dailyLogs: DailyLog[];
  weightLog: WeightEntry[];
  weightGoal?: 'lose' | 'maintain' | 'gain';
  maxStreakEverDays: number;
  inbodyRecords?: InBodyRecord[];
}): PermanentStats {
  const a = gainsFromExerciseEntries(opts.exerciseEntries);
  const b = gainsFromDailyLogs(opts.dailyLogs);
  const c = gainsFromStreakMilestones(opts.maxStreakEverDays);
  const d = gainsFromWeightProgress(opts.weightLog, opts.weightGoal);
  const e = gainsFromInBody(opts.inbodyRecords ?? []);

  const merged = emptyAccumulator();
  for (const k of STAT_KEYS) {
    merged[k] = round1(a[k] + b[k] + c[k] + d[k] + e[k]);
  }
  const total = round1(merged.str + merged.end + merged.vit + merged.agi + merged.wis);

  return {
    ...EMPTY_PERMANENT_STATS,
    ...merged,
    totalGained: total,
    lastRecalc: new Date().toISOString(),
  };
}

// ─── 6) 영구 스탯 → 표시용 레벨 (각 스탯별 등급) ──────────
// 0~5 미숙, 5~15 숙련, 15~30 정예, 30~60 전문가, 60+ 마스터
export function statTier(value: number): { tier: string; pct: number } {
  if (value >= 60) return { tier: '마스터',  pct: 100 };
  if (value >= 30) return { tier: '전문가',  pct: 100 };
  if (value >= 15) return { tier: '정예',    pct: Math.round(((value - 15) / 15) * 100) };
  if (value >= 5)  return { tier: '숙련',    pct: Math.round(((value - 5) / 10) * 100) };
  return { tier: '미숙', pct: Math.round((value / 5) * 100) };
}

// 다음 티어까지 진행률 (0~100)
export function statTierProgress(value: number): { current: number; next: number; pct: number; tierLabel: string } {
  let lower = 0, upper = 5, label = '미숙';
  if (value >= 60)      { return { current: value, next: value, pct: 100, tierLabel: '마스터' }; }
  else if (value >= 30) { lower = 30; upper = 60; label = '전문가'; }
  else if (value >= 15) { lower = 15; upper = 30; label = '정예'; }
  else if (value >= 5)  { lower = 5;  upper = 15; label = '숙련'; }
  else                  { lower = 0;  upper = 5;  label = '미숙'; }
  const pct = Math.round(((value - lower) / (upper - lower)) * 100);
  return { current: value, next: upper, pct: Math.min(100, Math.max(0, pct)), tierLabel: label };
}
