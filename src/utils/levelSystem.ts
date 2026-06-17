import { AchievementId, ACHIEVEMENT_DEFS, AchievementDef, DailyLog, UserXP } from '../types';

// ─── 레벨 임계값 (누적 XP) ────────────────────────────────
export const LEVEL_THRESHOLDS = [
  0,      // Lv 1
  150,    // Lv 2
  350,    // Lv 3
  600,    // Lv 4
  950,    // Lv 5  ← 용맹한 기사
  1400,   // Lv 6
  2000,   // Lv 7
  2800,   // Lv 8
  3800,   // Lv 9
  5000,   // Lv 10 ← 전설의 신
  6500,   // Lv 11
  8500,   // Lv 12 (MAX)
];

export const LEVEL_TITLES = [
  '견습 모험가',   // 1
  '신참 전사',     // 2
  '소형 전사',     // 3
  '정예 전사',     // 4
  '용맹한 기사',   // 5
  '왕국의 수호자', // 6
  '전설의 영웅',   // 7
  '불멸의 투사',   // 8
  '신화의 용사',   // 9
  '전설의 신',     // 10
  '무적의 신',     // 11
  '우주의 수호자', // 12
];

export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export function getXPProgress(xp: number): {
  level: number;
  current: number;
  needed: number;
  pct: number;
  isMax: boolean;
} {
  const level = getLevelFromXP(xp);
  const isMax = level >= LEVEL_THRESHOLDS.length;
  const idx = level - 1;
  const levelStart = LEVEL_THRESHOLDS[idx] ?? 0;
  const levelEnd = LEVEL_THRESHOLDS[idx + 1] ?? levelStart;
  const needed = isMax ? 0 : levelEnd - levelStart;
  // 최대 레벨이면 넘치는 XP를 그대로 노출하지 않고 가득 찬 상태로 표시
  const current = isMax ? 0 : xp - levelStart;
  return {
    level,
    current,
    needed,
    pct: isMax ? 100 : Math.min(100, Math.round((current / Math.max(1, needed)) * 100)),
    isMax,
  };
}

// 하루 기록 시 XP 계산 (기본 — 호환용)
export function calcXPGain(score: number, streak: number): number {
  const base = Math.round(score * 1.5);
  const streakBonus = Math.min(streak * 3, 25);        // 최대 +25
  const excellenceBonus = score >= 90 ? 20 : score >= 75 ? 10 : 0;
  return base + streakBonus + excellenceBonus;
}

// ─── 건강 추세 보너스 ──────────────────────────────────
// "출석 점수"가 아니라 "실제로 건강해지고 있는가"에 무게를 둔 XP.
// 사용처: InputScreen에서 buildLog 시점에 trends를 계산해 전달.

export interface HealthTrendInputs {
  // 체중 관련
  weightGoal?: 'lose' | 'maintain' | 'gain';
  weightChangeKg?: number;       // 시작체중 - 현재체중. lose 목표면 + 가 좋음
  // 혈압 관련
  bpStableDays?: number;         // 최근 N일 중 정상 혈압이었던 날 수
  // 혈당 관련
  bsNormalDays?: number;         // 최근 N일 중 공복혈당 정상이었던 날 수
  // 운동 누적
  exerciseMinutesThisWeek?: number;
}

// 추세 보너스 — 매 체크인마다 한 번에 다 받지 않고 점진적으로
export function calcHealthTrendBonus(t: HealthTrendInputs): number {
  let bonus = 0;

  // 1) 체중 목표 진행 (cap 30)
  if (t.weightGoal === 'lose' && (t.weightChangeKg ?? 0) > 0) {
    bonus += Math.min(30, Math.round((t.weightChangeKg ?? 0) * 6));
  } else if (t.weightGoal === 'gain' && (t.weightChangeKg ?? 0) < 0) {
    bonus += Math.min(30, Math.round(-(t.weightChangeKg ?? 0) * 8));
  }

  // 2) 혈압 안정 (최대 +10)
  bonus += Math.min(10, (t.bpStableDays ?? 0));

  // 3) 혈당 안정 (최대 +10)
  bonus += Math.min(10, (t.bsNormalDays ?? 0));

  // 4) 주간 운동량 (cap +20)
  const wk = t.exerciseMinutesThisWeek ?? 0;
  if (wk >= 150) bonus += 20;        // WHO 권장 충족
  else if (wk >= 90) bonus += 12;
  else if (wk >= 30) bonus += 5;

  return bonus;
}

// 건강 추세 + 출석 결합 XP. 추세를 모르면 calcXPGain과 동일.
export function calcXPGainWithTrends(
  score: number,
  streak: number,
  trends?: HealthTrendInputs,
): { total: number; base: number; streakBonus: number; excellenceBonus: number; trendBonus: number } {
  const base = Math.round(score * 1.0);                      // 기본 비중 축소 (1.5 → 1.0)
  const streakBonus = Math.min(streak * 2, 20);              // (3*max25 → 2*max20)
  const excellenceBonus = score >= 90 ? 15 : score >= 75 ? 8 : 0;
  const trendBonus = trends ? calcHealthTrendBonus(trends) : 0;
  return {
    total: base + streakBonus + excellenceBonus + trendBonus,
    base, streakBonus, excellenceBonus, trendBonus,
  };
}

// ─── 업적 조건 체크 ──────────────────────────────────────

export function checkAchievements(
  logs: DailyLog[],
  streak: number,
  level: number,
  unlockedIds: string[],
  waterGoalStreak: number,
  morningBSStreak?: number,
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];

  const maybeUnlock = (id: AchievementId, condition: boolean) => {
    if (condition && !unlockedIds.includes(id)) {
      newlyUnlocked.push(ACHIEVEMENT_DEFS[id]);
    }
  };

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const allScores = sortedLogs.map(l => l.conditionScore);
  const recent7 = sortedLogs.slice(0, 7);
  const recent30 = sortedLogs.slice(0, 30);

  const recent7NoAlcohol = recent7.length >= 7 && recent7.every(l => !l.alcohol?.consumed);
  const recent30NoAlcohol = recent30.length >= 30 && recent30.every(l => !l.alcohol?.consumed);

  const hasExercise = (l: DailyLog) => {
    const types = l.exercise?.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise?.type && l.exercise.type !== 'none');
  };
  const recent7Exercise = recent7.length >= 7 && recent7.every(hasExercise);
  const recent30Exercise = recent30.length >= 30 && recent30.every(hasExercise);

  // 3일 연속 90점 이상
  const recent3 = sortedLogs.slice(0, 3);
  const score90streak3 = recent3.length >= 3 && recent3.every(l => l.conditionScore >= 90);

  maybeUnlock('first_record', logs.length >= 1);
  maybeUnlock('streak_3', streak >= 3);
  maybeUnlock('streak_7', streak >= 7);
  maybeUnlock('streak_14', streak >= 14);
  maybeUnlock('streak_30', streak >= 30);
  maybeUnlock('streak_100', streak >= 100);
  maybeUnlock('score_90', allScores.some(s => s >= 90));
  maybeUnlock('perfect_score', allScores.some(s => s >= 100));
  maybeUnlock('score_90_streak_3', score90streak3);
  maybeUnlock('no_alcohol_7', recent7NoAlcohol);
  maybeUnlock('no_alcohol_30', recent30NoAlcohol);
  maybeUnlock('exercise_7', recent7Exercise);
  maybeUnlock('exercise_30', recent30Exercise);
  maybeUnlock('level_3', level >= 3);
  maybeUnlock('level_5', level >= 5);
  maybeUnlock('level_10', level >= 10);
  maybeUnlock('level_12', level >= 12);
  maybeUnlock('water_goal_7', waterGoalStreak >= 7);
  maybeUnlock('total_records_30', logs.length >= 30);
  maybeUnlock('total_records_100', logs.length >= 100);
  maybeUnlock('morning_bs_14', (morningBSStreak ?? 0) >= 14);

  return newlyUnlocked;
}
