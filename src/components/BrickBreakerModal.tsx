import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { addGold } from '../utils/gacha';
import { addXP } from '../utils/storage';

// ── 게임 상수 ────────────────────────────────────────────────
const BALL_R     = 8;
const BALL_SPD   = 6.0;       // 기본 속도 (벽돌 깰수록 증가)
const SPD_GROWTH = 0.012;     // 벽돌 1개당 속도 증가율 (최대 +50%)
const PADDLE_W   = 92;
const PADDLE_H   = 13;
const COLS       = 7;
const ROWS       = 5;
const BRICK_H    = 22;
const BRICK_GAP  = 5;
const BRICK_TOP  = 52;
const SIDE_PAD   = 10;
const MAX_LIVES  = 4;
const START_LIVES = 3;
const PAD_BOTTOM = 44;        // paddle top from area bottom

// ── 아이템 (파워업) ──────────────────────────────────────────
const DROP_CHANCE = 0.32;     // 벽돌 파괴 시 드랍 확률
const DROP_SPD    = 2.4;      // 아이템 낙하 속도
const DROP_SIZE   = 26;
const MAX_BALLS   = 6;
const WIDE_MULT   = 1.5;      // 패들 확장 배율
const TOAST_FRAMES = 80;      // 아이템 획득 토스트 표시 시간 (~1.3초)

type DropKind = 'wide' | 'multi' | 'slow' | 'fast' | 'gold' | 'life';

const DROP_CFG: Record<DropKind, {
  icon: keyof typeof Ionicons.glyphMap; color: string; label: string; weight: number;
  durationFrames?: number;  // 시간제 효과만
}> = {
  wide:  { icon: 'resize',          color: '#10B981', label: '패들 확장',   weight: 26, durationFrames: 750 },
  multi: { icon: 'copy',            color: '#14B8A6', label: '멀티볼',      weight: 20 },
  slow:  { icon: 'hourglass',       color: '#3B82F6', label: '슬로우',      weight: 18, durationFrames: 600 },
  fast:  { icon: 'flash',           color: '#EF4444', label: '가속 (함정)', weight: 14, durationFrames: 600 },
  gold:  { icon: 'server',          color: '#F59E0B', label: '+15 골드',    weight: 16 },
  life:  { icon: 'heart',           color: '#F472B6', label: '+1 목숨',     weight: 6 },
};

function rollDrop(): DropKind | null {
  if (Math.random() > DROP_CHANCE) return null;
  const entries = Object.entries(DROP_CFG) as [DropKind, typeof DROP_CFG[DropKind]][];
  const total = entries.reduce((s, [, c]) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const [kind, c] of entries) {
    r -= c.weight;
    if (r <= 0) return kind;
  }
  return null;
}

const ROW_CFG: { color: string; hp: number; glow: string }[] = [
  { color: COLORS.amber,   hp: 3, glow: 'rgba(245,158,11,0.55)' },
  { color: COLORS.amber,   hp: 3, glow: 'rgba(245,158,11,0.45)' },
  { color: '#A78BFA',      hp: 2, glow: 'rgba(167,139,250,0.55)' },
  { color: '#A78BFA',      hp: 2, glow: 'rgba(167,139,250,0.45)' },
  { color: COLORS.primary, hp: 1, glow: 'rgba(34,211,238,0.55)'  },
];

interface Brick {
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  color: string; glow: string;
  alive: boolean;
}

interface Ball { x: number; y: number; vx: number; vy: number; }
interface Drop { x: number; y: number; kind: DropKind; }
interface Effect { kind: 'wide' | 'slow' | 'fast'; framesLeft: number; }

type Phase = 'ready' | 'idle' | 'playing' | 'cleared' | 'dead';

// 게임 상태 — 성능을 위해 매 프레임 "제자리 변형"한다 (복사 없음).
// React 렌더는 setTick 카운터로만 트리거.
interface G {
  phase: Phase;
  balls: Ball[];
  drops: Drop[];
  effects: Effect[];
  toast: { kind: DropKind; frames: number } | null;
  px: number;              // paddle center X
  paddleY: number;         // paddle top Y
  lives: number;
  bricksHit: number;
  goldBonus: number;       // 골드 아이템으로 모은 보너스
  bricks: Brick[];
  areaW: number; areaH: number;
  earnedGold: number; earnedXp: number;
}

// ── 초기화 ─────────────────────────────────────────────────
function makeBricks(areaW: number): Brick[] {
  const usable = areaW - SIDE_PAD * 2;
  const brickW = (usable - (COLS - 1) * BRICK_GAP) / COLS;
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      x: SIDE_PAD + c * (brickW + BRICK_GAP),
      y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
      w: brickW, h: BRICK_H,
      hp: ROW_CFG[r].hp, maxHp: ROW_CFG[r].hp,
      color: ROW_CFG[r].color, glow: ROW_CFG[r].glow,
      alive: true,
    }))
  ).flat();
}

function makeG(areaW: number, areaH: number): G {
  const paddleY = areaH - PAD_BOTTOM;
  const px = areaW / 2;
  return {
    phase: 'ready',
    balls: [{ x: px, y: paddleY - BALL_R - 2, vx: 0, vy: 0 }],
    drops: [], effects: [], toast: null,
    px, paddleY,
    lives: START_LIVES, bricksHit: 0, goldBonus: 0,
    bricks: makeBricks(areaW),
    areaW, areaH,
    earnedGold: 0, earnedXp: 0,
  };
}

// ── 파생값 ─────────────────────────────────────────────────
function paddleWidth(g: G): number {
  return g.effects.some(e => e.kind === 'wide') ? PADDLE_W * WIDE_MULT : PADDLE_W;
}

function targetSpeed(g: G): number {
  let spd = BALL_SPD * (1 + Math.min(0.5, g.bricksHit * SPD_GROWTH));
  if (g.effects.some(e => e.kind === 'slow')) spd *= 0.72;
  if (g.effects.some(e => e.kind === 'fast')) spd *= 1.32;
  return spd;
}

// ── 아이템 적용 (G를 제자리 변형) ────────────────────────────
function applyDrop(g: G, kind: DropKind) {
  hapticLight();
  g.toast = { kind, frames: TOAST_FRAMES };
  switch (kind) {
    case 'wide':
    case 'slow':
    case 'fast': {
      const dur = DROP_CFG[kind].durationFrames ?? 600;
      g.effects = g.effects.filter(e => e.kind !== kind);
      g.effects.push({ kind, framesLeft: dur });
      break;
    }
    case 'multi': {
      const add: Ball[] = [];
      for (const b of g.balls) {
        if (g.balls.length + add.length >= MAX_BALLS) break;
        const spd = Math.max(2, Math.hypot(b.vx, b.vy)) || targetSpeed(g);
        const baseAngle = Math.atan2(b.vx, -b.vy);
        for (const off of [-0.55, 0.55]) {
          if (g.balls.length + add.length >= MAX_BALLS) break;
          const a = baseAngle + off;
          add.push({ x: b.x, y: b.y, vx: spd * Math.sin(a), vy: -Math.abs(spd * Math.cos(a)) });
        }
      }
      g.balls.push(...add);
      break;
    }
    case 'gold':
      g.goldBonus += 15;
      break;
    case 'life':
      g.lives = Math.min(MAX_LIVES, g.lives + 1);
      break;
  }
}

// ── 물리 1프레임 (G 제자리 변형, 종료 시 'end' 반환) ─────────
function step(g: G): 'continue' | 'cleared' | 'dead' {
  const { paddleY, areaW, areaH } = g;
  const padW = paddleWidth(g);
  const spd = targetSpeed(g);

  // 효과 시간 경과
  for (const e of g.effects) e.framesLeft--;
  g.effects = g.effects.filter(e => e.framesLeft > 0);
  if (g.toast) {
    g.toast.frames--;
    if (g.toast.frames <= 0) g.toast = null;
  }

  // 공 이동/충돌
  for (let bi = g.balls.length - 1; bi >= 0; bi--) {
    const ball = g.balls[bi];
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 벽 반사
    if (ball.x - BALL_R <= 0)     { ball.vx =  Math.abs(ball.vx); ball.x = BALL_R; }
    if (ball.x + BALL_R >= areaW) { ball.vx = -Math.abs(ball.vx); ball.x = areaW - BALL_R; }
    if (ball.y - BALL_R <= 0)     { ball.vy =  Math.abs(ball.vy); ball.y = BALL_R; }

    // 패들 반사 (공이 아래로 내려갈 때만)
    if (ball.vy > 0) {
      const padL = g.px - padW / 2;
      const padR = g.px + padW / 2;
      if (
        ball.x >= padL - BALL_R && ball.x <= padR + BALL_R &&
        ball.y + BALL_R >= paddleY && ball.y - BALL_R <= paddleY + PADDLE_H
      ) {
        const hit = Math.max(-1, Math.min(1, (ball.x - g.px) / (padW / 2)));
        const angle = hit * (55 * Math.PI / 180);
        ball.vx = spd * Math.sin(angle);
        ball.vy = -Math.abs(spd * Math.cos(angle));
        ball.y = paddleY - BALL_R - 1;
      }
    }

    // 벽돌 충돌 (공 하나당 한 프레임에 하나만)
    for (let i = 0; i < g.bricks.length; i++) {
      const b = g.bricks[i];
      if (!b.alive) continue;
      const bl = ball.x - BALL_R, br = ball.x + BALL_R;
      const bt = ball.y - BALL_R, bb = ball.y + BALL_R;
      if (br > b.x && bl < b.x + b.w && bb > b.y && bt < b.y + b.h) {
        const oL = br - b.x,         oR = (b.x + b.w) - bl;
        const oT = bb - b.y,         oB = (b.y + b.h) - bt;
        const mn = Math.min(oL, oR, oT, oB);
        if (mn === oL || mn === oR) ball.vx = -ball.vx;
        else                        ball.vy = -ball.vy;
        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          g.bricksHit++;
          const kind = rollDrop();
          if (kind) g.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, kind });
        }
        break;
      }
    }

    // 속도 정규화 (진행도/효과 반영)
    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > 0.1) { ball.vx = (ball.vx / mag) * spd; ball.vy = (ball.vy / mag) * spd; }

    // 낙사
    if (ball.y - BALL_R > areaH) g.balls.splice(bi, 1);
  }

  // 아이템 낙하/획득
  const padL = g.px - padW / 2;
  const padR = g.px + padW / 2;
  for (let di = g.drops.length - 1; di >= 0; di--) {
    const d = g.drops[di];
    d.y += DROP_SPD;
    const caught =
      d.y + DROP_SIZE / 2 >= paddleY && d.y - DROP_SIZE / 2 <= paddleY + PADDLE_H &&
      d.x >= padL - DROP_SIZE / 2 && d.x <= padR + DROP_SIZE / 2;
    if (caught) {
      g.drops.splice(di, 1);
      applyDrop(g, d.kind);
    } else if (d.y - DROP_SIZE / 2 > areaH) {
      g.drops.splice(di, 1);
    }
  }

  // 모든 공 낙사 → 목숨 차감
  if (g.balls.length === 0) {
    g.lives--;
    hapticWarning();
    if (g.lives <= 0) {
      g.earnedGold = Math.max(5, g.bricksHit * 3) + g.goldBonus;
      g.earnedXp   = Math.max(10, g.bricksHit * 2 + 10);
      g.phase = 'dead';
      return 'dead';
    }
    // 리스폰: 효과/아이템 초기화, 공 1개로
    g.phase = 'idle';
    g.effects = [];
    g.drops = [];
    g.toast = null;
    g.balls = [{ x: g.px, y: paddleY - BALL_R - 2, vx: 0, vy: 0 }];
  }

  // 클리어 체크
  if (g.bricks.every(b => !b.alive)) {
    g.earnedGold = g.bricksHit * 4 + 60 + g.goldBonus;
    g.earnedXp   = g.bricksHit * 3 + 100;
    g.phase = 'cleared';
    return 'cleared';
  }

  return 'continue';
}

// ── Props ──────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  addXpFn?: (xp: number) => Promise<any>;
  onGoldEarned?: (gold: number) => void;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function BrickBreakerModal({ visible, onClose, addXpFn, onGoldEarned }: Props) {
  const gRef     = useRef<G | null>(null);
  const rafRef   = useRef<number | null>(null);
  const endedRef = useRef(false);
  const [, setTick] = useState(0);

  const containerAnim = useRef(new Animated.Value(0)).current;
  const resultAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      endedRef.current = false;
      resultAnim.setValue(0);
      if (gRef.current) {
        const { areaW, areaH } = gRef.current;
        gRef.current = makeG(areaW, areaH);
        setTick(t => t + 1);
      }
      Animated.spring(containerAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }).start();
    } else {
      stopLoop();
      containerAnim.setValue(0);
    }
    return stopLoop;
  }, [visible]);

  // ── 게임 루프 (requestAnimationFrame — setInterval보다 끊김/중첩에 안전) ──
  function stopLoop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startLoop() {
    stopLoop();
    const loop = () => {
      const g = gRef.current;
      if (!g) { rafRef.current = null; return; }
      if (g.phase === 'playing') {
        const result = step(g);
        if (result !== 'continue') {
          setTick(t => t + 1);
          doEnd(g.earnedGold, g.earnedXp);
          rafRef.current = null;
          return;
        }
      }
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── 레이아웃 측정 ────────────────────────────────────────
  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (!gRef.current || Math.abs(gRef.current.areaW - width) > 2) {
      gRef.current = makeG(width, height);
      setTick(t => t + 1);
    }
  }

  // ── 게임 시작 ────────────────────────────────────────────
  function startGame() {
    const g = gRef.current;
    if (!g) return;
    g.phase = 'idle';
    setTick(t => t + 1);
    startLoop();
  }

  function doEnd(gold: number, xp: number) {
    if (endedRef.current) return;
    endedRef.current = true;
    stopLoop();
    addGold(gold);
    (addXpFn ?? addXP)(xp);
    onGoldEarned?.(gold);
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }).start();
  }

  // ── 터치 핸들러 ──────────────────────────────────────────
  function handleMove(e: GestureResponderEvent) {
    const g = gRef.current;
    if (!g || (g.phase !== 'playing' && g.phase !== 'idle')) return;
    const padW = paddleWidth(g);
    const newPx = Math.max(padW / 2, Math.min(g.areaW - padW / 2, e.nativeEvent.locationX));
    g.px = newPx;
    if (g.phase === 'idle') {
      g.balls = [{ x: newPx, y: g.paddleY - BALL_R - 2, vx: 0, vy: 0 }];
    }
  }

  function handleRelease() {
    const g = gRef.current;
    if (!g || g.phase !== 'idle') return;
    const angle = (Math.random() * 0.6 - 0.3);
    const spd = targetSpeed(g);
    for (const b of g.balls) {
      b.vx = spd * Math.sin(angle);
      b.vy = -Math.abs(spd * Math.cos(angle));
    }
    g.phase = 'playing';
  }

  function handleClose() {
    stopLoop();
    gRef.current = null;
    onClose();
  }

  // ── 렌더 ─────────────────────────────────────────────────
  const g = gRef.current;
  const isResult = g?.phase === 'cleared' || g?.phase === 'dead';
  const padW = g ? paddleWidth(g) : PADDLE_W;
  const wideActive = g?.effects.some(e => e.kind === 'wide');
  const toastCfg = g?.toast ? DROP_CFG[g.toast.kind] : null;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.container, {
          transform: [{ translateY: containerAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          opacity: containerAnim,
        }]}>

          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 16, left: 16, bottom: 16, right: 16 }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>🧱  벽돌깨기</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* HUD */}
          {g && (
            <View style={s.hud}>
              <View style={s.hudLives}>
                <Text style={s.hudLabel}>LIVES</Text>
                <View style={s.livesRow}>
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <Ionicons key={i} name={i < g.lives ? 'heart' : 'heart-outline'}
                      size={16} color={i < g.lives ? '#EF4444' : COLORS.textDisabled} />
                  ))}
                </View>
              </View>

              <View style={s.hudCenter}>
                {g.effects.length > 0 ? (
                  <View style={s.effectRow}>
                    {g.effects.map(e => (
                      <View key={e.kind} style={[s.effectPill, { borderColor: DROP_CFG[e.kind].color + '66', backgroundColor: DROP_CFG[e.kind].color + '1A' }]}>
                        <Ionicons name={DROP_CFG[e.kind].icon} size={10} color={DROP_CFG[e.kind].color} />
                        <Text style={[s.effectPillTxt, { color: DROP_CFG[e.kind].color }]}>{Math.ceil(e.framesLeft / 62)}s</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[s.phasePill, {
                    backgroundColor: g.phase === 'playing' ? COLORS.primaryGlow : 'rgba(15,23,42,0.05)',
                    borderColor: g.phase === 'playing' ? COLORS.primary + '60' : COLORS.border,
                  }]}>
                    <Text style={[s.phaseTxt, { color: g.phase === 'playing' ? COLORS.primary : COLORS.textDisabled }]}>
                      {g.phase === 'ready'   ? 'READY'
                      : g.phase === 'idle'   ? 'TAP!'
                      : g.phase === 'playing' ? `BALL x${g.balls.length}`
                      : g.phase === 'cleared' ? 'CLEAR!'
                      : 'GAME OVER'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.hudScore}>
                <Text style={s.hudLabel}>BRICKS</Text>
                <Text style={s.hudScoreNum}>
                  <Text style={{ color: COLORS.amber }}>{g.bricksHit}</Text>
                  <Text style={{ color: COLORS.textMuted }}> / {ROWS * COLS}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* 얇은 구분선 */}
          <View style={s.divider} />

          {/* 게임 영역 */}
          <View
            style={s.gameArea}
            onLayout={onLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleMove}
            onResponderMove={handleMove}
            onResponderRelease={handleRelease}
          >
            {g && !isResult && (
              <>
                {/* 벽돌들 */}
                {g.bricks.map((b, i) => b.alive && <BrickView key={i} brick={b} />)}

                {/* 낙하 아이템 */}
                {g.drops.map((d, i) => (
                  <View key={`d${i}`} style={[s.drop, {
                    left: d.x - DROP_SIZE / 2,
                    top:  d.y - DROP_SIZE / 2,
                    backgroundColor: DROP_CFG[d.kind].color,
                    shadowColor: DROP_CFG[d.kind].color,
                  }]}>
                    <Ionicons name={DROP_CFG[d.kind].icon} size={14} color="#FFFFFF" />
                  </View>
                ))}

                {/* 공들 */}
                {g.balls.map((b, i) => (
                  <View key={`b${i}`} style={[s.ball, {
                    left: b.x - BALL_R,
                    top:  b.y - BALL_R,
                  }]} />
                ))}

                {/* 패들 */}
                <View style={[s.paddle, {
                  width: padW,
                  left: g.px - padW / 2,
                  top:  g.paddleY,
                  backgroundColor: wideActive ? 'rgba(16,185,129,0.9)' : 'rgba(34,211,238,0.85)',
                  shadowColor: wideActive ? '#10B981' : COLORS.primary,
                }]} />

                {/* 패들 글로우 라인 */}
                <View style={[s.paddleGlow, {
                  width: padW - 16,
                  left: g.px - padW / 2 + 8,
                  top:  g.paddleY - 1,
                }]} />

                {/* 아이템 획득 토스트 */}
                {toastCfg && g.phase === 'playing' && (
                  <View style={s.toastWrap} pointerEvents="none">
                    <View style={[s.toastPill, { backgroundColor: toastCfg.color }]}>
                      <Text style={s.toastTxt}>{toastCfg.label}</Text>
                    </View>
                  </View>
                )}

                {/* READY 오버레이 */}
                {g.phase === 'ready' && (
                  <View style={s.readyOverlay}>
                    <Text style={s.readyEmoji}>🧱</Text>
                    <Text style={s.readyTitle}>벽돌깨기</Text>
                    <Text style={s.readySub}>모든 벽돌을 파괴하라</Text>

                    <View style={s.readyRuleBox}>
                      <RuleRow icon="hand-left-outline"   color={COLORS.primary} text="손가락으로 패들 이동 · 손 떼면 발사" />
                      <RuleRow icon="gift"                color={COLORS.good}    text="벽돌에서 아이템 드랍 — 패들로 받기" />
                      <RuleRow icon="copy"                color="#14B8A6"        text="멀티볼·패들 확장·슬로우·+1 목숨" />
                      <RuleRow icon="flash"               color="#EF4444"        text="빨간 번개는 가속 함정 — 피하세요!" />
                      <RuleRow icon="speedometer"         color={COLORS.amber}   text="벽돌을 깰수록 공이 빨라집니다" />
                    </View>

                    <TouchableOpacity style={s.startBtn} onPress={startGame} activeOpacity={0.85}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={s.startBtnTxt}>게임 시작</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* IDLE: 발사 힌트 */}
                {g.phase === 'idle' && (
                  <View style={[s.tapHint, { top: g.paddleY - 48 }]} pointerEvents="none">
                    <View style={s.tapHintPill}>
                      <Ionicons name="finger-print" size={13} color={COLORS.primary} />
                      <Text style={s.tapHintTxt}>손 떼면 발사</Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* 결과 오버레이 */}
            {g && isResult && (
              <Animated.View style={[s.resultOverlay, {
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
              }]}>
                <Text style={s.resultEmoji}>{g.phase === 'cleared' ? '🏆' : '💀'}</Text>
                <Text style={[s.resultTitle, { color: g.phase === 'cleared' ? COLORS.amber : '#EF4444' }]}>
                  {g.phase === 'cleared' ? '스테이지 클리어!' : '게임 오버'}
                </Text>
                <Text style={s.resultSub}>
                  벽돌 파괴  {g.bricksHit} / {ROWS * COLS}개
                  {g.goldBonus > 0 ? `  ·  보너스 +${g.goldBonus}G` : ''}
                </Text>

                <View style={s.statsRow}>
                  <StatBox label="파괴 벽돌" val={String(g.bricksHit)} color={COLORS.primary} />
                  <StatBox label="남은 목숨" val={String(g.lives)} color="#EF4444" />
                  <StatBox label="성공 여부" val={g.phase === 'cleared' ? 'WIN' : 'LOSE'} color={g.phase === 'cleared' ? COLORS.good : '#EF4444'} />
                </View>

                <View style={s.rewardPanel}>
                  <Text style={s.rewardLabel}>획득 보상</Text>
                  <View style={s.rewardRow}>
                    <RewardItem emoji="🪙" val={`${g.earnedGold} G`} />
                    <View style={s.rewardDivider} />
                    <RewardItem emoji="✨" val={`${g.earnedXp} XP`} />
                  </View>
                </View>

                <TouchableOpacity style={s.closeBtn2} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={s.closeBtnTxt}>확인</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────
function BrickView({ brick }: { brick: Brick }) {
  const hpRatio = brick.hp / brick.maxHp;
  const bgAlpha = hpRatio >= 1 ? '2A' : hpRatio >= 0.67 ? '1E' : '14';
  const borderAlpha = hpRatio >= 1 ? 'AA' : hpRatio >= 0.67 ? '77' : '44';
  return (
    <View style={[s.brick, {
      left: brick.x, top: brick.y,
      width: brick.w, height: brick.h,
      borderColor: brick.color + borderAlpha,
      backgroundColor: brick.color + bgAlpha,
    }]}>
      {/* HP 바 */}
      <View style={[s.brickHpBar, {
        width: `${hpRatio * 100}%` as any,
        backgroundColor: brick.color + 'CC',
      }]} />
      {/* 크랙 표시 (HP 손상시) */}
      {hpRatio < 1 && (
        <View style={[s.brickCrack, { opacity: 1 - hpRatio }]} />
      )}
    </View>
  );
}

function RuleRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={s.ruleRow}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={s.ruleTxt}>{text}</Text>
    </View>
  );
}

function StatBox({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={[s.statBox, { borderColor: color + '30', backgroundColor: color + '10' }]}>
      <Text style={[s.statBoxVal, { color }]}>{val}</Text>
      <Text style={s.statBoxLabel}>{label}</Text>
    </View>
  );
}

function RewardItem({ emoji, val }: { emoji: string; val: string }) {
  return (
    <View style={s.rewardItem}>
      <Text style={s.rewardEmoji}>{emoji}</Text>
      <Text style={s.rewardVal}>{val}</Text>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '93%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  hudLives: { alignItems: 'flex-start', gap: 4 },
  hudCenter: { alignItems: 'center', flex: 1 },
  hudScore: { alignItems: 'flex-end', gap: 4 },
  hudLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800' },
  livesRow: { flexDirection: 'row', gap: 3 },
  phasePill: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  phaseTxt: { fontSize: 9, fontFamily: 'monospace', fontWeight: '900', letterSpacing: 1 },
  hudScoreNum: { fontSize: FONTS.sm, fontWeight: '900', fontFamily: 'monospace' },

  effectRow: { flexDirection: 'row', gap: 4 },
  effectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  effectPillTxt: { fontSize: 9, fontFamily: 'monospace', fontWeight: '900' },

  divider: { height: 1, backgroundColor: COLORS.border },

  gameArea: {
    flex: 1,
    backgroundColor: '#030510',
    position: 'relative',
    overflow: 'hidden',
  },

  ball: {
    position: 'absolute',
    width: BALL_R * 2, height: BALL_R * 2,
    borderRadius: BALL_R,
    backgroundColor: '#F0FEFF',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 12,
  },
  paddle: {
    position: 'absolute',
    height: PADDLE_H,
    borderRadius: PADDLE_H / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  paddleGlow: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  drop: {
    position: 'absolute',
    width: DROP_SIZE, height: DROP_SIZE,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },

  toastWrap: {
    position: 'absolute',
    top: '38%', left: 0, right: 0,
    alignItems: 'center',
  },
  toastPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  toastTxt: { fontSize: FONTS.xs, fontWeight: '900', color: '#FFFFFF' },

  brick: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  brickHpBar: {
    position: 'absolute',
    bottom: 0, left: 0,
    height: 3,
    borderRadius: 0,
  },
  brickCrack: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    borderStyle: 'dashed',
  },

  // READY 오버레이
  readyOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 6,
  },
  readyEmoji: { fontSize: 64, marginBottom: 4 },
  readyTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  readySub: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 8 },
  readyRuleBox: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md,
    gap: 9,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleTxt: { fontSize: FONTS.xs, color: COLORS.textSub, flex: 1 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  startBtnTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#FFFFFF' },

  // IDLE 힌트
  tapHint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tapHintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  tapHintTxt: { fontSize: FONTS.xxs, color: COLORS.primary, fontFamily: 'monospace', fontWeight: '700' },

  // 결과 오버레이
  resultOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(3,5,16,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  resultEmoji: { fontSize: 68 },
  resultTitle: { fontSize: FONTS.xxl, fontWeight: '900', letterSpacing: -0.5 },
  resultSub: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },

  statsRow: { flexDirection: 'row', gap: 8, width: '100%' },
  statBox: {
    flex: 1, alignItems: 'center', gap: 3,
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingVertical: 12,
  },
  statBoxVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  statBoxLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted },

  rewardPanel: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  rewardLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rewardItem: { flex: 1, alignItems: 'center', gap: 4 },
  rewardEmoji: { fontSize: 28 },
  rewardVal: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  rewardDivider: { width: 1, height: 44, backgroundColor: COLORS.border },

  closeBtn2: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  closeBtnTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#FFFFFF' },
});
