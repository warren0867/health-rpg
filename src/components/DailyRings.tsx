import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Props {
  calorie: { current: number; goal: number };
  water: { currentMl: number; goalMl: number };
  quest: { done: number; total: number };
}

/**
 * Apple Fitness 스타일 3개 링.
 * 칼로리(사이안) · 수분(파랑) · 퀘스트(앰버) — 한눈에 일일 요약.
 *
 * 주의: react-native-svg 의존성 없이 RN의 borderRadius+rotate 트릭으로 그리려면 복잡해서,
 * 여기서는 막대 형태로 단순화. 정식 링은 svg 의존성 추가 후 변경 가능.
 */
export default function DailyRings({ calorie, water, quest }: Props) {
  const calPct = Math.min(100, Math.round((calorie.current / calorie.goal) * 100));
  const waterPct = Math.min(100, Math.round((water.currentMl / water.goalMl) * 100));
  const questPct = Math.min(100, Math.round((quest.done / Math.max(1, quest.total)) * 100));

  const waterL = (water.currentMl / 1000).toFixed(1);
  const waterGoalL = (water.goalMl / 1000).toFixed(1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>오늘의 활동</Text>

      <RingRow
        color={COLORS.primary}
        label="칼로리"
        value={`${calorie.current.toLocaleString()} / ${calorie.goal.toLocaleString()}`}
        pct={calPct}
      />
      <RingRow
        color={COLORS.info}
        label="수분"
        value={`${waterL} / ${waterGoalL}L`}
        pct={waterPct}
      />
      <RingRow
        color={COLORS.amber}
        label="퀘스트"
        value={`${quest.done} / ${quest.total}`}
        pct={questPct}
      />
    </View>
  );
}

function RingRow({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.dotWrap}>
        <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  dotWrap: { width: 16, alignItems: 'center' },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  label: { color: COLORS.textSub, fontSize: FONTS.sm, width: 56 },
  trackWrap: { flex: 1 },
  track: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.full },
  value: {
    fontSize: FONTS.xs,
    color: COLORS.text,
    fontFamily: 'monospace',
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
});
