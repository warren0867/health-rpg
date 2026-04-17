import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { DailyLog } from '../types';
import { getRank } from '../constants/theme';

interface MiniGraphProps {
  logs: DailyLog[]; // 최근 N일, 오래된 순 정렬
}

const BAR_W = 10;
const BAR_MAX_H = 64;
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function MiniGraph({ logs }: MiniGraphProps) {
  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>아직 기록이 없어요</Text>
        <Text style={styles.emptySubText}>오늘 첫 기록을 남겨보세요!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {logs.map((log, index) => {
        const rank = getRank(log.conditionScore);
        const barH = Math.max(5, (log.conditionScore / 100) * BAR_MAX_H);
        const dayName = DAY_NAMES[new Date(log.date).getDay()];
        const isWeekend = new Date(log.date).getDay() === 0 || new Date(log.date).getDay() === 6;
        const isLatest = index === logs.length - 1;

        return (
          <View key={log.date} style={styles.barCol}>
            <Text style={[styles.scoreLabel, { color: rank.color }]}>
              {log.conditionScore}
            </Text>
            {/* 슬림 필 바 */}
            <View style={[styles.barTrack, { opacity: isLatest ? 1 : 0.75 }]}>
              <View style={[styles.bar, { height: barH, backgroundColor: rank.color }]} />
            </View>
            <Text style={[styles.dayLabel, { color: isWeekend ? COLORS.purple : COLORS.textSub }]}>
              {dayName}
            </Text>
            <Text style={styles.dateLabel}>{log.date.slice(5)}</Text>
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
    paddingVertical: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  barTrack: {
    width: BAR_W,
    height: BAR_MAX_H,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.bgHighlight,
    borderRadius: BAR_W / 2,
    overflow: 'hidden',
  },
  bar: {
    width: BAR_W,
    borderRadius: BAR_W / 2,
  },
  scoreLabel: {
    fontSize: FONTS.xxs,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  empty: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.3,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  emptySubText: {
    color: COLORS.textDisabled,
    fontSize: FONTS.xs,
  },
});
