import { AlcoholInput, AlcoholType, BloodSugarStatus, BloodSugarTiming, CharacterStats, ExerciseInput, ExerciseType, MorningBloodSugar, ScoreBreakdown, SleepInput } from '../types';

const BASE_SCORE = 50;

// ─── MET 값 (운동 강도) ───
export const EXERCISE_MET: Record<ExerciseType, number> = {
  none: 0,
  walk: 3.5,
  run: 8.0,
  cycling: 6.0,
  gym: 5.0,
  swim: 7.0,
  hiking: 6.0,
  yoga: 3.0,
  pilates: 3.5,
  tennis: 6.5,
  soccer: 7.0,
  both: 5.5,  // 레거시
};

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  none: '안 함',
  walk: '걷기·산책',
  run: '달리기',
  cycling: '자전거',
  gym: '헬스·웨이트',
  swim: '수영',
  hiking: '등산',
  yoga: '요가·스트레칭',
  pilates: '필라테스',
  tennis: '테니스·배드민턴',
  soccer: '축구·농구',
  both: '복합 운동',
};

// 운동 소모 칼로리 계산 (MET × 체중 × 시간)
export function calcExerciseCalories(exercise: ExerciseInput, weightKg = 70): number {
  const types = exercise.types?.filter(t => t !== 'none') ?? [];
  // 구버전 호환
  const legacyType = exercise.type;
  const activeTypes = types.length > 0 ? types : (legacyType && legacyType !== 'none' ? [legacyType] : []);

  if (activeTypes.length === 0 || exercise.minutes === 0) return 0;
  const avgMET = activeTypes.reduce((sum, t) => sum + (EXERCISE_MET[t] ?? 5), 0) / activeTypes.length;
  return Math.round(avgMET * weightKg * (exercise.minutes / 60));
}

// ─── 음주 칼로리 ───
export const ALCOHOL_CAL_PER_UNIT: Record<AlcoholType, number> = {
  beer_can: 145,    // 맥주 캔 1개 (355ml)
  beer_bottle: 210, // 맥주 병 1개 (500ml)
  soju: 200,        // 소주 반병 (180ml)
  makgeolli: 130,   // 막걸리 1컵 (300ml)
  whiskey: 90,      // 위스키 1잔 (40ml)
  wine: 120,        // 와인 1잔 (150ml)
  highball: 110,    // 하이볼 1잔 (200ml)
  bomb: 175,        // 폭탄주 1잔
};

export const ALCOHOL_LABELS: Record<AlcoholType, string> = {
  beer_can: '맥주 캔',
  beer_bottle: '맥주 병',
  soju: '소주',
  makgeolli: '막걸리',
  whiskey: '위스키',
  wine: '와인',
  highball: '하이볼',
  bomb: '폭탄주',
};

export const ALCOHOL_UNITS: Record<AlcoholType, string> = {
  beer_can: '캔',
  beer_bottle: '병',
  soju: '반병',
  makgeolli: '컵',
  whiskey: '잔',
  wine: '잔',
  highball: '잔',
  bomb: '잔',
};

export const ALCOHOL_EMOJI: Record<AlcoholType, string> = {
  beer_can: '🍺',
  beer_bottle: '🍺',
  soju: '🥃',
  makgeolli: '🍶',
  whiskey: '🥃',
  wine: '🍷',
  highball: '🧊',
  bomb: '💣',
};

export function calcAlcoholCalories(alcohol: AlcoholInput): number {
  if (!alcohol.consumed) return 0;
  if (alcohol.items?.length) {
    return alcohol.items.reduce((sum, item) => sum + (ALCOHOL_CAL_PER_UNIT[item.type] ?? 0) * item.amount, 0);
  }
  // 구버전 호환
  return Math.round((alcohol.liters ?? 0) * 600);
}

// ─── 점수 계산 ───

function calcSleepBonus(hours: number): number {
  if (hours >= 7 && hours <= 8) return 20;
  if (hours >= 6 && hours <= 9) return 12;
  if (hours >= 5 && hours <= 10) return 5;
  if (hours < 5) return -10;
  return -5;
}

function calcExerciseBonus(exercise: ExerciseInput): number {
  const types = exercise.types?.filter(t => t !== 'none') ?? [];
  const legacyType = exercise.type;
  const hasExercise = types.length > 0 || (legacyType && legacyType !== 'none');
  if (!hasExercise) return 0;

  const min = exercise.minutes;
  const base = min >= 80 ? 22 : min >= 60 ? 17 : min >= 40 ? 12 : min >= 30 ? 9 : 5;
  const multiBonus = types.length > 1 ? 3 : 0;
  return Math.min(25, base + multiBonus);
}

function calcAlcoholPenalty(alcohol: AlcoholInput): number {
  if (!alcohol.consumed) return 0;
  const totalCal = calcAlcoholCalories(alcohol);
  if (totalCal <= 0) return 0;
  if (totalCal <= 150) return -8;
  if (totalCal <= 300) return -15;
  if (totalCal <= 500) return -22;
  return -30;
}

function calcBloodSugarBonus(bs: MorningBloodSugar | null): number {
  if (!bs) return 0;
  const v = bs.value;
  if (v >= 70 && v < 100) return 8;
  if (v >= 100 && v < 110) return 2;
  if (v >= 110 && v < 126) return -3;
  if (v < 70) return -5;
  return -8;
}

function calcCalorieBonus(consumed: number, goal: number): number {
  if (goal === 0) return 0;
  const ratio = consumed / goal;
  if (ratio >= 0.7 && ratio <= 1.05) return 5;
  if (ratio > 1.2) return -5;
  if (ratio < 0.5) return -3;
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
  const mealBonus = 0;

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
  return getBSStatus(value);
}

export function getBloodSugarStatusLabel(status: BloodSugarStatus): string {
  return getBSStatusLabel(status);
}
