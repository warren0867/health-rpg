import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Props {
  gold: number;
  streak: number;
  level: number;
  dateLabel: string;
  onPressNotif?: () => void;
  onPressGold?: () => void;
}

/**
 * 상단 status bar — 게임 풍 칩들 (골드 · 스트릭 · 레벨 + 알림)
 * 헤더의 일부로 hero banner 위에 위치.
 */
export default function TopStatusBar({ gold, streak, level, dateLabel, onPressNotif, onPressGold }: Props) {
  return (
    <View style={s.wrap}>
      {/* 좌측: 날짜 + 스트릭 */}
      <View style={s.leftBlock}>
        <Text style={s.dateText}>{dateLabel}</Text>
        {streak > 0 && (
          <View style={s.streakChip}>
            <Ionicons name="flame" size={11} color={COLORS.amber} />
            <Text style={s.streakNum}>{streak}</Text>
            <Text style={s.streakUnit}>일</Text>
          </View>
        )}
      </View>

      {/* 우측: 골드 + 레벨 + 알림 */}
      <View style={s.rightBlock}>
        <Pressable onPress={onPressGold} style={({ pressed }) => [s.chip, s.chipGold, pressed && { opacity: 0.7 }]}>
          <View style={s.chipIconGold}>
            <Ionicons name="logo-bitcoin" size={11} color={COLORS.amber} />
          </View>
          <Text style={s.chipGoldText}>{formatGold(gold)}</Text>
        </Pressable>

        <View style={[s.chip, s.chipLevel]}>
          <Text style={s.chipLevelLabel}>Lv</Text>
          <Text style={s.chipLevelNum}>{level}</Text>
        </View>

        <Pressable onPress={onPressNotif} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.textSub} />
          <View style={s.iconBtnDot} />
        </Pressable>
      </View>
    </View>
  );
}

function formatGold(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 1000)  return `${(n / 1000).toFixed(2)}K`;
  return n.toLocaleString();
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  leftBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.amberGlow,
    borderWidth: 1, borderColor: COLORS.amberLine,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  streakNum: { color: COLORS.amber, fontSize: 11, fontWeight: '900', fontFamily: 'monospace' },
  streakUnit: { color: COLORS.amber, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', opacity: 0.85 },

  rightBlock: { flexDirection: 'row', alignItems: 'center', gap: 7 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full,
    paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1,
  },
  chipGold: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.35)',
    paddingLeft: 4,
  },
  chipIconGold: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipGoldText: {
    fontSize: 12, fontWeight: '900', fontFamily: 'monospace',
    color: COLORS.amber, letterSpacing: 0.3,
  },

  chipLevel: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primaryLine,
    paddingHorizontal: 9,
    gap: 3,
  },
  chipLevelLabel: { fontSize: 9, fontWeight: '900', color: COLORS.primary, fontFamily: 'monospace', letterSpacing: 0.5, opacity: 0.85 },
  chipLevelNum:   { fontSize: 12, fontWeight: '900', color: COLORS.primary, fontFamily: 'monospace' },

  iconBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  iconBtnDot: {
    position: 'absolute', top: 7, right: 7,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
});
