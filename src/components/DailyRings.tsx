import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Props {
  calorie: { current: number; goal: number };
  water: { currentMl: number; goalMl: number };
  quest: { done: number; total: number };
}

export default function DailyRings({ calorie, water, quest }: Props) {
  const calPct   = Math.min(100, Math.round((calorie.current / calorie.goal) * 100));
  const waterPct = Math.min(100, Math.round((water.currentMl / water.goalMl) * 100));
  const questPct = Math.min(100, Math.round((quest.done / Math.max(1, quest.total)) * 100));
  const waterL   = (water.currentMl / 1000).toFixed(1);

  return (
    <View style={s.row}>
      <Tile
        icon="flame-outline"
        color={COLORS.primary}
        value={calorie.current > 0 ? calorie.current.toLocaleString() : '0'}
        unit="kcal"
        label="칼로리"
        pct={calPct}
      />
      <Tile
        icon="water-outline"
        color={COLORS.info}
        value={waterL}
        unit="L"
        label="수분"
        pct={waterPct}
      />
      <Tile
        icon="checkmark-circle-outline"
        color={COLORS.amber}
        value={`${quest.done}/${quest.total}`}
        unit=""
        label="퀘스트"
        pct={questPct}
      />
    </View>
  );
}

function Tile({ icon, color, value, unit, label, pct }: {
  icon: any; color: string; value: string; unit: string; label: string; pct: number;
}) {
  const done = pct >= 100;
  return (
    <View style={s.tile}>
      <View style={s.tileTop}>
        <Ionicons name={icon} size={13} color={done ? color : COLORS.textMuted} />
        <Text style={s.tileLabel}>{label}</Text>
      </View>
      <View style={s.tileValueRow}>
        <Text style={[s.tileValue, done && { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {!!unit && <Text style={s.tileUnit}>{unit}</Text>}
      </View>
      <View style={s.tileBarTrack}>
        <View style={[s.tileBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 10,
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '600', letterSpacing: 0.2,
  },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  tileValue: {
    fontSize: 20, fontWeight: '800', color: COLORS.text,
    fontFamily: 'monospace', letterSpacing: -0.8,
  },
  tileUnit: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace', fontWeight: '600' },
  tileBarTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden',
  },
  tileBarFill: { height: '100%', borderRadius: 2 },
});
