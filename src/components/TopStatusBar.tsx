import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface Props {
  gold: number;
  streak: number;
  level: number;
  dateLabel: string;
  onPressNotif?: () => void;
  onPressGold?: () => void;
}

/**
 * 미니멀 상단 바 — 날짜 (선택적 스트릭) / 알림
 * 골드·레벨 등은 캐릭터 카드 안에서 처리.
 */
export default function TopStatusBar({ streak, dateLabel, onPressNotif }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.left}>
        <Text style={s.dateText}>{dateLabel}</Text>
        {streak >= 2 && (
          <View style={s.streakChip}>
            <Ionicons name="flame" size={10} color={COLORS.amber} />
            <Text style={s.streakText}>{streak}일</Text>
          </View>
        )}
      </View>

      <Pressable onPress={onPressNotif} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}>
        <Ionicons name="notifications-outline" size={19} color={COLORS.textSub} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.amberGlow,
  },
  streakText: { fontSize: 10, color: COLORS.amber, fontWeight: '700' },
  iconBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});
