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
  const calPct  = Math.min(100, Math.round((calorie.current / calorie.goal) * 100));
  const waterPct = Math.min(100, Math.round((water.currentMl / water.goalMl) * 100));
  const questPct = Math.min(100, Math.round((quest.done / Math.max(1, quest.total)) * 100));
  const waterL   = (water.currentMl / 1000).toFixed(1);

  return (
    <View style={s.row}>
      <MetricTile
        icon="flame-outline"
        color={COLORS.primary}
        value={calorie.current > 0 ? calorie.current.toLocaleString() : '0'}
        unit="kcal"
        label="칼로리"
        pct={calPct}
        sub={`목표 ${calorie.goal.toLocaleString()}`}
      />
      <MetricTile
        icon="water-outline"
        color={COLORS.info}
        value={waterL}
        unit="L"
        label="수분"
        pct={waterPct}
        sub={`목표 ${(water.goalMl/1000).toFixed(1)}L`}
      />
      <MetricTile
        icon="checkmark-circle-outline"
        color={COLORS.amber}
        value={String(quest.done)}
        unit={`/${quest.total}`}
        label="퀘스트"
        pct={questPct}
        sub={questPct >= 100 ? 'ALL CLEAR' : `${questPct}% 완료`}
      />
    </View>
  );
}

function MetricTile({ icon, color, value, unit, label, pct, sub }: {
  icon: any; color: string; value: string; unit: string;
  label: string; pct: number; sub: string;
}) {
  const done = pct >= 100;
  return (
    <View style={[s.tile, { borderColor: color + (done ? '55' : '22') }]}>
      <View style={[s.tileGlow, { backgroundColor: color + '0E' }]} pointerEvents="none" />
      {/* 아이콘 + 라벨 */}
      <View style={s.tileHeader}>
        <View style={[s.iconBox, { backgroundColor: color + '1C' }]}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        <Text style={[s.tileLabel, { color: color + 'BB' }]}>{label}</Text>
      </View>
      {/* 큰 숫자 */}
      <View style={s.tileValueRow}>
        <Text style={[s.tileValue, { color: done ? color : COLORS.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[s.tileUnit, { color: COLORS.textMuted }]}>{unit}</Text>
      </View>
      {/* 진행 바 */}
      <View style={s.tileBarTrack}>
        <View style={[s.tileBarFill, {
          width: `${pct}%` as any,
          backgroundColor: done ? color : color + 'CC',
        }]} />
      </View>
      {/* 서브 텍스트 */}
      <Text style={[s.tileSub, { color: done ? color : COLORS.textDisabled }]} numberOfLines={1}>{sub}</Text>
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
    borderRadius: RADIUS.md + 2,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    gap: 6,
  },
  tileGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconBox: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: 10, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 0.3 },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  tileValue: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -1 },
  tileUnit: { fontSize: FONTS.xxs, fontFamily: 'monospace', fontWeight: '600', paddingBottom: 2 },
  tileBarTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  tileBarFill: { height: '100%', borderRadius: RADIUS.full },
  tileSub: { fontSize: 10, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 0.3 },
});
