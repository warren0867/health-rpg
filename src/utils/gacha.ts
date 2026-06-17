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
  // 희귀 (rare) — 5스탯 전부
  { name: '강화된 근력 주문서',   emoji: '🔵', rarity: 'rare', stat: 'str', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 지구력 주문서', emoji: '🔵', rarity: 'rare', stat: 'end', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 체력 주문서',   emoji: '🔵', rarity: 'rare', stat: 'vit', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 민첩 주문서',   emoji: '🔵', rarity: 'rare', stat: 'agi', bonus: 9,  durationDays: 7, weight: 5 },
  { name: '강화된 의지 주문서',   emoji: '🔵', rarity: 'rare', stat: 'wis', bonus: 9,  durationDays: 7, weight: 5 },
  // 영웅 (epic) — 5스탯 전부
  { name: '영웅의 근력 주문서',   emoji: '🟣', rarity: 'epic',  stat: 'str', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 지구력 주문서', emoji: '🟣', rarity: 'epic',  stat: 'end', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 체력 주문서',   emoji: '🟣', rarity: 'epic',  stat: 'vit', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 민첩 주문서',   emoji: '🟣', rarity: 'epic',  stat: 'agi', bonus: 14, durationDays: 7, weight: 3 },
  { name: '영웅의 의지 주문서',   emoji: '🟣', rarity: 'epic',  stat: 'wis', bonus: 14, durationDays: 7, weight: 3 },
  // 전설 (legendary) — 5스탯 전부
  { name: '전설의 전투 주문서',   emoji: '⭐', rarity: 'legendary', stat: 'str', bonus: 20, durationDays: 14, weight: 1 },
  { name: '전설의 불굴 주문서',   emoji: '⭐', rarity: 'legendary', stat: 'end', bonus: 20, durationDays: 14, weight: 1 },
  { name: '전설의 생명 주문서',   emoji: '⭐', rarity: 'legendary', stat: 'vit', bonus: 20, durationDays: 14, weight: 1 },
  { name: '전설의 질풍 주문서',   emoji: '⭐', rarity: 'legendary', stat: 'agi', bonus: 20, durationDays: 14, weight: 1 },
  { name: '전설의 의지 주문서',   emoji: '⭐', rarity: 'legendary', stat: 'wis', bonus: 20, durationDays: 14, weight: 1 },
];

const STAT_KEYS: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];

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

// 스탯별 버프 누적 상한 (무한 강화 방지)
export const STAT_BUFF_CAP = 40;

export async function useScroll(scrollId: string): Promise<GachaBonus | null> {
  const inv = await getGachaInventory();
  const scroll = inv.scrolls.find(s => s.id === scrollId);
  if (!scroll) return null;

  const nowMs = Date.now();
  // 같은 스탯에 활성 버프가 있으면 → 수치 누적(상한) + 기간 연장
  const existing = inv.activeBonuses.find(
    b => b.stat === scroll.stat && new Date(b.expiresAt).getTime() > nowMs
  );

  const stackedBonus = Math.min(STAT_BUFF_CAP, (existing?.bonus ?? 0) + scroll.bonus);
  // 기간은 (기존 남은 만료 시각 또는 지금) + 새 주문서 일수 → 항상 늘어남
  const baseMs = existing ? Math.max(nowMs, new Date(existing.expiresAt).getTime()) : nowMs;
  const expires = new Date(baseMs);
  expires.setDate(expires.getDate() + scroll.durationDays);

  const bonus: GachaBonus = {
    id: existing?.id ?? generateId(),
    name: scroll.name.replace('주문서', '강화'),
    emoji: scroll.emoji,
    rarity: scroll.rarity,
    stat: scroll.stat,
    bonus: stackedBonus,
    expiresAt: expires.toISOString(),
  };

  const newScrolls = inv.scrolls.filter(s => s.id !== scrollId);
  const newBonuses = [
    ...inv.activeBonuses.filter(b => b.stat !== scroll.stat),
    bonus,
  ];

  await setGachaInventory({ ...inv, scrolls: newScrolls, activeBonuses: newBonuses });
  return bonus;
}

// ─── 주문서 합성 (같은 등급 3개 → 한 단계 위) ───────────────

const RARITY_UP: Partial<Record<GachaRarity, GachaRarity>> = {
  common: 'rare',
  rare:   'epic',
  epic:   'legendary',
};

// 특정 (등급·스탯) 주문서 생성. 해당 조합 템플릿이 없으면 그 등급 아무거나.
function makeScrollOfRarity(rarity: GachaRarity, stat?: StatKey): GachaScroll {
  const pool = SCROLL_POOL.filter(t => t.rarity === rarity);
  const tpl = (stat && pool.find(t => t.stat === stat)) || pool[Math.floor(Math.random() * pool.length)];
  return {
    id: generateId(), name: tpl.name, emoji: tpl.emoji,
    rarity, stat: tpl.stat, bonus: tpl.bonus, durationDays: tpl.durationDays,
  };
}

// 입력 주문서들의 스탯 중 가장 많은 스탯 (동률이면 첫 번째) — 합성 결과 스탯 보존용
function dominantStat(scrolls: GachaScroll[]): StatKey {
  const counts: Partial<Record<StatKey, number>> = {};
  for (const s of scrolls) counts[s.stat] = (counts[s.stat] ?? 0) + 1;
  let best = scrolls[0].stat, bestN = 0;
  for (const s of scrolls) {
    const n = counts[s.stat] ?? 0;
    if (n > bestN) { best = s.stat; bestN = n; }
  }
  return best;
}

export async function fuseScrolls(scrollIds: string[]): Promise<GachaScroll | null> {
  if (scrollIds.length !== 3) return null;
  const inv = await getGachaInventory();
  const scrolls = scrollIds.map(id => inv.scrolls.find(s => s.id === id)).filter((s): s is GachaScroll => !!s);
  if (scrolls.length !== 3) return null;

  const rarity = scrolls[0].rarity;
  if (!scrolls.every(s => s.rarity === rarity)) return null;

  const nextRarity = RARITY_UP[rarity];
  if (!nextRarity) return null; // legendary는 합성 불가

  // 넣은 주문서의 스탯을 보존 (다수 스탯)
  const newScroll = makeScrollOfRarity(nextRarity, dominantStat(scrolls));

  const remaining = inv.scrolls.filter(s => !scrollIds.includes(s.id));
  await setGachaInventory({ ...inv, scrolls: [...remaining, newScroll] });
  return newScroll;
}

/** 일괄 합성 — 같은 등급·같은 스탯끼리 3개씩 묶어 한 단계 위 같은 스탯으로 합성.
 *  스탯이 보존되며, 결과가 다시 3개 모이면 연쇄 합성된다 (common→…→legendary).
 *  생성된 주문서 목록을 반환. */
export async function fuseAllScrolls(): Promise<GachaScroll[]> {
  const inv = await getGachaInventory();
  let scrolls = [...inv.scrolls];
  const created: GachaScroll[] = [];

  for (const rarity of ['common', 'rare', 'epic'] as GachaRarity[]) {
    const nextRarity = RARITY_UP[rarity];
    if (!nextRarity) continue;
    for (const stat of STAT_KEYS) {
      while (scrolls.filter(s => s.rarity === rarity && s.stat === stat).length >= 3) {
        const three = scrolls.filter(s => s.rarity === rarity && s.stat === stat).slice(0, 3);
        const ids = new Set(three.map(s => s.id));
        const newScroll = makeScrollOfRarity(nextRarity, stat);
        created.push(newScroll);
        scrolls = scrolls.filter(s => !ids.has(s.id));
        scrolls.push(newScroll);
      }
    }
  }

  if (created.length === 0) return [];
  await setGachaInventory({ ...inv, scrolls });
  return created;
}

/** 일괄 합성 시 생길 합성 횟수를 미리 계산 (같은 등급·같은 스탯 3개 단위, 연쇄 포함) */
export function countFusable(scrolls: GachaScroll[]): number {
  const counts: Record<string, number> = {};
  for (const s of scrolls) { const k = `${s.rarity}|${s.stat}`; counts[k] = (counts[k] ?? 0) + 1; }
  let total = 0;
  for (const rarity of ['common', 'rare', 'epic'] as GachaRarity[]) {
    const next = RARITY_UP[rarity];
    for (const stat of STAT_KEYS) {
      const k = `${rarity}|${stat}`;
      const groups = Math.floor((counts[k] ?? 0) / 3);
      total += groups;
      if (next) { const nk = `${next}|${stat}`; counts[nk] = (counts[nk] ?? 0) + groups; }
    }
  }
  return total;
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
