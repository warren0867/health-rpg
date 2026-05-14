import {
  DailyLog,
  EMPTY_EQUIPMENT,
  EMPTY_PERMANENT_STATS,
  EquipmentItem,
  EquipmentSlots,
  EquipmentTier,
  ExerciseEntry,
  InBodyRecord,
  PermanentStats,
  StatKey,
  WeightEntry,
} from '../types';

// ────────────────────────────────────────────────────────────
//  새 설계 (v2)
//  - InBody 최신 측정치 → STR / END / VIT / AGI 기반 스탯
//  - 매일 퀘스트(수면·운동·금주·연속기록) → 장비 4슬롯
//  - WIS → 연속 기록·절제에서 산출
//  - EVO → totalGained(InBody 기반 합산)으로 판정
// ────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ─── 1) InBody → 기본 스탯 ───────────────────────────────
//  골격근량(kg) → STR / END
//  인바디 점수   → VIT
//  체지방률(%)  → AGI (낮을수록 높음)
//
//  기준값 (일반 성인 중간값 기준):
//    STR: 근량 30kg = 36p, 40kg = 56p, 20kg = 16p
//    END: 근량 + 인바디 점수 복합
//    VIT: 점수 75 = 52p, 점수 85 = 60p
//    AGI: 체지방 15% = 37p, 20% = 25p, 10% = 50p
function calcBaseStatsFromInBody(records: InBodyRecord[]): Record<'str'|'end'|'vit'|'agi', number> {
  if (records.length === 0) {
    return { str: 5, end: 5, vit: 5, agi: 5 };
  }
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const r = sorted[0];

  const str = clamp(round1((r.skeletalMuscleMass - 12) * 2.0), 0, 80);
  const end = clamp(round1((r.skeletalMuscleMass - 12) * 1.4 + (r.score / 100) * 14), 0, 80);
  const vit = clamp(round1((r.score / 100) * 70), 0, 80);
  const agi = clamp(round1(75 - r.bodyFatPercentage * 2.5), 0, 80);

  return { str, end, vit, agi };
}

// ─── 2) 연속 기록·절제 → WIS ──────────────────────────────
function calcWis(maxStreakEverDays: number, dailyLogs: DailyLog[]): number {
  let wis = 0;
  if (maxStreakEverDays >= 3)   wis += 2;
  if (maxStreakEverDays >= 7)   wis += 4;
  if (maxStreakEverDays >= 30)  wis += 8;
  if (maxStreakEverDays >= 100) wis += 16;

  // 최근 30일 기록 퀄리티 보너스
  const recent = dailyLogs.slice(0, 30);
  const noAlcDays = recent.filter(l => !l.alcohol?.consumed).length;
  wis += round1(noAlcDays * 0.2);

  const highScoreDays = recent.filter(l => l.conditionScore >= 80).length;
  wis += round1(highScoreDays * 0.15);

  return clamp(round1(wis), 0, 60);
}

// ─── 3) 장비 시스템 ─────────────────────────────────────
function getTier(days: number): EquipmentTier {
  if (days === 0) return 'none';
  if (days <= 2)  return 'common';
  if (days <= 4)  return 'rare';
  if (days <= 6)  return 'epic';
  return 'legendary';
}

const TIER_BONUS: Record<EquipmentTier, number> = {
  none: 0, common: 3, rare: 7, epic: 12, legendary: 20,
};

const TIER_LABEL: Record<EquipmentTier, string> = {
  none: '없음', common: '일반', rare: '희귀', epic: '영웅', legendary: '전설',
};

export { TIER_LABEL };

function hasExercise(log: DailyLog): boolean {
  const types = log.exercise?.types?.filter(t => t !== 'none') ?? [];
  return types.length > 0 || (!!log.exercise?.type && log.exercise.type !== 'none');
}

function dominantExercise(logs: DailyLog[]): string {
  const count: Record<string, number> = {};
  for (const l of logs) {
    const types = l.exercise?.types?.filter(t => t !== 'none') ?? [];
    if (types.length === 0 && l.exercise?.type && l.exercise.type !== 'none') {
      types.push(l.exercise.type);
    }
    for (const t of types) count[t] = (count[t] ?? 0) + 1;
  }
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'gym';
}

const WEAPON_BY_TYPE: Record<string, { name: string; emoji: string; bonus: Partial<Record<StatKey, number>> }> = {
  gym:     { name: '전사의 검',    emoji: '⚔️',  bonus: { str: 1, end: 0 } },
  hiking:  { name: '모험가의 검',  emoji: '🗡️',  bonus: { str: 1, end: 0 } },
  swim:    { name: '파도의 창',    emoji: '🔱',  bonus: { end: 1, str: 0 } },
  run:     { name: '바람의 활',    emoji: '🏹',  bonus: { end: 1, agi: 0 } },
  cycling: { name: '질주의 활',    emoji: '🎯',  bonus: { end: 1, agi: 0 } },
  yoga:    { name: '균형의 지팡이', emoji: '🪄',  bonus: { agi: 1, vit: 0 } },
  pilates: { name: '유연의 지팡이', emoji: '✨',  bonus: { agi: 1, vit: 0 } },
  tennis:  { name: '투사의 검',    emoji: '🏸',  bonus: { agi: 1, str: 0 } },
  soccer:  { name: '전사의 창',    emoji: '⚡',  bonus: { end: 1, agi: 0 } },
  walk:    { name: '여행자의 지팡이', emoji: '🦯', bonus: { end: 1 } },
};

function calcEquipment(recentLogs: DailyLog[]): EquipmentSlots {
  const last7 = [...recentLogs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  // 무기: 운동한 날 수
  const exerciseDays = last7.filter(hasExercise);
  const weaponTier = getTier(exerciseDays.length);
  let weapon: EquipmentItem | null = null;
  if (weaponTier !== 'none') {
    const bonus_ = TIER_BONUS[weaponTier];
    const dom = dominantExercise(exerciseDays);
    const meta = WEAPON_BY_TYPE[dom] ?? WEAPON_BY_TYPE.gym;
    const bonus: Partial<Record<StatKey, number>> = {};
    for (const [k, ratio] of Object.entries(meta.bonus)) {
      bonus[k as StatKey] = ratio === 1 ? bonus_ : Math.round(bonus_ * 0.5);
    }
    weapon = { slot: 'weapon', name: meta.name, emoji: meta.emoji, tier: weaponTier, days: exerciseDays.length, bonus };
  }

  // 방어구: 수면 7h+ 날 수
  const goodSleepDays = last7.filter(l => (l.sleep?.hours ?? 0) >= 7).length;
  const armorTier = getTier(goodSleepDays);
  let armor: EquipmentItem | null = null;
  if (armorTier !== 'none') {
    const b = TIER_BONUS[armorTier];
    armor = {
      slot: 'armor', name: '회복의 갑옷', emoji: '🛡️',
      tier: armorTier, days: goodSleepDays,
      bonus: { vit: b, end: Math.round(b * 0.5) },
    };
  }

  // 반지: 금주한 날 수
  const noAlcDays = last7.filter(l => l.alcohol !== undefined && !l.alcohol.consumed).length;
  const ringTier = getTier(noAlcDays);
  let ring: EquipmentItem | null = null;
  if (ringTier !== 'none') {
    const b = TIER_BONUS[ringTier];
    ring = {
      slot: 'ring', name: '절제의 반지', emoji: '💍',
      tier: ringTier, days: noAlcDays,
      bonus: { wis: b, vit: Math.round(b * 0.5) },
    };
  }

  // 부적: 전체 기록 연속성 (최근 7일 중 기록 일수)
  const loggedDays = last7.length;
  const amuletTier = getTier(loggedDays);
  let amulet: EquipmentItem | null = null;
  if (amuletTier !== 'none') {
    const b = TIER_BONUS[amuletTier];
    amulet = {
      slot: 'amulet', name: '꾸준함의 부적', emoji: '🧿',
      tier: amuletTier, days: loggedDays,
      bonus: { wis: Math.round(b * 0.7), vit: Math.round(b * 0.3) },
    };
  }

  return { weapon, armor, ring, amulet };
}

function sumEquipmentBonus(equipment: EquipmentSlots): Record<StatKey, number> {
  const acc: Record<StatKey, number> = { str: 0, end: 0, vit: 0, agi: 0, wis: 0 };
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    for (const [k, v] of Object.entries(item.bonus) as [StatKey, number][]) {
      acc[k] = (acc[k] ?? 0) + (v ?? 0);
    }
  }
  return acc;
}

// ─── 4) 종합 재계산 ──────────────────────────────────────
export function recalcPermanentStats(opts: {
  exerciseEntries: ExerciseEntry[];
  dailyLogs: DailyLog[];
  weightLog: WeightEntry[];
  weightGoal?: 'lose' | 'maintain' | 'gain';
  maxStreakEverDays: number;
  inbodyRecords?: InBodyRecord[];
}): PermanentStats {
  const { dailyLogs, maxStreakEverDays, inbodyRecords = [] } = opts;

  const base = calcBaseStatsFromInBody(inbodyRecords);
  const wis  = calcWis(maxStreakEverDays, dailyLogs);
  const equipment = calcEquipment(dailyLogs);
  const eq = sumEquipmentBonus(equipment);

  // totalGained = InBody 기반 합산 (장비 제외) → EVO 판정 기준
  const totalGained = round1(base.str + base.end + base.vit + base.agi + wis);

  return {
    str: round1(base.str + (eq.str ?? 0)),
    end: round1(base.end + (eq.end ?? 0)),
    vit: round1(base.vit + (eq.vit ?? 0)),
    agi: round1(base.agi + (eq.agi ?? 0)),
    wis: round1(wis     + (eq.wis ?? 0)),
    totalGained,
    equipment,
    lastRecalc: new Date().toISOString(),
  };
}

// ─── 5) 최근 활동 기반 컨디션 ─────────────────────────────
export interface RecentCondition {
  score: number;
  trend: 'up' | 'down' | 'stable';
  daysInactive: number;
  label: string;
}

export function calcRecentCondition(logs: DailyLog[]): RecentCondition {
  if (logs.length === 0) {
    return { score: 5, trend: 'down', daysInactive: 99, label: '약화중' };
  }
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const lastMs  = (() => { const d = new Date(latest.date + 'T00:00:00'); return d.getTime(); })();
  const daysInactive = Math.max(0, Math.round((todayMs - lastMs) / 86_400_000));

  const consistencyScore = (logs.length / 7) * 55;
  const avgScore = logs.reduce((s, l) => s + l.conditionScore, 0) / logs.length;
  const qualityScore = (avgScore / 100) * 40;
  const inactivityPenalty = daysInactive >= 3 ? Math.min(50, (daysInactive - 2) * 10) : 0;

  const score = Math.min(100, Math.max(5, Math.round(consistencyScore + qualityScore - inactivityPenalty)));

  const recent3 = sorted.slice(0, 3);
  const older3  = sorted.slice(3, 6);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (older3.length > 0) {
    const rAvg = recent3.reduce((s, l) => s + l.conditionScore, 0) / recent3.length;
    const oAvg = older3.reduce((s, l) => s + l.conditionScore, 0) / older3.length;
    if (rAvg > oAvg + 5) trend = 'up';
    else if (rAvg < oAvg - 5) trend = 'down';
  }
  if (daysInactive >= 3) trend = 'down';

  const label = score >= 70 ? '성장중' : score >= 40 ? '유지중' : '약화중';
  return { score, trend, daysInactive, label };
}

// ─── 6) 스탯 등급 표시 ────────────────────────────────────
export function statTier(value: number): { tier: string; pct: number } {
  if (value >= 60) return { tier: '마스터',  pct: 100 };
  if (value >= 30) return { tier: '전문가',  pct: 100 };
  if (value >= 15) return { tier: '정예',    pct: Math.round(((value - 15) / 15) * 100) };
  if (value >= 5)  return { tier: '숙련',    pct: Math.round(((value - 5) / 10) * 100) };
  return { tier: '미숙', pct: Math.round((value / 5) * 100) };
}

export function statTierProgress(value: number): { current: number; next: number; pct: number; tierLabel: string } {
  if (value >= 60) return { current: value, next: value, pct: 100, tierLabel: '마스터' };
  let lower = 0, upper = 5, label = '미숙';
  if (value >= 30) { lower = 30; upper = 60; label = '전문가'; }
  else if (value >= 15) { lower = 15; upper = 30; label = '정예'; }
  else if (value >= 5)  { lower = 5;  upper = 15; label = '숙련'; }
  const pct = Math.round(((value - lower) / (upper - lower)) * 100);
  return { current: value, next: upper, pct: clamp(pct, 0, 100), tierLabel: label };
}

// ─── gainsFromInBody 등 레거시 export (ResultScreen 등에서 참조 가능) ──
export function gainsFromExerciseEntries() { return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 }; }
export function gainsFromDailyLogs()       { return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 }; }
export function gainsFromStreakMilestones() { return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 }; }
export function gainsFromWeightProgress()  { return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 }; }
export function gainsFromInBody()          { return { str: 0, end: 0, vit: 0, agi: 0, wis: 0 }; }
