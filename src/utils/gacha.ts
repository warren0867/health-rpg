import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_GACHA_INVENTORY,
  GachaBonus,
  GachaInventory,
  GachaPullResult,
  GachaRarity,
  GachaScroll,
  StatKey,
} from '../types';
import { generateId } from './storage';

const GACHA_KEY      = 'hrpg_gacha_inventory';
const DAILY_FREE_KEY = 'hrpg_gacha_daily_free';

// ─── 뽑기 풀 정의 ───────────────────────────────────────────
type ScrollTemplate = {
  name: string;
  emoji: string;
  rarity: GachaRarity;
  stat: StatKey;
  bonus: number;
  durationDays: number;
  weight: number;
};

const SCROLL_POOL: ScrollTemplate[] = [
  // 일반 (common)
  { name: '근력의 주문서',   emoji: '📜', rarity: 'common',    stat: 'str', bonus: 5,  durationDays: 7, weight: 8 },
  { name: '지구력의 주문서', emoji: '📜', rarity: 'common',    stat: 'end', bonus: 5,  durationDays: 7, weight: 8 },
  { name: '체력의 주문서',   emoji: '📜', rarity: 'common',    stat: 'vit', bonus: 5,  durationDays: 7, weight: 8 },
  { name: '민첩의 주문서',   emoji: '📜', rarity: 'common',    stat: 'agi', bonus: 5,  durationDays: 7, weight: 8 },
  { name: '의지의 주문서',   emoji: '📜', rarity: 'common',    stat: 'wis', bonus: 5,  durationDays: 7, weight: 8 },
  // 희귀 (rare)
  { name: '강화된 근력 주문서',   emoji: '🔵', rarity: 'rare', stat: 'str', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 지구력 주문서', emoji: '🔵', rarity: 'rare', stat: 'end', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 체력 주문서',   emoji: '🔵', rarity: 'rare', stat: 'vit', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 민첩 주문서',   emoji: '🔵', rarity: 'rare', stat: 'agi', bonus: 9,  durationDays: 7, weight: 5 },
  // 영웅 (epic)
  { name: '영웅의 근력 주문서', emoji: '🟣', rarity: 'epic',   stat: 'str', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 지구력 주문서',emoji: '🟣', rarity: 'epic',   stat: 'end', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 체력 주문서', emoji: '🟣', rarity: 'epic',   stat: 'vit', bonus: 14, durationDays: 7, weight: 3 },
  // 전설 (legendary)
  { name: '전설의 의지 주문서', emoji: '⭐', rarity: 'legendary', stat: 'wis', bonus: 20, durationDays: 14, weight: 1 },
  { name: '전설의 전투 주문서', emoji: '⭐', rarity: 'legendary', stat: 'str', bonus: 20, durationDays: 14, weight: 1 },
];

// 기타 보상 가중치
const XP_POTION_WEIGHT = 12;   // 경험치 물약
const GOLD_WEIGHT      = 8;    // 골드 반환 (꽝 방지)

function weightedRandom(): GachaPullResult {
  const totalScroll = SCROLL_POOL.reduce((s, t) => s + t.weight, 0);
  const total = totalScroll + XP_POTION_WEIGHT + GOLD_WEIGHT;
  let roll = Math.random() * total;

  for (const tpl of SCROLL_POOL) {
    roll -= tpl.weight;
    if (roll <= 0) {
      const scroll: GachaScroll = {
        id: generateId(),
        name: tpl.name,
        emoji: tpl.emoji,
        rarity: tpl.rarity,
        stat: tpl.stat,
        bonus: tpl.bonus,
        durationDays: tpl.durationDays,
      };
      return { type: 'scroll', scroll };
    }
  }
  roll -= XP_POTION_WEIGHT;
  if (roll <= 0) return { type: 'xp_potion', amount: 150 };
  return { type: 'gold', amount: 30 };
}

// 10연 뽑기: 최소 rare 1개 보장
function pull10(): GachaPullResult[] {
  const results: GachaPullResult[] = [];
  for (let i = 0; i < 9; i++) results.push(weightedRandom());

  // 마지막 1개: rare 이상 보장
  const guaranteed = (() => {
    const rarePlus = SCROLL_POOL.filter(t => t.rarity !== 'common');
    const total = rarePlus.reduce((s, t) => s + t.weight, 0) + XP_POTION_WEIGHT;
    let roll = Math.random() * total;
    for (const tpl of rarePlus) {
      roll -= tpl.weight;
      if (roll <= 0) {
        const scroll: GachaScroll = {
          id: generateId(), name: tpl.name, emoji: tpl.emoji,
          rarity: tpl.rarity, stat: tpl.stat, bonus: tpl.bonus,
          durationDays: tpl.durationDays,
        };
        return { type: 'scroll' as const, scroll };
      }
    }
    return { type: 'xp_potion' as const, amount: 200 };
  })();
  results.push(guaranteed);
  return results;
}

// ─── 인벤토리 CRUD ───────────────────────────────────────────

export async function getGachaInventory(): Promise<GachaInventory> {
  const raw = await AsyncStorage.getItem(GACHA_KEY);
  if (!raw) return { ...EMPTY_GACHA_INVENTORY };
  const parsed: GachaInventory = JSON.parse(raw);
  // 만료된 버프 제거
  const now = new Date().toISOString();
  return {
    ...parsed,
    activeBonuses: (parsed.activeBonuses ?? []).filter(b => b.expiresAt > now),
  };
}

export async function setGachaInventory(inv: GachaInventory): Promise<void> {
  await AsyncStorage.setItem(GACHA_KEY, JSON.stringify(inv));
}

export async function addGold(amount: number): Promise<number> {
  const inv = await getGachaInventory();
  const updated = { ...inv, gold: inv.gold + amount };
  await setGachaInventory(updated);
  return updated.gold;
}

export async function getGold(): Promise<number> {
  const inv = await getGachaInventory();
  return inv.gold;
}

// ─── 일일 무료 뽑기 ──────────────────────────────────────────

export async function canDailyFreePull(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(DAILY_FREE_KEY);
  if (!raw) return true;
  const today = new Date().toISOString().slice(0, 10);
  return raw !== today;
}

export async function doDailyFreePull(): Promise<GachaPullResult | null> {
  const can = await canDailyFreePull();
  if (!can) return null;
  const today = new Date().toISOString().slice(0, 10);
  await AsyncStorage.setItem(DAILY_FREE_KEY, today);
  const inv = await getGachaInventory();
  const result = weightedRandom();
  let newScrolls = [...inv.scrolls];
  let goldToAdd = 0;
  if (result.type === 'scroll') newScrolls.push(result.scroll);
  else if (result.type === 'gold') goldToAdd = result.amount;
  await setGachaInventory({ ...inv, gold: inv.gold + goldToAdd, scrolls: newScrolls });
  return result;
}

// ─── 뽑기 실행 ───────────────────────────────────────────────
const SINGLE_COST = 30;
const TEN_COST    = 270;

export async function doPull(count: 1 | 10): Promise<{ results: GachaPullResult[]; newGold: number } | null> {
  const inv = await getGachaInventory();
  const cost = count === 1 ? SINGLE_COST : TEN_COST;
  if (inv.gold < cost) return null;

  const results: GachaPullResult[] = count === 1 ? [weightedRandom()] : pull10();

  // 인벤토리에 결과 반영
  let newScrolls = [...inv.scrolls];
  let xpToAdd = 0;
  let goldToAdd = 0;
  for (const r of results) {
    if (r.type === 'scroll') newScrolls.push(r.scroll);
    else if (r.type === 'xp_potion') xpToAdd += r.amount;
    else if (r.type === 'gold') goldToAdd += r.amount;
  }

  const newGold = inv.gold - cost + goldToAdd;
  await setGachaInventory({ ...inv, gold: newGold, scrolls: newScrolls });

  return { results, newGold };
}

// XP 물약 처리는 호출자에서 (addXP import 순환 방지)
export async function applyXpPotions(results: GachaPullResult[], addXpFn: (xp: number) => Promise<any>) {
  for (const r of results) {
    if (r.type === 'xp_potion') await addXpFn(r.amount);
  }
}

// ─── 주문서 사용 ─────────────────────────────────────────────

export async function useScroll(scrollId: string): Promise<GachaBonus | null> {
  const inv = await getGachaInventory();
  const scroll = inv.scrolls.find(s => s.id === scrollId);
  if (!scroll) return null;

  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + scroll.durationDays);

  const bonus: GachaBonus = {
    id: generateId(),
    name: scroll.name.replace('주문서', '강화'),
    emoji: scroll.emoji,
    rarity: scroll.rarity,
    stat: scroll.stat,
    bonus: scroll.bonus,
    expiresAt: expires.toISOString(),
  };

  const newScrolls = inv.scrolls.filter(s => s.id !== scrollId);
  // 같은 스탯 기존 버프 교체 (중복 방지)
  const newBonuses = [
    ...inv.activeBonuses.filter(b => b.stat !== scroll.stat),
    bonus,
  ];

  await setGachaInventory({ ...inv, scrolls: newScrolls, activeBonuses: newBonuses });
  return bonus;
}

// ─── 현재 활성 버프 합산 ─────────────────────────────────────

export function sumActiveBonuses(bonuses: GachaBonus[]): Partial<Record<StatKey, number>> {
  const result: Partial<Record<StatKey, number>> = {};
  const now = new Date().toISOString();
  for (const b of bonuses) {
    if (b.expiresAt <= now) continue;
    result[b.stat] = (result[b.stat] ?? 0) + b.bonus;
  }
  return result;
}

export { SINGLE_COST, TEN_COST, DAILY_FREE_KEY };
