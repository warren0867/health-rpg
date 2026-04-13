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
  const levelEnd = LEVEL_THRESHOLDS[idx + 1] ?? levelStart + 2000;
  const current = xp - levelStart;
  const needed = levelEnd - levelStart;
  return {
    level,
    current,
    needed,
    pct: isMax ? 100 : Math.min(100, Math.round((current / needed) * 100)),
    isMax,
  };
}

// 하루 기록 시 XP 계산
export function calcXPGain(score: number, streak: number): number {
  const base = Math.round(score * 1.5);
  const streakBonus = Math.min(streak * 3, 25);        // 최대 +25
  const excellenceBonus = score >= 90 ? 20 : score >= 75 ? 10 : 0;
  return base + streakBonus + excellenceBonus;
}

// ─── 업적 조건 체크 ──────────────────────────────────────

export function checkAchievements(
  logs: DailyLog[],
  streak: number,
  level: number,
  unlockedIds: string[],
  waterGoalStreak: number,
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];

  const maybeUnlock = (id: AchievementId, condition: boolean) => {
    if (condition && !unlockedIds.includes(id)) {
      newlyUnlocked.push(ACHIEVEMENT_DEFS[id]);
    }
  };

  const allScores = logs.map(l => l.conditionScore);
  const recentLogs = logs.slice(0, 7);
  const recentNoAlcohol = recentLogs.length >= 7 && recentLogs.every(l => !l.alcohol.consumed);
  const recentExercise = recentLogs.length >= 7 && recentLogs.every(l => {
    const types = l.exercise.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise.type && l.exercise.type !== 'none');
  });

  maybeUnlock('first_record', logs.length >= 1);
  maybeUnlock('streak_3', streak >= 3);
  maybeUnlock('streak_7', streak >= 7);
  maybeUnlock('streak_30', streak >= 30);
  maybeUnlock('score_90', allScores.some(s => s >= 90));
  maybeUnlock('perfect_score', allScores.some(s => s >= 100));
  maybeUnlock('no_alcohol_7', recentNoAlcohol);
  maybeUnlock('exercise_7', recentExercise);
  maybeUnlock('level_5', level >= 5);
  maybeUnlock('level_10', level >= 10);
  maybeUnlock('water_goal_7', waterGoalStreak >= 7);

  return newlyUnlocked;
}
