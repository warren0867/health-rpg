import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { GachaBonus, PermanentStats } from '../types';
import { addGold } from '../utils/gacha';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import {
  HuntDrop, TIER_CFG, getGearState, rollHuntDrops, saveGearState,
} from '../utils/equipment';
import {
  CombatStats, Monster, calcCombatStats, calcHuntReward, calcRegen,
  getHuntBest, monsterHit, monsterFor, playerHit, saveHuntBest,
} from '../utils/hunt';
import { addXP } from '../utils/storage';
import { getEvoStage } from './AvatarEvo';

const pixelated: any = Platform.select({ web: { imageRendering: 'pixelated' }, default: {} });

const TICK_MS = 420;          // 공방 한 번 주기
const TICK_FAST = 180;        // 2배속

type Phase = 'ready' | 'fighting' | 'result';

interface Props {
  visible: boolean;
  onClose: () => void;
  permStats: PermanentStats;
  level: number;
  condScore: number | null;
  activeBonuses: GachaBonus[];
  addXpFn?: (xp: number) => Promise<any>;
  onGoldEarned?: (gold: number) => void;
}

interface FloatNum { id: number; val: string; color: string; side: 'player' | 'monster'; }

export default function HuntModal({
  visible, onClose, permStats, level, condScore, activeBonuses,
  addXpFn, onGoldEarned,
}: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [best, setBest] = useState(0);
  const [stage, setStage] = useState(1);
  const [monster, setMonster] = useState<Monster | null>(null);
  const [mHp, setMHp] = useState(0);
  const [pHp, setPHp] = useState(0);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [fast, setFast] = useState(false);
  const [reward, setReward] = useState<{ gold: number; xp: number; newBestBonus: number } | null>(null);
  const [drops, setDrops] = useState<HuntDrop | null>(null);
  const [clearedBanner, setClearedBanner] = useState(false);
  const [, forceRender] = useState(0);

  const combat = useRef<CombatStats>(calcCombatStats(permStats, level, condScore, activeBonuses));
  const stateRef = useRef({ stage: 1, mHp: 0, pHp: 0, turn: 'player' as 'player' | 'monster', rounds: 0 });
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const fastRef = useRef(false);
  fastRef.current = fast;

  const playerShake = useRef(new Animated.Value(0)).current;
  const monsterShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 장착 장비를 반영해 전투력 계산
      combat.current = calcCombatStats(permStats, level, condScore, activeBonuses);
      getGearState().then(gear => {
        combat.current = calcCombatStats(permStats, level, condScore, activeBonuses, gear);
        forceRender(t => t + 1);
      });
      getHuntBest().then(setBest);
      setPhase('ready');
      setReward(null);
      setDrops(null);
      setFast(false);
      endedRef.current = false;
    } else {
      stopTick();
    }
    return stopTick;
  }, [visible]);

  function stopTick() {
    if (tickTimer.current) { clearTimeout(tickTimer.current); tickTimer.current = null; }
  }

  function pushFloat(val: string, color: string, side: 'player' | 'monster') {
    const id = Date.now() + Math.random();
    setFloats(prev => [...prev.slice(-4), { id, val, color, side }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 800);
  }

  function shake(side: 'player' | 'monster') {
    const v = side === 'player' ? playerShake : monsterShake;
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function start() {
    const c = combat.current;
    const m = monsterFor(1);
    stateRef.current = { stage: 1, mHp: m.maxHp, pHp: c.maxHp, turn: 'player', rounds: 0 };
    setStage(1);
    setMonster(m);
    setMHp(m.maxHp);
    setPHp(c.maxHp);
    setFloats([]);
    setReward(null);
    endedRef.current = false;
    setPhase('fighting');
    scheduleTick();
  }

  function scheduleTick() {
    stopTick();
    tickTimer.current = setTimeout(tick, fastRef.current ? TICK_FAST : TICK_MS);
  }

  function tick() {
    const st = stateRef.current;
    const c = combat.current;
    const m = monsterFor(st.stage);

    if (st.turn === 'player') {
      const hit = playerHit(c, m);
      st.mHp = Math.max(0, st.mHp - hit.dmg);
      setMHp(st.mHp);
      pushFloat(hit.crit ? `크리! -${hit.dmg}` : `-${hit.dmg}`, hit.crit ? COLORS.amber : '#FFFFFF', 'monster');
      shake('monster');
      hapticLight();

      if (st.mHp <= 0) {
        // 스테이지 클리어 → 회복 후 다음 스테이지
        const regen = calcRegen(c.maxHp, permStats);
        st.pHp = Math.min(c.maxHp, st.pHp + regen);
        setPHp(st.pHp);
        pushFloat(`+${regen}`, COLORS.good, 'player');
        st.stage++;
        st.rounds = 0;
        const next = monsterFor(st.stage);
        st.mHp = next.maxHp;
        st.turn = 'player';
        setClearedBanner(true);
        setTimeout(() => {
          setClearedBanner(false);
          setStage(st.stage);
          setMonster(next);
          setMHp(next.maxHp);
          scheduleTick();
        }, fastRef.current ? 250 : 600);
        return;
      }
      st.turn = 'monster';
    } else {
      const hit = monsterHit(m, c);
      if (hit.dodged) {
        pushFloat('회피!', COLORS.primary, 'player');
      } else {
        st.pHp = Math.max(0, st.pHp - hit.dmg);
        setPHp(st.pHp);
        pushFloat(`-${hit.dmg}`, COLORS.bad, 'player');
        shake('player');
      }
      st.rounds++;

      if (st.pHp <= 0 || st.rounds >= 60) {
        finish(st.stage - 1);
        return;
      }
      st.turn = 'player';
    }
    scheduleTick();
  }

  async function finish(stagesCleared: number) {
    if (endedRef.current) return;
    endedRef.current = true;
    stopTick();
    hapticWarning();

    const r = calcHuntReward(stagesCleared, best);
    setReward(r);
    addGold(r.gold);
    (addXpFn ?? addXP)(r.xp);
    onGoldEarned?.(r.gold);
    if (stagesCleared > best) {
      await saveHuntBest(stagesCleared);
      hapticSuccess();
    }

    // 장비/주문서 드랍
    const drop = rollHuntDrops(stagesCleared);
    if (drop.weaponScrolls || drop.armorScrolls || drop.gear) {
      const gear = await getGearState();
      gear.weaponScrolls += drop.weaponScrolls;
      gear.armorScrolls += drop.armorScrolls;
      if (drop.gear) gear.inventory.push(drop.gear);
      await saveGearState(gear);
    }
    setDrops(drop);
    setPhase('result');
  }

  function handleClose() {
    // 전투 중 닫으면 현재까지 정산
    if (phase === 'fighting' && !endedRef.current) {
      finish(stateRef.current.stage - 1);
      return;
    }
    stopTick();
    onClose();
  }

  const c = combat.current;
  const evo = getEvoStage(permStats.totalGained);
  const stagesCleared = stage - 1;
  const isNewBest = phase === 'result' && stagesCleared > best;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.container}>

          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 16, left: 16, bottom: 16, right: 16 }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>🏹  사냥터</Text>
            {phase === 'fighting' ? (
              <TouchableOpacity onPress={() => setFast(f => !f)} style={[s.speedBtn, fast && s.speedBtnOn]} hitSlop={8}>
                <Text style={[s.speedTxt, fast && { color: '#FFFFFF' }]}>x2</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />}
          </View>

          {/* ── READY: 전투력 + 시작 ── */}
          {phase === 'ready' && (
            <View style={s.body}>
              <Text style={s.bestLabel}>
                최고 기록  <Text style={s.bestVal}>STAGE {best}</Text>
              </Text>

              <View style={s.powerCard}>
                <Text style={s.powerTitle}>내 전투력</Text>
                <Text style={s.powerSub}>인바디·운동·장비·레벨이 그대로 전투력이 됩니다</Text>
                <View style={s.powerGrid}>
                  <PowerItem icon="heart"        label="체력"   val={String(c.maxHp)}                color={COLORS.hp}      from="VIT" />
                  <PowerItem icon="flash"        label="공격력" val={String(Math.round(c.atk))}      color={COLORS.amber}   from="STR" />
                  <PowerItem icon="shield"       label="방어력" val={String(Math.round(c.def))}      color={COLORS.mp}      from="END" />
                  <PowerItem icon="walk"         label="회피"   val={`${Math.round(c.dodge * 100)}%`} color={COLORS.agi}    from="AGI" />
                  <PowerItem icon="sparkles"     label="치명타" val={`${Math.round(c.crit * 100)}%`}  color={COLORS.rankS}  from="WIS" />
                  <PowerItem icon="pulse"        label="컨디션" val={`x${c.condMult.toFixed(2)}`}     color={c.condMult >= 1.05 ? COLORS.good : c.condMult < 1 ? COLORS.bad : COLORS.textMuted} from="오늘" />
                </View>
              </View>

              <Text style={s.readyHint}>
                쓰러질 때까지 몬스터를 사냥합니다.{'\n'}
                운동·인바디로 스탯을 올리면 더 멀리 갈 수 있어요!
              </Text>

              <TouchableOpacity style={s.startBtn} onPress={start} activeOpacity={0.85}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={s.startBtnTxt}>사냥 시작</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── FIGHTING ── */}
          {phase === 'fighting' && monster && (
            <View style={s.body}>
              {/* 스테이지 */}
              <View style={s.stageRow}>
                <Text style={s.stageTxt}>STAGE {stage}</Text>
                {monster.isBoss && <View style={s.bossPill}><Text style={s.bossPillTxt}>BOSS</Text></View>}
                {best > 0 && stage > best && <View style={s.recordPill}><Text style={s.recordPillTxt}>신기록 구간!</Text></View>}
              </View>

              {/* 몬스터 */}
              <View style={s.fighterBlock}>
                <Animated.Text style={[s.monsterEmoji, monster.isBoss && { fontSize: 84 }, { transform: [{ translateX: monsterShake }] }]}>
                  {monster.emoji}
                </Animated.Text>
                <Text style={s.monsterName}>{monster.name}</Text>
                <HpBar cur={mHp} max={monster.maxHp} color={monster.isBoss ? COLORS.purple : COLORS.bad} />
                {floats.filter(f => f.side === 'monster').map(f => (
                  <FloatText key={f.id} val={f.val} color={f.color} />
                ))}
              </View>

              {/* VS 구분 */}
              <View style={s.vsRow}>
                {clearedBanner
                  ? <Text style={s.clearTxt}>STAGE CLEAR!</Text>
                  : <Ionicons name="flash" size={18} color={COLORS.textDisabled} />}
              </View>

              {/* 플레이어 */}
              <View style={s.fighterBlock}>
                <Animated.View style={{ transform: [{ translateX: playerShake }] }}>
                  <Image source={evo.source} style={{ width: 72, height: 72, ...pixelated }} resizeMode="contain" />
                </Animated.View>
                <Text style={s.playerName}>나의 용사</Text>
                <HpBar cur={pHp} max={c.maxHp} color={COLORS.good} />
                {floats.filter(f => f.side === 'player').map(f => (
                  <FloatText key={f.id} val={f.val} color={f.color} />
                ))}
              </View>
            </View>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && reward && (
            <View style={s.body}>
              <Text style={s.resultEmoji}>{isNewBest ? '🏆' : '⚔️'}</Text>
              <Text style={[s.resultTitle, isNewBest && { color: COLORS.amber }]}>
                {isNewBest ? '신기록 달성!' : '사냥 종료'}
              </Text>
              <Text style={s.resultStage}>STAGE {stagesCleared} 도달</Text>

              {isNewBest ? (
                <Text style={s.resultCompare}>
                  지난 기록(STAGE {best})보다 <Text style={{ color: COLORS.amber, fontWeight: '900' }}>+{stagesCleared - best}</Text> — 그만큼 강해졌어요!
                </Text>
              ) : best > 0 ? (
                <Text style={s.resultCompare}>
                  최고 기록 STAGE {best}까지 {best - stagesCleared === 0 ? '동률!' : `-${best - stagesCleared}`}
                </Text>
              ) : null}

              <View style={s.rewardRow}>
                <Text style={s.rewardTxt}>🪙 +{reward.gold}G</Text>
                <Text style={s.rewardTxt}>✨ +{reward.xp} XP</Text>
              </View>

              {/* 드랍 아이템 */}
              {drops && (drops.weaponScrolls > 0 || drops.armorScrolls > 0 || drops.gear) && (
                <View style={s.dropBox}>
                  <Text style={s.dropTitle}>전리품</Text>
                  <View style={s.dropRow}>
                    {drops.weaponScrolls > 0 && (
                      <View style={s.dropItem}>
                        <Text style={s.dropEmoji}>📜</Text>
                        <Text style={s.dropName}>무기 주문서 x{drops.weaponScrolls}</Text>
                      </View>
                    )}
                    {drops.armorScrolls > 0 && (
                      <View style={s.dropItem}>
                        <Text style={s.dropEmoji}>📘</Text>
                        <Text style={s.dropName}>방어구 주문서 x{drops.armorScrolls}</Text>
                      </View>
                    )}
                    {drops.gear && (
                      <View style={[s.dropItem, { borderColor: TIER_CFG[drops.gear.tier].color + '66', backgroundColor: TIER_CFG[drops.gear.tier].color + '12' }]}>
                        <Text style={s.dropEmoji}>{drops.gear.emoji}</Text>
                        <Text style={[s.dropName, { color: TIER_CFG[drops.gear.tier].color, fontWeight: '800' }]}>
                          [{TIER_CFG[drops.gear.tier].label}] {drops.gear.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.dropHint}>캐릭터 정보 → 장비 탭에서 장착·강화할 수 있어요</Text>
                </View>
              )}

              <View style={s.tipBox}>
                <Ionicons name="trending-up" size={14} color={COLORS.primary} />
                <Text style={s.tipTxt}>
                  더 멀리 가려면: 운동 기록(STR·END) · 인바디 갱신(VIT·AGI) · 일일 퀘스트로 장비 강화
                </Text>
              </View>

              <View style={s.resultBtnRow}>
                <TouchableOpacity style={[s.startBtn, s.againBtn]} onPress={start} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={15} color={COLORS.primaryDark} />
                  <Text style={[s.startBtnTxt, { color: COLORS.primaryDark }]}>다시 사냥</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.startBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={s.startBtnTxt}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────
function PowerItem({ icon, label, val, color, from }: {
  icon: any; label: string; val: string; color: string; from: string;
}) {
  return (
    <View style={s.powerItem}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={s.powerItemVal}>{val}</Text>
      <Text style={s.powerItemLabel}>{label}</Text>
      <Text style={[s.powerItemFrom, { color }]}>{from}</Text>
    </View>
  );
}

function HpBar({ cur, max, color }: { cur: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (cur / Math.max(1, max)) * 100));
  return (
    <View style={s.hpWrap}>
      <View style={s.hpTrack}>
        <View style={[s.hpFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.hpTxt}>{Math.max(0, Math.round(cur))} / {max}</Text>
    </View>
  );
}

function FloatText({ val, color }: { val: string; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: -36, duration: 700, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(op, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.Text style={[s.floatTxt, { color, transform: [{ translateY: y }], opacity: op }]}>
      {val}
    </Animated.Text>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────
const s = StyleSheet.create({
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
  speedBtn: {
    width: 36, height: 28, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.primaryLine,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgHighlight,
  },
  speedBtnOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  speedTxt: { fontSize: 11, fontWeight: '900', color: COLORS.primaryDark, fontFamily: 'monospace' },

  body: { flex: 1, paddingHorizontal: SPACING.md, alignItems: 'center' },

  // READY
  bestLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, marginBottom: 12 },
  bestVal: { color: COLORS.amber, fontWeight: '900', fontFamily: 'monospace' },
  powerCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  powerTitle: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text },
  powerSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, marginTop: 2, marginBottom: 12 },
  powerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  powerItem: { width: '33.33%', alignItems: 'center', gap: 2 },
  powerItemVal: { fontSize: FONTS.md, fontWeight: '900', color: COLORS.text, fontFamily: 'monospace' },
  powerItemLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  powerItemFrom: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },

  readyHint: {
    fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 19, marginTop: 16, marginBottom: 16,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  startBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
  againBtn: { backgroundColor: COLORS.bgHighlight, borderWidth: 1, borderColor: COLORS.primaryLine },

  // FIGHTING
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 6 },
  stageTxt: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text, fontFamily: 'monospace', letterSpacing: 1 },
  bossPill: {
    backgroundColor: COLORS.purple, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  bossPillTxt: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', fontFamily: 'monospace', letterSpacing: 1 },
  recordPill: {
    backgroundColor: COLORS.amberGlow, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.amberLine,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  recordPillTxt: { fontSize: 9, fontWeight: '900', color: COLORS.amber },

  fighterBlock: { alignItems: 'center', width: '100%', paddingVertical: 8 },
  monsterEmoji: { fontSize: 64 },
  monsterName: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.textSub, marginTop: 4, marginBottom: 6 },
  playerName: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.textSub, marginTop: 4, marginBottom: 6 },

  vsRow: { height: 30, alignItems: 'center', justifyContent: 'center' },
  clearTxt: { fontSize: FONTS.sm, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace', letterSpacing: 1 },

  hpWrap: { width: '80%', gap: 3 },
  hpTrack: {
    height: 10, backgroundColor: 'rgba(15,23,42,0.08)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  hpFill: { height: '100%', borderRadius: RADIUS.full },
  hpTxt: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', alignSelf: 'flex-end' },

  floatTxt: {
    position: 'absolute', top: 8,
    fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace',
    textShadowColor: 'rgba(15,23,42,0.25)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },

  // RESULT
  resultEmoji: { fontSize: 56, marginTop: 14 },
  resultTitle: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.text, marginTop: 6 },
  resultStage: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.primaryDark, fontFamily: 'monospace', marginTop: 4 },
  resultCompare: { fontSize: FONTS.xs, color: COLORS.textSub, marginTop: 8, textAlign: 'center' },
  rewardRow: { flexDirection: 'row', gap: 18, marginTop: 14 },
  rewardTxt: { fontSize: FONTS.md, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  dropBox: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginTop: 14,
  },
  dropTitle: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: 1 },
  dropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  dropEmoji: { fontSize: 14 },
  dropName: { fontSize: FONTS.xxs, color: COLORS.textSub, fontWeight: '600' },
  dropHint: { fontSize: 9, color: COLORS.textDisabled, textAlign: 'center', marginTop: 8 },
  tipBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primaryLine,
    padding: 12, marginTop: 16, marginHorizontal: 4,
  },
  tipTxt: { flex: 1, fontSize: FONTS.xxs, color: COLORS.textSub, lineHeight: 16 },
  resultBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
