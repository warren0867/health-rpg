import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

interface StatBarProps {
  label: string;
  abbr?: string;
  value: number; // 0~100
  color?: string;
  showValue?: boolean;
  animated?: boolean;
}

export default function StatBar({
  label,
  abbr,
  value,
  color = COLORS.purple,
  showValue = true,
  animated = true,
}: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clamped,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          {abbr && (
            <Text style={[styles.abbr, { color: COLORS.textMuted }]}>{abbr}</Text>
          )}
          <Text style={styles.label}>{label}</Text>
        </View>
        {showValue && (
          <Text style={[styles.value, { color }]}>{clamped}</Text>
        )}
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: animatedWidth, backgroundColor: color }]}
        />
        {/* glow layer */}
        <Animated.View
          style={[styles.glow, { width: animatedWidth, backgroundColor: color }]}
        />
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
    alignItems: 'center',
    marginBottom: 4,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  abbr: {
    fontSize: FONTS.xxs,
    fontWeight: '900',
    width: 30,
    fontFamily: 'monospace',
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
  },
  value: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    fontFamily: 'monospace',
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
  glow: {
    position: 'absolute',
    height: '100%',
    borderRadius: RADIUS.full,
    opacity: 0.25,
    top: 0,
  },
});
