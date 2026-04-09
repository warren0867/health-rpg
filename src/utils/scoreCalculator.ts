import { AlcoholInput, BloodSugarStatus, BloodSugarTiming, CharacterStats, ExerciseInput, MorningBloodSugar, ScoreBreakdown, SleepInput } from '../types';

const BASE_SCORE = 50;

function calcSleepBonus(hours: number): number {
  if (hours >= 7 && hours <= 8) return 20;
  if (hours >= 6 && hours <= 9) return 12;
  if (hours >= 5 && hours <= 10) return 5;
  if (hours < 5) return -10;
  return -5;
}

function calcExerciseBonus(exercise: ExerciseInput): number {
  if (exercise.type === 'none') return 0;
  const min = exercise.minutes;
  const base = min >= 90 ? 20 : min >= 60 ? 15 : min >= 30 ? 9 : 4;
  const typeBonus = exercise.type === 'both' ? 3 : 0;
  return Math.min(25, base + typeBonus);
}

function calcAlcoholPenalty(alcohol: AlcoholInput): number {
  if (!alcohol.consumed) return 0;
  if (alcohol.liters <= 0.5) return -10;
  if (alcohol.liters <= 1.0) return -18;
  if (alcohol.liters <= 1.5) return -24;
  return -30;
}

function calcBloodSugarBonus(bs: MorningBloodSugar | null): number {
  if (!bs) return 0;
  const v = bs.value;
  if (v >= 70 && v < 100) return 8;    // 정상
  if (v >= 100 && v < 110) return 2;   // 전당뇨 초기
  if (v >= 110 && v < 126) return -3;  // 전당뇨 주의
  if (v < 70) return -5;               // 저혈당
  return -8;                           // 당뇨 의심
}

function calcCalorieBonus(consumed: number, goal: number): number {
  if (goal === 0) return 0;
  const ratio = consumed / goal;
  if (ratio >= 0.7 && ratio <= 1.05) return 5;   // 목표 달성
  if (ratio > 1.2) return -5;                     // 20% 초과
  if (ratio < 0.5) return -3;                     // 너무 적게 먹음
  return 0;
}

export function calculateScore(
  sleep: SleepInput,
  exercise: ExerciseInput,
  alcohol: AlcoholInput,
  morningBS: MorningBloodSugar | null,
  consumedCalories: number,
  targetCalories: number
): ScoreBreakdown {
  const sleepBonus = calcSleepBonus(sleep.hours);
  const exerciseBonus = calcExerciseBonus(exercise);
  const alcoholPenalty = calcAlcoholPenalty(alcohol);
  const bloodSugarBonus = calcBloodSugarBonus(morningBS);
  const calorieBonus = calcCalorieBonus(consumedCalories, targetCalories);
  const mealBonus = 0; // 이제 칼로리로 대체

  const raw = BASE_SCORE + sleepBonus + exerciseBonus + alcoholPenalty + bloodSugarBonus + calorieBonus;

  return {
    base: BASE_SCORE,
    sleepBonus,
    exerciseBonus,
    mealBonus,
    alcoholPenalty,
    bloodSugarBonus,
    calorieBonus,
    total: Math.max(0, Math.min(100, Math.round(raw))),
  };
}

export function calculateStats(
  breakdown: ScoreBreakdown,
  exercise: ExerciseInput,
  sleep: SleepInput,
  morningBS: MorningBloodSugar | null
): CharacterStats {
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)));

  const hp = clamp(50 + breakdown.sleepBonus * 1.5 + breakdown.exerciseBonus + breakdown.alcoholPenalty * 0.8);
  const stamina = clamp(45 + breakdown.exerciseBonus * 2.2 + breakdown.alcoholPenalty * 0.4);
  const recovery = clamp(50 + breakdown.sleepBonus * 2.5 + breakdown.alcoholPenalty * 0.5);
  const condition = breakdown.total;

  let bloodSugarControl = 60;
  if (morningBS) {
    bloodSugarControl = clamp(60 + breakdown.bloodSugarBonus * 4);
  }

  return { hp, condition, stamina, recovery, bloodSugarControl };
}

// ─── 혈당 상태 판정 ───

export function getBSStatus(value: number): BloodSugarStatus {
  if (value < 70) return 'low';
  if (value < 100) return 'normal';
  if (value < 126) return 'warning';
  return 'danger';
}

export function getBSStatusLabel(status: BloodSugarStatus): string {
  return { low: '저혈당', normal: '정상', warning: '주의', danger: '위험' }[status];
}

export const BS_STATUS_COLOR: Record<BloodSugarStatus, string> = {
  low: '#4ECDC4',
  normal: '#2ECC71',
  warning: '#FFB800',
  danger: '#FF4757',
};

// 타이밍별 혈당 상태 판정 (BloodSugarScreen에서 사용)
export function getBloodSugarStatus(value: number, timing: BloodSugarTiming): BloodSugarStatus {
  if (timing === 'after_meal_2h') {
    if (value < 70) return 'low';
    if (value < 140) return 'normal';
    if (value < 200) return 'warning';
    return 'danger';
  }
  if (timing === 'after_meal_1h') {
    if (value < 70) return 'low';
    if (value < 180) return 'normal';
    if (value < 220) return 'warning';
    return 'danger';
  }
  // fasting, before_meal, bedtime, random → 공복 기준
  return getBSStatus(value);
}

export function getBloodSugarStatusLabel(status: BloodSugarStatus): string {
  return getBSStatusLabel(status);
}
