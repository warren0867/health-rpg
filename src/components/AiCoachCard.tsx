import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { DailyLog, InBodyRecord, PermanentStats, UserProfile } from '../types';
import { getCheckInFeedback } from '../utils/aiCoach';
import { RecentCondition } from '../utils/permanentStats';

interface Props {
  log: DailyLog;
  profile: UserProfile;
  recentLogs: DailyLog[];
  inbodyRecords: InBodyRecord[];
  permStats: PermanentStats;
  conditionInfo?: RecentCondition;
  onOpenChat: () => void;
}

export default function AiCoachCard({
  log, profile, recentLogs, inbodyRecords, permStats, conditionInfo, onOpenChat,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCheckInFeedback({ log, profile, recentLogs, inbodyRecords, permStats, conditionInfo })
      .then(text => { setFeedback(text); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <View style={s.card}>
      <View style={s.glow} pointerEvents="none" />

      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons name="sparkles" size={16} color={COLORS.purple} />
        </View>
        <Text style={s.title}>AI 코치 피드백</Text>
        <Text style={s.badge}>claude</Text>
      </View>

      {loading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.purple} />
          <Text style={s.loadingText}>데이터 분석 중...</Text>
        </View>
      ) : error ? (
        <Text style={s.errorText}>피드백을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</Text>
      ) : (
        <Text style={s.feedbackText}>{feedback}</Text>
      )}

      <TouchableOpacity style={s.chatBtn} onPress={onOpenChat} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.purple} />
        <Text style={s.chatBtnText}>코치에게 더 물어보기</Text>
        <Ionicons name="chevron-forward" size={13} color={COLORS.purple} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.purple + '44',
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.purpleGlow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconWrap: {
    width: 30, height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.purple + '22',
    borderWidth: 1,
    borderColor: COLORS.purple + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.purple,
    flex: 1,
  },
  badge: {
    fontSize: FONTS.xxs - 1,
    color: COLORS.purple + 'AA',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: FONTS.xs,
    color: COLORS.bad,
    lineHeight: 18,
    paddingVertical: 4,
  },
  feedbackText: {
    fontSize: FONTS.sm,
    color: COLORS.textSub,
    lineHeight: 22,
    marginBottom: 12,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.purple + '22',
    paddingTop: 12,
  },
  chatBtnText: {
    fontSize: FONTS.xs,
    color: COLORS.purple,
    fontWeight: '700',
    flex: 1,
  },
});
