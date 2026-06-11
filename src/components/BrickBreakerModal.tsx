import { Ionicons } from '@expo/vector-icons';
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
const TICK_MS    = 16;
const BALL_R     = 8;
const BALL_SPD   = 6.2;
const PADDLE_W   = 92;
const PADDLE_H   = 13;
const COLS       = 7;
const ROWS       = 5;
const BRICK_H    = 22;
const BRICK_GAP  = 5;
const BRICK_TOP  = 52;
const SIDE_PAD   = 10;
const MAX_LIVES  = 3;
const PAD_BOTTOM = 44; // paddle top from area bottom

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

type Phase = 'ready' | 'idle' | 'playing' | 'cleared' | 'dead';

interface G {
  phase: Phase;
  bx: number; by: number;  // ball center
  vx: number; vy: number;  // ball velocity (px/frame)
  px: number;              // paddle center X
  paddleY: number;         // paddle top Y
  lives: number;
  bricksHit: number;
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
    bx: px, by: paddleY - BALL_R - 2,
    vx: 0, vy: 0,
    px, paddleY,
    lives: MAX_LIVES, bricksHit: 0,
    bricks: makeBricks(areaW),
    areaW, areaH,
    earnedGold: 0, earnedXp: 0,
  };
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
  const tickRef  = useRef<ReturnType<typeof setInterval>>();
  const endedRef = useRef(false);
  const [tick, setTick] = useState(0);

  const containerAnim = useRef(new Animated.Value(0)).current;
  const resultAnim    = useRef(new Animated.Value(0)).current;
  const ballGlow      = useRef(new Animated.Value(1)).current;

  // 볼 글로우 pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ballGlow, { toValue: 1.6, duration: 500, useNativeDriver: true }),
        Animated.timing(ballGlow, { toValue: 0.8, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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
      stopTick();
      containerAnim.setValue(0);
    }
  }, [visible]);

  // ── 타이머 ──────────────────────────────────────────────
  function stopTick() {
    clearInterval(tickRef.current);
    tickRef.current = undefined;
  }

  function startTick() {
    stopTick();
    tickRef.current = setInterval(physics, TICK_MS);
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
    gRef.current = { ...g, phase: 'idle' };
    setTick(t => t + 1);
    startTick();
  }

  // ── 물리 업데이트 ────────────────────────────────────────
  function physics() {
    const g = gRef.current;
    if (!g || g.phase !== 'playing') return;

    let { bx, by, vx, vy, px, paddleY, areaW, areaH, lives, bricksHit } = g;
    const bricks = g.bricks.slice();

    // 공 이동
    bx += vx;
    by += vy;

    // 벽 반사
    if (bx - BALL_R <= 0)     { vx =  Math.abs(vx); bx = BALL_R; }
    if (bx + BALL_R >= areaW) { vx = -Math.abs(vx); bx = areaW - BALL_R; }
    if (by - BALL_R <= 0)     { vy =  Math.abs(vy); by = BALL_R; }

    // 패들 반사 (공이 아래로 내려갈 때만)
    if (vy > 0) {
      const padL = px - PADDLE_W / 2;
      const padR = px + PADDLE_W / 2;
      if (
        bx >= padL - BALL_R && bx <= padR + BALL_R &&
        by + BALL_R >= paddleY && by - BALL_R <= paddleY + PADDLE_H
      ) {
        const hit = Math.max(-1, Math.min(1, (bx - px) / (PADDLE_W / 2)));
        const angle = hit * (55 * Math.PI / 180);
        vx = BALL_SPD * Math.sin(angle);
        vy = -Math.abs(BALL_SPD * Math.cos(angle));
        by = paddleY - BALL_R - 1;
      }
    }

    // 벽돌 충돌 (한 프레임에 하나만)
    let hitOne = false;
    for (let i = 0; i < bricks.length && !hitOne; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      const bl = bx - BALL_R, br = bx + BALL_R;
      const bt = by - BALL_R, bb = by + BALL_R;
      if (br > b.x && bl < b.x + b.w && bb > b.y && bt < b.y + b.h) {
        const oL = br - b.x,         oR = (b.x + b.w) - bl;
        const oT = bb - b.y,         oB = (b.y + b.h) - bt;
        const mn = Math.min(oL, oR, oT, oB);
        if (mn === oL || mn === oR) vx = -vx;
        else                        vy = -vy;
        const newHp = b.hp - 1;
        bricks[i] = { ...b, hp: newHp, alive: newHp > 0 };
        if (newHp <= 0) bricksHit++;
        hitOne = true;
      }
    }

    // 공 낙사
    let phase: Phase = g.phase;
    let earnedGold = g.earnedGold;
    let earnedXp   = g.earnedXp;

    if (by - BALL_R > areaH) {
      lives--;
      if (lives <= 0) {
        earnedGold = Math.max(5, bricksHit * 3);
        earnedXp   = Math.max(10, bricksHit * 2 + 10);
        gRef.current = { ...g, bx, by, vx, vy, bricks, lives: 0, bricksHit, phase: 'dead', earnedGold, earnedXp };
        doEnd(false, earnedGold, earnedXp);
        return;
      } else {
        phase = 'idle';
        bx = px; by = paddleY - BALL_R - 2;
        vx = 0;  vy = 0;
      }
    }

    // 클리어 체크
    if (bricks.every(b => !b.alive)) {
      earnedGold = bricksHit * 4 + 60;
      earnedXp   = bricksHit * 3 + 100;
      gRef.current = { ...g, bx, by, vx, vy, bricks, lives, bricksHit, phase: 'cleared', earnedGold, earnedXp };
      doEnd(true, earnedGold, earnedXp);
      return;
    }

    gRef.current = { ...g, bx, by, vx, vy, bricks, lives, bricksHit, phase };
    setTick(t => t + 1);
  }

  function doEnd(cleared: boolean, gold: number, xp: number) {
    if (endedRef.current) return;
    endedRef.current = true;
    stopTick();
    setTick(t => t + 1);
    addGold(gold);
    (addXpFn ?? addXP)(xp);
    onGoldEarned?.(gold);
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }).start();
  }

  // ── 터치 핸들러 ──────────────────────────────────────────
  function handleMove(e: GestureResponderEvent) {
    const g = gRef.current;
    if (!g || (g.phase !== 'playing' && g.phase !== 'idle')) return;
    const newPx = Math.max(PADDLE_W / 2, Math.min(g.areaW - PADDLE_W / 2, e.nativeEvent.locationX));
    if (g.phase === 'idle') {
      gRef.current = { ...g, px: newPx, bx: newPx, by: g.paddleY - BALL_R - 2 };
      setTick(t => t + 1);
    } else {
      gRef.current = { ...g, px: newPx };
    }
  }

  function handleRelease() {
    const g = gRef.current;
    if (!g || g.phase !== 'idle') return;
    const angle = (Math.random() * 0.6 - 0.3);
    gRef.current = {
      ...g, phase: 'playing',
      vx: BALL_SPD * Math.sin(angle),
      vy: -Math.abs(BALL_SPD * Math.cos(angle)),
    };
    setTick(t => t + 1);
  }

  function handleClose() {
    stopTick();
    gRef.current = null;
    onClose();
  }

  // ── 렌더 ─────────────────────────────────────────────────
  const g = gRef.current;
  const isResult = g?.phase === 'cleared' || g?.phase === 'dead';

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
                      size={18} color={i < g.lives ? '#EF4444' : COLORS.textDisabled} />
                  ))}
                </View>
              </View>

              <View style={s.hudCenter}>
                <View style={[s.phasePill, {
                  backgroundColor: g.phase === 'playing' ? COLORS.primaryGlow : 'rgba(15,23,42,0.05)',
                  borderColor: g.phase === 'playing' ? COLORS.primary + '60' : COLORS.border,
                }]}>
                  <Text style={[s.phaseTxt, { color: g.phase === 'playing' ? COLORS.primary : COLORS.textDisabled }]}>
                    {g.phase === 'ready'   ? 'READY'
                    : g.phase === 'idle'   ? 'TAP!'
                    : g.phase === 'playing' ? 'IN GAME'
                    : g.phase === 'cleared' ? 'CLEAR!'
                    : 'GAME OVER'}
                  </Text>
                </View>
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

                {/* 공 */}
                <Animated.View style={[s.ball, {
                  left: g.bx - BALL_R,
                  top:  g.by - BALL_R,
                  shadowOpacity: ballGlow.interpolate({ inputRange: [0.8, 1.6], outputRange: [0.6, 1] }),
                  shadowRadius:  ballGlow.interpolate({ inputRange: [0.8, 1.6], outputRange: [6, 16] }),
                }]} />

                {/* 패들 */}
                <View style={[s.paddle, {
                  left: g.px - PADDLE_W / 2,
                  top:  g.paddleY,
                }]} />

                {/* 패들 글로우 라인 */}
                <View style={[s.paddleGlow, {
                  left: g.px - PADDLE_W / 2 + 8,
                  top:  g.paddleY - 1,
                }]} />

                {/* READY 오버레이 */}
                {g.phase === 'ready' && (
                  <View style={s.readyOverlay}>
                    <Text style={s.readyEmoji}>🧱</Text>
                    <Text style={s.readyTitle}>벽돌깨기</Text>
                    <Text style={s.readySub}>모든 벽돌을 파괴하라</Text>

                    <View style={s.readyRuleBox}>
                      <RuleRow icon="hand-left-outline"   color={COLORS.primary} text="손가락으로 패들 이동" />
                      <RuleRow icon="radio-button-on"     color={COLORS.amber}   text="손 떼면 공 발사 (IDLE 상태)" />
                      <RuleRow icon="heart"               color="#EF4444"        text="목숨 3개 — 공을 놓치지 마세요" />
                      <RuleRow icon="cube-outline"        color="#A78BFA"        text="황금·보라 벽돌은 여러 번 쳐야 파괴" />
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
      shadowColor: brick.glow,
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
  hudCenter: { alignItems: 'center' },
  hudScore: { alignItems: 'flex-end', gap: 4 },
  hudLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800' },
  livesRow: { flexDirection: 'row', gap: 4 },
  phasePill: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  phaseTxt: { fontSize: 9, fontFamily: 'monospace', fontWeight: '900', letterSpacing: 1 },
  hudScoreNum: { fontSize: FONTS.sm, fontWeight: '900', fontFamily: 'monospace' },

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
    width: PADDLE_W, height: PADDLE_H,
    borderRadius: PADDLE_H / 2,
    backgroundColor: 'rgba(34,211,238,0.85)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  paddleGlow: {
    position: 'absolute',
    width: PADDLE_W - 16, height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  brick: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
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
