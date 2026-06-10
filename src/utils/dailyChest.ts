import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from './storage';

const CHEST_KEY = 'hrpg_daily_chest';

export interface ChestReward {
  gold: number;
  xp: number;
  jackpot: boolean;   // 15% 확률 2배
}

interface ChestState {
  lastClaimedDate: string;  // YYYY-MM-DD
}

export async function isChestClaimedToday(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CHEST_KEY);
  if (!raw) return false;
  try {
    const state: ChestState = JSON.parse(raw);
    return state.lastClaimedDate === getTodayKey();
  } catch {
    return false;
  }
}

/** 연속 출석일수록 커지는 보상 (7일에서 캡) */
export function calcChestReward(streak: number): ChestReward {
  const bonus = Math.min(streak, 7);
  const jackpot = Math.random() < 0.15;
  const mult = jackpot ? 2 : 1;
  return {
    gold: (30 + bonus * 10) * mult,
    xp: (15 + bonus * 5) * mult,
    jackpot,
  };
}

/** 오늘 보상 수령 처리. 이미 받았으면 null 반환. */
export async function claimDailyChest(streak: number): Promise<ChestReward | null> {
  if (await isChestClaimedToday()) return null;
  const reward = calcChestReward(streak);
  const state: ChestState = { lastClaimedDate: getTodayKey() };
  await AsyncStorage.setItem(CHEST_KEY, JSON.stringify(state));
  return reward;
}
