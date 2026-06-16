import AsyncStorage from '@react-native-async-storage/async-storage';
import { GachaBonus, PermanentStats, StatKey } from '../types';
import { GearState, gearAtk, gearDef, gearHp, gearAccHp, gearCrit } from './equipment';

// ────────────────────────────────────────────────────────────
//  사냥터 — 영구 스탯이 전투력이 되는 무한 스테이지
//  "진짜 건강해질수록 더 멀리 간다"를 숫자로 체감시키는 모드.
//  인바디·운동·장비·레벨·오늘 컨디션이 모두 전투력에 반영된다.
// ────────────────────────────────────────────────────────────

const BEST_KEY = 'hrpg_hunt_best';

export interface CombatStats {
  maxHp: number;
  atk: number;
  def: number;
  dodge: number;   // 0~1 회피율
  crit: number;    // 0~1 치명타율 (x1.6)
  regen: number;   // 스테이지 클리어 시 회복량
  condMult: number; // 오늘 컨디션 배율 (HP·ATK에 적용됨)
}

export interface Monster {
  stage: number;
  name: string;
  emoji: string;
  maxHp: number;
  atk: number;
  def: number;
  isBoss: boolean;
}

// ─── 전투력 계산 ─────────────────────────────────────────
export function calcCombatStats(
  ps: PermanentStats,
  level: number,
  condScore: number | null,
  activeBonuses: GachaBonus[] = [],
  gear?: GearState | null,
): CombatStats {
  // 가챠 버프 합산
  const bonus: Record<StatKey, number> = { str: 0, end: 0, vit: 0, agi: 0, wis: 0 };
  for (const b of activeBonuses) bonus[b.stat] = (bonus[b.stat] ?? 0) + b.bonus;

  const str = ps.str + bonus.str;
  const end = ps.end + bonus.end;
  const vit = ps.vit + bonus.vit;
  const agi = ps.agi + bonus.agi;
  const wis = ps.wis + bonus.wis;

  // 오늘 컨디션이 좋으면 더 잘 싸운다
  const condMult =
    condScore == null ? 1.0 :
    condScore >= 75 ? 1.10 :
    condScore >= 60 ? 1.05 :
    condScore >= 40 ? 1.0 :
    0.92;

  // 장착 장비 보너스
  const wAtk    = gear ? gearAtk(gear.weapon) : 0;
  const aDef    = gear ? gearDef(gear.armor) : 0;
  const aHp     = gear ? gearHp(gear.armor) : 0;
  const accHp   = gear ? gearAccHp(gear.accessory) : 0;   // 악세사리 체력
  const accCrit = gear ? gearCrit(gear.accessory) : 0;    // 악세사리 치명타

  return {
    maxHp: Math.round((80 + vit * 6 + level * 6 + aHp + accHp) * condMult),
    atk:   Math.round((10 + str * 1.4 + level * 1.0 + wAtk) * condMult * 10) / 10,
    def:   Math.round((end * 0.55 + aDef) * 10) / 10,
    dodge: Math.min(0.30, agi * 0.006),
    crit:  Math.min(0.50, wis * 0.008 + accCrit),
    regen: 0, // calcRegen에서 maxHp 기준으로 산출
    condMult,
  };
}

/** 스테이지 클리어 시 회복량 (최대 HP 비율 + WIS 보너스) */
export function calcRegen(maxHp: number, ps: PermanentStats): number {
  return Math.round(maxHp * 0.22 + ps.wis * 0.4);
}

// ─── 몬스터 ──────────────────────────────────────────────
const MOB_POOL: { name: string; emoji: string }[] = [
  { name: '들쥐',     emoji: '🐀' },
  { name: '박쥐',     emoji: '🦇' },
  { name: '늑대',     emoji: '🐺' },
  { name: '멧돼지',   emoji: '🐗' },
  { name: '좀비',     emoji: '🧟' },
  { name: '전갈',     emoji: '🦂' },
  { name: '독사',     emoji: '🐍' },
  { name: '고블린',   emoji: '👺' },
  { name: '스켈레톤', emoji: '💀' },
  { name: '뱀파이어', emoji: '🧛' },
  { name: '악마',     emoji: '😈' },
  { name: '드래곤',   emoji: '🐉' },
];

const BOSS_POOL: { name: string; emoji: string }[] = [
  { name: '오우거 족장',   emoji: '👹' },
  { name: '트롤 왕',       emoji: '🧌' },
  { name: '리치',          emoji: '☠️' },
  { name: '심연의 마수',   emoji: '🐙' },
  { name: '고대 용',       emoji: '🐲' },
];

export function monsterFor(stage: number): Monster {
  const isBoss = stage % 5 === 0;
  const pool = isBoss ? BOSS_POOL : MOB_POOL;
  const pick = pool[Math.floor((stage - 1) / 5) % pool.length];

  let hp  = 35 + stage * 18 + stage * stage * 0.75;
  let atk = 7 + stage * 2.4 + stage * stage * 0.05;
  let def = stage * 0.6;
  if (isBoss) { hp *= 1.6; atk *= 1.25; }

  return {
    stage,
    name: isBoss ? pick.name : `${pick.name} Lv${stage}`,
    emoji: pick.emoji,
    maxHp: Math.round(hp),
    atk: Math.round(atk * 10) / 10,
    def: Math.round(def * 10) / 10,
    isBoss,
  };
}

// ─── 한 번의 공격 계산 ────────────────────────────────────
export interface HitResult { dmg: number; crit: boolean; dodged: boolean; }

export function playerHit(c: CombatStats, m: Monster): HitResult {
  const crit = Math.random() < c.crit;
  const base = Math.max(1, c.atk - m.def);
  const variance = 0.9 + Math.random() * 0.2;
  return { dmg: Math.round(base * (crit ? 1.6 : 1) * variance), crit, dodged: false };
}

export function monsterHit(m: Monster, c: CombatStats): HitResult {
  if (Math.random() < c.dodge) return { dmg: 0, crit: false, dodged: true };
  const variance = 0.9 + Math.random() * 0.2;
  return { dmg: Math.max(1, Math.round((m.atk - c.def) * variance)), crit: false, dodged: false };
}

// ─── 보상 ────────────────────────────────────────────────
export function calcHuntReward(stagesCleared: number, prevBest: number): {
  gold: number; xp: number; newBestBonus: number;
} {
  let gold = 0, xp = 0;
  for (let s = 1; s <= stagesCleared; s++) {
    gold += 3 + s;
    xp   += 2 + s;
  }
  const newStages = Math.max(0, stagesCleared - prevBest);
  const newBestBonus = newStages * 20;
  gold += newBestBonus;
  xp   += newStages * 15;
  return { gold: Math.min(500, gold), xp: Math.min(400, xp), newBestBonus };
}

// ─── 기록 저장 ────────────────────────────────────────────
export async function getHuntBest(): Promise<number> {
  const raw = await AsyncStorage.getItem(BEST_KEY);
  return raw ? parseInt(raw) || 0 : 0;
}

export async function saveHuntBest(stage: number): Promise<void> {
  await AsyncStorage.setItem(BEST_KEY, String(stage));
}

// ─── 밸런스 검증용 — 전투 자동 시뮬레이션 (UI 미사용) ──────
export function simulateRun(c: CombatStats, ps: PermanentStats, maxStage = 99): number {
  let hp = c.maxHp;
  const regen = calcRegen(c.maxHp, ps);
  for (let stage = 1; stage <= maxStage; stage++) {
    const m = monsterFor(stage);
    let mHp = m.maxHp;
    let rounds = 0;
    while (mHp > 0 && hp > 0 && rounds < 60) {
      mHp -= playerHit(c, m).dmg;
      if (mHp <= 0) break;
      hp -= monsterHit(m, c).dmg;
      rounds++;
    }
    if (hp <= 0 || rounds >= 60) return stage - 1;
    hp = Math.min(c.maxHp, hp + regen);
  }
  return maxStage;
}
