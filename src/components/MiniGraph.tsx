import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { DailyLog } from '../types';
import { getRank } from '../constants/theme';

interface MiniGraphProps {
  logs: DailyLog[]; // 최근 N일, 오래된 순 정렬
}

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

  const BAR_MAX_HEIGHT = 70;

  return (
    <View style={styles.container}>
      {logs.map((log, index) => {
        const rank = getRank(log.conditionScore);
        const barH = Math.max(4, (log.conditionScore / 100) * BAR_MAX_HEIGHT);
        const dateLabel = log.date.slice(5); // MM-DD

        return (
          <View key={log.date} style={styles.barCol}>
            <Text style={[styles.scoreLabel, { color: rank.color }]}>
              {log.conditionScore}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barH,
                    backgroundColor: rank.color,
                  },
                ]}
              />
              {/* glow */}
              <View
                style={[
                  styles.barGlow,
                  {
                    height: barH,
                    backgroundColor: rank.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
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
    gap: 5,
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
    position: 'relative',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.sm,
  },
  barGlow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: RADIUS.sm,
    opacity: 0.2,
  },
  scoreLabel: {
    fontSize: FONTS.xxs,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dateLabel: {
    fontSize: FONTS.xxs,
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
