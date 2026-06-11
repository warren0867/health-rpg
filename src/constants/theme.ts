// ─── Vital Quest 디자인 시스템 v2 (라이트) ──────────────────────────
// 밝고 친근한 헬스케어 톤 (Helpy 레퍼런스) — 화이트 베이스 + 민트 시그니처
//
// 변경 이력:
//   v2 (2026.06): 미드나잇 다크 → 라이트 클린으로 전면 개편
//   - 화이트 카드 + 옅은 그레이 배경, 파스텔 컬러 칩
//   - 시그니처: 민트(Teal), 보상 모먼트: 앰버 유지
//   v1 (2026.04): RPG Deep Slate → Vital Quest 미드나잇

export const COLORS = {
  // ─── 라이트 베이스 ────────────────────────────────
  bg:           '#F5F7F9',   // 최하단 (옅은 그레이)
  bgCard:       '#FFFFFF',   // 카드
  bgInput:      '#F1F4F6',   // 입력창
  bgHighlight:  '#E6F4F1',   // 강조 배경 / 선택 상태 (민트 틴트)
  bgOverlay:    '#0F172A',   // 게임 모달 등 어두운 배경이 필요한 곳

  // ─── 헬스 시그니처 (민트/틸) ──────────────────────
  primary:      '#14B8A6',   // 메인 액센트
  primaryDark:  '#0F9488',
  primaryGlow:  'rgba(20,184,166,0.10)',
  primaryLine:  'rgba(20,184,166,0.30)',

  // ─── RPG 보상 (앰버) ─────────────────────────────
  amber:        '#F59E0B',
  amberDark:    '#B45309',
  amberGlow:    'rgba(245,158,11,0.12)',
  amberLine:    'rgba(245,158,11,0.35)',

  // ─── RPG 등급 컬러 (화이트 대비 확보) ─────────────
  rankS:        '#F59E0B',
  rankSGlow:    'rgba(245,158,11,0.16)',
  rankA:        '#8B5CF6',
  rankAGlow:    'rgba(139,92,246,0.14)',
  rankB:        '#10B981',
  rankBGlow:    'rgba(16,185,129,0.14)',
  rankC:        '#3B82F6',
  rankCGlow:    'rgba(59,130,246,0.14)',
  rankD:        '#64748B',
  rankDGlow:    'rgba(100,116,139,0.14)',
  rankF:        '#EF4444',
  rankFGlow:    'rgba(239,68,68,0.14)',

  // ─── 시맨틱 ──────────────────────────────────────
  good:         '#10B981',
  goodGlow:     'rgba(16,185,129,0.12)',
  warn:         '#F59E0B',
  warnGlow:     'rgba(245,158,11,0.12)',
  bad:          '#EF4444',
  badGlow:      'rgba(239,68,68,0.10)',
  info:         '#3B82F6',
  infoGlow:     'rgba(59,130,246,0.10)',

  // ─── RPG 스탯 (캐릭터 시각화) ─────────────────────
  hp:           '#EF4444',   // HP — 레드
  str:          '#F59E0B',   // STR — 앰버
  vit:          '#10B981',   // VIT — 에메랄드
  mp:           '#0EA5E9',   // MP — 스카이
  agi:          '#8B5CF6',   // AGI — 바이올렛 (구 통합용)

  // ─── 텍스트 ──────────────────────────────────────
  text:         '#1E293B',   // 메인
  textSub:      '#475569',   // 서브
  textMuted:    '#64748B',   // 뮤트
  textDisabled: '#94A3B8',   // 비활성

  // ─── 테두리 ──────────────────────────────────────
  border:       'rgba(15,23,42,0.08)',
  borderSub:    'rgba(15,23,42,0.04)',
  borderActive: '#14B8A6',

  // ─── 글래스 / 히어로 ──────────────────────────────
  glassTop:     'rgba(255,255,255,0.65)', // 카드 상단 하이라이트
  glassMid:     'rgba(255,255,255,0.35)', // 카드 중간
  glassBottom:  'rgba(15,23,42,0.04)',    // 카드 하단 깊이
  vignette:     'rgba(15,23,42,0.05)',    // 화면 모서리 비네트
  inkDeep:      '#EAF0F2',                // 더 깊은 배경
  shimmer:      'rgba(255,255,255,0.55)', // 카드 전체 sheen

  // ─── 레거시 호환 (구 화면들이 참조하는 변수) ──────
  // 새 화면은 위의 명시적 토큰을 쓸 것. 아래는 잔존 코드 미보호 안전망.
  purple:       '#8B5CF6',
  purpleDark:   '#7C3AED',
  purpleGlow:   'rgba(139,92,246,0.12)',
  gold:         '#F59E0B',
  goldGlow:     'rgba(245,158,11,0.12)',
  teal:         '#14B8A6',
  tealGlow:     'rgba(20,184,166,0.12)',
  red:          '#EF4444',
  redGlow:      'rgba(239,68,68,0.12)',
  blue:         '#3B82F6',
  blueGlow:     'rgba(59,130,246,0.12)',
  green:        '#10B981',
  orange:       '#F97316',
  int:          '#10B981',
} as const;

// ─── 타이포 ──────────────────────────────────────────
// monospace는 숫자/메트릭에만, UI 텍스트는 시스템 폰트
export const FONTS = {
  xxs: 11,
  xs:  12,
  sm:  14,
  md:  16,
  lg:  19,
  xl:  24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── 간격 (8pt 그리드) ────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── 반경 ────────────────────────────────────────────
export const RADIUS = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  20,
  xl:  28,
  full: 999,
} as const;

// ─── 그림자/엘리베이션 (RN용) ─────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  glow: {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  amberGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

// ─── 혈당 기준값 (의료 기준 — 변경 시 의사 자문 필요) ──
export const BLOOD_SUGAR_RANGES = {
  fasting: {
    low:     { max: 70,  label: '저혈당',  color: '#3B82F6' },
    normal:  { min: 70,  max: 100, label: '정상',   color: '#10B981' },
    warning: { min: 100, max: 126, label: '주의',   color: '#F59E0B' },
    danger:  { min: 126, label: '위험',   color: '#EF4444' },
  },
  afterMeal2h: {
    normal:  { max: 140, label: '정상',  color: '#10B981' },
    warning: { min: 140, max: 200, label: '주의', color: '#F59E0B' },
    danger:  { min: 200, label: '위험', color: '#EF4444' },
  },
} as const;

// ─── 캐릭터 등급 ──────────────────────────────────────
export const CHARACTER_RANKS = [
  { min: 90, rank: 'S', label: '전설의 용사',  color: '#F59E0B', glow: 'rgba(245,158,11,0.22)' },
  { min: 75, rank: 'A', label: '용맹한 기사',  color: '#8B5CF6', glow: 'rgba(139,92,246,0.22)' },
  { min: 60, rank: 'B', label: '견습 전사',    color: '#10B981', glow: 'rgba(16,185,129,0.22)' },
  { min: 45, rank: 'C', label: '마을 주민',    color: '#3B82F6', glow: 'rgba(59,130,246,0.22)' },
  { min: 30, rank: 'D', label: '지친 농부',    color: '#64748B', glow: 'rgba(100,116,139,0.22)' },
  { min: 0,  rank: 'F', label: '쓰러진 병사',  color: '#EF4444', glow: 'rgba(239,68,68,0.22)' },
] as const;

export function getRank(score: number) {
  return CHARACTER_RANKS.find(r => score >= r.min) ?? CHARACTER_RANKS[CHARACTER_RANKS.length - 1];
}

// ─── 캐릭터 시각화 ────────────────────────────────────
// 이모지 의존을 줄이기 위해 SVG 아이콘 키로 매핑 (각 화면에서 직접 렌더)
// 레거시 코드 호환을 위해 emoji는 유지하되 새 화면에선 사용 자제
export function getAvatar(score: number): string {
  if (score >= 90) return '🦸';
  if (score >= 75) return '⚔️';
  if (score >= 60) return '🛡️';
  if (score >= 45) return '🧑‍🌾';
  if (score >= 30) return '😮‍💨';
  return '💀';
}

// 새 화면용 — 등급별 캐릭터 컬러 키
export function getRankIconKey(score: number): 'hero' | 'knight' | 'warrior' | 'villager' | 'farmer' | 'fallen' {
  if (score >= 90) return 'hero';
  if (score >= 75) return 'knight';
  if (score >= 60) return 'warrior';
  if (score >= 45) return 'villager';
  if (score >= 30) return 'farmer';
  return 'fallen';
}
