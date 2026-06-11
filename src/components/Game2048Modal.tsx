import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { addGold } from '../utils/gacha';
import { addXP } from '../utils/storage';

// ── 상수 ─────────────────────────────────────────────────────
const N = 4;                 // 4x4
const GAP = 8;
const SWIPE_MIN = 24;        // 스와이프 인식 최소 거리(px)
const BEST_KEY = 'hrpg_2048_best';

// 타일 값 → 색 (민트 → 앰버 → 레전드)
const TILE_STYLE: Record<number, { bg: string; fg: string }> = {
  2:    { bg: '#E6F4F1', fg: '#0F9488' },
  4:    { bg: '#CCEAE4', fg: '#0F9488' },
  8:    { bg: '#7DD8C8', fg: '#FFFFFF' },
  16:   { bg: '#3EC3AE', fg: '#FFFFFF' },
  32:   { bg: '#14B8A6', fg: '#FFFFFF' },
  64:   { bg: '#0E9384', fg: '#FFFFFF' },
  128:  { bg: '#FBBF24', fg: '#FFFFFF' },
  256:  { bg: '#F59E0B', fg: '#FFFFFF' },
  512:  { bg: '#F97316', fg: '#FFFFFF' },
  1024: { bg: '#EF4444', fg: '#FFFFFF' },
  2048: { bg: '#8B5CF6', fg: '#FFFFFF' },
};
const TILE_FALLBACK = { bg: '#6D28D9', fg: '#FFFFFF' };

type Grid = number[][];
type Dir = 'left' | 'right' | 'up' | 'down';

// ── 2048 로직 (순수 함수) ─────────────────────────────────────
function emptyGrid(): Grid {
  return Array.from({ length: N }, () => Array(N).fill(0));
}

function randomSpawn(grid: Grid): Grid {
  const empties: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (empties.length === 0) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => row.slice());
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function newGame(): Grid {
  return randomSpawn(randomSpawn(emptyGrid()));
}

/** 한 줄을 왼쪽으로 슬라이드+병합. gained = 이번에 합쳐진 값 합계 */
function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter(v => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < N) out.push(0);
  return { row: out, gained };
}

function transpose(g: Grid): Grid {
  return g[0].map((_, c) => g.map(row => row[c]));
}
function reverseRows(g: Grid): Grid {
  return g.map(row => row.slice().reverse());
}

function move(grid: Grid, dir: Dir): { grid: Grid; gained: number; moved: boolean } {
  // 모든 방향을 '왼쪽 슬라이드' 문제로 변환
  let g = grid;
  if (dir === 'right') g = reverseRows(g);
  if (dir === 'up')    g = transpose(g);
  if (dir === 'down')  g = reverseRows(transpose(g));

  let gained = 0;
  const slid = g.map(row => {
    const r = slideRow(row);
    gained += r.gained;
    return r.row;
  });

  let out = slid;
  if (dir === 'right') out = reverseRows(out);
  if (dir === 'up')    out = transpose(out);
  if (dir === 'down')  out = transpose(reverseRows(out));

  const moved = out.some((row, r) => row.some((v, c) => v !== grid[r][c]));
  return { grid: out, gained, moved };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < N && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < N && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function maxTile(grid: Grid): number {
  return Math.max(...grid.flat());
}

// ── 보상 ─────────────────────────────────────────────────────
function calcReward(score: number, max: number): { gold: number; xp: number } {
  let gold = Math.min(150, Math.round(score / 30));
  let xp   = Math.min(120, Math.round(score / 40)) + 10;
  if (max >= 2048) { gold += 100; xp += 100; }
  else if (max >= 1024) { gold += 40; xp += 40; }
  else if (max >= 512)  { gold += 15; xp += 15; }
  return { gold: Math.max(5, gold), xp };
}

// ── 타일 (등장/병합 스케일 애니메이션) ────────────────────────
function Tile({ value, size, x, y }: { value: number; size: number; x: number; y: number }) {
  const scale = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    scale.setValue(0.55);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [value]);

  const st = TILE_STYLE[value] ?? TILE_FALLBACK;
  const fontSize = value >= 1024 ? 22 : value >= 128 ? 26 : 30;

  return (
    <Animated.View style={[t.tile, {
      width: size, height: size, left: x, top: y,
      backgroundColor: st.bg,
      transform: [{ scale }],
    }]}>
      <Text style={[t.tileTxt, { color: st.fg, fontSize }]}>{value}</Text>
    </Animated.View>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  addXpFn?: (xp: number) => Promise<any>;
  onGoldEarned?: (gold: number) => void;
}

type Phase = 'ready' | 'playing' | 'over';

export default function Game2048Modal({ visible, onClose, addXpFn, onGoldEarned }: Props) {
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [reward, setReward] = useState<{ gold: number; xp: number } | null>(null);
  const [boardW, setBoardW] = useState(0);
  const endedRef = useRef(false);

  // 상태를 ref에도 — PanResponder 클로저에서 최신값 접근
  const gridRef = useRef(grid);   gridRef.current = grid;
  const scoreRef = useRef(score); scoreRef.current = score;
  const phaseRef = useRef(phase); phaseRef.current = phase;

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(BEST_KEY).then(v => setBest(v ? parseInt(v) : 0));
      setPhase('ready');
      setReward(null);
      setScore(0);
      endedRef.current = false;
    }
  }, [visible]);

  function start() {
    setGrid(newGame());
    setScore(0);
    setReward(null);
    endedRef.current = false;
    setPhase('playing');
  }

  function finish(g: Grid, s: number) {
    if (endedRef.current) return;
    endedRef.current = true;
    const r = calcReward(s, maxTile(g));
    setReward(r);
    addGold(r.gold);
    (addXpFn ?? addXP)(r.xp);
    onGoldEarned?.(r.gold);
    if (s > best) {
      setBest(s);
      AsyncStorage.setItem(BEST_KEY, String(s));
    }
    setPhase('over');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function doMove(dir: Dir) {
    if (phaseRef.current !== 'playing') return;
    const res = move(gridRef.current, dir);
    if (!res.moved) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const spawned = randomSpawn(res.grid);
    const newScore = scoreRef.current + res.gained;
    setGrid(spawned);
    setScore(newScore);
    if (!canMove(spawned)) finish(spawned, newScore);
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8,
    onPanResponderRelease: (_, gs) => {
      const { dx, dy } = gs;
      if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
      else                             doMove(dy > 0 ? 'down' : 'up');
    },
  })).current;

  function handleClose() {
    // 진행 중 종료 → 점수가 있으면 보상 정산 화면으로
    if (phaseRef.current === 'playing' && scoreRef.current > 0 && !endedRef.current) {
      finish(gridRef.current, scoreRef.current);
      return;
    }
    onClose();
  }

  function onBoardLayout(e: LayoutChangeEvent) {
    setBoardW(e.nativeEvent.layout.width);
  }

  const cell = boardW > 0 ? (boardW - GAP * (N + 1)) / N : 0;
  const pos = (i: number) => GAP + i * (cell + GAP);
  const max = maxTile(grid);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={t.overlay}>
        <View style={t.container}>

          {/* 헤더 */}
          <View style={t.header}>
            <TouchableOpacity onPress={handleClose} style={t.closeBtn} hitSlop={{ top: 16, left: 16, bottom: 16, right: 16 }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={t.headerTitle}>🧪  2048 합성</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* 점수 HUD */}
          <View style={t.hud}>
            <View style={t.scoreBox}>
              <Text style={t.scoreLabel}>SCORE</Text>
              <Text style={t.scoreVal}>{score.toLocaleString()}</Text>
            </View>
            <View style={t.scoreBox}>
              <Text style={t.scoreLabel}>BEST</Text>
              <Text style={[t.scoreVal, { color: COLORS.amber }]}>{best.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={t.restartBtn} onPress={start} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* 보드 */}
          <View style={t.boardWrap}>
            <View style={t.board} onLayout={onBoardLayout} {...pan.panHandlers}>
              {/* 빈 셀 */}
              {boardW > 0 && Array.from({ length: N * N }).map((_, i) => {
                const r = Math.floor(i / N), c = i % N;
                return (
                  <View key={`bg${i}`} style={[t.cellBg, {
                    width: cell, height: cell,
                    left: pos(c), top: pos(r),
                  }]} />
                );
              })}
              {/* 타일 */}
              {boardW > 0 && grid.map((row, r) => row.map((v, c) =>
                v !== 0 && (
                  <Tile key={`${r}-${c}-${v}`} value={v} size={cell} x={pos(c)} y={pos(r)} />
                )
              ))}

              {/* READY 오버레이 */}
              {phase === 'ready' && (
                <View style={t.boardOverlay}>
                  <Text style={t.readyEmoji}>🧪</Text>
                  <Text style={t.readyTitle}>2048 합성</Text>
                  <Text style={t.readyDesc}>스와이프로 같은 숫자를 합쳐{'\n'}2048 엘릭서를 만들어보세요</Text>
                  <TouchableOpacity style={t.startBtn} onPress={start} activeOpacity={0.85}>
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                    <Text style={t.startBtnTxt}>게임 시작</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 결과 오버레이 */}
              {phase === 'over' && reward && (
                <View style={t.boardOverlay}>
                  <Text style={t.readyEmoji}>{max >= 2048 ? '🏆' : max >= 512 ? '✨' : '🧪'}</Text>
                  <Text style={t.readyTitle}>
                    {max >= 2048 ? '엘릭서 완성!' : '게임 종료'}
                  </Text>
                  <Text style={t.overScore}>점수 {score.toLocaleString()} · 최고 타일 {max}</Text>
                  <View style={t.rewardRow}>
                    <Text style={t.rewardTxt}>🪙 +{reward.gold}G</Text>
                    <Text style={t.rewardTxt}>✨ +{reward.xp} XP</Text>
                  </View>
                  <View style={t.overBtnRow}>
                    <TouchableOpacity style={[t.startBtn, t.againBtn]} onPress={start} activeOpacity={0.85}>
                      <Ionicons name="refresh" size={15} color={COLORS.primaryDark} />
                      <Text style={[t.startBtnTxt, { color: COLORS.primaryDark }]}>한판 더</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={t.startBtn} onPress={onClose} activeOpacity={0.85}>
                      <Text style={t.startBtnTxt}>확인</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 하단 힌트 */}
          {phase === 'playing' && (
            <View style={t.hintRow}>
              <Ionicons name="swap-horizontal" size={13} color={COLORS.textMuted} />
              <Text style={t.hintTxt}>상하좌우 스와이프 · 같은 숫자가 만나면 합쳐져요</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── 스타일 ────────────────────────────────────────────────────
const t = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl,
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
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'stretch',
  },
  scoreBox: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 1,
  },
  scoreLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800' },
  scoreVal: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text, fontFamily: 'monospace' },
  restartBtn: {
    width: 48,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primaryLine,
  },

  boardWrap: { paddingHorizontal: SPACING.md },
  board: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#CDD9DE',
    borderRadius: RADIUS.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  cellBg: {
    position: 'absolute',
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tile: {
    position: 'absolute',
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  tileTxt: { fontWeight: '900', fontFamily: 'monospace', letterSpacing: -1 },

  boardOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(245,247,249,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
  },
  readyEmoji: { fontSize: 56 },
  readyTitle: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  readyDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  startBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
  againBtn: { backgroundColor: COLORS.bgHighlight, borderWidth: 1, borderColor: COLORS.primaryLine },

  overScore: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  rewardRow: { flexDirection: 'row', gap: 18, marginVertical: 6 },
  rewardTxt: { fontSize: FONTS.md, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  overBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },

  hintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingTop: SPACING.sm + 2,
  },
  hintTxt: { fontSize: FONTS.xxs, color: COLORS.textMuted },
});
