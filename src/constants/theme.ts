// RPG 다크 테마
export const COLORS = {
  // 배경
  bg: '#0D0D1A',
  bgCard: '#16162A',
  bgInput: '#1E1E35',
  bgHighlight: '#252545',

  // 포인트 색상
  purple: '#7B2FBE',
  purpleLight: '#9B5FDE',
  teal: '#00D4AA',
  gold: '#FFB800',
  red: '#FF4757',
  orange: '#FF6B35',
  blue: '#4ECDC4',
  green: '#2ECC71',

  // 텍스트
  text: '#E8E8F0',
  textMuted: '#8888AA',
  textDisabled: '#444466',

  // 상태 색상
  normal: '#2ECC71',
  warning: '#FFB800',
  danger: '#FF4757',
  low: '#4ECDC4',

  // 테두리
  border: '#2A2A4A',
  borderActive: '#7B2FBE',
} as const;

export const FONTS = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 40,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// 혈당 기준값
export const BLOOD_SUGAR_RANGES = {
  fasting: {
    low: { max: 70, label: '저혈당', color: '#4ECDC4' },
    normal: { min: 70, max: 100, label: '정상', color: '#2ECC71' },
    warning: { min: 100, max: 126, label: '주의 (전당뇨)', color: '#FFB800' },
    danger: { min: 126, label: '위험', color: '#FF4757' },
  },
  afterMeal2h: {
    normal: { max: 140, label: '정상', color: '#2ECC71' },
    warning: { min: 140, max: 200, label: '주의', color: '#FFB800' },
    danger: { min: 200, label: '위험', color: '#FF4757' },
  },
} as const;

// 캐릭터 등급 (점수 기반)
export const CHARACTER_RANKS = [
  { min: 90, rank: 'S', label: '전설의 용사', color: '#FFD700' },
  { min: 75, rank: 'A', label: '용맹한 기사', color: '#C0C0C0' },
  { min: 60, rank: 'B', label: '견습 전사', color: '#CD7F32' },
  { min: 45, rank: 'C', label: '마을 주민', color: '#4ECDC4' },
  { min: 30, rank: 'D', label: '지친 농부', color: '#8888AA' },
  { min: 0,  rank: 'F', label: '쓰러진 병사', color: '#FF4757' },
] as const;

export function getRank(score: number) {
  return CHARACTER_RANKS.find(r => score >= r.min) ?? CHARACTER_RANKS[CHARACTER_RANKS.length - 1];
}
