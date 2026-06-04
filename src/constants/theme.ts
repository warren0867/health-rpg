// ─── Vital Quest 디자인 시스템 v1 ──────────────────────────────────
// Health 80% (Cyan) + RPG 20% (Amber) 비율의 미드나잇 다크 테마
//
// 변경 이력:
//   v1 (2026.04): RPG Deep Slate → Vital Quest 미드나잇으로 전면 개편
//   - 컬러 위계 정립: 평소엔 Cyan, 보상 모먼트엔 Amber
//   - 글로우/네온 효과 → 결과 화면에만 사용
//   - 폰트 위계 강화 (display / ui / mono 분리)

export const COLORS = {
  // ─── 미드나잇 다크 베이스 (Whoop/Oura 톤) ────────────
  bg:           '#070912',   // 최하단
  bgCard:       '#0F1322',   // 카드
  bgInput:      '#171C2E',   // 입력창
  bgHighlight:  '#222840',   // 강조 배경 / 선택 상태
  bgOverlay:    '#020308',   // 오버레이

  // ─── 헬스 시그니처 (사이안, 80%) ──────────────────
  primary:      '#22D3EE',   // 메인 액센트
  primaryDark:  '#0E9DAB',
  primaryGlow:  'rgba(34,211,238,0.12)',
  primaryLine:  'rgba(34,211,238,0.25)',

  // ─── RPG 보상 (앰버, 20%) ────────────────────────
  amber:        '#F59E0B',
  amberDark:    '#B45309',
  amberGlow:    'rgba(245,158,11,0.14)',
  amberLine:    'rgba(245,158,11,0.30)',

  // ─── RPG 등급 컬러 ────────────────────────────────
  rankS:        '#FFD700',
  rankSGlow:    'rgba(255,215,0,0.20)',
  rankA:        '#A78BFA',
  rankAGlow:    'rgba(167,139,250,0.20)',
  rankB:        '#34D399',
  rankBGlow:    'rgba(52,211,153,0.20)',
  rankC:        '#60A5FA',
  rankCGlow:    'rgba(96,165,250,0.20)',
  rankD:        '#94A3B8',
  rankDGlow:    'rgba(148,163,184,0.20)',
  rankF:        '#F87171',
  rankFGlow:    'rgba(248,113,113,0.20)',

  // ─── 시맨틱 (절제) ───────────────────────────────
  good:         '#10B981',
  goodGlow:     'rgba(16,185,129,0.14)',
  warn:         '#F59E0B',
  warnGlow:     'rgba(245,158,11,0.14)',
  bad:          '#EF4444',
  badGlow:      'rgba(239,68,68,0.14)',
  info:         '#3B82F6',
  infoGlow:     'rgba(59,130,246,0.14)',

  // ─── RPG 스탯 (캐릭터 시각화) ─────────────────────
  hp:           '#F87171',   // HP — 소프트 레드
  str:          '#F59E0B',   // STR — 앰버
  vit:          '#10B981',   // VIT — 에메랄드
  mp:           '#22D3EE',   // MP — 사이안
  agi:          '#A78BFA',   // AGI — 바이올렛 (구 통합용)

  // ─── 텍스트 ──────────────────────────────────────
  text:         '#F8FAFC',   // 메인
  textSub:      '#CBD5E1',   // 서브
  textMuted:    '#94A3B8',   // 뮤트
  textDisabled: '#64748B',   // 비활성

  // ─── 테두리 ──────────────────────────────────────
  border:       'rgba(255,255,255,0.06)',
  borderSub:    'rgba(255,255,255,0.03)',
  borderActive: '#22D3EE',

  // ─── 글래스 / 히어로 (v2 게임 풍) ─────────────────
  glassTop:     'rgba(255,255,255,0.07)',  // 카드 상단 하이라이트
  glassMid:     'rgba(255,255,255,0.02)',  // 카드 중간
  glassBottom:  'rgba(0,0,0,0.25)',        // 카드 하단 깊이
  vignette:     'rgba(2,4,12,0.55)',       // 화면 모서리 비네트
  inkDeep:      '#04060F',                 // 더 깊은 배경
  shimmer:      'rgba(255,255,255,0.10)',  // 카드 전체 sheen

  // ─── 레거시 호환 (구 화면들이 참조하는 변수) ──────
  // 새 화면은 위의 명시적 토큰을 쓸 것. 아래는 잔존 코드 미보호 안전망.
  purple:       '#A78BFA',
  purpleDark:   '#7C3AED',
  purpleGlow:   'rgba(167,139,250,0.14)',
  gold:         '#F59E0B',
  goldGlow:     'rgba(245,158,11,0.14)',
  teal:         '#22D3EE',
  tealGlow:     'rgba(34,211,238,0.14)',
  red:          '#EF4444',
  redGlow:      'rgba(239,68,68,0.14)',
  blue:         '#3B82F6',
  blueGlow:     'rgba(59,130,246,0.14)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  amberGlow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
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
  { min: 90, rank: 'S', label: '전설의 용사',  color: '#FFD700', glow: 'rgba(255,215,0,0.30)' },
  { min: 75, rank: 'A', label: '용맹한 기사',  color: '#A78BFA', glow: 'rgba(167,139,250,0.30)' },
  { min: 60, rank: 'B', label: '견습 전사',    color: '#34D399', glow: 'rgba(52,211,153,0.30)' },
  { min: 45, rank: 'C', label: '마을 주민',    color: '#60A5FA', glow: 'rgba(96,165,250,0.30)' },
  { min: 30, rank: 'D', label: '지친 농부',    color: '#94A3B8', glow: 'rgba(148,163,184,0.30)' },
  { min: 0,  rank: 'F', label: '쓰러진 병사',  color: '#F87171', glow: 'rgba(248,113,113,0.30)' },
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
