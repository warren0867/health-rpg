import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Stats {
  hp: number;
  stamina: number;        // STR
  recovery: number;       // VIT
  bloodSugarControl: number; // MP
  condition?: number;     // 사용 안 하지만 호환용
}

interface Props {
  stats: Stats;
  max?: number; // 기본 100
}

/**
 * 캐릭터 4스탯 2x2 그리드.
 * 각 스탯은 색깔로 구분 (이모지 X, Ionicons 사용).
 * 5번째 스탯 condition은 새 디자인에서 제거됨 (가독성 우선).
 */
export default function StatGrid({ stats, max = 100 }: Props) {
  const items = [
    { key: 'hp',  abbr: 'HP',  icon: 'heart' as const,         color: COLORS.hp,  value: stats.hp },
    { key: 'str', abbr: 'STR', icon: 'flash' as const,         color: COLORS.str, value: stats.stamina },
    { key: 'vit', abbr: 'VIT', icon: 'shield-checkmark' as const, color: COLORS.vit, value: stats.recovery },
    { key: 'mp',  abbr: 'MP',  icon: 'water' as const,         color: COLORS.mp,  value: stats.bloodSugarControl },
  ];

  return (
    <View style={styles.grid}>
      {items.map(item => {
        const pct = Math.min(100, Math.round((item.value / max) * 100));
        const tintBg = item.color + '1F'; // ~12% alpha
        return (
          <View key={item.key} style={styles.cell}>
            <View style={styles.top}>
              <View style={[styles.iconBox, { backgroundColor: tintBg }]}>
                <Ionicons name={item.icon} size={14} color={item.color} />
              </View>
              <Text style={styles.abbr}>{item.abbr}</Text>
            </View>
            <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: 10,
  },
  cell: {
    width: '48.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBox: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  abbr: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  value: {
    fontFamily: 'monospace',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -1,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.full,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.full },
});
