import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { addGold } from '../utils/gacha';
import { addXP } from '../utils/storage';
import { BOSS_DEFS, WeeklyBossState } from '../utils/weeklyBoss';

const { width: SW } = Dimensions.get('window');

// ─── 상수 ────────────────────────────────────────────────────
const GAME_SEC    = 30;
const BOSS_MAX_HP = 600;
const MAX_SHIELDS = 3;

type OrbType        = 'normal' | 'rare' | 'legendary';
type GamePhase      = 'ready' | 'playing' | 'result';
type FallingItemType = 'power' | 'time' | 'bomb';

const ORB_CFG: Record<OrbType, {
  color: string; inner: string; size: number;
  damage: number; weight: number; lifetimeMs: number;
}> = {
  normal:    { color: COLORS.primary, inner: 'rgba(34,211,238,0.4)',  size: 54, damage: 12, weight: 62, lifetimeMs: 3800 },
  rare:      { color: '#A78BFA',      inner: 'rgba(167,139,250,0.4)', size: 64, damage: 28, weight: 27, lifetimeMs: 3100 },
  legendary: { color: COLORS.amber,   inner: 'rgba(245,158,11,0.45)', size: 76, damage: 52, weight: 11, lifetimeMs: 2500 },
};

// ─── 콤보 배율 계산 ──────────────────────────────────────────
function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 3.0;
  if (combo >= 5)  return 2.0;
  if (combo >= 3)  return 1.5;
  return 1.0;
}

interface OrbData {
  id: string;
  x: number;
  y: number;
  type: OrbType;
  damage: number;
  size: number;
  color: string;
  inner: string;
  scale:   Animated.Value;
  opacity: Animated.Value;
  pulse:   Animated.Value;
}

interface FallingItem {
  id: string;
  type: FallingItemType;
  x: number;
  y: Animated.Value;
  opacity: Animated.Value;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  bossState: WeeklyBossState | null;
  addXpFn?: (xp: number) => Promise<any>;
  onGoldEarned?: (gold: number) => void;
}

// ─── 오브 생성 (게임영역 크기 기준) ─────────────────────────
function makeOrb(areaW: number, areaH: number): OrbData {
  const weights = Object.entries(ORB_CFG) as [OrbType, typeof ORB_CFG.normal][];
  const total = weights.reduce((s, [, c]) => s + c.weight, 0);
  let roll = Math.random() * total;
  let type: OrbType = 'normal';
  for (const [t, c] of weights) { roll -= c.weight; if (roll <= 0) { type = t; break; } }
  const cfg    = ORB_CFG[type];
  const margin = cfg.size / 2 + 8;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x:  margin + Math.random() * (areaW - margin * 2),
    y:  margin + Math.random() * (areaH - margin * 2),
    type, damage: cfg.damage, size: cfg.size, color: cfg.color, inner: cfg.inner,
    scale:   new Animated.Value(0),
    opacity: new Animated.Value(1),
    pulse:   new Animated.Value(1),
  };
}

// ─── 낙하 아이템 생성 ────────────────────────────────────────
const FALLING_CFG: Record<FallingItemType, { emoji: string; color: string; label: string }> = {
  power: { emoji: '⚡', color: '#F59E0B', label: 'POWER UP' },
  time:  { emoji: '⏱', color: '#22D3EE', label: '+5 SEC'   },
  bomb:  { emoji: '💣', color: '#EF4444', label: 'DANGER!'  },
};

function makeFallingItem(areaW: number): FallingItem {
  const types: FallingItemType[] = ['power', 'time', 'bomb'];
  const type = types[Math.floor(Math.random() * types.length)];
  const itemSize = 50;
  const margin = itemSize / 2 + 10;
  return {
    id: `fi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    x: margin + Math.random() * (areaW - margin * 2),
    y: new Animated.Value(-60),
    opacity: new Animated.Value(1),
  };
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function MiniGameModal({ visible, onClose, bossState, addXpFn, onGoldEarned }: Props) {
  const boss = bossState ? (BOSS_DEFS[bossState.bossId] ?? BOSS_DEFS[0]) : BOSS_DEFS[0];

  // 게임 영역 크기 (onLayout 측정)
  const areaSizeRef = useRef({ w: SW, h: 320 });

  // ── 렌더 상태 ──
  const [phase,         setPhase]         = useState<GamePhase>('ready');
  const [timeLeft,      setTimeLeft]       = useState(GAME_SEC);
  const [orbs,          setOrbs]           = useState<OrbData[]>([]);
  const [dmgDealt,      setDmgDealt]       = useState(0);
  const [combo,         setCombo]          = useState(0);
  const [maxCombo,      setMaxCombo]       = useState(0);
  const [shields,       setShields]        = useState(MAX_SHIELDS);
  const [bossHp,        setBossHp]         = useState(BOSS_MAX_HP);
  const [earnedGold,    setEarnedGold]     = useState(0);
  const [earnedXp,      setEarnedXp]       = useState(0);
  const [flashKey,      setFlashKey]       = useState(0);
  const [dmgPops,       setDmgPops]        = useState<{ id: number; val: number; x: number; y: number }[]>([]);
  const [fallingItems,  setFallingItems]   = useState<FallingItem[]>([]);
  const [powerupActive, setPowerupActive]  = useState(false);
  const [comboMessage,  setComboMessage]   = useState<string | null>(null);

  // powerup 만료 ref
  const powerupUntilRef = useRef<number>(0);
  const powerupActiveRef = useRef(false);

  // ── 애니메이션 ──
  const containerAnim  = useRef(new Animated.Value(0)).current;
  const bossShake      = useRef(new Animated.Value(0)).current;
  const comboScale     = useRef(new Animated.Value(1)).current;
  const screenFlash    = useRef(new Animated.Value(0)).current;
  const timerBarAnim   = useRef(new Animated.Value(1)).current;
  const resultAnim     = useRef(new Animated.Value(0)).current;
  const bossRageAnim   = useRef(new Animated.Value(0)).current;
  const shakeAnim      = useRef(new Animated.Value(0)).current;
  const hitFlashAnim   = useRef(new Animated.Value(0)).current;  // 피격 플래시 (HP바 위)
  const comboMsgY      = useRef(new Animated.Value(0)).current;
  const comboMsgOpacity = useRef(new Animated.Value(0)).current;

  // ── ref 기반 게임 상태 (stale closure 방지) ──
  const phaseRef   = useRef<GamePhase>('ready');
  const dmgRef     = useRef(0);
  const comboRef   = useRef(0);
  const shieldRef  = useRef(MAX_SHIELDS);
  const bossHpRef  = useRef(BOSS_MAX_HP);
  const endingRef  = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();
  const spawnRef   = useRef<ReturnType<typeof setTimeout>>();
  const fallingSpawnRef = useRef<ReturnType<typeof setTimeout>>();
  const expiryMap  = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const timeLeftRef = useRef(GAME_SEC);

  // ── 보스 rage 루프 (HP 30% 이하) ──
  useEffect(() => {
    const pct = bossHp / BOSS_MAX_HP;
    if (pct < 0.3 && phase === 'playing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bossRageAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(bossRageAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      bossRageAnim.stopAnimation();
      bossRageAnim.setValue(0);
    }
  }, [bossHp, phase]);

  useEffect(() => {
    if (visible) {
      resetAll();
      Animated.spring(containerAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }).start();
    } else {
      stopAll();
      containerAnim.setValue(0);
    }
  }, [visible]);

  // ── 게임 로직 ────────────────────────────────────────────
  function stopAll() {
    clearInterval(timerRef.current);
    clearTimeout(spawnRef.current);
    clearTimeout(fallingSpawnRef.current);
    expiryMap.current.forEach(t => clearTimeout(t));
    expiryMap.current.clear();
  }

  function resetAll() {
    stopAll();
    phaseRef.current    = 'ready';
    dmgRef.current      = 0;
    comboRef.current    = 0;
    shieldRef.current   = MAX_SHIELDS;
    bossHpRef.current   = BOSS_MAX_HP;
    endingRef.current   = false;
    powerupActiveRef.current = false;
    powerupUntilRef.current  = 0;
    timeLeftRef.current = GAME_SEC;
    setPhase('ready');
    setTimeLeft(GAME_SEC);
    setOrbs([]);
    setDmgDealt(0);
    setCombo(0);
    setMaxCombo(0);
    setShields(MAX_SHIELDS);
    setBossHp(BOSS_MAX_HP);
    setEarnedGold(0);
    setEarnedXp(0);
    setDmgPops([]);
    setFallingItems([]);
    setPowerupActive(false);
    setComboMessage(null);
    timerBarAnim.setValue(1);
    bossShake.setValue(0);
    comboScale.setValue(1);
    screenFlash.setValue(0);
    resultAnim.setValue(0);
    shakeAnim.setValue(0);
    hitFlashAnim.setValue(0);
    comboMsgY.setValue(0);
    comboMsgOpacity.setValue(0);
  }

  function startGame() {
    phaseRef.current = 'playing';
    setPhase('playing');

    Animated.timing(timerBarAnim, {
      toValue: 0, duration: GAME_SEC * 1000, useNativeDriver: false,
    }).start();

    let t = GAME_SEC;
    timerRef.current = setInterval(() => {
      t--;
      timeLeftRef.current = t;
      setTimeLeft(t);
      // powerup 만료 체크
      if (powerupActiveRef.current && Date.now() >= powerupUntilRef.current) {
        powerupActiveRef.current = false;
        setPowerupActive(false);
      }
      if (t <= 0) { clearInterval(timerRef.current); triggerEnd(); }
    }, 1000);

    // 즉시 첫 오브 스폰
    doSpawn();
    scheduleNext();
    // 낙하 아이템 스케줄
    scheduleFallingItem();
  }

  function scheduleNext() {
    if (phaseRef.current !== 'playing') return;
    const delay = 800 + Math.random() * 700;
    spawnRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      doSpawn();
      scheduleNext();
    }, delay);
  }

  // ── 낙하 아이템 스케줄 ──────────────────────────────────
  function scheduleFallingItem() {
    if (phaseRef.current !== 'playing') return;
    const delay = (5000 + Math.random() * 3000); // 5~8초
    fallingSpawnRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      doSpawnFallingItem();
      scheduleFallingItem();
    }, delay);
  }

  function doSpawnFallingItem() {
    const { w, h } = areaSizeRef.current;
    const item = makeFallingItem(w);

    // 3초에 걸쳐 하강
    Animated.timing(item.y, {
      toValue: h + 80,
      duration: 3000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        // 화면 하단 도달 시 자동 소멸 (bomb 포함 모두 제거)
        setFallingItems(prev => prev.filter(fi => fi.id !== item.id));
      }
    });

    setFallingItems(prev => [...prev, item]);
  }

  function tapFallingItem(item: FallingItem) {
    if (phaseRef.current !== 'playing') return;

    // 아이템 즉시 제거
    item.y.stopAnimation();
    Animated.timing(item.opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setFallingItems(prev => prev.filter(fi => fi.id !== item.id));

    if (item.type === 'power') {
      // 10초간 데미지 ×2
      powerupActiveRef.current = true;
      powerupUntilRef.current  = Date.now() + 10000;
      setPowerupActive(true);
    } else if (item.type === 'time') {
      // +5초 추가
      timeLeftRef.current = timeLeftRef.current + 5;
      setTimeLeft(prev => prev + 5);
    } else if (item.type === 'bomb') {
      // 데미지 -30 (획득 손해)
      const penalty = 30;
      dmgRef.current    = Math.max(0, dmgRef.current - penalty);
      bossHpRef.current = Math.min(BOSS_MAX_HP, bossHpRef.current + penalty);
      setDmgDealt(dmgRef.current);
      setBossHp(bossHpRef.current);
      // 폭탄 피격 플래시
      Animated.sequence([
        Animated.timing(screenFlash, { toValue: 0.5, duration: 80, useNativeDriver: true }),
        Animated.timing(screenFlash, { toValue: 0,   duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }

  function doSpawn() {
    const { w, h } = areaSizeRef.current;
    const orb = makeOrb(w, h);
    const cfg  = ORB_CFG[orb.type];

    Animated.spring(orb.scale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 5 }).start();
    Animated.timing(orb.opacity, { toValue: 0.12, duration: cfg.lifetimeMs, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb.pulse, { toValue: 1.14, duration: 520, useNativeDriver: true }),
        Animated.timing(orb.pulse, { toValue: 0.87, duration: 520, useNativeDriver: true }),
      ])
    ).start();

    setOrbs(prev => [...prev, orb]);

    const expiry = setTimeout(() => {
      expiryMap.current.delete(orb.id);
      if (phaseRef.current !== 'playing') return;
      shieldRef.current = Math.max(0, shieldRef.current - 1);
      setShields(shieldRef.current);
      comboRef.current = 0;
      setCombo(0);
      // 화면 붉은 플래시 (실드 소모)
      Animated.sequence([
        Animated.timing(screenFlash, { toValue: 0.4, duration: 80, useNativeDriver: true }),
        Animated.timing(screenFlash, { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]).start();
      setOrbs(prev => prev.filter(o => o.id !== orb.id));
    }, cfg.lifetimeMs);

    expiryMap.current.set(orb.id, expiry);
  }

  // ── 화면 흔들기 ─────────────────────────────────────────
  function triggerScreenShake() {
    const seq: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < 4; i++) {
      const dx = (Math.random() - 0.5) * 12; // ±6px
      seq.push(Animated.timing(shakeAnim, { toValue: dx, duration: 40, useNativeDriver: true }));
    }
    seq.push(Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }));
    Animated.sequence(seq).start();
  }

  // ── 콤보 메시지 팝업 ─────────────────────────────────────
  function showComboMessage(msg: string) {
    setComboMessage(msg);
    comboMsgY.setValue(0);
    comboMsgOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(comboMsgY,      { toValue: -60, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(comboMsgOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => setComboMessage(null));
  }

  function tapOrb(orb: OrbData) {
    if (phaseRef.current !== 'playing') return;

    const timer = expiryMap.current.get(orb.id);
    if (timer) { clearTimeout(timer); expiryMap.current.delete(orb.id); }

    comboRef.current++;
    const c = comboRef.current;
    setCombo(c);
    setMaxCombo(prev => Math.max(prev, c));

    const comboMult = getComboMultiplier(c);
    const powerMult = powerupActiveRef.current ? 2.0 : 1.0;
    const dmg  = Math.round(orb.damage * comboMult * powerMult);

    dmgRef.current    += dmg;
    bossHpRef.current  = Math.max(0, bossHpRef.current - dmg);
    setDmgDealt(dmgRef.current);
    setBossHp(bossHpRef.current);

    // 데미지 팝업 (오브 위치 기준)
    const popId = Date.now() + Math.random();
    setDmgPops(prev => [...prev, { id: popId, val: dmg, x: orb.x, y: orb.y }]);
    setTimeout(() => setDmgPops(prev => prev.filter(p => p.id !== popId)), 900);

    // 보스 흔들기
    Animated.sequence([
      Animated.timing(bossShake, { toValue: 10,  duration: 35, useNativeDriver: true }),
      Animated.timing(bossShake, { toValue: -10, duration: 35, useNativeDriver: true }),
      Animated.timing(bossShake, { toValue: 5,   duration: 25, useNativeDriver: true }),
      Animated.timing(bossShake, { toValue: 0,   duration: 25, useNativeDriver: true }),
    ]).start();

    // 콤보 팝
    if (c >= 3) {
      Animated.sequence([
        Animated.spring(comboScale, { toValue: 1.4, useNativeDriver: true, tension: 500 }),
        Animated.timing(comboScale,  { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();
    }

    // 콤보 메시지
    if (c === 5) {
      showComboMessage('NICE!');
    } else if (c === 10) {
      showComboMessage('AMAZING!');
    }

    // 화면 플래시 (타격)
    const flashColor = orb.type === 'legendary' ? 0.25 : orb.type === 'rare' ? 0.12 : 0.06;
    setFlashKey(k => k + 1);
    Animated.sequence([
      Animated.timing(screenFlash, { toValue: flashColor, duration: 50, useNativeDriver: true }),
      Animated.timing(screenFlash, { toValue: 0,          duration: 180, useNativeDriver: true }),
    ]).start();

    // 피격 플래시 (HP바 위 빨간 오버레이)
    Animated.sequence([
      Animated.timing(hitFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
      Animated.timing(hitFlashAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    // 화면 흔들기 (보스 HP 50% 이하)
    if (bossHpRef.current <= BOSS_MAX_HP * 0.5) {
      triggerScreenShake();
    }

    // 오브 제거 애니
    Animated.parallel([
      Animated.spring(orb.scale, { toValue: 1.6, useNativeDriver: true, tension: 600, friction: 4 }),
      Animated.timing(orb.opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => setOrbs(prev => prev.filter(o => o.id !== orb.id)));

    if (bossHpRef.current <= 0) triggerEnd(true);
  }

  // ── 빈 화면 탭 → 콤보 리셋 ─────────────────────────────
  function handleGameAreaTap() {
    if (phaseRef.current !== 'playing') return;
    if (comboRef.current > 0) {
      comboRef.current = 0;
      setCombo(0);
    }
  }

  function triggerEnd(bossKilled = false) {
    if (endingRef.current) return;
    endingRef.current = true;
    phaseRef.current = 'result';
    stopAll();
    setOrbs([]);
    setFallingItems([]);
    setPhase('result');

    const perfect = shieldRef.current === MAX_SHIELDS;
    const gold = Math.floor(dmgRef.current / 6) + (bossKilled ? 100 : 0) + (perfect ? 40 : 0);
    const xp   = Math.floor(dmgRef.current / 4) + (bossKilled ? 150 : 30);

    setEarnedGold(gold);
    setEarnedXp(xp);
    addGold(gold);
    (addXpFn ?? addXP)(xp);
    onGoldEarned?.(gold);

    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }).start();
  }

  function handleClose() { stopAll(); resetAll(); onClose(); }

  function onGameAreaLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    areaSizeRef.current = { w: width, h: height };
  }

  // ─── 파생값 ─────────────────────────────────────────────
  const hpPct       = bossHp / BOSS_MAX_HP;
  const hpColor     = hpPct > 0.5 ? COLORS.good : hpPct > 0.25 ? COLORS.warn : COLORS.bad;
  const timerColor  = timeLeft <= 10 ? COLORS.bad : timeLeft <= 20 ? COLORS.warn : COLORS.primary;
  const isRage      = hpPct < 0.3 && phase === 'playing';
  const comboMult   = getComboMultiplier(combo);
  const showComboIndicator = combo >= 3;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={s.overlay}>
        {/* 전체 게임 View를 Animated.View로 감싸 화면 흔들기 적용 */}
        <Animated.View style={[s.container, {
          transform: [
            { translateY: containerAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) },
            { translateX: shakeAnim },
          ],
          opacity: containerAnim,
        }]}>

          {/* ── 헤더 ── */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 16, left: 16, bottom: 16, right: 16 }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>⚔️  보스 격파</Text>
              {phase === 'playing' && (
                <View style={[s.timerPill, { borderColor: timerColor + '60', backgroundColor: timerColor + '14' }]}>
                  <Text style={[s.timerNum, { color: timerColor }]}>{timeLeft}</Text>
                  <Text style={[s.timerSec, { color: timerColor }]}>초</Text>
                </View>
              )}
              {/* 파워업 활성 표시 */}
              {powerupActive && phase === 'playing' && (
                <View style={s.powerupPill}>
                  <Text style={s.powerupPillTxt}>⚡ ×2</Text>
                </View>
              )}
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* 타이머 진행 바 */}
          <View style={s.timerTrack}>
            <Animated.View style={[s.timerFill, {
              width: timerBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: timerColor,
            }]} />
          </View>

          {/* ── 콤보 인디케이터 (상단) ── */}
          {phase === 'playing' && (
            <Animated.View style={[s.comboIndicator, {
              opacity: showComboIndicator ? 1 : 0,
              transform: [{ scale: comboScale }],
            }]}>
              <Text style={[s.comboIndicatorText, {
                color:      combo >= 10 ? COLORS.amber : '#A78BFA',
                textShadowColor: combo >= 10 ? COLORS.amber + '80' : '#A78BFA80',
              }]}>
                COMBO ×{comboMult.toFixed(1)}
              </Text>
            </Animated.View>
          )}

          {/* ── 보스 패널 ── */}
          <Animated.View style={[s.bossPanel, {
            transform: [{ translateX: bossShake }],
            backgroundColor: isRage
              ? bossRageAnim.interpolate({ inputRange: [0, 1], outputRange: [COLORS.bgCard, boss.color + '18'] })
              : COLORS.bgCard,
          }]}>
            <View style={[s.bossPanelBg, { backgroundColor: boss.color + '08' }]} />
            <View style={s.bossRow}>
              {/* 보스 이모지 */}
              <Animated.Text style={[s.bossEmoji, isRage && {
                transform: [{ scale: bossRageAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
              }]}>{boss.emoji}</Animated.Text>

              <View style={{ flex: 1 }}>
                <View style={s.bossNameRow}>
                  <Text style={[s.bossName, { color: boss.color }]}>{boss.name}</Text>
                  {isRage && <View style={s.ragePill}><Text style={s.rageTxt}>분노!</Text></View>}
                </View>
                {/* HP 바 + 피격 플래시 오버레이 */}
                <View style={s.hpBarRow}>
                  <View style={s.hpTrack}>
                    <Animated.View style={[s.hpFill, { width: `${hpPct * 100}%`, backgroundColor: hpColor }]} />
                    {/* 피격 플래시: 반투명 빨간 오버레이 */}
                    <Animated.View
                      style={[StyleSheet.absoluteFill, s.hpHitFlash, { opacity: hitFlashAnim }]}
                      pointerEvents="none"
                    />
                  </View>
                  <Text style={[s.hpNum, { color: hpColor }]}>{bossHp}</Text>
                </View>
              </View>

              {/* 실드 */}
              <View style={s.shieldCol}>
                <Text style={s.shieldLabel}>SHIELD</Text>
                <View style={s.shieldRow}>
                  {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
                    <View key={i} style={[s.shieldDot, { opacity: i < shields ? 1 : 0.2, backgroundColor: i < shields ? COLORS.primary : COLORS.textDisabled }]} />
                  ))}
                </View>
              </View>
            </View>

            {/* 데미지 + 콤보 */}
            <View style={s.statRow}>
              <View style={s.dmgBox}>
                <Text style={s.statLabel}>DAMAGE</Text>
                <Text style={[s.dmgVal, { color: COLORS.amber }]}>{dmgDealt.toLocaleString()}</Text>
              </View>
              <Animated.View style={[s.comboBox, {
                transform: [{ scale: comboScale }],
                opacity: combo >= 2 ? 1 : 0.25,
                borderColor: combo >= 10 ? COLORS.amber + '80' : combo >= 5 ? '#A78BFA80' : COLORS.primary + '50',
                backgroundColor: combo >= 10 ? COLORS.amberGlow : combo >= 5 ? 'rgba(167,139,250,0.10)' : COLORS.primaryGlow,
              }]}>
                <Text style={[s.comboXNum, {
                  color: combo >= 10 ? COLORS.amber : combo >= 5 ? '#A78BFA' : COLORS.primary,
                }]}>{combo}<Text style={s.comboX}>×</Text></Text>
                <Text style={s.comboLabel}>COMBO</Text>
              </Animated.View>
            </View>
          </Animated.View>

          {/* ── 게임 영역 ── */}
          <TouchableWithoutFeedback onPress={handleGameAreaTap}>
            <View style={s.gameArea} onLayout={onGameAreaLayout}>

              {/* ready 오버레이 */}
              {phase === 'ready' && (
                <View style={s.readyOverlay}>
                  <Text style={s.readyBossEmoji}>{boss.emoji}</Text>
                  <Text style={[s.readyTitle, { color: boss.color }]}>도전!</Text>
                  <Text style={s.readyBossName}>{boss.name}</Text>
                  <View style={s.readyRules}>
                    <RuleRow icon="radio-button-on" color={COLORS.primary}  text="오브를 탭해 데미지 입히기" />
                    <RuleRow icon="trending-up"     color={COLORS.amber}    text="콤보 연결로 배율 최대 ×3.0" />
                    <RuleRow icon="shield"          color={COLORS.good}     text="실드 소진 전 격파 = 보너스" />
                    <RuleRow icon="star"            color="#A78BFA"         text="전설 오브 = 52 데미지!" />
                  </View>
                  <TouchableOpacity style={[s.startBtn, { backgroundColor: boss.color }]} onPress={startGame} activeOpacity={0.85}>
                    <Text style={s.startBtnTxt}>전투 시작</Text>
                    <Ionicons name="flash" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* 오브 */}
              {orbs.map(orb => (
                <OrbView key={orb.id} orb={orb} onTap={() => tapOrb(orb)} />
              ))}

              {/* 낙하 아이템 */}
              {fallingItems.map(item => (
                <FallingItemView key={item.id} item={item} onTap={() => tapFallingItem(item)} />
              ))}

              {/* 데미지 팝업 */}
              {dmgPops.map(p => (
                <DmgPop key={p.id} value={p.val} x={p.x} y={p.y} />
              ))}

              {/* 콤보 메시지 팝업 */}
              {comboMessage !== null && (
                <Animated.Text style={[s.comboMsgText, {
                  transform: [{ translateY: comboMsgY }],
                  opacity: comboMsgOpacity,
                  color: combo >= 10 ? COLORS.amber : '#A78BFA',
                  textShadowColor: combo >= 10 ? COLORS.amber + '80' : '#A78BFA80',
                }]}>
                  {comboMessage}
                </Animated.Text>
              )}

              {/* 화면 플래시 */}
              <Animated.View
                key={flashKey}
                style={[StyleSheet.absoluteFill, s.screenFlash, { opacity: screenFlash }]}
                pointerEvents="none"
              />
            </View>
          </TouchableWithoutFeedback>

          {/* ── 결과 오버레이 ── */}
          {phase === 'result' && (
            <Animated.View style={[s.resultOverlay, {
              opacity: resultAnim,
              transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            }]}>
              <View style={s.resultContent}>
                <Text style={s.resultEmoji}>{bossHp <= 0 ? '🏆' : shields > 0 ? '⚔️' : '💀'}</Text>
                <Text style={[s.resultTitle, { color: bossHp <= 0 ? COLORS.amber : shields > 0 ? COLORS.primary : COLORS.bad }]}>
                  {bossHp <= 0 ? '보스 격파 성공!' : shields > 0 ? '시간 종료' : '전투 패배'}
                </Text>

                <View style={s.resultCards}>
                  <ResultCard label="총 데미지"  val={dmgDealt.toLocaleString()} color={COLORS.amber}   icon="flash-outline" />
                  <ResultCard label="최대 콤보"  val={`${maxCombo}×`}            color={COLORS.primary}  icon="repeat-outline" />
                  <ResultCard label="남은 실드"  val={`${shields} / ${MAX_SHIELDS}`} color={COLORS.good} icon="shield-outline" />
                </View>

                <View style={s.rewardPanel}>
                  <Text style={s.rewardTitle}>획득 보상</Text>
                  <View style={s.rewardRow}>
                    <View style={s.rewardItem}>
                      <Text style={s.rewardEmoji}>🪙</Text>
                      <Text style={s.rewardVal}>{earnedGold} G</Text>
                    </View>
                    <View style={s.rewardDivider} />
                    <View style={s.rewardItem}>
                      <Text style={s.rewardEmoji}>✨</Text>
                      <Text style={s.rewardVal}>{earnedXp} XP</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={s.closeResultBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={s.closeResultTxt}>확인</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── 오브 ─────────────────────────────────────────────────────
function OrbView({ orb, onTap }: { orb: OrbData; onTap: () => void }) {
  return (
    <Animated.View style={[s.orb, {
      left: orb.x - orb.size / 2,
      top:  orb.y - orb.size / 2,
      width:  orb.size,
      height: orb.size,
      borderRadius: orb.size / 2,
      transform: [{ scale: Animated.multiply(orb.scale, orb.pulse) }],
      opacity: orb.opacity,
      borderColor: orb.color,
      backgroundColor: orb.inner,
      shadowColor: orb.color,
    }]}>
      <TouchableWithoutFeedback onPress={onTap}>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', borderRadius: orb.size / 2 }]}>
          {/* 반짝이 */}
          <View style={[s.orbShine, { width: orb.size * 0.22, height: orb.size * 0.22, borderRadius: orb.size * 0.11 }]} />
          {/* 중앙 코어 */}
          <View style={[s.orbCore, {
            width: orb.size * 0.38, height: orb.size * 0.38, borderRadius: orb.size * 0.19,
            backgroundColor: orb.color + '70',
          }]} />
          {orb.type !== 'normal' && (
            <Text style={[s.orbTypeLabel, { color: orb.color, bottom: orb.size * 0.1 }]}>
              {orb.type === 'legendary' ? '전설' : '희귀'}
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

// ─── 낙하 아이템 뷰 ─────────────────────────────────────────
function FallingItemView({ item, onTap }: { item: FallingItem; onTap: () => void }) {
  const cfg = FALLING_CFG[item.type];
  return (
    <Animated.View style={[s.fallingItem, {
      left: item.x - 25,
      transform: [{ translateY: item.y }],
      opacity: item.opacity,
      borderColor: cfg.color + '90',
      backgroundColor: cfg.color + '22',
      shadowColor: cfg.color,
    }]}>
      <TouchableWithoutFeedback onPress={onTap}>
        <View style={s.fallingItemInner}>
          <Text style={s.fallingItemEmoji}>{cfg.emoji}</Text>
          <Text style={[s.fallingItemLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

// ─── 데미지 팝업 ─────────────────────────────────────────────
function DmgPop({ value, x, y }: { value: number; x: number; y: number }) {
  const upAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(upAnim, { toValue: -55, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(opAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  const color = value >= 50 ? COLORS.amber : value >= 25 ? '#A78BFA' : COLORS.primary;
  return (
    <Animated.Text style={[s.dmgPop, { left: x - 30, top: y - 30, color, transform: [{ translateY: upAnim }], opacity: opAnim }]}>
      -{value}
    </Animated.Text>
  );
}

// ─── 결과 카드 ────────────────────────────────────────────────
function ResultCard({ label, val, color, icon }: { label: string; val: string; color: string; icon: string }) {
  return (
    <View style={[s.resultCard, { borderColor: color + '30', backgroundColor: color + '0D' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={s.resultCardLabel}>{label}</Text>
      <Text style={[s.resultCardVal, { color }]}>{val}</Text>
    </View>
  );
}

// ─── 룰 행 ───────────────────────────────────────────────────
function RuleRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={s.ruleRow}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={s.ruleTxt}>{text}</Text>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.88)',
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

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  timerPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  timerNum: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  timerSec: { fontSize: FONTS.xxs, fontWeight: '700' },

  // 파워업 표시 pill
  powerupPill: {
    backgroundColor: '#F59E0B28',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F59E0B70',
  },
  powerupPillTxt: {
    fontSize: FONTS.xxs,
    color: '#F59E0B',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  timerTrack: { height: 2, backgroundColor: 'rgba(15,23,42,0.05)' },
  timerFill:  { height: '100%' },

  // 콤보 인디케이터 (상단 바)
  comboIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(15,23,42,0.25)',
  },
  comboIndicatorText: {
    fontSize: FONTS.sm,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // 보스 패널
  bossPanel: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  bossPanelBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bossRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  bossEmoji: { fontSize: 40 },
  bossNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  bossName: { fontSize: FONTS.md, fontWeight: '900' },
  ragePill: {
    backgroundColor: COLORS.bad + '28', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.bad + '55',
  },
  rageTxt: { fontSize: 9, color: COLORS.bad, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 0.5 },
  hpBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hpTrack: { flex: 1, height: 7, backgroundColor: 'rgba(15,23,42,0.05)', borderRadius: RADIUS.full, overflow: 'hidden' },
  hpFill:  { height: '100%', borderRadius: RADIUS.full },
  hpHitFlash: {
    backgroundColor: 'rgba(239,68,68,0.7)',
    borderRadius: RADIUS.full,
  },
  hpNum: { fontSize: FONTS.xxs, fontFamily: 'monospace', fontWeight: '800', minWidth: 32, textAlign: 'right' },
  shieldCol: { alignItems: 'center', gap: 4 },
  shieldLabel: { fontSize: 8, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1 },
  shieldRow: { flexDirection: 'row', gap: 5 },
  shieldDot: { width: 10, height: 10, borderRadius: 5 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dmgBox: {},
  statLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5 },
  dmgVal: { fontSize: FONTS.lg, fontWeight: '900', fontFamily: 'monospace' },
  comboBox: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  comboXNum: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', lineHeight: 28 },
  comboX: { fontSize: FONTS.sm },
  comboLabel: { fontSize: 8, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 2 },

  // 게임 영역
  gameArea: {
    flex: 1,
    backgroundColor: '#040610',
    position: 'relative',
    overflow: 'hidden',
  },
  screenFlash: {
    backgroundColor: COLORS.bad,
    pointerEvents: 'none' as any,
  },

  // 오브
  orb: {
    position: 'absolute',
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  orbShine: {
    position: 'absolute',
    top: '14%', left: '18%',
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  orbCore: { position: 'absolute' },
  orbTypeLabel: {
    position: 'absolute',
    fontSize: 9, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 0.3,
  },

  // 낙하 아이템
  fallingItem: {
    position: 'absolute',
    top: 0,
    width: 50,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  fallingItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  fallingItemEmoji: {
    fontSize: 22,
  },
  fallingItemLabel: {
    fontSize: 7,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },

  // 데미지 팝
  dmgPop: {
    position: 'absolute',
    fontSize: FONTS.xl,
    fontWeight: '900',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(15,23,42,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // 콤보 메시지 팝업
  comboMsgText: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    top: '45%',
    fontSize: FONTS.xxl,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    zIndex: 100,
  },

  // Ready 오버레이
  readyOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 8,
  },
  readyBossEmoji: { fontSize: 72, marginBottom: 4 },
  readyTitle: { fontSize: FONTS.xxl, fontWeight: '900', letterSpacing: -1 },
  readyBossName: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: -4, marginBottom: 12 },
  readyRules: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleTxt: { fontSize: FONTS.xs, color: COLORS.textSub },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    paddingHorizontal: 44,
  },
  startBtnTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#FFFFFF' },

  // 결과
  resultOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(4,6,16,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    width: '100%',
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  resultEmoji: { fontSize: 64 },
  resultTitle: { fontSize: FONTS.xxl, fontWeight: '900', letterSpacing: -0.5 },
  resultCards: { flexDirection: 'row', gap: 8, width: '100%' },
  resultCard: {
    flex: 1, alignItems: 'center', gap: 4,
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 6,
  },
  resultCardLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted },
  resultCardVal: { fontSize: FONTS.sm, fontWeight: '900', fontFamily: 'monospace' },
  rewardPanel: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.amberLine,
  },
  rewardTitle: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 10, textAlign: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rewardItem: { flex: 1, alignItems: 'center', gap: 4 },
  rewardEmoji: { fontSize: 28 },
  rewardVal: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  rewardDivider: { width: 1, height: 44, backgroundColor: COLORS.border },
  closeResultBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    paddingHorizontal: 52,
  },
  closeResultTxt: { fontSize: FONTS.md, fontWeight: '900', color: '#FFFFFF' },
});
