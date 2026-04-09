import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, getRank, RADIUS, SPACING } from '../constants/theme';
import { DailyLog } from '../types';
import { formatDate, getAllDailyLogs } from '../utils/storage';

export default function HistoryScreen() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const all = await getAllDailyLogs();
        setLogs(all);
        setLoading(false);
      })();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.purple} size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // 평균 점수
  const avg = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + l.conditionScore, 0) / logs.length)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>전체 기록</Text>

        {/* 요약 */}
        {avg !== null && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.length}</Text>
              <Text style={styles.summaryLabel}>총 기록일</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getRank(avg).color }]}>{avg}</Text>
              <Text style={styles.summaryLabel}>평균 점수</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getRank(avg).color }]}>
                {getRank(avg).rank}
              </Text>
              <Text style={styles.summaryLabel}>평균 등급</Text>
            </View>
          </View>
        )}

        {/* 로그 리스트 */}
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>아직 기록이 없어요{'\n'}입력 탭에서 첫 기록을 남겨보세요!</Text>
        ) : (
          logs.map(log => {
            const rank = getRank(log.conditionScore);
            return (
              <View key={log.date} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  <View style={styles.logRankBadge}>
                    <Text style={[styles.logRank, { color: rank.color }]}>{rank.rank}</Text>
                  </View>
                  <Text style={[styles.logScore, { color: rank.color }]}>{log.conditionScore}점</Text>
                </View>
                <View style={styles.logStats}>
                  <LogStat label="수면" value={`${log.sleep.hours}h`} />
                  <LogStat
                    label="운동"
                    value={log.exercise.type === 'none' ? '없음' : `${log.exercise.minutes}분`}
                  />
                  <LogStat
                    label="음주"
                    value={log.alcohol.consumed ? `${log.alcohol.liters}L` : '없음'}
                    danger={log.alcohol.consumed}
                  />
                </View>
                {/* 스탯 미니 바 */}
                <View style={styles.miniStatRow}>
                  {[
                    { label: 'HP', value: log.stats.hp, color: COLORS.teal },
                    { label: '지구력', value: log.stats.stamina, color: COLORS.gold },
                    { label: '회복', value: log.stats.recovery, color: COLORS.blue },
                    { label: '혈당', value: log.stats.bloodSugarControl, color: COLORS.green },
                  ].map(s => (
                    <View key={s.label} style={styles.miniStat}>
                      <Text style={[styles.miniStatVal, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.miniStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LogStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.logStatItem}>
      <Text style={styles.logStatLabel}>{label}</Text>
      <Text style={[styles.logStatValue, danger && { color: COLORS.red }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  pageTitle: {
    fontSize: FONTS.xxl,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  divider: { width: 1, backgroundColor: COLORS.border },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
    lineHeight: 24,
  },
  logCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logDate: { flex: 1, color: COLORS.text, fontWeight: '700', fontSize: FONTS.md },
  logRankBadge: {
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logRank: { fontWeight: '900', fontSize: FONTS.sm },
  logScore: { fontSize: FONTS.lg, fontWeight: '900' },
  logStats: { flexDirection: 'row', gap: SPACING.md },
  logStatItem: { alignItems: 'center' },
  logStatLabel: { color: COLORS.textMuted, fontSize: FONTS.xs },
  logStatValue: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  miniStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: FONTS.sm, fontWeight: '900' },
  miniStatLabel: { color: COLORS.textDisabled, fontSize: 10 },
});
