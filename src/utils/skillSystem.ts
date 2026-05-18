import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface Skill {
  id: string;
  name: string;
  desc: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  unlockLevel: number;
  effect: {
    type: 'xp_bonus' | 'gold_bonus' | 'gacha_rare_up' | 'streak_bonus' | 'quest_xp_bonus' | 'display_boost';
    value: number;
  };
}

export const SKILLS: Skill[] = [
  {
    id: 'basic_training',
    name: '기초 훈련',
    desc: 'XP +5%',
    detail: '모든 활동에서 획득하는 경험치가 5% 증가합니다.',
    icon: 'flash',
    color: COLORS.primary,
    unlockLevel: 2,
    effect: { type: 'xp_bonus', value: 0.05 },
  },
  {
    id: 'iron_will',
    name: '강철 의지',
    desc: '스트릭 보너스 +2/일',
    detail: '연속 기록 보너스가 하루 2포인트 추가됩니다.',
    icon: 'shield',
    color: '#A78BFA',
    unlockLevel: 3,
    effect: { type: 'streak_bonus', value: 2 },
  },
  {
    id: 'sleep_master',
    name: '숙면의 달인',
    desc: '수면 보너스 +5pt',
    detail: '수면 기록 시 보너스 XP가 5포인트 추가됩니다.',
    icon: 'moon',
    color: COLORS.info,
    unlockLevel: 4,
    effect: { type: 'xp_bonus', value: 0.08 },
  },
  {
    id: 'warrior_heart',
    name: '전사의 심장',
    desc: '퀘스트 XP +10%',
    detail: '퀘스트 완료 시 획득하는 XP가 10% 증가합니다.',
    icon: 'heart',
    color: COLORS.bad,
    unlockLevel: 5,
    effect: { type: 'quest_xp_bonus', value: 0.10 },
  },
  {
    id: 'golden_sense',
    name: '황금 감각',
    desc: '골드 +20%',
    detail: '모든 활동에서 획득하는 골드가 20% 증가합니다.',
    icon: 'logo-bitcoin',
    color: COLORS.amber,
    unlockLevel: 6,
    effect: { type: 'gold_bonus', value: 0.20 },
  },
  {
    id: 'lucky_hand',
    name: '행운의 손',
    desc: '희귀 뽑기 확률 +5%',
    detail: '가챠에서 희귀 등급 이상 아이템 획득 확률이 5% 증가합니다.',
    icon: 'star',
    color: '#F472B6',
    unlockLevel: 7,
    effect: { type: 'gacha_rare_up', value: 0.05 },
  },
  {
    id: 'alchemist',
    name: '연금술사',
    desc: '강화 비용 -1G',
    detail: '아이템 강화 시 비용이 1골드 감소합니다.',
    icon: 'flask',
    color: '#34D399',
    unlockLevel: 8,
    effect: { type: 'gold_bonus', value: 0.25 },
  },
  {
    id: 'iron_routine',
    name: '강철 루틴',
    desc: '스트릭 보호 +1회',
    detail: '연속 기록이 끊길 위기에서 1회 보호를 받습니다.',
    icon: 'infinite',
    color: COLORS.primary,
    unlockLevel: 9,
    effect: { type: 'streak_bonus', value: 5 },
  },
  {
    id: 'legendary_power',
    name: '전설의 힘',
    desc: '모든 XP +15%',
    detail: '모든 활동에서 획득하는 경험치가 15% 증가합니다.',
    icon: 'flame',
    color: COLORS.amber,
    unlockLevel: 10,
    effect: { type: 'xp_bonus', value: 0.15 },
  },
  {
    id: 'divine_blessing',
    name: '신의 가호',
    desc: '퀘스트 보상 +20%',
    detail: '퀘스트 완료 시 모든 보상이 20% 증가합니다.',
    icon: 'sparkles',
    color: '#FFD700',
    unlockLevel: 11,
    effect: { type: 'quest_xp_bonus', value: 0.20 },
  },
  {
    id: 'cosmic_guardian',
    name: '우주의 수호자',
    desc: '모든 보너스 2배',
    detail: '모든 패시브 보너스 효과가 2배로 증폭됩니다.',
    icon: 'planet',
    color: '#E879F9',
    unlockLevel: 12,
    effect: { type: 'display_boost', value: 2.0 },
  },
];

export function getActiveSkills(level: number): Skill[] {
  return SKILLS.filter(s => s.unlockLevel <= level);
}

export function getSkillByType(skills: Skill[], type: string): Skill | undefined {
  return skills.find(s => s.effect.type === type);
}

export function calcXpBonus(level: number): number {
  const active = getActiveSkills(level);
  let bonus = 0;
  for (const skill of active) {
    if (skill.effect.type === 'xp_bonus') bonus += skill.effect.value;
  }
  return 1 + bonus;
}

export function calcGoldBonus(level: number): number {
  const active = getActiveSkills(level);
  let bonus = 0;
  for (const skill of active) {
    if (skill.effect.type === 'gold_bonus') bonus += skill.effect.value;
  }
  return 1 + bonus;
}
