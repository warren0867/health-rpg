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
  birthDate?: string;      // YYYY-MM-DD (운세용)
  waterGoalMl?: number;    // 하루 물 목표 (기본 1500)
  targetWeightKg?: number; // 목표 체중
  createdAt: string;
}

// ─────────────────────────────────────────────
//  기분 / 스트레스
// ─────────────────────────────────────────────

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const MOOD_EMOJI: Record<MoodLevel, string> = {
  1: '😩',
  2: '😔',
  3: '😐',
  4: '😊',
  5: '🤩',
};

export const MOOD_LABEL: Record<MoodLevel, string> = {
  1: '매우 힘듦',
  2: '좀 힘듦',
  3: '보통',
  4: '좋음',
  5: '최고!',
};

// ─────────────────────────────────────────────
//  체중 기록
// ─────────────────────────────────────────────

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  timestamp: string;
}

// ─────────────────────────────────────────────
//  혈압 기록
// ─────────────────────────────────────────────

export interface BloodPressureEntry {
  id: string;
  date: string;
  systolic: number;    // 수축기 (위)
  diastolic: number;   // 이완기 (아래)
  pulse?: number;      // 맥박
  timestamp: string;
}

export type BPStatus = 'optimal' | 'normal' | 'warning' | 'danger';

export function getBPStatus(sys: number, dia: number): BPStatus {
  if (sys < 120 && dia < 80) return 'optimal';
  if (sys < 130 && dia < 85) return 'normal';
  if (sys < 160 && dia < 100) return 'warning';
  return 'danger';
}

export const BP_STATUS_LABEL: Record<BPStatus, string> = {
  optimal: '최적',
  normal: '정상',
  warning: '주의',
  danger: '위험',
};

export const BP_STATUS_COLOR: Record<BPStatus, string> = {
  optimal: '#06D6A0',
  normal: '#2ECC71',
  warning: '#F5A623',
  danger: '#FF5370',
};

// ─────────────────────────────────────────────
//  업적 시스템
// ─────────────────────────────────────────────

export type AchievementId =
  | 'first_record'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'score_90'
  | 'perfect_score'
  | 'no_alcohol_7'
  | 'exercise_7'
  | 'level_5'
  | 'level_10'
  | 'water_goal_7';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  desc: string;
  emoji: string;
}

export const ACHIEVEMENT_DEFS: Record<AchievementId, AchievementDef> = {
  first_record:  { id: 'first_record',  name: '첫 발걸음',    desc: '첫 번째 일일 기록 완료',    emoji: '🎯' },
  streak_3:      { id: 'streak_3',      name: '3일 전사',     desc: '3일 연속 기록 달성',        emoji: '🔥' },
  streak_7:      { id: 'streak_7',      name: '일주일 영웅',  desc: '7일 연속 기록 달성',        emoji: '⚡' },
  streak_30:     { id: 'streak_30',     name: '전설의 루틴',  desc: '30일 연속 기록 달성',       emoji: '👑' },
  score_90:      { id: 'score_90',      name: '전설에 근접',  desc: '하루 90점 이상 달성',       emoji: '⚔️' },
  perfect_score: { id: 'perfect_score', name: '완벽한 하루',  desc: '100점 만점 달성',           emoji: '🏆' },
  no_alcohol_7:  { id: 'no_alcohol_7',  name: '금주 챌린지',  desc: '7일 연속 금주 달성',        emoji: '🧘' },
  exercise_7:    { id: 'exercise_7',    name: '운동 중독자',  desc: '7일 연속 운동 기록',        emoji: '💪' },
  level_5:       { id: 'level_5',       name: '용맹한 기사',  desc: '레벨 5 달성',               emoji: '🛡️' },
  level_10:      { id: 'level_10',      name: '전설의 신',    desc: '레벨 10 달성',              emoji: '🌟' },
  water_goal_7:  { id: 'water_goal_7',  name: '수분 충전',    desc: '7일 연속 물 목표 달성 (1.5L+)', emoji: '💧' },
};

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: string;
}

// ─────────────────────────────────────────────
//  XP / 레벨
// ─────────────────────────────────────────────

export interface UserXP {
  totalXP: number;
  level: number;
  lastUpdated: string;
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
  | 'walk'
  | 'run'
  | 'cycling'
  | 'gym'
  | 'swim'
  | 'hiking'
  | 'yoga'
  | 'pilates'
  | 'tennis'
  | 'soccer'
  | 'both';     // (레거시 호환)

export interface ExerciseInput {
  types: ExerciseType[];
  minutes: number;
  type?: ExerciseType;     // @deprecated 구버전 호환
}

// ─────────────────────────────────────────────
//  음주 (주종별 상세)
// ─────────────────────────────────────────────

export type AlcoholType =
  | 'beer_can'
  | 'beer_bottle'
  | 'soju'
  | 'makgeolli'
  | 'whiskey'
  | 'wine'
  | 'highball'
  | 'bomb';

export interface AlcoholItem {
  type: AlcoholType;
  amount: number;
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
  exerciseCalories?: number;
  alcoholCalories?: number;
  mood?: MoodLevel;                     // 기분 (1~5)
  bloodPressure?: { systolic: number; diastolic: number; pulse?: number };  // 혈압
  xpGained?: number;                    // 이날 획득한 XP
  steps?: number;                       // 걸음수
  caloriesConsumed?: number;            // 음식 섭취 칼로리 (음주 제외)
  morningBSValue?: number;             // 공복혈당 수치
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
//  약 복용
// ─────────────────────────────────────────────

export interface Medication {
  id: string;
  name: string;         // 약 이름
  dose: string;         // 용량 (예: "1정", "500mg")
  times: string[];      // 복용 시간대 ["morning","lunch","dinner","bedtime"]
  color: string;        // 구분 색상
  createdAt: string;
}

export interface MedLog {
  date: string;
  taken: string[];      // 복용 완료한 "{medicationId}_{time}" 목록
}

export const MED_TIME_LABEL: Record<string, string> = {
  morning:  '아침',
  lunch:    '점심',
  dinner:   '저녁',
  bedtime:  '취침 전',
};

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
  Illness: undefined;
};

// ─────────────────────────────────────────────
//  질병 기록
// ─────────────────────────────────────────────

export type IllnessType =
  | 'cold'      // 감기
  | 'gastro'    // 장염
  | 'flu'       // 독감
  | 'fever'     // 발열
  | 'headache'  // 두통
  | 'fatigue'   // 몸살/피로
  | 'allergy'   // 알레르기
  | 'covid'     // 코로나
  | 'injury'    // 부상
  | 'other';    // 기타

export type IllnessSymptom =
  | 'fever' | 'runny_nose' | 'cough' | 'sore_throat'
  | 'nausea' | 'vomit' | 'diarrhea' | 'stomach'
  | 'fatigue' | 'muscle' | 'headache' | 'chills' | 'loss_appetite';

export interface IllnessEntry {
  id: string;
  type: IllnessType;
  startDate: string;   // YYYY-MM-DD
  endDate?: string;    // undefined = 현재 앓는 중
  symptoms: IllnessSymptom[];
  severity: 1 | 2 | 3 | 4 | 5;
  temperature?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const ILLNESS_LABELS: Record<IllnessType, string> = {
  cold: '감기', gastro: '장염', flu: '독감', fever: '발열',
  headache: '두통', fatigue: '몸살', allergy: '알레르기',
  covid: '코로나', injury: '부상', other: '기타',
};

export const ILLNESS_EMOJI: Record<IllnessType, string> = {
  cold: '🤧', gastro: '🤢', flu: '🤒', fever: '🌡️',
  headache: '🤕', fatigue: '😴', allergy: '🌿',
  covid: '😷', injury: '🩹', other: '💊',
};

export const SYMPTOM_LABELS: Record<IllnessSymptom, string> = {
  fever: '발열', runny_nose: '콧물', cough: '기침', sore_throat: '목아픔',
  nausea: '메스꺼움', vomit: '구토', diarrhea: '설사', stomach: '복통',
  fatigue: '피로', muscle: '근육통', headache: '두통',
  chills: '오한', loss_appetite: '식욕부진',
};

// ─────────────────────────────────────────────
//  주간 챌린지
// ─────────────────────────────────────────────

export type ChallengeId =
  | 'exercise_5'    // 이번 주 5번 운동
  | 'no_alcohol_5'  // 이번 주 5일 금주
  | 'sleep_7h_5'    // 이번 주 5일 7시간 이상 수면
  | 'water_5'       // 이번 주 5일 물 목표 달성
  | 'steps_7k_3'    // 이번 주 3일 7000보 이상
  | 'record_7'      // 이번 주 7일 기록
  | 'score_70_5';   // 이번 주 5일 70점 이상

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  desc: string;
  emoji: string;
  target: number;   // 목표 횟수
  xpReward: number;
}

export const CHALLENGE_DEFS: Record<ChallengeId, ChallengeDef> = {
  exercise_5:    { id: 'exercise_5',    name: '주간 운동왕',     desc: '이번 주 5번 이상 운동하기',       emoji: '💪', target: 5, xpReward: 100 },
  no_alcohol_5:  { id: 'no_alcohol_5',  name: '금주 챌린지',     desc: '이번 주 5일 이상 금주하기',       emoji: '🧘', target: 5, xpReward: 80  },
  sleep_7h_5:    { id: 'sleep_7h_5',    name: '숙면 마스터',     desc: '이번 주 5일 이상 7시간+ 수면',    emoji: '😴', target: 5, xpReward: 80  },
  water_5:       { id: 'water_5',       name: '수분 충전기',     desc: '이번 주 5일 이상 물 목표 달성',   emoji: '💧', target: 5, xpReward: 60  },
  steps_7k_3:    { id: 'steps_7k_3',    name: '만보의 전사',     desc: '이번 주 3일 이상 7,000보 달성',   emoji: '🚶', target: 3, xpReward: 70  },
  record_7:      { id: 'record_7',      name: '개근왕',          desc: '이번 주 7일 모두 기록하기',        emoji: '📝', target: 7, xpReward: 120 },
  score_70_5:    { id: 'score_70_5',    name: '고득점 연속',     desc: '이번 주 5일 이상 70점+ 달성',     emoji: '⚔️', target: 5, xpReward: 90  },
};

export interface WeeklyChallenge {
  weekKey: string;         // "YYYY-WNN" 형식
  challengeIds: ChallengeId[];
  progress: Record<ChallengeId, number>;
  completed: ChallengeId[];
  rewardClaimed: ChallengeId[];
}
