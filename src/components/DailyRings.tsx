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
      <MetricTile
        icon="flame"
        color={COLORS.primary}
        value={calorie.current > 0 ? calorie.current.toLocaleString() : '0'}
        unit="kcal"
        label="칼로리"
        pct={calPct}
        sub={`${calorie.goal.toLocaleString()}`}
      />
      <MetricTile
        icon="water"
        color={COLORS.info}
        value={waterL}
        unit="L"
        label="수분"
        pct={waterPct}
        sub={`${(water.goalMl / 1000).toFixed(1)}L`}
      />
      <MetricTile
        icon="checkmark-circle"
        color={COLORS.amber}
        value={String(quest.done)}
        unit={`/${quest.total}`}
        label="퀘스트"
        pct={questPct}
        sub={questPct >= 100 ? 'CLEAR!' : `${questPct}%`}
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
    <View style={[s.tile, { borderColor: color + (done ? '88' : '33') }]}>
      {/* 그라데이션 배경 (3겹 페이크) */}
      <View style={[s.bgBottom, { backgroundColor: color + '14' }]} pointerEvents="none" />
      <View style={[s.bgGlow, { backgroundColor: color + '22' }]} pointerEvents="none" />
      <View style={s.bgTopShine} pointerEvents="none" />

      {/* 상단: 아이콘 + 라벨 */}
      <View style={s.tileHeader}>
        <View style={[s.iconBox, { backgroundColor: color + '28', borderColor: color + '55' }]}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        <Text style={[s.tileLabel, { color: color + 'CC' }]}>{label}</Text>
      </View>

      {/* 큰 숫자 */}
      <View style={s.tileValueRow}>
        <Text style={[s.tileValue, { color: done ? color : COLORS.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={s.tileUnit}>{unit}</Text>
      </View>

      {/* 진행 바 */}
      <View style={s.tileBarTrack}>
        <View
          style={[
            s.tileBarFill,
            {
              width: `${pct}%` as any,
              backgroundColor: done ? color : color,
            },
          ]}
        >
          <View style={s.tileBarShine} pointerEvents="none" />
        </View>
      </View>

      {/* 서브 */}
      <View style={s.tileFooter}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'arrow-up-circle-outline'}
          size={10}
          color={done ? color : COLORS.textDisabled}
        />
        <Text style={[s.tileSub, { color: done ? color : COLORS.textDisabled }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 9,
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md + 2,
    padding: 11,
    paddingBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  bgGlow: {
    position: 'absolute', top: -28, right: -28,
    width: 76, height: 76, borderRadius: 38,
    opacity: 0.7,
  },
  bgTopShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: COLORS.glassTop,
  },

  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconBox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 0.5 },

  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, minHeight: 28 },
  tileValue: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -1.2 },
  tileUnit: { fontSize: 10, fontFamily: 'monospace', fontWeight: '700', color: COLORS.textMuted, paddingBottom: 2 },

  tileBarTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.full, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  tileBarFill: { height: '100%', borderRadius: RADIUS.full, position: 'relative', overflow: 'hidden' },
  tileBarShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tileSub: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 0.3 },
});
