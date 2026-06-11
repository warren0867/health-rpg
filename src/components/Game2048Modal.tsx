import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
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
const SWIPE_MIN = 20;        // 스와이프 인식 최소 거리(px)
const SLIDE_MS = 110;        // 타일 슬라이드 시간
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

type Dir = 'left' | 'right' | 'up' | 'down';

// 타일 — id로 추적해서 이동을 애니메이션한다
interface TileT {
  id: number;
  value: number;
  r: number; c: number;
  dying?: boolean;    // 병합돼 사라지는 타일 (슬라이드 후 제거)
  spawned?: boolean;  // 방금 등장 (스케일 인)
}

// ── 2048 로직 ────────────────────────────────────────────────
let _nextId = 1;
function newTile(r: number, c: number, value: number, spawned = false): TileT {
  return { id: _nextId++, value, r, c, spawned };
}

function tilesToGrid(tiles: TileT[]): number[][] {
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  for (const t of tiles) if (!t.dying) g[t.r][t.c] = t.value;
  return g;
}

function spawnTile(tiles: TileT[]): TileT | null {
  const grid = tilesToGrid(tiles);
  const empties: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (empties.length === 0) return null;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  return newTile(r, c, Math.random() < 0.9 ? 2 : 4, true);
}

function startTiles(): TileT[] {
  const tiles: TileT[] = [];
  const a = spawnTile(tiles); if (a) tiles.push({ ...a, spawned: false });
  const b = spawnTile(tiles); if (b) tiles.push({ ...b, spawned: false });
  return tiles;
}

/**
 * 한 방향으로 이동+병합. 살아있는 타일은 id를 유지한 채 새 좌표를 받고,
 * 병합으로 사라지는 타일은 dying=true + 병합 셀 좌표 (그 위치로 슬라이드 후 제거).
 */
function moveTiles(tiles: TileT[], dir: Dir): { tiles: TileT[]; gained: number; moved: boolean } {
  const horizontal = dir === 'left' || dir === 'right';
  const forward = dir === 'left' || dir === 'up';   // 진행 방향이 인덱스 증가 쪽인지

  const lines: TileT[][] = Array.from({ length: N }, () => []);
  for (const t of tiles) {
    if (t.dying) continue;
    lines[horizontal ? t.r : t.c].push(t);
  }

  let gained = 0;
  let moved = false;
  const out: TileT[] = [];

  for (let li = 0; li < N; li++) {
    const line = lines[li];
    line.sort((a, b) => {
      const ka = horizontal ? a.c : a.r;
      const kb = horizontal ? b.c : b.r;
      return forward ? ka - kb : kb - ka;
    });

    const posFor = (idx: number) => {
      const p = forward ? idx : N - 1 - idx;
      return horizontal ? { r: li, c: p } : { r: p, c: li };
    };

    let target = 0;
    let prev: TileT | null = null;       // out에 들어간 직전 생존 타일
    let prevOriginal = 0;                // 병합 판정용 원래 값
    let prevMerged = false;

    for (const t of line) {
      if (prev && prevOriginal === t.value && !prevMerged) {
        // t는 prev 자리로 슬라이드하며 소멸, prev는 두 배
        const pos = posFor(target - 1);
        out.push({ id: t.id, value: t.value, r: pos.r, c: pos.c, dying: true });
        prev.value = t.value * 2;
        gained += t.value * 2;
        prevMerged = true;
        moved = true;
      } else {
        const pos = posFor(target);
        const nt: TileT = { id: t.id, value: t.value, r: pos.r, c: pos.c };
        if (nt.r !== t.r || nt.c !== t.c) moved = true;
        out.push(nt);
        prev = nt;
        prevOriginal = t.value;
        prevMerged = false;
        target++;
      }
    }
  }

  return { tiles: out, gained, moved };
}

function canMoveAny(tiles: TileT[]): boolean {
  const g = tilesToGrid(tiles);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (g[r][c] === 0) return true;
      if (c + 1 < N && g[r][c] === g[r][c + 1]) return true;
      if (r + 1 < N && g[r][c] === g[r + 1][c]) return true;
    }
  }
  return false;
}

function maxTile(tiles: TileT[]): number {
  return tiles.reduce((m, t) => (t.dying ? m : Math.max(m, t.value)), 0);
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

// ── 타일 뷰 (슬라이드 + 등장/병합 팝) ─────────────────────────
function TileView({ tile, cell }: { tile: TileT; cell: number }) {
  const pos = (i: number) => GAP + i * (cell + GAP);
  const xy = useRef(new Animated.ValueXY({ x: pos(tile.c), y: pos(tile.r) })).current;
  const scale = useRef(new Animated.Value(tile.spawned ? 0.3 : 1)).current;
  const firstValue = useRef(true);

  // 좌표 변경 → 슬라이드
  useEffect(() => {
    Animated.timing(xy, {
      toValue: { x: pos(tile.c), y: pos(tile.r) },
      duration: SLIDE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [tile.r, tile.c, cell]);

  // 등장 스케일 인
  useEffect(() => {
    if (tile.spawned) {
      Animated.sequence([
        Animated.delay(SLIDE_MS),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  // 병합으로 값 변경 → 팝
  useEffect(() => {
    if (firstValue.current) { firstValue.current = false; return; }
    scale.setValue(1.22);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();
  }, [tile.value]);

  const st = TILE_STYLE[tile.value] ?? TILE_FALLBACK;
  const fontSize = cell < 70
    ? (tile.value >= 1024 ? 18 : tile.value >= 128 ? 22 : 26)
    : (tile.value >= 1024 ? 22 : tile.value >= 128 ? 26 : 30);

  return (
    <Animated.View style={[t.tile, {
      width: cell, height: cell,
      backgroundColor: st.bg,
      zIndex: tile.dying ? 1 : 2,
      transform: [{ translateX: xy.x }, { translateY: xy.y }, { scale }],
    }]}>
      <Text style={[t.tileTxt, { color: st.fg, fontSize }]}>{tile.value}</Text>
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
  const [tiles, setTiles] = useState<TileT[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [reward, setReward] = useState<{ gold: number; xp: number } | null>(null);
  const [boardSize, setBoardSize] = useState(0);
  const endedRef = useRef(false);
  const lockRef = useRef(false);                 // 애니메이션 중 입력 잠금
  const pruneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PanResponder 클로저용 ref
  const tilesRef = useRef(tiles);  tilesRef.current = tiles;
  const scoreRef = useRef(score);  scoreRef.current = score;
  const phaseRef = useRef(phase);  phaseRef.current = phase;
  const bestRef  = useRef(best);   bestRef.current = best;

  useEffect(() => () => { if (pruneTimer.current) clearTimeout(pruneTimer.current); }, []);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(BEST_KEY).then(v => setBest(v ? parseInt(v) : 0)).catch(() => {});
      setPhase('ready');
      setReward(null);
      setScore(0);
      setTiles([]);
      endedRef.current = false;
      lockRef.current = false;
    }
  }, [visible]);

  function start() {
    if (pruneTimer.current) clearTimeout(pruneTimer.current);
    setTiles(startTiles());
    setScore(0);
    setReward(null);
    endedRef.current = false;
    lockRef.current = false;
    setPhase('playing');
  }

  function finish(finalTiles: TileT[], finalScore: number) {
    if (endedRef.current) return;
    endedRef.current = true;
    const r = calcReward(finalScore, maxTile(finalTiles));
    setReward(r);
    addGold(r.gold);
    (addXpFn ?? addXP)(r.xp);
    onGoldEarned?.(r.gold);
    if (finalScore > bestRef.current) {
      setBest(finalScore);
      AsyncStorage.setItem(BEST_KEY, String(finalScore)).catch(() => {});
    }
    setPhase('over');
    hapticSuccess();
  }

  function doMove(dir: Dir) {
    if (lockRef.current || phaseRef.current !== 'playing') return;
    const res = moveTiles(tilesRef.current, dir);
    if (!res.moved) return;

    lockRef.current = true;
    hapticLight();
    setTiles(res.tiles);                        // 슬라이드 시작
    const newScore = scoreRef.current + res.gained;
    setScore(newScore);

    // 슬라이드 끝난 뒤: 죽은 타일 제거 + 새 타일 스폰 + 종료 판정
    pruneTimer.current = setTimeout(() => {
      const alive = res.tiles.filter(tl => !tl.dying).map(tl => ({ ...tl, spawned: false }));
      const sp = spawnTile(alive);
      const next = sp ? [...alive, sp] : alive;
      setTiles(next);
      lockRef.current = false;
      if (!canMoveAny(next)) finish(next, newScore);
    }, SLIDE_MS + 30);
  }

  // 웹: 키보드 방향키 지원
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); doMove(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

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
      finish(tilesRef.current, scoreRef.current);
      return;
    }
    onClose();
  }

  // 보드 크기 = 가용 영역의 짧은 변 (화면을 절대 벗어나지 않음)
  function onAreaLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setBoardSize(Math.floor(Math.min(width - SPACING.md * 2, height - 8)));
  }

  const cell = boardSize > 0 ? (boardSize - GAP * (N + 1)) / N : 0;
  const pos = (i: number) => GAP + i * (cell + GAP);
  const max = maxTile(tiles);

  // 죽는 타일을 먼저 그려서 생존 타일이 위로 오게
  const ordered = tiles.slice().sort((a, b) => (a.dying ? 0 : 1) - (b.dying ? 0 : 1));

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={t.overlay}>
        <View style={t.container}>

          {/* 헤더 — 항상 보이는 닫기 버튼 */}
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
              <Text style={[t.scoreVal, { color: COLORS.amber }]}>{Math.max(best, score).toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={t.restartBtn} onPress={start} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* 보드 영역 — 남는 공간에서 정사각형으로 */}
          <View style={t.boardArea} onLayout={onAreaLayout}>
            {boardSize > 0 && (
              <View style={[t.board, { width: boardSize, height: boardSize }]} {...pan.panHandlers}>
                {/* 빈 셀 */}
                {Array.from({ length: N * N }).map((_, i) => {
                  const r = Math.floor(i / N), c = i % N;
                  return (
                    <View key={`bg${i}`} style={[t.cellBg, {
                      width: cell, height: cell,
                      left: pos(c), top: pos(r),
                    }]} />
                  );
                })}

                {/* 타일 (id 기반 — 위치 변경이 애니메이션됨) */}
                {ordered.map(tile => (
                  <TileView key={tile.id} tile={tile} cell={cell} />
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
            )}
          </View>

          {/* 하단 힌트 */}
          <View style={t.hintRow}>
            {phase === 'playing' ? (
              <>
                <Ionicons name="swap-horizontal" size={13} color={COLORS.textMuted} />
                <Text style={t.hintTxt}>
                  {Platform.OS === 'web' ? '방향키 또는 드래그' : '상하좌우 스와이프'} · 같은 숫자가 만나면 합쳐져요
                </Text>
              </>
            ) : (
              <Text style={t.hintTxt}> </Text>
            )}
          </View>
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
    height: '88%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.lg,
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

  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
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
    left: 0, top: 0,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
    zIndex: 10,
  },
  readyEmoji: { fontSize: 52 },
  readyTitle: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  readyDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 12, paddingHorizontal: 26,
  },
  startBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
  againBtn: { backgroundColor: COLORS.bgHighlight, borderWidth: 1, borderColor: COLORS.primaryLine },

  overScore: { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  rewardRow: { flexDirection: 'row', gap: 18, marginVertical: 6 },
  rewardTxt: { fontSize: FONTS.md, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  overBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },

  hintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingTop: SPACING.sm,
    minHeight: 28,
  },
  hintTxt: { fontSize: FONTS.xxs, color: COLORS.textMuted },
});
