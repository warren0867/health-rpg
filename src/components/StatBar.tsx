import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

interface StatBarProps {
  label: string;
  value: number; // 0~100
  color?: string;
  showValue?: boolean;
}

export default function StatBar({ label, value, color = COLORS.purple, showValue = true }: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue && <Text style={[styles.value, { color }]}>{clamped}</Text>}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
  },
  value: {
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
