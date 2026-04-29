import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

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
  onEditName?: () => void;
}

/**
 * 홈 화면 최상단 캐릭터 카드.
 * 평소엔 절제된 카드지만 등급 컬러로 약한 글로우를 줘서 RPG 정체성 유지.
 * 풀 RPG 효과는 ResultScreen에서 발동.
 */
export default function CharacterCard({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, onEditName,
}: Props) {
  const rankColor = rank?.color ?? COLORS.textMuted;
  const rankGlow = rank?.glow ?? COLORS.primaryGlow;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));

  return (
    <View style={[styles.card, { borderColor: rankColor + '33' } as ViewStyle]}>
      {/* 등급 컬러 글로우 (배경) */}
      <View style={[styles.glow, { backgroundColor: rankGlow }]} pointerEvents="none" />

      <View style={styles.row}>
        <View style={styles.left}>
          {/* 캐릭터 아바타 — 등급 컬러 박스 */}
          <View style={[styles.avatar, { borderColor: rankColor, backgroundColor: rankGlow }]}>
            <Ionicons name="person" size={32} color={rankColor} />
          </View>

          <View style={styles.charInfo}>
            <TouchableOpacity onPress={onEditName} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={styles.name}>{name || '용사'}</Text>
              <Ionicons name="create-outline" size={14} color={COLORS.textDisabled} />
            </TouchableOpacity>
            {rank && (
              <View style={[styles.rankPill, { backgroundColor: rankGlow, borderColor: rankColor + '55' }]}>
                <Text style={[styles.rankBadge, { color: '#000', backgroundColor: rankColor }]}>{rank.rank}</Text>
                <Text style={[styles.rankLabel, { color: rankColor }]}>{rank.label}</Text>
              </View>
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
