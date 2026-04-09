import AsyncStorage from '@react-native-async-storage/async-storage';
import { BloodSugarEntry, DailyLog, FoodEntry, MorningBloodSugar, UserProfile } from '../types';

const KEYS = {
  USER_PROFILE: 'hrpg_profile',
  DAILY_LOGS: 'hrpg_daily_logs',
  FOOD_ENTRIES: 'hrpg_food_entries',
  MORNING_BS: 'hrpg_morning_bs',
  BLOOD_SUGAR: 'hrpg_blood_sugar',
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
