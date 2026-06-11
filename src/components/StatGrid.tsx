import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Stats {
  hp: number; stamina: number; recovery: number; bloodSugarControl: number; condition?: number;
}
interface Props { stats: Stats; max?: number; }

export default function StatGrid({ stats, max = 100 }: Props) {
  const items = [
    { key: 'hp',  abbr: 'HP',  icon: 'heart'            as const, color: COLORS.hp,      value: stats.hp },
    { key: 'str', abbr: 'STR', icon: 'flash'            as const, color: COLORS.str,     value: stats.stamina },
    { key: 'vit', abbr: 'VIT', icon: 'shield-checkmark' as const, color: COLORS.vit,     value: stats.recovery },
    { key: 'mp',  abbr: 'MP',  icon: 'water'            as const, color: COLORS.mp,      value: stats.bloodSugarControl },
  ];
  return (
    <View style={s.grid}>
      {items.map(item => {
        const pct = Math.min(100, Math.round((item.value / max) * 100));
        return (
          <View key={item.key} style={[s.cell, { borderColor: item.color + '30', backgroundColor: COLORS.bgCard }]}>
            <View style={[s.cellGlow, { backgroundColor: item.color + '0C' }]} pointerEvents="none" />
            <View style={s.top}>
              <View style={[s.iconBox, { backgroundColor: item.color + '22', borderColor: item.color + '44', borderWidth: 1 }]}>
                <Ionicons name={item.icon} size={15} color={item.color} />
              </View>
              <Text style={[s.abbr, { color: item.color + 'AA' }]}>{item.abbr}</Text>
            </View>
            <Text style={[s.value, { color: item.color }]}>{item.value}</Text>
            <View style={s.barRow}>
              <View style={s.track}>
                <View style={[s.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
              </View>
              <Text style={[s.pct, { color: item.color + '99' }]}>{pct}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: 10,
  },
  cell: {
    width: '48.5%', borderRadius: RADIUS.md + 2,
    padding: SPACING.md, borderWidth: 1,
    position: 'relative', overflow: 'hidden', gap: 6,
  },
  cellGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  abbr: { fontSize: 10, fontFamily: 'monospace', fontWeight: '900', letterSpacing: 2 },
  value: { fontFamily: 'monospace', fontSize: 38, fontWeight: '900', lineHeight: 40, letterSpacing: -2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: {
    flex: 1, height: 5,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.full },
  pct: { fontSize: 10, fontFamily: 'monospace', fontWeight: '700', minWidth: 30, textAlign: 'right' },
});
