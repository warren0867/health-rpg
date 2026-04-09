// ─────────────────────────────────────────────
//  사용자 프로필
// ─────────────────────────────────────────────

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetCalories: number; // TDEE 기반 자동 계산 or 수동 설정
  createdAt: string;
}

// ─────────────────────────────────────────────
//  식단 / 칼로리
// ─────────────────────────────────────────────

export type FoodCategory =
  | 'rice'        // 밥류
  | 'soup'        // 국/찌개
  | 'noodle'      // 면류
  | 'meat'        // 육류
  | 'seafood'     // 해산물
  | 'protein'     // 단백질 (두부/계란)
  | 'vegetable'   // 채소
  | 'fruit'       // 과일
  | 'snack'       // 간식/빵
  | 'fastfood'    // 패스트푸드
  | 'beverage'    // 음료
  | 'korean';     // 기타 한식

export type GlycemicIndex = 'low' | 'medium' | 'high';

export interface FoodItem {
  id: string;
  name: string;
  nameSearch: string;    // 검색용 (소문자 + 별칭)
  cal: number;           // kcal per serving
  serving: string;       // "1공기 (210g)"
  carbs: number;         // g
  protein: number;       // g
  fat: number;           // g
  gi: GlycemicIndex;
  category: FoodCategory;
}

export interface FoodEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  timestamp: string;
  foodId: string;
  foodName: string;
  servings: number;      // 0.5, 1, 1.5, 2 ...
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// ─────────────────────────────────────────────
//  혈당 (공복 + 식후 멀티 타이밍)
// ─────────────────────────────────────────────

// 레거시: 홈화면 공복혈당 빠른 입력용
export interface MorningBloodSugar {
  id: string;
  date: string;
  value: number;         // mg/dL
  timestamp: string;
  note?: string;
}

export type BloodSugarTiming =
  | 'fasting'         // 공복
  | 'before_meal'     // 식전
  | 'after_meal_1h'   // 식후 1시간
  | 'after_meal_2h'   // 식후 2시간
  | 'bedtime'         // 취침 전
  | 'random';         // 기타

export interface BloodSugarEntry {
  id: string;
  date: string;
  timestamp: string;
  value: number;          // mg/dL
  timing: BloodSugarTiming;
  note?: string;
}

export type BloodSugarStatus = 'low' | 'normal' | 'warning' | 'danger';

// ─────────────────────────────────────────────
//  일일 건강 입력 (수면/운동/음주)
// ─────────────────────────────────────────────

export interface AlcoholInput {
  consumed: boolean;
  liters: number;
}

export type ExerciseType = 'none' | 'cycling' | 'gym' | 'walk' | 'both';

export interface ExerciseInput {
  type: ExerciseType;
  minutes: number;
}

export interface SleepInput {
  hours: number;
}

// ─────────────────────────────────────────────
//  캐릭터 스탯
// ─────────────────────────────────────────────

export interface CharacterStats {
  hp: number;
  condition: number;
  stamina: number;
  recovery: number;
  bloodSugarControl: number;
  // 확장: bodyFat, muscle, hydration 등 추가 가능
}

// ─────────────────────────────────────────────
//  점수
// ─────────────────────────────────────────────

export interface ScoreBreakdown {
  base: number;
  sleepBonus: number;
  exerciseBonus: number;
  mealBonus: number;
  alcoholPenalty: number;
  bloodSugarBonus: number;
  calorieBonus: number;
  total: number;
}

export interface ScoreFactor {
  label: string;
  value: number;
  emoji: string;
}

// ─────────────────────────────────────────────
//  일일 종합 로그
// ─────────────────────────────────────────────

export interface DailyLog {
  id: string;
  date: string;
  alcohol: AlcoholInput;
  exercise: ExerciseInput;
  sleep: SleepInput;
  conditionScore: number;
  scoreBreakdown: ScoreBreakdown;
  stats: CharacterStats;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  네비게이션
// ─────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Result: { log: DailyLog };
};

export type MainTabParamList = {
  Home: undefined;
  Input: undefined;
  Calorie: undefined;
  BloodSugar: undefined;
  History: undefined;
};
