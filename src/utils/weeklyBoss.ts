import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog } from '../types';

export interface BossDef {
  id: number;
  name: string;
  emoji: string;
  subtitle: string;
  color: string;
  bgColor: string;
  weakness: string;
  maxHp: number;
}

export const BOSS_DEFS: BossDef[] = [
  {
    id: 0,
    name: '나태의 마왕',
    emoji: '👹',
    subtitle: '운동 포기자의 수호신',
    color: '#FF5370',
    bgColor: 'rgba(255,83,112,0.08)',
    weakness: '운동',
    maxHp: 300,
  },
  {
    id: 1,
    name: '술의 악마',
    emoji: '🍺',
    subtitle: '절제를 무너뜨리는 자',
    color: '#F5A623',
    bgColor: 'rgba(245,166,35,0.08)',
    weakness: '금주',
    maxHp: 300,
  },
  {
    id: 2,
    name: '불면의 저주',
    emoji: '👁️',
    subtitle: '수면을 빼앗는 악령',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.08)',
    weakness: '수면 7h+',
    maxHp: 300,
  },
  {
    id: 3,
    name: '혼돈의 거인',
    emoji: '💀',
    subtitle: '루틴을 파괴하는 자',
    color: '#06D6A0',
    bgColor: 'rgba(6,214,160,0.08)',
    weakness: '꾸준한 기록',
    maxHp: 300,
  },
];

export interface WeeklyBossState {
  weekKey: string;
  bossId: number;
  damageDealt: number;
  maxHp: number;
  result: 'ongoing' | 'victory' | 'defeat';
  rewardClaimed: boolean;
}

const BOSS_KEY = 'hrpg_weekly_boss';

function getWeekKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getThisWeekLogs(logs: DailyLog[]): DailyLog[] {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  return logs.filter(l => l.date >= mondayStr && l.date <= todayStr);
}

function calcDamageForLog(bossId: number, log: DailyLog): number {
  const hasEx = (() => {
    const types = log.exercise?.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (!!log.exercise?.type && log.exercise.type !== 'none');
  })();
  const goodSleep = (log.sleep?.hours ?? 0) >= 7;
  const noAlc = log.alcohol ? !log.alcohol.consumed : false;

  switch (bossId) {
    case 0: // 나태의 마왕 — 운동에 취약
      return (hasEx ? 40 : 0) + (goodSleep ? 20 : 0) + (noAlc ? 10 : 0) + 10;
    case 1: // 술의 악마 — 금주에 취약
      return (noAlc ? 40 : 0) + (goodSleep ? 20 : 0) + (hasEx ? 10 : 0) + 10;
    case 2: // 불면의 저주 — 수면에 취약
      return (goodSleep ? 45 : 0) + (hasEx ? 15 : 0) + (noAlc ? 10 : 0) + 5;
    case 3: // 혼돈의 거인 — 꾸준함에 취약
      return 20 + (log.conditionScore >= 70 ? 20 : 0) + (hasEx ? 10 : 0);
    default:
      return 0;
  }
}

export async function getOrCreateWeeklyBoss(): Promise<WeeklyBossState> {
  const weekKey = getWeekKey();
  const raw = await AsyncStorage.getItem(BOSS_KEY);
  const existing: WeeklyBossState | null = raw ? JSON.parse(raw) : null;
  if (existing && existing.weekKey === weekKey) return existing;

  const weekNum = parseInt(weekKey.replace(/\D/g, ''));
  const bossId = weekNum % 4;

  const fresh: WeeklyBossState = {
    weekKey,
    bossId,
    damageDealt: 0,
    maxHp: BOSS_DEFS[bossId].maxHp,
    result: 'ongoing',
    rewardClaimed: false,
  };
  await AsyncStorage.setItem(BOSS_KEY, JSON.stringify(fresh));
  return fresh;
}

export async function updateWeeklyBoss(allLogs: DailyLog[]): Promise<WeeklyBossState> {
  const state = await getOrCreateWeeklyBoss();
  const thisWeekLogs = getThisWeekLogs(allLogs);

  const totalDamage = thisWeekLogs.reduce(
    (acc, log) => acc + calcDamageForLog(state.bossId, log),
    0,
  );

  let result = state.result;
  if (result === 'ongoing' && totalDamage >= state.maxHp) {
    result = 'victory';
  }

  const updated: WeeklyBossState = { ...state, damageDealt: totalDamage, result };
  await AsyncStorage.setItem(BOSS_KEY, JSON.stringify(updated));
  return updated;
}

export const BOSS_REWARD_XP   = 200;
export const BOSS_REWARD_GOLD = 100;

export async function claimBossReward(
  addXpFn: (xp: number) => Promise<any>,
  addGoldFn: (gold: number) => Promise<any>,
): Promise<{ xp: number; gold: number }> {
  const raw = await AsyncStorage.getItem(BOSS_KEY);
  if (!raw) return { xp: 0, gold: 0 };
  const state: WeeklyBossState = JSON.parse(raw);
  if (state.result !== 'victory' || state.rewardClaimed) return { xp: 0, gold: 0 };
  await addXpFn(BOSS_REWARD_XP);
  await addGoldFn(BOSS_REWARD_GOLD);
  const updated: WeeklyBossState = { ...state, rewardClaimed: true };
  await AsyncStorage.setItem(BOSS_KEY, JSON.stringify(updated));
  return { xp: BOSS_REWARD_XP, gold: BOSS_REWARD_GOLD };
}
