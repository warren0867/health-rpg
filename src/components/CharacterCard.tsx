import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { EMPTY_PERMANENT_STATS, PermanentStats } from '../types';
import AvatarEvo, { getEvoStage, getNextEvoStage } from './AvatarEvo';

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
  onEditName?: () => void;
}

/**
 * 홈 화면 최상단 캐릭터 카드.
 * 평소엔 절제된 카드지만 등급 컬러로 약한 글로우를 줘서 RPG 정체성 유지.
 * 풀 RPG 효과는 ResultScreen에서 발동.
 */
export default function CharacterCard({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, permStats, onEditName,
}: Props) {
  const rankColor = rank?.color ?? COLORS.textMuted;
  const rankGlow = rank?.glow ?? COLORS.primaryGlow;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));
  const ps = permStats ?? EMPTY_PERMANENT_STATS;
  const evo = getEvoStage(ps.totalGained);
  const nextEvo = getNextEvoStage(ps.totalGained);
  const toNext = nextEvo ? Math.max(0, nextEvo.threshold - ps.totalGained) : 0;

  return (
    <View style={[styles.card, { borderColor: rankColor + '33' } as ViewStyle]}>
      {/* 등급 컬러 글로우 (배경) */}
      <View style={[styles.glow, { backgroundColor: rankGlow }]} pointerEvents="none" />

      <View style={styles.row}>
        <View style={styles.left}>
          {/* 캐릭터 아바타 — 영구 스탯 기반 진화 */}
          <AvatarEvo stats={ps} size={60} />

          <View style={styles.charInfo}>
            <TouchableOpacity onPress={onEditName} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={styles.name}>{name || '용사'}</Text>
              <Ionicons name="create-outline" size={14} color={COLORS.textDisabled} />
            </TouchableOpacity>
            <View style={[styles.rankPill, { backgroundColor: evo.bgColor, borderColor: evo.borderColor }]}>
              <Text style={[styles.evoStage, { color: evo.textColor }]}>EVO {evo.stage}</Text>
              <Text style={[styles.rankLabel, { color: evo.textColor }]}>{evo.label}</Text>
            </View>
            {nextEvo && (
              <Text style={styles.nextEvo}>다음 진화까지 {toNext.toFixed(1)}</Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.score, { color: rankColor }]}>{score ?? '--'}</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
        </View>
      </View>

      {/* XP 바 */}
      <View style={styles.xpBlock}>
        <View style={styles.xpRow}>
          <Text style={styles.xpLevel}>
            <Text style={styles.xpLevelDim}>LV </Text>
            {level} · {levelTitle}
          </Text>
          <Text style={styles.xpNum}>
            {todayXp != null && todayXp > 0 && (
              <Text style={styles.xpGain}>+{todayXp} XP </Text>
            )}
            <Text style={styles.xpDim}>{xpCurrent} / {xpNeeded}</Text>
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: rankColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 4,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0, right: 0, left: 0, bottom: 0,
    opacity: 0.35,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatar: {
    width: 60, height: 60, borderRadius: RADIUS.md + 2,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  charInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '800', letterSpacing: -0.3 },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingRight: 10, paddingLeft: 4,
    borderRadius: RADIUS.full, borderWidth: 1, alignSelf: 'flex-start',
  },
  rankBadge: {
    fontSize: FONTS.xxs, fontWeight: '900',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  rankLabel: { fontSize: FONTS.xxs, fontWeight: '700' },
  evoStage: {
    fontFamily: 'monospace',
    fontSize: FONTS.xxs - 1, fontWeight: '900', letterSpacing: 0.8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  nextEvo: {
    color: COLORS.textMuted,
    fontSize: FONTS.xxs - 1,
    marginTop: 4,
    fontFamily: 'monospace',
  },

  right: { alignItems: 'flex-end' },
  score: {
    fontSize: 44, fontWeight: '700',
    fontFamily: 'monospace',
    lineHeight: 46, letterSpacing: -1.5,
  },
  scoreLabel: {
    fontSize: 10, color: COLORS.textDisabled,
    fontFamily: 'monospace',
    letterSpacing: 2.5, fontWeight: '600', marginTop: 2,
  },

  xpBlock: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpLevel: { fontSize: FONTS.xs, color: COLORS.text, fontWeight: '700', fontFamily: 'monospace' },
  xpLevelDim: { color: COLORS.textMuted, fontWeight: '500' },
  xpNum: { fontSize: FONTS.xxs, fontFamily: 'monospace' },
  xpGain: { color: COLORS.amber, fontWeight: '800' },
  xpDim: { color: COLORS.textMuted },
  xpTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: RADIUS.full },
});
