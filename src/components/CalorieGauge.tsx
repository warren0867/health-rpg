import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { CalorieGaugeData } from '../utils/calorieCalculator';

interface CalorieGaugeProps {
  data: CalorieGaugeData;
  carbs: number;
  protein: number;
  fat: number;
  carbsGoal: number;
  proteinGoal: number;
  fatGoal: number;
  compact?: boolean;
}

const GAUGE_SIZE = 180;
const STROKE = 14;

function getGaugeColor(status: CalorieGaugeData['status']): string {
  if (status === 'safe') return COLORS.teal;
  if (status === 'caution') return COLORS.gold;
  return COLORS.red;
}

// 원형 게이지 — React Native border trick 구현
function CircleGauge({ percentage, color, size }: { percentage: number; color: string; size: number }) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const half = size / 2;
  const stroke = STROKE;

  // 두 반원을 회전시켜 arc 구현
  const leftDeg = clampedPct > 50
    ? 180
    : (clampedPct / 50) * 180;
  const rightDeg = clampedPct > 50
    ? ((clampedPct - 50) / 50) * 180
    : 0;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* 트랙 (회색 원) */}
      <View style={[styles.circle, { width: size, height: size, borderColor: COLORS.bgHighlight }]} />

      {/* 왼쪽 반원 채우기 */}
      <View style={[styles.halfCircleContainer, { width: half, height: size, left: 0 }]}>
        <View style={[
          styles.halfCircle,
          { width: size, height: size, borderColor: rightDeg > 0 ? color : COLORS.bgHighlight, borderRadius: half },
          { transform: [{ rotate: `${leftDeg}deg` }] }
        ]} />
      </View>

      {/* 오른쪽 반원 채우기 */}
      <View style={[styles.halfCircleContainer, { width: half, height: size, right: 0 }]}>
        <View style={[
          styles.halfCircle,
          styles.halfCircleRight,
          { width: size, height: size, borderColor: color, borderRadius: half },
          { transform: [{ rotate: `${rightDeg}deg` }] }
        ]} />
      </View>

      {/* 내부 원 (도넛 구멍) */}
      <View style={[
        styles.innerCircle,
        {
          width: size - stroke * 2,
          height: size - stroke * 2,
          top: stroke,
          left: stroke,
          backgroundColor: COLORS.bgCard,
        }
      ]} />
    </View>
  );
}

// 매크로 바 (가로)
function MacroBar({ label, consumed, goal, color }: { label: string; consumed: number; goal: number; color: string }) {
  const pct = Math.min(100, goal > 0 ? (consumed / goal) * 100 : 0);
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <Animated.View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroValue, { color }]}>{consumed}g</Text>
    </View>
  );
}

export default function CalorieGauge({
  data, carbs, protein, fat, carbsGoal, proteinGoal, fatGoal, compact = false
}: CalorieGaugeProps) {
  const gaugeColor = getGaugeColor(data.status);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactLeft}>
          <Text style={styles.compactConsumed}>{data.consumed}</Text>
          <Text style={styles.compactUnit}>kcal 섭취</Text>
        </View>
        <View style={styles.compactBar}>
          <View style={[styles.compactFill, {
            width: `${data.percentage}%`,
            backgroundColor: gaugeColor,
          }]} />
        </View>
        <View style={styles.compactRight}>
          <Text style={[styles.compactRemaining, { color: data.remaining < 0 ? COLORS.red : COLORS.text }]}>
            {data.remaining < 0 ? `+${Math.abs(data.remaining)}` : data.remaining}
          </Text>
          <Text style={styles.compactUnit}>{data.remaining < 0 ? 'kcal 초과' : 'kcal 남음'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 원형 게이지 */}
      <View style={styles.gaugeWrapper}>
        <CircleGauge percentage={data.percentage} color={gaugeColor} size={GAUGE_SIZE} />
        {/* 중앙 텍스트 */}
        <View style={[styles.centerText, { width: GAUGE_SIZE, height: GAUGE_SIZE }]}>
          <Text style={[styles.consumedText, { color: gaugeColor }]}>{data.consumed}</Text>
          <Text style={styles.goalText}>/ {data.goal} kcal</Text>
          <Text style={[styles.remainText, { color: data.remaining < 0 ? COLORS.red : COLORS.textMuted }]}>
            {data.remaining < 0 ? `${Math.abs(data.remaining)} 초과` : `${data.remaining} 남음`}
          </Text>
        </View>
      </View>

      {/* 매크로 */}
      <View style={styles.macrosContainer}>
        <MacroBar label="탄수화물" consumed={carbs} goal={carbsGoal} color={COLORS.gold} />
        <MacroBar label="단백질" consumed={protein} goal={proteinGoal} color={COLORS.teal} />
        <MacroBar label="지방" consumed={fat} goal={fatGoal} color={COLORS.orange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  gaugeWrapper: { alignItems: 'center', justifyContent: 'center' },
  circle: {
    position: 'absolute',
    borderWidth: STROKE,
    borderRadius: GAUGE_SIZE / 2,
  },
  halfCircleContainer: {
    position: 'absolute',
    overflow: 'hidden',
    top: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    borderWidth: STROKE,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  halfCircleRight: {
    right: 0,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  innerCircle: {
    position: 'absolute',
    borderRadius: GAUGE_SIZE / 2,
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedText: { fontSize: 32, fontWeight: '900' },
  goalText: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  remainText: { fontSize: FONTS.xs, marginTop: 2, fontWeight: '600' },
  macrosContainer: { width: '100%', marginTop: 16, gap: 8 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, width: 52 },
  macroTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: RADIUS.full },
  macroValue: { fontSize: FONTS.xs, fontWeight: '700', width: 36, textAlign: 'right' },
  // compact
  compactContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactLeft: { alignItems: 'flex-end', minWidth: 60 },
  compactRight: { alignItems: 'flex-start', minWidth: 60 },
  compactConsumed: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900' },
  compactRemaining: { fontSize: FONTS.md, fontWeight: '700' },
  compactUnit: { color: COLORS.textMuted, fontSize: FONTS.xs },
  compactBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  compactFill: { height: '100%', borderRadius: RADIUS.full },
});
