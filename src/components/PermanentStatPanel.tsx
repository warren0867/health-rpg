import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { PermanentStats, STAT_FULLNAME, STAT_LABEL, StatKey } from '../types';
import { statTierProgress } from '../utils/permanentStats';

interface Props {
  stats: PermanentStats;
}

const STAT_META: Record<StatKey, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  str: { icon: 'flame',           color: COLORS.str  },
  end: { icon: 'pulse',            color: COLORS.primary },
  vit: { icon: 'shield-checkmark', color: COLORS.vit  },
  agi: { icon: 'flash',            color: COLORS.agi  },
  wis: { icon: 'sparkles',         color: COLORS.amber },
};

const STAT_ORDER: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];

/**
 * 영구 누적 스탯 표시 — 운동/수면/혈압/streak/체중 추세에서 결정적으로 도출.
 * "오늘 컨디션"이 아니라 "내가 얼마나 강해졌나"를 보여주는 게 목적.
 */
export default function PermanentStatPanel({ stats }: Props) {
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>영구 능력치</Text>
        <Text style={s.totalVal}>총 {stats.totalGained.toFixed(1)}</Text>
      </View>
      <Text style={s.sub}>운동·수면·혈압 안정·체중 변화로 영구 누적</Text>

      <View style={s.list}>
        {STAT_ORDER.map(key => {
          const value = stats[key];
          const meta = STAT_META[key];
          const tp = statTierProgress(value);
          return (
            <View key={key} style={s.row}>
              <View style={[s.iconBox, { backgroundColor: meta.color + '1F' }]}>
                <Ionicons name={meta.icon} size={14} color={meta.color} />
              </View>
              <View style={s.rowMid}>
                <View style={s.rowMidTop}>
                  <Text style={s.statName}>
                    <Text style={[s.statAbbr, { color: meta.color }]}>{STAT_LABEL[key]}</Text>
                    <Text style={s.statFull}>  {STAT_FULLNAME[key]}</Text>
                  </Text>
                  <Text style={s.tierLabel}>{tp.tierLabel}</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${tp.pct}%`, backgroundColor: meta.color }]} />
                </View>
              </View>
              <Text style={[s.statVal, { color: meta.color }]}>{value.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800' },
  totalVal: { color: COLORS.amber, fontSize: FONTS.sm, fontWeight: '800', fontFamily: 'monospace' },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 4, marginBottom: 12 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rowMid: { flex: 1 },
  rowMidTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 },
  statName: { fontSize: FONTS.xs },
  statAbbr: { fontWeight: '900', fontFamily: 'monospace', letterSpacing: 1 },
  statFull: { color: COLORS.textSub, fontWeight: '600' },
  tierLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', letterSpacing: 0.5 },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  statVal: {
    fontFamily: 'monospace', fontSize: FONTS.md, fontWeight: '800',
    minWidth: 44, textAlign: 'right',
  },
});
