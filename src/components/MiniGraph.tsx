import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { DailyLog } from '../types';
import { formatDate } from '../utils/storage';

interface MiniGraphProps {
  logs: DailyLog[]; // 최근 N일, 오래된 순 정렬
}

function scoreToColor(score: number): string {
  if (score >= 75) return COLORS.teal;
  if (score >= 55) return COLORS.gold;
  return COLORS.red;
}

export default function MiniGraph({ logs }: MiniGraphProps) {
  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 기록이 없어요</Text>
      </View>
    );
  }

  const maxScore = 100;
  const BAR_MAX_HEIGHT = 70;

  return (
    <View style={styles.container}>
      {logs.map((log) => {
        const barH = Math.max(4, (log.conditionScore / maxScore) * BAR_MAX_HEIGHT);
        const color = scoreToColor(log.conditionScore);
        return (
          <View key={log.date} style={styles.barCol}>
            <Text style={[styles.scoreLabel, { color }]}>{log.conditionScore}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
            </View>
            <Text style={styles.dateLabel}>{formatDate(log.date)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 8,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    height: 70,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.sm,
  },
  scoreLabel: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  empty: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
  },
});
