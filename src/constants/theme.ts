// ─── RPG 다크 테마 ───────────────────────────────────────
export const COLORS = {
  // 배경 레이어
  bg:           '#080812',   // 최하단
  bgCard:       '#0F0F20',   // 카드
  bgInput:      '#161628',   // 입력창
  bgHighlight:  '#1E1E38',   // 강조 배경
  bgOverlay:    '#0A0A18',   // 오버레이

  // 시그니처 포인트
  purple:       '#8B45D4',
  purpleDark:   '#5B1F94',
  purpleGlow:   '#8B45D422',
  gold:         '#E8A000',
  goldGlow:     '#E8A00022',
  teal:         '#00C4A0',
  tealGlow:     '#00C4A022',
  red:          '#E84057',
  redGlow:      '#E8405722',
  blue:         '#3D9BE9',
  blueGlow:     '#3D9BE922',
  green:        '#27AE60',
  orange:       '#E86535',

  // RPG 스탯 색
  hp:           '#E84057',   // HP (빨강)
  mp:           '#3D9BE9',   // MP (파랑)
  str:          '#E8A000',   // 힘 (골드)
  vit:          '#00C4A0',   // 생명 (청록)
  agi:          '#8B45D4',   // 민첩 (보라)
  int:          '#27AE60',   // 지력 (초록)

  // 텍스트
  text:         '#D8D8EC',
  textSub:      '#9090B0',
  textMuted:    '#606080',
  textDisabled: '#353550',

  // 테두리
  border:       '#1E1E3A',
  borderSub:    '#161630',
  borderActive: '#8B45D4',
} as const;

export const FONTS = {
  xxs: 10,
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  21,
  xxl: 26,
  xxxl: 38,
} as const;

export const RADIUS = {
  xs:  4,
  sm:  8,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
} as const;

// ─── 혈당 기준값 ──────────────────────────────────────────
export const BLOOD_SUGAR_RANGES = {
  fasting: {
    low:     { max: 70,  label: '저혈당',  color: '#3D9BE9' },
    normal:  { min: 70,  max: 100, label: '정상',   color: '#27AE60' },
    warning: { min: 100, max: 126, label: '주의',   color: '#E8A000' },
    danger:  { min: 126, label: '위험',   color: '#E84057' },
  },
  afterMeal2h: {
    normal:  { max: 140, label: '정상',  color: '#27AE60' },
    warning: { min: 140, max: 200, label: '주의', color: '#E8A000' },
    danger:  { min: 200, label: '위험', color: '#E84057' },
  },
} as const;

// ─── 캐릭터 등급 ──────────────────────────────────────────
export const CHARACTER_RANKS = [
  { min: 90, rank: 'S', label: '전설의 용사',  color: '#FFD700', glow: '#FFD70033' },
  { min: 75, rank: 'A', label: '용맹한 기사',  color: '#C8B8FF', glow: '#C8B8FF33' },
  { min: 60, rank: 'B', label: '견습 전사',    color: '#00C4A0', glow: '#00C4A033' },
  { min: 45, rank: 'C', label: '마을 주민',    color: '#3D9BE9', glow: '#3D9BE933' },
  { min: 30, rank: 'D', label: '지친 농부',    color: '#606080', glow: '#60608033' },
  { min: 0,  rank: 'F', label: '쓰러진 병사',  color: '#E84057', glow: '#E8405733' },
] as const;

export function getRank(score: number) {
  return CHARACTER_RANKS.find(r => score >= r.min) ?? CHARACTER_RANKS[CHARACTER_RANKS.length - 1];
}

// ─── RPG 아바타 ───────────────────────────────────────────
export function getAvatar(score: number): string {
  if (score >= 90) return '🦸';
  if (score >= 75) return '⚔️';
  if (score >= 60) return '🛡️';
  if (score >= 45) return '🧑‍🌾';
  if (score >= 30) return '😮‍💨';
  return '💀';
}
