import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { addGold } from '../utils/gacha';
import { BOSS_DEFS, WeeklyBossState } from '../utils/weeklyBoss';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── 게임 상수 ───────────────────────────────────────────────
const GAME_SEC     = 30;
const BOSS_MAX_HP  = 600;
const MAX_SHIELDS  = 3;
const SPAWN_MIN_MS = 750;
const SPAWN_MAX_MS = 1400;

type OrbType   = 'normal' | 'rare' | 'legendary';
type GamePhase = 'ready' | 'playing' | 'result';

// 오브 영역: 전체 화면 기준 절대 좌표
const AREA_TOP    = SH * 0.30;
const AREA_BOTTOM = SH * 0.76;

const ORB_CFG: Record<OrbType, {
  color: string; glowColor: string; size: number;
  damage: number; weight: number; lifetimeMs: number; label: string;
}> = {
  normal:    { color: COLORS.primary, glowColor: 'rgba(34,211,238,0.35)',  size: 52, damage: 12, weight: 62, lifetimeMs: 3600, label: 'NORMAL' },
  rare:      { color: '#A78BFA',      glowColor: 'rgba(167,139,250,0.35)', size: 62, damage: 25, weight: 27, lifetimeMs: 3000, label: 'RARE' },
  legendary: { color: COLORS.amber,   glowColor: 'rgba(245,158,11,0.40)',  size: 75, damage: 50, weight: 11, lifetimeMs: 2400, label: 'LEGENDARY' },
};

// ─── 오브 타입 ───────────────────────────────────────────────
interface OrbData {
  id: string;
  x: number; y: number;
  type: OrbType;
  damage: number;
  size: number;
  color: string;
  glowColor: string;
  scale:   Animated.Value;
  opacity: Animated.Value;
  pulse:   Animated.Value;
}

// ─── Props ───────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  bossState: WeeklyBossState | null;
  addXpFn?: (xp: number) => Promise<any>;
  onGoldEarned?: (gold: number) => void;
}

// ─── 유틸 ────────────────────────────────────────────────────
function pickOrbType(): OrbType {
  const r = Math.random() * 100;
  if (r < ORB_CFG.legendary.weight) return 'legendary';
  if (r < ORB_CFG.legendary.weight + ORB_CFG.rare.weight) return 'rare';
  return 'normal';
}

function createOrb(): OrbData {
  const type = pickOrbType();
  const cfg  = ORB_CFG[type];
  const margin = cfg.size / 2 + 10;
  const x = margin + Math.random() * (SW - margin * 2);
  const y = AREA_TOP + margin + Math.random() * (AREA_BOTTOM - AREA_TOP - margin * 2);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x, y, type,
    damage: cfg.damage,
    size: cfg.size,
    color: cfg.color,
    glowColor: cfg.glowColor,
    scale:   new Animated.Value(0),
    opacity: new Animated.Value(1),
    pulse:   new Animated.Value(1),
  };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────
export default function MiniGameModal({ visible, onClose, bossState, addXpFn, onGoldEarned }: Props) {
  const boss = bossState ? (BOSS_DEFS[bossState.bossId] ?? BOSS_DEFS[0]) : BOSS_DEFS[0];

  // ── 렌더 상태 ──
  const [phase,       setPhase]       = useState<GamePhase>('ready');
  const [timeLeft,    setTimeLeft]    = useState(GAME_SEC);
  const [orbs,        setOrbs]        = useState<OrbData[]>([]);
  const [dmgDealt,    setDmgDealt]    = useState(0);
  const [combo,       setCombo]       = useState(0);
  const [maxCombo,    setMaxCombo]    = useState(0);
  const [shields,     setShields]     = useState(MAX_SHIELDS);
  const [bossHp,      setBossHp]      = useState(BOSS_MAX_HP);
  const [earnedGold,  setEarnedGold]  = useState(0);
  const [lastDmgText, setLastDmgText] = useState<{ val: number; key: number } | null>(null);

  // ── 변환 애니 ──
  const bossShakeAnim = useRef(new Animated.Value(0)).current;
  const comboScaleAnim = useRef(new Animated.Value(1)).current;
  const timerBarAnim   = useRef(new Animated.Value(1)).current;
  const introAnim      = useRef(new Animated.Value(0)).current;
  const resultAnim     = useRef(new Animated.Value(0)).current;

  // ── 뮤터블 refs (stale closure 방지) ──
  const phaseRef   = useRef<GamePhase>('ready');
  const dmgRef     = useRef(0);
  const comboRef   = useRef(0);
  const shieldRef  = useRef(MAX_SHIELDS);
  const bossHpRef  = useRef(BOSS_MAX_HP);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();
  const spawnRef   = useRef<ReturnType<typeof setTimeout>>();
  const expiryMap  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── 초기화 ──
  useEffect(() => {
    if (!visible) { stopAll(); resetAll(); }
    else {
      Animated.spring(introAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }).start();
    }
  }, [visible]);

  function stopAll() {
    clearInterval(timerRef.current);
    clearTimeout(spawnRef.current);
    expiryMap.current.forEach(t => clearTimeout(t));
    expiryMap.current.clear();
  }

  function resetAll() {
    phaseRef.current  = 'ready';
    dmgRef.current    = 0;
    comboRef.current  = 0;
    shieldRef.current = MAX_SHIELDS;
    bossHpRef.current = BOSS_MAX_HP;
    setPhase('ready');
    setTimeLeft(GAME_SEC);
    setOrbs([]);
    setDmgDealt(0);
    setCombo(0);
    setMaxCombo(0);
    setShields(MAX_SHIELDS);
    setBossHp(BOSS_MAX_HP);
    setEarnedGold(0);
    setLastDmgText(null);
    timerBarAnim.setValue(1);
    bossShakeAnim.setValue(0);
    comboScaleAnim.setValue(1);
    resultAnim.setValue(0);
  }

  // ── 게임 시작 ──
  function startGame() {
    phaseRef.current = 'playing';
    setPhase('playing');

    // 타이머
    let t = GAME_SEC;
    Animated.timing(timerBarAnim, {
      toValue: 0, duration: GAME_SEC * 1000, useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        clearTimeout(spawnRef.current);
        endGame();
      }
    }, 1000);

    // 스폰 루프
    scheduleSpawn();
  }

  function scheduleSpawn() {
    if (phaseRef.current !== 'playing') return;
    const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
    spawnRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      doSpawn();
      scheduleSpawn();
    }, delay);
  }

  function doSpawn() {
    const orb = createOrb();
    const cfg  = ORB_CFG[orb.type];

    // 등장 애니
    Animated.spring(orb.scale, {
      toValue: 1, useNativeDriver: true, tension: 140, friction: 5,
    }).start();

    // 만료 페이드
    Animated.timing(orb.opacity, {
      toValue: 0.15, duration: cfg.lifetimeMs, useNativeDriver: true,
    }).start();

    // 펄스 루프
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb.pulse, { toValue: 1.15, duration: 550, useNativeDriver: true }),
        Animated.timing(orb.pulse, { toValue: 0.88, duration: 550, useNativeDriver: true }),
      ])
    ).start();

    setOrbs(prev => [...prev, orb]);

    // 만료 → 실드 감소
    const expiry = setTimeout(() => {
      expiryMap.current.delete(orb.id);
      if (phaseRef.current !== 'playing') return;
      shieldRef.current = Math.max(0, shieldRef.current - 1);
      setShields(shieldRef.current);
      comboRef.current = 0;
      setCombo(0);
      removeOrb(orb.id);
    }, cfg.lifetimeMs);
    expiryMap.current.set(orb.id, expiry);
  }

  function removeOrb(id: string) {
    setOrbs(prev => prev.filter(o => o.id !== id));
  }

  // ── 오브 탭 ──
  function tapOrb(orb: OrbData) {
    if (phaseRef.current !== 'playing') return;

    // 만료 타이머 취소
    const t = expiryMap.current.get(orb.id);
    if (t) { clearTimeout(t); expiryMap.current.delete(orb.id); }

    // 콤보
    comboRef.current++;
    setCombo(comboRef.current);
    setMaxCombo(prev => Math.max(prev, comboRef.current));

    // 배율 계산
    const mult = comboRef.current >= 10 ? 2.0 : comboRef.current >= 5 ? 1.5 : comboRef.current >= 3 ? 1.25 : 1;
    const dmg  = Math.round(orb.damage * mult);

    // 누적 데미지
    dmgRef.current += dmg;
    bossHpRef.current = Math.max(0, bossHpRef.current - dmg);
    setDmgDealt(dmgRef.current);
    setBossHp(bossHpRef.current);

    // 떠오르는 데미지 텍스트
    setLastDmgText({ val: dmg, key: Date.now() });

    // 보스 흔들기
    Animated.sequence([
      Animated.timing(bossShakeAnim, { toValue: 8,  duration: 40, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: 4,  duration: 30, useNativeDriver: true }),
      Animated.timing(bossShakeAnim, { toValue: 0,  duration: 30, useNativeDriver: true }),
    ]).start();

    // 콤보 팝
    if (comboRef.current >= 3) {
      Animated.sequence([
        Animated.spring(comboScaleAnim, { toValue: 1.35, useNativeDriver: true, tension: 400 }),
        Animated.timing(comboScaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }

    // 오브 터지는 애니
    Animated.parallel([
      Animated.spring(orb.scale, { toValue: 1.5, useNativeDriver: true, tension: 500, friction: 4 }),
      Animated.timing(orb.opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => removeOrb(orb.id));

    // 보스 HP 0 = 즉시 종료
    if (bossHpRef.current <= 0) {
      clearInterval(timerRef.current);
      clearTimeout(spawnRef.current);
      phaseRef.current = 'result';
      endGame(true);
    }
  }

  // ── 게임 종료 ──
  async function endGame(bossKilled = false) {
    if (phaseRef.current === 'result') return;
    phaseRef.current = 'result';
    stopAll();
    setOrbs([]);
    setPhase('result');

    const perfectShield = shieldRef.current === MAX_SHIELDS;
    const gold = Math.floor(dmgRef.current / 7)
      + (bossKilled  ? 80 : 0)
      + (perfectShield ? 30 : 0);
    setEarnedGold(gold);
    await addGold(gold);
    onGoldEarned?.(gold);

    Animated.spring(resultAnim, {
      toValue: 1, useNativeDriver: true, tension: 60, friction: 8,
    }).start();
  }

  // ── 닫기 ──
  function handleClose() {
    stopAll();
    resetAll();
    onClose();
  }

  // ─── 렌더 ────────────────────────────────────────────────────

  const bossHpPct  = (bossHp / BOSS_MAX_HP) * 100;
  const timerColor = timeLeft <= 10 ? COLORS.bad : timeLeft <= 20 ? COLORS.warn : COLORS.primary;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={s.overlay}>
        {/* 배경 탭 = 닫기 (ready 상태에서만) */}
        {phase === 'ready' && (
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        )}

        <Animated.View style={[s.container, {
          transform: [{ scale: introAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          opacity: introAnim,
        }]}>
          {/* ── 상단 바: 보스 이름 + 타이머 ── */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={s.gameTitle}>⚔️  보스 격파</Text>
            {phase === 'playing' ? (
              <View style={s.timerBox}>
                <Text style={[s.timerNum, { color: timerColor }]}>{timeLeft}</Text>
                <Text style={s.timerSec}>초</Text>
              </View>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>

          {/* 타이머 바 */}
          {phase === 'playing' && (
            <Animated.View style={[s.timerBar, {
              width: timerBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: timerColor,
            }]} />
          )}

          {/* ── 보스 섹션 ── */}
          <Animated.View style={[s.bossSection, { transform: [{ translateX: bossShakeAnim }] }]}>
            <View style={s.bossRow}>
              <Text style={s.bossEmoji}>{boss.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.bossName, { color: boss.color }]}>{boss.name}</Text>
                <View style={s.bossHpRow}>
                  <View style={s.bossHpTrack}>
                    <View style={[s.bossHpFill, {
                      width: `${bossHpPct}%`,
                      backgroundColor: bossHpPct > 50 ? COLORS.good : bossHpPct > 25 ? COLORS.warn : COLORS.bad,
                    }]} />
                  </View>
                  <Text style={s.bossHpNum}>{bossHp}</Text>
                </View>
              </View>
              {/* 내 실드 */}
              <View style={s.shieldGroup}>
                {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
                  <Text key={i} style={{ fontSize: 16, opacity: i < shields ? 1 : 0.2 }}>🛡️</Text>
                ))}
              </View>
            </View>

            {/* 데미지 + 콤보 */}
            <View style={s.statsRow}>
              <View>
                <Text style={s.statsLabel}>누적 데미지</Text>
                <Text style={[s.statsVal, { color: COLORS.amber }]}>{dmgDealt}</Text>
              </View>
              <Animated.View style={[s.comboBox, {
                transform: [{ scale: comboScaleAnim }],
                opacity: combo >= 2 ? 1 : 0.3,
              }]}>
                <Text style={s.comboLabel}>COMBO</Text>
                <Text style={[s.comboVal, {
                  color: combo >= 10 ? COLORS.amber : combo >= 5 ? '#A78BFA' : COLORS.primary,
                }]}>{combo}x</Text>
              </Animated.View>
            </View>
          </Animated.View>

          {/* ── 게임 영역 (오브 레이어) ── */}
          <View style={s.gameArea} pointerEvents={phase === 'playing' ? 'box-none' : 'none'}>
            {phase === 'ready' && (
              <View style={s.readyOverlay}>
                <Text style={s.readyEmoji}>{boss.emoji}</Text>
                <Text style={s.readyTitle}>보스를 격파하라!</Text>
                <Text style={s.readySub}>
                  오브를 탭해서 데미지를 입혀요{'\n'}
                  콤보로 배율 ×1.25 / ×1.5 / ×2.0{'\n'}
                  실드 {MAX_SHIELDS}개 소진 전에 격파하면 보너스!
                </Text>
                <TouchableOpacity style={s.startBtn} onPress={startGame} activeOpacity={0.85}>
                  <Text style={s.startBtnTxt}>전투 시작!</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 오브들 */}
            {orbs.map(orb => (
              <OrbView key={orb.id} orb={orb} onTap={() => tapOrb(orb)} />
            ))}

            {/* 떠오르는 데미지 텍스트 */}
            {lastDmgText && (
              <FloatDmgText key={lastDmgText.key} value={lastDmgText.val} />
            )}
          </View>

          {/* ── 결과 화면 ── */}
          {phase === 'result' && (
            <Animated.View style={[s.resultOverlay, {
              transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
              opacity: resultAnim,
            }]}>
              <Text style={s.resultEmoji}>
                {bossHp <= 0 ? '🎉' : shields > 0 ? '⚔️' : '💀'}
              </Text>
              <Text style={[s.resultTitle, {
                color: bossHp <= 0 ? COLORS.amber : shields > 0 ? COLORS.primary : COLORS.bad,
              }]}>
                {bossHp <= 0 ? '보스 격파!' : shields > 0 ? '시간 종료' : '전투 패배'}
              </Text>

              <View style={s.resultStats}>
                <ResultRow icon="flash"   label="총 데미지"  val={`${dmgDealt}`}  color={COLORS.amber} />
                <ResultRow icon="repeat"  label="최대 콤보"  val={`${maxCombo}x`} color={COLORS.primary} />
                <ResultRow icon="shield"  label="남은 실드"  val={`${shields} / ${MAX_SHIELDS}`} color={COLORS.good} />
                <View style={s.resultDivider} />
                <ResultRow icon="logo-bitcoin" label="획득 골드" val={`🪙 ${earnedGold} G`} color={COLORS.amber} big />
              </View>

              <TouchableOpacity style={s.resultCloseBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={s.resultCloseTxt}>확인</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── 오브 서브컴포넌트 ────────────────────────────────────────
function OrbView({ orb, onTap }: { orb: OrbData; onTap: () => void }) {
  const cfg = ORB_CFG[orb.type];
  return (
    <Animated.View
      style={[
        s.orbWrap,
        {
          left: orb.x - orb.size / 2,
          top: orb.y - AREA_TOP - orb.size / 2,
          width: orb.size,
          height: orb.size,
          transform: [
            { scale: Animated.multiply(orb.scale, orb.pulse) },
          ],
          opacity: orb.opacity,
        },
      ]}
    >
      <TouchableWithoutFeedback onPress={onTap}>
        <View style={[s.orbBody, {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color + '22',
          borderColor: orb.color,
          shadowColor: orb.color,
        }]}>
          {/* 내부 광원 */}
          <View style={[s.orbInner, {
            width: orb.size * 0.55,
            height: orb.size * 0.55,
            borderRadius: orb.size * 0.275,
            backgroundColor: orb.color + '55',
          }]} />
          {/* 반짝이 */}
          <View style={[s.orbShine, {
            width: orb.size * 0.22,
            height: orb.size * 0.22,
            borderRadius: orb.size * 0.11,
            top: orb.size * 0.14,
            left: orb.size * 0.18,
          }]} />
          {orb.type !== 'normal' && (
            <Text style={[s.orbLabel, { color: orb.color, fontSize: orb.type === 'legendary' ? 9 : 8 }]}>
              {cfg.label}
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

// ─── 떠오르는 데미지 텍스트 ───────────────────────────────────
function FloatDmgText({ value }: { value: number }) {
  const yAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(1)).current;
  const color = value >= 50 ? COLORS.amber : value >= 25 ? '#A78BFA' : COLORS.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(yAnim,  { toValue: -60, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text style={[s.floatDmg, {
      color, transform: [{ translateY: yAnim }], opacity: opAnim,
    }]}>
      -{value}
    </Animated.Text>
  );
}

// ─── 결과 행 ─────────────────────────────────────────────────
function ResultRow({ icon, label, val, color, big }: {
  icon: string; label: string; val: string; color: string; big?: boolean;
}) {
  return (
    <View style={s.resultRow}>
      <Ionicons name={icon as any} size={big ? 16 : 14} color={color} />
      <Text style={[s.resultLabel, big && { fontSize: FONTS.sm, color: COLORS.text }]}>{label}</Text>
      <Text style={[s.resultVal, { color }, big && { fontSize: FONTS.lg, fontWeight: '900' }]}>{val}</Text>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,3,8,0.92)',
    justifyContent: 'flex-end',
  },
  container: {
    height: SH * 0.94,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: { padding: 4 },
  gameTitle: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  timerBox: { flexDirection: 'row', alignItems: 'baseline', minWidth: 48, justifyContent: 'flex-end' },
  timerNum: { fontSize: FONTS.lg, fontWeight: '900', fontFamily: 'monospace' },
  timerSec: { fontSize: FONTS.xxs, color: COLORS.textMuted, marginLeft: 2 },
  timerBar: {
    height: 3,
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
  },

  bossSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bossRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  bossEmoji: { fontSize: 36 },
  bossName: { fontSize: FONTS.md, fontWeight: '800', marginBottom: 4 },
  bossHpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bossHpTrack: {
    flex: 1, height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  bossHpFill: { height: '100%', borderRadius: RADIUS.full },
  bossHpNum: { fontSize: FONTS.xs, fontFamily: 'monospace', fontWeight: '700', color: COLORS.textSub, minWidth: 36, textAlign: 'right' },
  shieldGroup: { flexDirection: 'row', gap: 2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  statsVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  comboBox: { alignItems: 'flex-end' },
  comboLabel: { fontSize: 9, letterSpacing: 1.5, color: COLORS.textDisabled, fontFamily: 'monospace' },
  comboVal: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace' },

  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(7,9,18,0.95)',
  },

  readyOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  readyEmoji: { fontSize: 60, marginBottom: SPACING.xs },
  readyTitle: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  readySub: {
    fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 20, marginTop: 4, marginBottom: SPACING.md,
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: SPACING.sm,
  },
  startBtnTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#000' },

  orbWrap: {
    position: 'absolute',
  },
  orbBody: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  orbInner: { position: 'absolute' },
  orbShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  orbLabel: {
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: 0.5,
    position: 'absolute',
    bottom: 7,
  },

  floatDmg: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    fontSize: FONTS.xxl,
    fontWeight: '900',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(7,9,18,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: FONTS.xxl, fontWeight: '900', marginBottom: SPACING.sm },
  resultStats: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultLabel: { flex: 1, fontSize: FONTS.xs, color: COLORS.textSub },
  resultVal: { fontSize: FONTS.sm, fontWeight: '800', fontFamily: 'monospace' },
  resultDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  resultCloseBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  resultCloseTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#000' },
});
