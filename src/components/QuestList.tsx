import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export interface Quest {
  label: string;
  sub: string;
  done: boolean;
  xp: number;
  gold?: number;
  action?: () => void;
}

interface Props {
  quests: Quest[];
}

/**
 * 오늘의 퀘스트 리스트.
 * 클리어 = 앰버색 체크박스 + 라벨 strikethrough.
 * 미완료 = 빈 체크박스, 탭하면 해당 화면으로 이동(action prop).
 */
export default function QuestList({ quests }: Props) {
  const done = quests.filter(q => q.done).length;
  const total = quests.length;
  const pct = Math.round((done / Math.max(1, total)) * 100);
  const allDone = done === total && total > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>오늘의 퀘스트</Text>
        <Text style={styles.progress}>
          <Text style={[styles.progressDone, { color: allDone ? COLORS.amber : COLORS.text }]}>{done}</Text>
          <Text style={styles.progressDim}> / {total} 클리어</Text>
        </Text>
      </View>

      {/* 진행 바 */}
      <View style={styles.bar}>
        <View style={[styles.barFill, {
          width: `${pct}%`,
          backgroundColor: allDone ? COLORS.amber : COLORS.primary,
        }]} />
      </View>

      {quests.map((q, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.row, i === quests.length - 1 && styles.rowLast]}
          onPress={q.action}
          activeOpacity={q.action ? 0.6 : 1}
          disabled={!q.action}
        >
          <View style={[styles.checkbox, q.done && styles.checkboxDone]}>
            {q.done && <Ionicons name="checkmark" size={13} color="#000" />}
          </View>
          <View style={styles.text}>
            <Text style={[styles.label, q.done && styles.labelDone]}>{q.label}</Text>
            <Text style={styles.sub}>{q.done ? 'CLEARED' : q.sub}</Text>
          </View>
          <View style={styles.rewardGroup}>
            <View style={[styles.xpPill, q.done && styles.xpPillDone]}>
              <Text style={[styles.xpText, q.done && styles.xpTextDone]}>+{q.xp} XP</Text>
            </View>
            {(q.gold ?? 0) > 0 && (
              <View style={[styles.goldPill, q.done && styles.xpPillDone]}>
                <Text style={[styles.goldText, q.done && styles.xpTextDone]}>🪙 {q.gold}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  progress: { fontFamily: 'monospace', fontSize: FONTS.xxs },
  progressDone: { fontWeight: '800' },
  progressDim: { color: COLORS.textMuted },

  bar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: SPACING.md + 2,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.full },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSub,
  },
  rowLast: { borderBottomWidth: 0 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: COLORS.textDisabled,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  text: { flex: 1 },
  label: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.text },
  labelDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  sub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2 },
  rewardGroup: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  xpPill: {
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.amberGlow,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  xpPillDone: { backgroundColor: COLORS.bgInput, borderColor: COLORS.border },
  xpText: { fontFamily: 'monospace', fontSize: FONTS.xxs, fontWeight: '700', color: COLORS.amber },
  xpTextDone: { color: COLORS.textMuted },
  goldPill: {
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
  },
  goldText: { fontFamily: 'monospace', fontSize: FONTS.xxs, fontWeight: '700', color: '#F59E0B' },
});
