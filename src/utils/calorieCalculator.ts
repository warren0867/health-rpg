import { ActivityLevel, Gender, Goal, UserProfile } from '../types';

// ─────────────────────────────────────────────
//  BMR (Harris-Benedict 공식)
// ─────────────────────────────────────────────

function calcBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (gender === 'male') {
    return 88.36 + (13.40 * weightKg) + (4.80 * heightCm) - (5.68 * age);
  }
  return 447.60 + (9.25 * weightKg) + (3.10 * heightCm) - (4.33 * age);
}

// ─────────────────────────────────────────────
//  TDEE (Total Daily Energy Expenditure)
// ─────────────────────────────────────────────

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,    // 거의 운동 안 함
  light: 1.375,      // 주 1-3회
  moderate: 1.55,    // 주 3-5회
  active: 1.725,     // 주 6-7회
  very_active: 1.9,  // 매일 + 육체 노동
};

export function calcTDEE(profile: Omit<UserProfile, 'targetCalories' | 'goal' | 'name' | 'createdAt'>): number {
  const bmr = calcBMR(profile.gender, profile.weightKg, profile.heightCm, profile.age);
  return Math.round(bmr * ACTIVITY_MULTIPLIER[profile.activityLevel]);
}

// ─────────────────────────────────────────────
//  목표별 칼로리
// ─────────────────────────────────────────────

const GOAL_DELTA: Record<Goal, number> = {
  lose: -300,      // 당뇨 전단계 체중 감량
  maintain: 0,
  gain: +300,
};

export function calcTargetCalories(
  gender: Gender,
  age: number,
  heightCm: number,
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: Goal
): number {
  const tdee = calcTDEE({ gender, age, heightCm, weightKg, activityLevel });
  const target = tdee + GOAL_DELTA[goal];
  // 최소 1200kcal (여성), 1500kcal (남성)
  const min = gender === 'female' ? 1200 : 1500;
  return Math.max(min, target);
}

// ─────────────────────────────────────────────
//  BMI 계산
// ─────────────────────────────────────────────

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function getBMILabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: '저체중', color: '#4ECDC4' };
  if (bmi < 23)   return { label: '정상', color: '#2ECC71' };
  if (bmi < 25)   return { label: '과체중', color: '#FFB800' };
  if (bmi < 30)   return { label: '비만', color: '#FF6B35' };
  return { label: '고도비만', color: '#FF4757' };
}

// ─────────────────────────────────────────────
//  칼로리 게이지 계산
// ─────────────────────────────────────────────

export interface CalorieGaugeData {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;   // 0~100+ (초과 가능)
  status: 'safe' | 'caution' | 'over';
}

export function calcGaugeData(consumed: number, goal: number): CalorieGaugeData {
  const remaining = goal - consumed;
  const percentage = Math.min(100, Math.round((consumed / goal) * 100));
  const status: CalorieGaugeData['status'] =
    percentage < 75 ? 'safe' : percentage < 100 ? 'caution' : 'over';
  return { consumed, goal, remaining, percentage, status };
}

// ─────────────────────────────────────────────
//  매크로 비율 (당뇨 전단계 권장: 저탄고단)
// ─────────────────────────────────────────────

export interface MacroGoal {
  carbs: number;    // g
  protein: number;  // g
  fat: number;      // g
}

export function calcMacroGoal(targetCalories: number): MacroGoal {
  // 당뇨 전단계 권장: 탄수화물 40%, 단백질 30%, 지방 30%
  return {
    carbs: Math.round((targetCalories * 0.40) / 4),    // 4kcal/g
    protein: Math.round((targetCalories * 0.30) / 4),  // 4kcal/g
    fat: Math.round((targetCalories * 0.30) / 9),      // 9kcal/g
  };
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '거의 안 움직여요',
  light: '가끔 운동 (주 1-3회)',
  moderate: '규칙적 운동 (주 3-5회)',
  active: '매일 운동',
  very_active: '고강도 매일',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: '체중 감량',
  maintain: '현재 유지',
  gain: '근육 증가',
};
