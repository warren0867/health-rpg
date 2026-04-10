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
  targetCalories: number;
  birthDate?: string;   // YYYY-MM-DD (운세용)
  createdAt: string;
}

// ─────────────────────────────────────────────
//  식단 / 칼로리
// ─────────────────────────────────────────────

export type FoodCategory =
  | 'rice'
  | 'soup'
  | 'noodle'
  | 'meat'
  | 'seafood'
  | 'protein'
  | 'vegetable'
  | 'fruit'
  | 'snack'
  | 'fastfood'
  | 'beverage'
  | 'korean';

export type GlycemicIndex = 'low' | 'medium' | 'high';

export interface FoodItem {
  id: string;
  name: string;
  nameSearch: string;
  cal: number;
  serving: string;
  carbs: number;
  protein: number;
  fat: number;
  gi: GlycemicIndex;
  category: FoodCategory;
  isCustom?: boolean;
}

// ─────────────────────────────────────────────
//  즐겨찾기 / 최근 음식
// ─────────────────────────────────────────────

export interface RecentFoodEntry {
  foodId: string;
  foodName: string;
  lastUsed: string;
  useCount: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  entries: {
    foodId: string;
    foodName: string;
    servings: number;
    mealTime: FoodEntry['mealTime'];
  }[];
  createdAt: string;
}

export interface FoodEntry {
  id: string;
  date: string;
  timestamp: string;
  foodId: string;
  foodName: string;
  servings: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// ─────────────────────────────────────────────
//  혈당 (공복 + 식후 멀티 타이밍)
// ─────────────────────────────────────────────

export interface MorningBloodSugar {
  id: string;
  date: string;
  value: number;
  timestamp: string;
  note?: string;
}

export type BloodSugarTiming =
  | 'fasting'
  | 'before_meal'
  | 'after_meal_1h'
  | 'after_meal_2h'
  | 'bedtime'
  | 'random';

export interface BloodSugarEntry {
  id: string;
  date: string;
  timestamp: string;
  value: number;
  timing: BloodSugarTiming;
  note?: string;
}

export type BloodSugarStatus = 'low' | 'normal' | 'warning' | 'danger';

// ─────────────────────────────────────────────
//  운동 (다중 선택)
// ─────────────────────────────────────────────

export type ExerciseType =
  | 'none'
  | 'walk'      // 걷기/산책
  | 'run'       // 달리기
  | 'cycling'   // 자전거
  | 'gym'       // 헬스/웨이트
  | 'swim'      // 수영
  | 'hiking'    // 등산
  | 'yoga'      // 요가/스트레칭
  | 'pilates'   // 필라테스
  | 'tennis'    // 테니스/배드민턴
  | 'soccer'    // 축구/농구
  | 'both';     // (레거시 호환)

export interface ExerciseInput {
  types: ExerciseType[];   // 복수 선택
  minutes: number;         // 총 운동 시간
  type?: ExerciseType;     // @deprecated 구버전 호환
}

// ─────────────────────────────────────────────
//  음주 (주종별 상세)
// ─────────────────────────────────────────────

export type AlcoholType =
  | 'beer_can'    // 맥주 캔 (355ml)
  | 'beer_bottle' // 맥주 병 (500ml)
  | 'soju'        // 소주 (0.5병 단위)
  | 'makgeolli'   // 막걸리 (1컵 300ml)
  | 'whiskey'     // 위스키 (1잔 40ml)
  | 'wine'        // 와인 (1잔 150ml)
  | 'highball'    // 하이볼 (1잔 200ml)
  | 'bomb';       // 폭탄주 (1잔)

export interface AlcoholItem {
  type: AlcoholType;
  amount: number;  // 단위 수량
}

export interface AlcoholInput {
  consumed: boolean;
  items: AlcoholItem[];
  liters?: number;   // @deprecated 구버전 호환
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
  exerciseCalories?: number;   // 운동 소모 칼로리
  alcoholCalories?: number;    // 음주 칼로리
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
