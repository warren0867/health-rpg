import { Ionicons } from '@expo/vector-icons';
import { hapticMedium } from '../utils/haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { EMPTY_PERMANENT_STATS, GachaBonus, PermanentStats } from '../types';
import { GearState, TIER_CFG } from '../utils/equipment';
import { RecentCondition } from '../utils/permanentStats';
import { StatusEffect } from '../utils/statusEffects';
import { getEvoStage, getNextEvoStage } from './AvatarEvo';
import { EvoModal } from './CharacterCard';

type Rank = { rank: string; label: string; color: string; glow: string };

interface Props {
  name: string;
  score: number | null;
  rank: Rank | null;
  level: number;
  levelTitle: string;
  xpCurrent: number;
  xpNeeded: number;
  todayXp: number | null;
  permStats?: PermanentStats;
  /** 가챠 주문서로 적용된 활성 버프 (스탯 칩에 +N 표시) */
  activeBonuses?: GachaBonus[];
  conditionInfo?: RecentCondition;
  statusEffects?: StatusEffect[];
  streak?: number;
  questsLeft?: number;
  hasIllness?: boolean;
  onEditName?: () => void;
  /** 능력치 요약 칩을 탭했을 때 (캐릭터 시트 열기) */
  onOpenSheet?: () => void;
  /** 장착 장비 (캐릭터 옆 슬롯 표시) */
  gear?: GearState | null;
  /** 장비 슬롯을 탭했을 때 (장비창 열기) */
  onPressGear?: () => void;
}

const STAT_CHIP_COLORS: Record<'str' | 'end' | 'vit' | 'agi' | 'wis', string> = {
  str: COLORS.str, end: COLORS.mp, vit: COLORS.vit, agi: COLORS.agi, wis: COLORS.amber,
};

// ─── 장비 슬롯 (캐릭터 옆) ──────────────────────────
function GearSlot({ kind, item, onPress }: {
  kind: 'weapon' | 'armor' | 'accessory';
  item: GearState['weapon'];
  onPress?: () => void;
}) {
  const label = kind === 'weapon' ? '무기' : kind === 'armor' ? '방어구' : '악세';
  const icon = kind === 'weapon' ? 'flash-outline' : kind === 'armor' ? 'shield-outline' : 'diamond-outline';
  if (!item) {
    return (
      <Pressable style={[s.gearSlot, s.gearSlotEmpty]} onPress={onPress} hitSlop={4}>
        <Ionicons name={icon} size={16} color={COLORS.textDisabled} />
        <Text style={s.gearSlotLabel}>{label}</Text>
      </Pressable>
    );
  }
  const tier = TIER_CFG[item.tier];
  return (
    <Pressable
      style={[s.gearSlot, { borderColor: tier.color + '88', backgroundColor: tier.color + '14' }]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={s.gearSlotEmoji}>{item.emoji}</Text>
      {item.enh > 0 && (
        <View style={s.gearEnhBadge}>
          <Text style={s.gearEnhTxt}>+{item.enh}</Text>
        </View>
      )}
    </Pressable>
  );
}

const pixelated: any = Platform.select({ web: { imageRendering: 'pixelated' }, default: {} });

// ─── 말풍선 대사 (상황 맥락 기반) ────────────────────
function pickSpeech(p: {
  questsLeft: number; streak: number; condScore?: number; hasIllness: boolean; name: string;
}): string {
  const pools: string[][] = [];

  if (p.hasIllness) {
    pools.push([
      '으윽... 일단 회복부터 하자...',
      '아플 땐 무리하지 말고 푹 쉬어야 해',
      '물 많이 마시고 일찍 자자... 콜록',
    ]);
  } else if (p.questsLeft === 0) {
    pools.push([
      '오늘 퀘스트 올 클리어! 나 좀 강해진 것 같지 않아?',
      '완벽한 하루야. 내일도 부탁해!',
      '이 기세면 보스도 문제없겠는걸?',
    ]);
  } else {
    pools.push([
      `퀘스트가 ${p.questsLeft}개 남았어! 같이 깨자!`,
      '체크인하면 내가 강해진다구!',
      '물 한 잔 어때? 나도 목말라...',
    ]);
  }

  if (p.streak >= 3) {
    pools.push([
      `${p.streak}일 연속 출석! 이 기세 너무 좋아!`,
      `${p.streak}일째 함께하는 중! 의리 있네~`,
    ]);
  }
  if (p.condScore !== undefined && p.condScore < 40 && !p.hasIllness) {
    pools.push([
      '요즘 컨디션이 별로야... 오늘은 일찍 자자',
      '몸이 무거워... 가볍게 스트레칭 어때?',
    ]);
  }

  // 항상 섞이는 잡담
  pools.push([
    '톡톡 치지 마~ 간지러워!',
    '오늘도 모험이다!',
    `${p.name}, 오늘 컨디션 어때?`,
    '진짜 건강해지면 나도 진짜 강해져!',
  ]);

  const all = pools.flat();
  return all[Math.floor(Math.random() * all.length)];
}

/**
 * 히어로 스테이지 — 캐릭터가 무대 위에 서 있는 홈 메인 섹션.
 * idle 호흡 애니메이션 + 탭 인터랙션(스쿼시 바운스 · 햅틱 · 말풍선).
 */
export default function HeroStage({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, permStats, activeBonuses = [], conditionInfo, statusEffects,
  streak = 0, questsLeft = 0, hasIllness = false, onEditName, onOpenSheet,
  gear, onPressGear,
}: Props) {
  const ps = permStats ?? EMPTY_PERMANENT_STATS;
  // 가챠 버프를 스탯별로 합산 (만료 제외)
  const bonusByStat = useMemo(() => {
    const now = new Date().toISOString();
    const m: Record<string, number> = {};
    for (const b of activeBonuses) {
      if (b.expiresAt > now) m[b.stat] = (m[b.stat] ?? 0) + b.bonus;
    }
    return m;
  }, [activeBonuses]);
  const evo = getEvoStage(ps.totalGained);
  const nextEvo = getNextEvoStage(ps.totalGained);
  const [evoModalVisible, setEvoModalVisible] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);

  const rankColor = rank?.color ?? COLORS.textMuted;
  const xpPct = Math.min(100, Math.round((xpCurrent / Math.max(1, xpNeeded)) * 100));

  // ─── idle 호흡 (위아래 둥실 + 그림자 호응) ───────────
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const shadowScale = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });
  const shadowOpacity = bob.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.07] });

  // ─── 탭 반응 (스쿼시 & 스트레치) ─────────────────────
  const squash = useRef(new Animated.Value(0)).current;
  const speechOpacity = useRef(new Animated.Value(0)).current;
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (speechTimer.current) clearTimeout(speechTimer.current); }, []);

  const handlePoke = () => {
    hapticMedium();
    squash.setValue(0);
    Animated.sequence([
      Animated.timing(squash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.spring(squash, { toValue: 0, friction: 3, tension: 140, useNativeDriver: true }),
    ]).start();

    setSpeech(pickSpeech({ questsLeft, streak, condScore: conditionInfo?.score, hasIllness, name }));
    speechOpacity.setValue(0);
    Animated.timing(speechOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => {
      Animated.timing(speechOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        .start(() => setSpeech(null));
    }, 2600);
  };
  const squashScaleY = squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] });
  const squashScaleX = squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const condColor = !conditionInfo ? COLORS.textMuted
    : conditionInfo.score >= 70 ? COLORS.good
    : conditionInfo.score >= 40 ? COLORS.amber
    : COLORS.bad;

  const evoPct = useMemo(() => {
    if (!nextEvo) return 100;
    const span = nextEvo.threshold - evo.threshold;
    return Math.min(100, Math.max(0, ((ps.totalGained - evo.threshold) / Math.max(1, span)) * 100));
  }, [ps.totalGained, evo, nextEvo]);

  return (
    <View style={s.card}>
      <EvoModal visible={evoModalVisible} totalGained={ps.totalGained} onClose={() => setEvoModalVisible(false)} />

      {/* 무대 배경 글로우 (EVO 단계 컬러) — 알파를 잘게 나눠 라디얼 그라데이션처럼 */}
      {[
        { size: 300, alpha: '06' },
        { size: 240, alpha: '08' },
        { size: 185, alpha: '0A' },
        { size: 135, alpha: '0D' },
      ].map(({ size, alpha }) => (
        <View
          key={size}
          pointerEvents="none"
          style={[s.stageGlow, {
            width: size, height: size, borderRadius: size / 2,
            top: 95 - size / 2,
            backgroundColor: (evo.glowColor ?? COLORS.primary) + alpha,
          }]}
        />
      ))}

      {/* 상단 정보 줄: 이름·레벨 / 점수 */}
      <View style={s.headerRow}>
        <Pressable onPress={onEditName} style={s.nameBlock}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{name || '용사'}</Text>
            <Ionicons name="create-outline" size={12} color={COLORS.textDisabled} />
          </View>
          <Text style={s.subText}>Lv {level} · {levelTitle}</Text>
        </Pressable>
        <View style={s.scoreBlock}>
          <Text style={[s.score, { color: rankColor }]}>{score ?? '–'}</Text>
          <Text style={s.scoreLabel}>{rank?.rank ?? 'SCORE'}</Text>
        </View>
      </View>

      {/* 캐릭터 무대 */}
      <View style={s.stage}>
        {/* 장비 슬롯 (캐릭터 왼쪽 — RPG 캐릭터창 스타일) */}
        <View style={s.gearColumn}>
          <GearSlot kind="weapon"    item={gear?.weapon ?? null}    onPress={onPressGear} />
          <GearSlot kind="armor"     item={gear?.armor ?? null}     onPress={onPressGear} />
          <GearSlot kind="accessory" item={gear?.accessory ?? null} onPress={onPressGear} />
        </View>

        {/* 말풍선 */}
        {speech && (
          <Animated.View style={[s.bubble, { opacity: speechOpacity }]} pointerEvents="none">
            <Text style={s.bubbleText}>{speech}</Text>
            <View style={s.bubbleTail} />
          </Animated.View>
        )}

        <Pressable onPress={handlePoke} hitSlop={12}>
          <Animated.View style={{
            transform: [{ translateY: bobY }, { scaleY: squashScaleY }, { scaleX: squashScaleX }],
          }}>
            <Image
              source={evo.source}
              style={{ width: 104, height: 104, opacity: hasIllness ? 0.6 : 1, ...pixelated }}
              resizeMode="contain"
            />
          </Animated.View>
        </Pressable>

        {/* 발밑 그림자 */}
        <Animated.View style={[s.floorShadow, {
          opacity: shadowOpacity,
          transform: [{ scaleX: shadowScale }],
        }]} />

        {/* 컨디션 라벨 */}
        {conditionInfo && (
          <View style={s.condRow}>
            <View style={[s.condDot, { backgroundColor: condColor }]} />
            <Text style={[s.condText, { color: condColor }]}>{conditionInfo.label}</Text>
            {conditionInfo.trend !== 'stable' && (
              <Ionicons name={conditionInfo.trend === 'up' ? 'trending-up' : 'trending-down'} size={11} color={condColor} />
            )}
          </View>
        )}
      </View>

      {/* 상태이상 칩 */}
      {statusEffects && statusEffects.length > 0 && (
        <View style={s.effectRow}>
          {statusEffects.slice(0, 3).map(ef => (
            <View key={ef.id} style={[s.effectBadge, { backgroundColor: ef.color + '18', borderColor: ef.color + '40' }]}>
              <Text style={s.effectEmoji}>{ef.emoji}</Text>
              <Text style={[s.effectName, { color: ef.color }]}>{ef.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* EVO 진행 + XP 바 */}
      <Pressable onPress={() => setEvoModalVisible(true)} style={s.evoRow}>
        <View style={[s.evoBadge, { backgroundColor: evo.bgColor, borderColor: evo.borderColor }]}>
          <Text style={[s.evoBadgeText, { color: evo.textColor }]}>EVO {evo.stage}</Text>
        </View>
        <Text style={s.evoLabel}>{evo.label}</Text>
        <View style={s.evoTrack}>
          <View style={[s.evoFill, { width: `${evoPct}%`, backgroundColor: evo.textColor }]} />
        </View>
        <Ionicons name="chevron-forward" size={12} color={COLORS.textDisabled} />
      </Pressable>

      <View style={s.xpRow}>
        <View style={s.xpTrack}>
          <View style={[s.xpFill, { width: `${xpPct}%` }]} />
        </View>
        <Text style={s.xpMeta}>
          {todayXp != null && todayXp > 0 && <Text style={s.xpGain}>+{todayXp}  </Text>}
          <Text style={s.xpDim}>XP {xpCurrent}/{xpNeeded}</Text>
        </Text>
      </View>

      {/* 능력치 요약 — 상세는 탭해서 캐릭터 시트로 */}
      <Pressable style={s.statChipRow} onPress={onOpenSheet}>
        {(['str', 'end', 'vit', 'agi', 'wis'] as const).map(k => {
          const base = Math.round(ps[k]);
          const bonus = bonusByStat[k] ?? 0;
          return (
            <View key={k} style={s.statChip}>
              <Text style={[s.statChipKey, { color: STAT_CHIP_COLORS[k] }]}>{k.toUpperCase()}</Text>
              <Text style={s.statChipVal}>
                {base}
                {bonus > 0 && <Text style={[s.statChipBonus, { color: STAT_CHIP_COLORS[k] }]}>(+{bonus})</Text>}
              </Text>
            </View>
          );
        })}
        <Ionicons name="chevron-forward" size={13} color={COLORS.textDisabled} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    overflow: 'hidden',
  },

  stageGlow: {
    position: 'absolute',
    alignSelf: 'center',
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameBlock: { gap: 3, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  subText: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '600', letterSpacing: 0.2 },
  scoreBlock: { alignItems: 'flex-end', minWidth: 50 },
  score: { fontSize: 28, fontWeight: '800', fontFamily: 'monospace', letterSpacing: -1, lineHeight: 30 },
  scoreLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '700', marginTop: 1 },

  // 슬롯 3개(무기·방어구·악세사리)가 EVO 줄과 겹치지 않도록 최소 높이 확보
  stage: { alignItems: 'center', paddingTop: 18, paddingBottom: 4, minHeight: 158 },

  // 장비 슬롯 컬럼 (캐릭터 왼쪽)
  gearColumn: {
    position: 'absolute',
    left: 4, top: 14,
    gap: 6,
    zIndex: 5,
  },
  gearSlot: {
    width: 42, height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  gearSlotEmpty: {
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 1,
  },
  gearSlotLabel: { fontSize: 8, color: COLORS.textDisabled, fontWeight: '700' },
  gearSlotEmoji: { fontSize: 20 },
  gearEnhBadge: {
    position: 'absolute',
    bottom: -5, alignSelf: 'center',
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  gearEnhTxt: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  floorShadow: {
    width: 70, height: 12, borderRadius: 6,
    backgroundColor: '#0F172A',
    marginTop: -6,
  },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  condDot: { width: 6, height: 6, borderRadius: 3 },
  condText: { fontSize: 11, fontWeight: '700' },

  bubble: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
    maxWidth: 240,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  bubbleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  bubbleTail: {
    position: 'absolute', bottom: -6, alignSelf: 'center',
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#1E293B',
  },

  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 6 },
  effectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  effectEmoji: { fontSize: 10 },
  effectName: { fontSize: 10, fontWeight: '700' },

  evoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  evoBadge: {
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  evoBadgeText: { fontSize: 10, fontWeight: '900', fontFamily: 'monospace' },
  evoLabel: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },
  evoTrack: {
    flex: 1, height: 3,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  evoFill: { height: '100%', borderRadius: RADIUS.full },

  xpRow: { gap: 5, marginTop: 10 },
  xpTrack: { height: 4, backgroundColor: 'rgba(15,23,42,0.06)', borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  xpMeta: { fontSize: 10, fontFamily: 'monospace', alignSelf: 'flex-end' },
  xpGain: { color: COLORS.amber, fontWeight: '700' },
  xpDim: { color: COLORS.textMuted, fontWeight: '600' },

  statChipRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.borderSub,
    gap: 6,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    gap: 1,
  },
  statChipKey: { fontSize: 9, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 0.5 },
  statChipVal: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text, fontFamily: 'monospace' },
  statChipBonus: { fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
});
