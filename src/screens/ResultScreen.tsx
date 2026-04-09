import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatBar from '../components/StatBar';
import { COLORS, FONTS, getRank, RADIUS, SPACING } from '../constants/theme';
import { RootStackParamList, ScoreFactor } from '../types';
import { getConditionFeedback, getScoreFactors, getTodayFortune } from '../utils/feedback';

type Route = RouteProp<RootStackParamList, 'Result'>;

export default function ResultScreen() {
  const navigation = useNavigation();
  const { log } = useRoute<Route>().params;
  const { conditionScore, scoreBreakdown, stats } = log;

  const rank = getRank(conditionScore);
  const feedback = getConditionFeedback(conditionScore);
  const factors: ScoreFactor[] = getScoreFactors(scoreBreakdown, log);
  const fortune = getTodayFortune(log.date);

  // 점수 카운트업 애니메이션
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scoreAnim, { toValue: conditionScore, duration: 1000, useNativeDriver: false }),
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const animatedScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0', '100'],
  });

  const gains = factors.filter(f => f.value > 0);
  const losses = factors.filter(f => f.value < 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 점수 히어로 섹션 */}
        <Animated.View style={[styles.heroCard, { opacity: fadeIn }]}>
          <Text style={styles.heroEmoji}>
            {conditionScore >= 90 ? '🦸' : conditionScore >= 75 ? '⚔️' : conditionScore >= 55 ? '🧑‍🌾' : conditionScore >= 35 ? '😮‍💨' : '😵'}
          </Text>
          <Text style={styles.heroLabel}>오늘의 컨디션 점수</Text>
          <Animated.Text style={[styles.heroScore, { color: rank.color }]}>
            {animatedScore}
          </Animated.Text>
          <View style={[styles.rankBadge, { borderColor: rank.color }]}>
            <Text style={[styles.rankText, { color: rank.color }]}>
              {rank.rank} 등급 — {rank.label}
            </Text>
          </View>
          <Text style={styles.feedbackText}>"{feedback}"</Text>
        </Animated.View>

        {/* 점수 분석 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>점수 분석</Text>
          <View style={styles.baseRow}>
            <Text style={styles.baseLabel}>기본 점수</Text>
            <Text style={styles.baseValue}>+{scoreBreakdown.base}</Text>
          </View>

          {gains.length > 0 && (
            <>
              <Text style={styles.factorGroupLabel}>가점 요인</Text>
              {gains.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <Text style={styles.factorEmoji}>{f.emoji}</Text>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={[styles.factorValue, { color: COLORS.teal }]}>+{f.value}</Text>
                </View>
              ))}
            </>
          )}

          {losses.length > 0 && (
            <>
              <Text style={[styles.factorGroupLabel, { color: COLORS.red }]}>감점 요인</Text>
              {losses.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <Text style={styles.factorEmoji}>{f.emoji}</Text>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={[styles.factorValue, { color: COLORS.red }]}>{f.value}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>최종 점수</Text>
            <Text style={[styles.totalValue, { color: rank.color }]}>{conditionScore}</Text>
          </View>
        </View>

        {/* 캐릭터 스탯 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>캐릭터 스탯 업데이트</Text>
          <StatBar label="체력 (HP)" value={stats.hp} color={COLORS.teal} />
          <StatBar label="컨디션" value={stats.condition} color={COLORS.purple} />
          <StatBar label="지구력" value={stats.stamina} color={COLORS.gold} />
          <StatBar label="회복력" value={stats.recovery} color={COLORS.blue} />
          <StatBar label="혈당 조절력" value={stats.bloodSugarControl} color={COLORS.green} />
        </View>

        {/* 오늘의 운세 */}
        <View style={[styles.card, { borderColor: COLORS.gold + '44' }]}>
          <Text style={styles.sectionTitle}>오늘의 운세</Text>
          <Text style={styles.fortuneText}>{fortune.text}</Text>
          <Text style={[styles.fortuneLucky, { color: COLORS.gold }]}>행운의 아이템: {fortune.lucky}</Text>
        </View>

        {/* 내일 목표 제안 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>내일 이것만 해봐요</Text>
          {conditionScore < 60 && <TipRow emoji="😴" tip="오늘 일찍 자서 7-8시간 채워보세요." />}
          {scoreBreakdown.alcoholPenalty < -10 && <TipRow emoji="🚫" tip="내일은 술을 쉬어가요. 혈당이 안정됩니다." />}
          {stats.stamina < 50 && <TipRow emoji="🚲" tip="자전거 30분이 혈당 조절에 효과적이에요." />}
          {scoreBreakdown.mealBonus < 0 && <TipRow emoji="🥗" tip="채소 반찬 한 가지 추가만으로도 달라져요." />}
          {stats.bloodSugarControl < 60 && <TipRow emoji="📊" tip="식후 2시간 혈당을 꼭 측정해보세요." />}
          {conditionScore >= 80 && <TipRow emoji="🌟" tip="완벽한 루틴! 내일도 오늘처럼만 해주세요." />}
        </View>

        {/* 버튼 */}
        <TouchableOpacity style={styles.homeBtn} onPress={() => (navigation as any).navigate('MainTabs')}>
          <Text style={styles.homeBtnText}>홈으로 돌아가기</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TipRow({ emoji, tip }: { emoji: string; tip: string }) {
  return (
    <View style={styles.tipRow}>
      <Text style={styles.tipEmoji}>{emoji}</Text>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroEmoji: { fontSize: 72, marginBottom: 4 },
  heroLabel: { color: COLORS.textMuted, fontSize: FONTS.sm },
  heroScore: {
    fontSize: 88,
    fontWeight: '900',
    lineHeight: 96,
    marginVertical: 4,
  },
  rankBadge: {
    borderWidth: 1.5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginTop: 4,
  },
  rankText: { fontSize: FONTS.sm, fontWeight: '700' },
  feedbackText: {
    color: COLORS.textMuted,
    fontSize: FONTS.md,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  baseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  baseLabel: { color: COLORS.textMuted, fontSize: FONTS.sm },
  baseValue: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  factorGroupLabel: {
    color: COLORS.teal,
    fontSize: FONTS.xs,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  factorEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  factorLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.sm },
  factorValue: { fontSize: FONTS.sm, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.md },
  totalValue: { fontSize: FONTS.xl, fontWeight: '900' },
  fortuneText: { color: COLORS.text, fontSize: FONTS.md, lineHeight: 22 },
  fortuneLucky: { fontSize: FONTS.sm, marginTop: 6, fontWeight: '600' },
  tipRow: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 20 },
  homeBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: { color: COLORS.textMuted, fontSize: FONTS.md, fontWeight: '600' },
});
