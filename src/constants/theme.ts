// ─── RPG Deep Slate 테마 ──────────────────────────────────
export const COLORS = {
  // 배경 레이어 (블루-슬레이트 계열 — 눈에 편한 다크모드)
  bg:           '#0C1120',   // 최하단 (짙은 네이비, 순흑 X)
  bgCard:       '#151E30',   // 카드 (배경과 명확한 구분)
  bgInput:      '#1C2840',   // 입력창
  bgHighlight:  '#243048',   // 강조 배경 / 선택 상태
  bgOverlay:    '#090D18',   // 오버레이

  // 시그니처 포인트 (채도 올림 — 슬레이트 배경 위에서 생동감)
  purple:       '#9B6DFF',   // 더 밝고 선명한 바이올렛
  purpleDark:   '#6B3FBF',
  purpleGlow:   '#9B6DFF28',
  gold:         '#F5A623',   // 따뜻한 앰버 골드
  goldGlow:     '#F5A62328',
  teal:         '#06D6A0',   // 더 선명한 민트 그린
  tealGlow:     '#06D6A028',
  red:          '#FF5370',   // 소프트 레드 (원색 X)
  redGlow:      '#FF537028',
  blue:         '#56B4F5',   // 밝은 스카이 블루
  blueGlow:     '#56B4F528',
  green:        '#2ECC71',
  orange:       '#FF7043',

  // RPG 스탯 색 (선명도 통일)
  hp:           '#FF5370',   // HP (소프트 레드)
  mp:           '#56B4F5',   // MP (스카이 블루)
  str:          '#F5A623',   // STR (앰버 골드)
  vit:          '#06D6A0',   // VIT (민트)
  agi:          '#9B6DFF',   // AGI (바이올렛)
  int:          '#2ECC71',   // INT (에메랄드)

  // 텍스트 (대비 개선)
  text:         '#E8EDF8',   // 메인 텍스트 (차가운 화이트 → 따뜻한 오프화이트)
  textSub:      '#9AAABF',   // 서브 텍스트
  textMuted:    '#627090',   // 뮤트 텍스트
  textDisabled: '#38445A',   // 비활성

  // 테두리 (더 선명하게)
  border:       '#283450',   // 일반 테두리
  borderSub:    '#1E2840',   // 서브 테두리
  borderActive: '#9B6DFF',   // 활성 테두리
} as const;

export const FONTS = {
  xxs: 11,   // 10 → 11 (가독성 최소 보장)
  xs:  12,   // 11 → 12
  sm:  14,   // 13 → 14
  md:  16,   // 15 → 16
  lg:  18,   // 17 → 18
  xl:  22,   // 21 → 22
  xxl: 28,   // 26 → 28
  xxxl: 40,  // 38 → 40
} as const;

export const RADIUS = {
  xs:  4,
  sm:  8,
  md:  12,   // 10 → 12 (더 둥글게)
  lg:  16,   // 14 → 16
  xl:  22,   // 20 → 22
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,   // 14 → 16
  lg: 24,   // 22 → 24
  xl: 32,   // 30 → 32
} as const;

// ─── 혈당 기준값 ──────────────────────────────────────────
export const BLOOD_SUGAR_RANGES = {
  fasting: {
    low:     { max: 70,  label: '저혈당',  color: '#56B4F5' },
    normal:  { min: 70,  max: 100, label: '정상',   color: '#2ECC71' },
    warning: { min: 100, max: 126, label: '주의',   color: '#F5A623' },
    danger:  { min: 126, label: '위험',   color: '#FF5370' },
  },
  afterMeal2h: {
    normal:  { max: 140, label: '정상',  color: '#2ECC71' },
    warning: { min: 140, max: 200, label: '주의', color: '#F5A623' },
    danger:  { min: 200, label: '위험', color: '#FF5370' },
  },
} as const;

// ─── 캐릭터 등급 ──────────────────────────────────────────
export const CHARACTER_RANKS = [
  { min: 90, rank: 'S', label: '전설의 용사',  color: '#FFD700', glow: '#FFD70033' },
  { min: 75, rank: 'A', label: '용맹한 기사',  color: '#B8A0FF', glow: '#B8A0FF33' },
  { min: 60, rank: 'B', label: '견습 전사',    color: '#06D6A0', glow: '#06D6A033' },
  { min: 45, rank: 'C', label: '마을 주민',    color: '#56B4F5', glow: '#56B4F533' },
  { min: 30, rank: 'D', label: '지친 농부',    color: '#7A8AA0', glow: '#7A8AA033' },
  { min: 0,  rank: 'F', label: '쓰러진 병사',  color: '#FF5370', glow: '#FF537033' },
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
