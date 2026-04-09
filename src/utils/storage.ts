import AsyncStorage from '@react-native-async-storage/async-storage';
import { BloodSugarEntry, DailyLog, FoodEntry, FoodItem, MorningBloodSugar, RecentFoodEntry, UserProfile } from '../types';

const KEYS = {
  USER_PROFILE: 'hrpg_profile',
  DAILY_LOGS: 'hrpg_daily_logs',
  FOOD_ENTRIES: 'hrpg_food_entries',
  MORNING_BS: 'hrpg_morning_bs',
  BLOOD_SUGAR: 'hrpg_blood_sugar',
  RECENT_FOODS: 'hrpg_recent_foods',
  FAVORITE_FOODS: 'hrpg_favorite_foods',
  CUSTOM_FOODS: 'hrpg_custom_foods',
} as const;

// ─────────────────────────────────────────────
//  날짜 유틸
// ─────────────────────────────────────────────

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getDatesBefore(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

// ─────────────────────────────────────────────
//  사용자 프로필
// ─────────────────────────────────────────────

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

// ─────────────────────────────────────────────
//  일일 건강 로그
// ─────────────────────────────────────────────

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
  const logs: Record<string, DailyLog> = raw ? JSON.parse(raw) : {};
  logs[log.date] = log;
  await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(logs));
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
  if (!raw) return null;
  return JSON.parse(raw)[date] ?? null;
}

export async function getAllDailyLogs(): Promise<DailyLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
  if (!raw) return [];
  return Object.values(JSON.parse(raw)).sort((a: any, b: any) => b.date.localeCompare(a.date)) as DailyLog[];
}

export async function getRecentDailyLogs(days: number): Promise<DailyLog[]> {
  const all = await getAllDailyLogs();
  return all.slice(0, days);
}

// ─────────────────────────────────────────────
//  식단 / 칼로리 기록
// ─────────────────────────────────────────────

export async function saveFoodEntry(entry: FoodEntry): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_ENTRIES);
  const entries: FoodEntry[] = raw ? JSON.parse(raw) : [];
  entries.push(entry);
  await AsyncStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(entries));
}

export async function getFoodEntriesByDate(date: string): Promise<FoodEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_ENTRIES);
  if (!raw) return [];
  return (JSON.parse(raw) as FoodEntry[])
    .filter(e => e.date === date)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_ENTRIES);
  if (!raw) return;
  const filtered = (JSON.parse(raw) as FoodEntry[]).filter(e => e.id !== id);
  await AsyncStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify(filtered));
}

export function sumFoodEntries(entries: FoodEntry[]) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      carbs: acc.carbs + e.carbs,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );
}

// 어제 식단 복사
export async function copyYesterdayMeals(today: string, yesterday: string): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_ENTRIES);
  const all: FoodEntry[] = raw ? JSON.parse(raw) : [];
  const yesterdayEntries = all.filter(e => e.date === yesterday);
  if (yesterdayEntries.length === 0) return 0;
  const copied = yesterdayEntries.map(e => ({
    ...e,
    id: generateId(),
    date: today,
    timestamp: new Date().toISOString(),
  }));
  await AsyncStorage.setItem(KEYS.FOOD_ENTRIES, JSON.stringify([...all, ...copied]));
  return copied.length;
}

// ─────────────────────────────────────────────
//  최근 음식
// ─────────────────────────────────────────────

export async function trackRecentFood(foodId: string, foodName: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.RECENT_FOODS);
  const recents: RecentFoodEntry[] = raw ? JSON.parse(raw) : [];
  const idx = recents.findIndex(r => r.foodId === foodId);
  if (idx >= 0) {
    recents[idx].lastUsed = new Date().toISOString();
    recents[idx].useCount += 1;
  } else {
    recents.unshift({ foodId, foodName, lastUsed: new Date().toISOString(), useCount: 1 });
  }
  // 최대 20개 유지
  const trimmed = recents.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed)).slice(0, 20);
  await AsyncStorage.setItem(KEYS.RECENT_FOODS, JSON.stringify(trimmed));
}

export async function getRecentFoods(): Promise<RecentFoodEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.RECENT_FOODS);
  if (!raw) return [];
  return (JSON.parse(raw) as RecentFoodEntry[])
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, 10);
}

// ─────────────────────────────────────────────
//  즐겨찾기
// ─────────────────────────────────────────────

export async function getFavoriteFoodIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.FAVORITE_FOODS);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavoriteFood(foodId: string): Promise<boolean> {
  const favs = await getFavoriteFoodIds();
  const isNowFav = !favs.includes(foodId);
  const updated = isNowFav ? [...favs, foodId] : favs.filter(id => id !== foodId);
  await AsyncStorage.setItem(KEYS.FAVORITE_FOODS, JSON.stringify(updated));
  return isNowFav;
}

// ─────────────────────────────────────────────
//  커스텀 음식
// ─────────────────────────────────────────────

export async function saveCustomFood(food: FoodItem): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_FOODS);
  const customs: FoodItem[] = raw ? JSON.parse(raw) : [];
  const idx = customs.findIndex(f => f.id === food.id);
  if (idx >= 0) customs[idx] = food;
  else customs.push(food);
  await AsyncStorage.setItem(KEYS.CUSTOM_FOODS, JSON.stringify(customs));
}

export async function getCustomFoods(): Promise<FoodItem[]> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_FOODS);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteCustomFood(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_FOODS);
  if (!raw) return;
  const filtered = (JSON.parse(raw) as FoodItem[]).filter(f => f.id !== id);
  await AsyncStorage.setItem(KEYS.CUSTOM_FOODS, JSON.stringify(filtered));
}

// ─────────────────────────────────────────────
//  공복혈당 (아침 1회)
// ─────────────────────────────────────────────

export async function saveMorningBS(entry: MorningBloodSugar): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.MORNING_BS);
  const entries: Record<string, MorningBloodSugar> = raw ? JSON.parse(raw) : {};
  entries[entry.date] = entry; // 하루 1개만 저장 (덮어쓰기)
  await AsyncStorage.setItem(KEYS.MORNING_BS, JSON.stringify(entries));
}

export async function getMorningBS(date: string): Promise<MorningBloodSugar | null> {
  const raw = await AsyncStorage.getItem(KEYS.MORNING_BS);
  if (!raw) return null;
  return JSON.parse(raw)[date] ?? null;
}

export async function getRecentMorningBS(days: number): Promise<MorningBloodSugar[]> {
  const raw = await AsyncStorage.getItem(KEYS.MORNING_BS);
  if (!raw) return [];
  const all = Object.values(JSON.parse(raw)) as MorningBloodSugar[];
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days);
}

export async function getAllMorningBS(): Promise<MorningBloodSugar[]> {
  const raw = await AsyncStorage.getItem(KEYS.MORNING_BS);
  if (!raw) return [];
  return (Object.values(JSON.parse(raw)) as MorningBloodSugar[])
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function calcAvgBS(entries: MorningBloodSugar[]): number | null {
  if (entries.length === 0) return null;
  return Math.round(entries.reduce((s, e) => s + e.value, 0) / entries.length);
}

export function getBSTrend(entries: MorningBloodSugar[]): 'up' | 'down' | 'stable' | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const diff = sorted[0].value - sorted[1].value;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

// ─────────────────────────────────────────────
//  혈당 상세 기록 (멀티 타이밍)
// ─────────────────────────────────────────────

export async function saveBloodSugarEntry(entry: BloodSugarEntry): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.BLOOD_SUGAR);
  const entries: BloodSugarEntry[] = raw ? JSON.parse(raw) : [];
  entries.push(entry);
  await AsyncStorage.setItem(KEYS.BLOOD_SUGAR, JSON.stringify(entries));
}

export async function getBloodSugarByDate(date: string): Promise<BloodSugarEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.BLOOD_SUGAR);
  if (!raw) return [];
  return (JSON.parse(raw) as BloodSugarEntry[])
    .filter(e => e.date === date)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getBloodSugarWeekly(): Promise<BloodSugarEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.BLOOD_SUGAR);
  if (!raw) return [];
  const all = JSON.parse(raw) as BloodSugarEntry[];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return all.filter(e => e.date >= cutoffStr);
}

export async function getAllBloodSugar(): Promise<BloodSugarEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.BLOOD_SUGAR);
  if (!raw) return [];
  return (JSON.parse(raw) as BloodSugarEntry[])
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function deleteBloodSugarEntry(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.BLOOD_SUGAR);
  if (!raw) return;
  const filtered = (JSON.parse(raw) as BloodSugarEntry[]).filter(e => e.id !== id);
  await AsyncStorage.setItem(KEYS.BLOOD_SUGAR, JSON.stringify(filtered));
}

export function calcWeeklyAvgBloodSugar(entries: BloodSugarEntry[]): number | null {
  const fasting = entries.filter(e => e.timing === 'fasting');
  if (fasting.length === 0) return null;
  return Math.round(fasting.reduce((s, e) => s + e.value, 0) / fasting.length);
}
