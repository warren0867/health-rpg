import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────────────────────
//  장비 시스템 — 뽑기 / 장착 / 강화(+N) / 판매 / 사냥 드랍
//  강화는 올라갈수록 확률이 떨어지고(바닥 10%), 한계는 없다.
//  높은 강화 달성 시 업적 + 최강 무기 보상.
// ────────────────────────────────────────────────────────────

const GEAR_KEY = 'hrpg_gear';

export type GearKind = 'weapon' | 'armor' | 'accessory';
export type GearTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface GearItem {
  id: string;
  kind: GearKind;
  tier: GearTier;
  name: string;
  emoji: string;
  base: number;     // 기본 수치 (무기=공격, 방어구=방어)
  enh: number;      // 강화 수치 (+N)
}

export interface GearState {
  weapon: GearItem | null;
  armor: GearItem | null;
  accessory: GearItem | null;
  inventory: GearItem[];
  weaponScrolls: number;     // 무기 강화 주문서
  armorScrolls: number;      // 방어구 강화 주문서
  accessoryScrolls: number;  // 악세사리 강화 주문서
  swordRewarded: boolean;    // 최강 무기 업적 보상 지급 여부
}

export const EMPTY_GEAR: GearState = {
  weapon: null, armor: null, accessory: null, inventory: [],
  weaponScrolls: 0, armorScrolls: 0, accessoryScrolls: 0, swordRewarded: false,
};

export const TIER_CFG: Record<GearTier, {
  label: string; color: string; weight: number; base: number; sell: number;
}> = {
  common:    { label: '일반', color: '#64748B', weight: 56, base: 3,  sell: 50 },
  rare:      { label: '희귀', color: '#3B82F6', weight: 30, base: 6,  sell: 140 },
  epic:      { label: '영웅', color: '#8B5CF6', weight: 11, base: 10, sell: 360 },
  legendary: { label: '전설', color: '#F59E0B', weight: 3,  base: 16, sell: 900 },
};

const KIND_LABEL: Record<GearKind, string> = { weapon: '무기', armor: '방어구', accessory: '악세사리' };

const GEAR_NAMES: Record<GearKind, Record<GearTier, { name: string; emoji: string }[]>> = {
  weapon: {
    common:    [{ name: '낡은 검', emoji: '🗡️' }, { name: '나무 몽둥이', emoji: '🪵' }],
    rare:      [{ name: '강철 검', emoji: '⚔️' }, { name: '전투 도끼', emoji: '🪓' }],
    epic:      [{ name: '마력의 창', emoji: '🔱' }, { name: '룬 블레이드', emoji: '🗡️' }],
    legendary: [{ name: '용살자의 대검', emoji: '⚡' }, { name: '태양의 검', emoji: '🌟' }],
  },
  armor: {
    common:    [{ name: '천 갑옷', emoji: '🥋' }, { name: '가죽 갑옷', emoji: '🦺' }],
    rare:      [{ name: '사슬 갑옷', emoji: '⛓️' }, { name: '강철 방패', emoji: '🛡️' }],
    epic:      [{ name: '수호자의 판금', emoji: '🛡️' }, { name: '마력의 로브', emoji: '🧥' }],
    legendary: [{ name: '용비늘 갑주', emoji: '🐲' }, { name: '성기사의 갑주', emoji: '✨' }],
  },
  accessory: {
    common:    [{ name: '낡은 반지', emoji: '💍' }, { name: '구리 목걸이', emoji: '📿' }],
    rare:      [{ name: '마력의 반지', emoji: '💍' }, { name: '수정 목걸이', emoji: '🔮' }],
    epic:      [{ name: '용의 눈', emoji: '🦎' }, { name: '현자의 부적', emoji: '🧿' }],
    legendary: [{ name: '불멸의 인장', emoji: '♾️' }, { name: '신성한 성배', emoji: '🏆' }],
  },
};

// ─── 상태 저장/로드 ──────────────────────────────────────
export async function getGearState(): Promise<GearState> {
  const raw = await AsyncStorage.getItem(GEAR_KEY);
  if (!raw) return { ...EMPTY_GEAR };
  try { return { ...EMPTY_GEAR, ...JSON.parse(raw) }; } catch { return { ...EMPTY_GEAR }; }
}

export async function saveGearState(g: GearState): Promise<void> {
  await AsyncStorage.setItem(GEAR_KEY, JSON.stringify(g));
}

// ─── 뽑기 ────────────────────────────────────────────────
export const GEAR_PULL_COST = 150;

export type PullResult =
  | { type: 'gear'; item: GearItem }
  | { type: 'scroll'; kind: GearKind };

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function rollTier(): GearTier {
  const entries = Object.entries(TIER_CFG) as [GearTier, typeof TIER_CFG.common][];
  const total = entries.reduce((s, [, c]) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const [tier, c] of entries) { r -= c.weight; if (r <= 0) return tier; }
  return 'common';
}

/** 종류 무작위 — 무기 40% / 방어구 40% / 악세사리 20% */
export function randomKind(): GearKind {
  const r = Math.random();
  return r < 0.4 ? 'weapon' : r < 0.8 ? 'armor' : 'accessory';
}

export function rollGear(kind?: GearKind, tier?: GearTier): GearItem {
  const k: GearKind = kind ?? randomKind();
  const t: GearTier = tier ?? rollTier();
  const pool = GEAR_NAMES[k][t];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { id: genId(), kind: k, tier: t, name: pick.name, emoji: pick.emoji, base: TIER_CFG[t].base, enh: 0 };
}

/** 장비 뽑기 1회 — 72% 장비 / 28% 강화 주문서 */
export function pullGear(): PullResult {
  if (Math.random() < 0.28) {
    return { type: 'scroll', kind: randomKind() };
  }
  return { type: 'gear', item: rollGear() };
}

// ─── 주문서 보유/지급 헬퍼 (무기/방어구/악세사리 공통) ───────
export function scrollCount(g: GearState, kind: GearKind): number {
  return kind === 'weapon' ? g.weaponScrolls : kind === 'armor' ? g.armorScrolls : g.accessoryScrolls;
}

export function addScroll(g: GearState, kind: GearKind, n = 1): void {
  if (kind === 'weapon') g.weaponScrolls += n;
  else if (kind === 'armor') g.armorScrolls += n;
  else g.accessoryScrolls += n;
}

export function spendScroll(g: GearState, kind: GearKind): void {
  if (kind === 'weapon') g.weaponScrolls--;
  else if (kind === 'armor') g.armorScrolls--;
  else g.accessoryScrolls--;
}

export function kindLabel(kind: GearKind): string {
  return KIND_LABEL[kind];
}

export function getEquipped(g: GearState, kind: GearKind): GearItem | null {
  return kind === 'weapon' ? g.weapon : kind === 'armor' ? g.armor : g.accessory;
}

export function setEquipped(g: GearState, kind: GearKind, item: GearItem | null): void {
  if (kind === 'weapon') g.weapon = item;
  else if (kind === 'armor') g.armor = item;
  else g.accessory = item;
}

// ─── 강화 ────────────────────────────────────────────────
/** +N → +N+1 성공 확률. 올라갈수록 낮아지고 25%가 바닥 (한계 없음) */
export function enhanceRate(enh: number): number {
  return Math.max(0.25, 0.97 - enh * 0.045);
}

export function enhanceGoldCost(enh: number): number {
  return 20 + enh * 15;
}

/** 강화 시도 — 주문서/골드 차감은 호출측 책임. 성공 여부 반환 */
export function tryEnhance(item: GearItem): boolean {
  const ok = Math.random() < enhanceRate(item.enh);
  if (ok) item.enh++;
  return ok;
}

// ─── 효과 수치 ───────────────────────────────────────────
export function gearAtk(item: GearItem | null): number {
  if (!item || item.kind !== 'weapon') return 0;
  return Math.round(item.base * (1 + 0.30 * item.enh));
}

export function gearDef(item: GearItem | null): number {
  if (!item || item.kind !== 'armor') return 0;
  return Math.round(item.base * (1 + 0.30 * item.enh));
}

export function gearHp(item: GearItem | null): number {
  if (!item || item.kind !== 'armor') return 0;
  return item.base * 5 + item.enh * 8;
}

/** 악세사리 → 치명타 확률(소수) */
export function gearCrit(item: GearItem | null): number {
  if (!item || item.kind !== 'accessory') return 0;
  return item.base * 0.003 + item.enh * 0.003;
}

/** 악세사리 → 추가 체력 */
export function gearAccHp(item: GearItem | null): number {
  if (!item || item.kind !== 'accessory') return 0;
  return item.base * 4 + item.enh * 6;
}

export function sellValue(item: GearItem): number {
  return TIER_CFG[item.tier].sell + item.enh * 40;
}

/** 장비 효과를 짧은 텍스트로 (무기/방어구/악세사리 공통) */
export function gearStatText(item: GearItem): string {
  if (item.kind === 'weapon') return `공격 +${gearAtk(item)}`;
  if (item.kind === 'armor') return `방어 +${gearDef(item)} · HP +${gearHp(item)}`;
  return `치명 +${(gearCrit(item) * 100).toFixed(1)}% · HP +${gearAccHp(item)}`;
}

export function scrollEmoji(kind: GearKind): string {
  return kind === 'weapon' ? '📜' : kind === 'armor' ? '📘' : '📒';
}

// ─── 강화 업적 ───────────────────────────────────────────
export const ENHANCE_MILESTONES = [5, 10, 15, 20] as const;

/** 최강 무기 업적(+15) 보상 — 유니크 전설 무기 */
export function makeHeroSword(): GearItem {
  return { id: genId(), kind: 'weapon', tier: 'legendary', name: '용사의 성검', emoji: '🗡️', base: 24, enh: 0 };
}

// ─── 사냥 드랍 ───────────────────────────────────────────
export interface HuntDrop {
  weaponScrolls: number;
  armorScrolls: number;
  accessoryScrolls: number;
  gear: GearItem | null;
}

export function rollHuntDrops(stagesCleared: number): HuntDrop {
  const drop: HuntDrop = { weaponScrolls: 0, armorScrolls: 0, accessoryScrolls: 0, gear: null };
  const bump = (kind: GearKind) => {
    if (kind === 'weapon') drop.weaponScrolls++;
    else if (kind === 'armor') drop.armorScrolls++;
    else drop.accessoryScrolls++;
  };
  if (stagesCleared >= 3 && Math.random() < 0.5) bump(randomKind());
  if (stagesCleared >= 8) bump(randomKind());
  // 장비 드랍 — 멀리 갈수록 확률·등급 상승
  const gearChance = Math.min(0.5, stagesCleared * 0.035);
  if (Math.random() < gearChance) {
    let tier: GearTier = 'common';
    const r = Math.random() + Math.min(0.35, stagesCleared * 0.012);
    if (r > 1.15) tier = 'legendary';
    else if (r > 0.95) tier = 'epic';
    else if (r > 0.65) tier = 'rare';
    drop.gear = rollGear(undefined, tier);
  }
  return drop;
}
