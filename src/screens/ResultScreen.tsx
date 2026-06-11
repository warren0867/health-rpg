import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Clipboard, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING, getRank } from '../constants/theme';
import { DailyLog, InBodyRecord, PermanentStats, RootStackParamList, STAT_FULLNAME, STAT_LABEL, ScoreFactor, StatKey, UserProfile } from '../types';
import AiCoachCard from '../components/AiCoachCard';
import { getConditionFeedback, getScoreFactors } from '../utils/feedback';
import { getLevelFromXP, getLevelTitle, getXPProgress } from '../utils/levelSystem';
import { calcRecentCondition, RecentCondition } from '../utils/permanentStats';
import { getAllDailyLogs, getInBodyRecords, getUserProfile, getUserXP } from '../utils/storage';

type Route = RouteProp<RootStackParamList, 'Result'>;

/**
 * 결과 화면 — RPG 풀발동 모먼트 (디자인 시스템의 20% 영역)
 *
 * 핵심 의도: 평소엔 절제된 헬스 앱이지만 결과를 받는 순간 RPG가 깨어남.
 *  - 거대한 등급 글자 (S/A/B 등)
 *  - 글로우 + 그라디언트
 *  - 스탯 게인 애니메이션
 *  - "DUNGEON CLEARED" 게임적 카피
 */
export default function ResultScreen() {
  const navigation = useNavigation<any>();
  const { log, permStatsBefore, permStatsAfter } = useRoute<Route>().params;
  const { conditionScore, scoreBreakdown, stats } = log;
  const previousScore = (log as any).previousScore as number | undefined;

  // 영구 스탯 게인 diff
  const permGains = computePermGainDiff(permStatsBefore, permStatsAfter);
  const [xpProgress, setXpProgress] = useState<ReturnType<typeof getXPProgress> | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{ newLevel: number; title: string } | null>(null);
  const [coachData, setCoachData] = useState<{
    profile: UserProfile;
    recentLogs: DailyLog[];
    inbodyRecords: InBodyRecord[];
    conditionInfo: RecentCondition;
  } | null>(null);

  const rank = getRank(conditionScore);
  const feedback = getConditionFeedback(conditionScore);
  const factors: ScoreFactor[] = getScoreFactors(scoreBreakdown, log);

  // 애니메이션
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const rankScale = useRef(new Animated.Value(0.5)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0)).current;

  // 레벨업 모달 추가 애니메이션
  const luPulse = useRef(new Animated.Value(0.6)).current;
  const levelNumScale = useRef(new Animated.Value(0)).current;
  const luBtnScale = useRef(new Animated.Value(1)).current;

  // 파티클
  const PARTICLE_COUNT = 6;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Promise.all([getUserProfile(), getAllDailyLogs(), getInBodyRecords()]).then(([p, logs, inbody]) => {
      if (p) {
        const recent = logs.slice(0, 14);
        setCoachData({
          profile: p,
          recentLogs: recent,
          inbodyRecords: inbody,
          conditionInfo: calcRecentCondition(recent),
        });
      }
    });
  }, []);

  useEffect(() => {
    getUserXP().then(xp => {
      const prog = getXPProgress(xp.totalXP);
      setXpProgress(prog);
      Animated.timing(xpBarAnim, { toValue: prog.pct, duration: 1000, useNativeDriver: false }).start();

      if (log.xpGained) {
        const prevXP = xp.totalXP - log.xpGained;
        const prevLevel = getLevelFromXP(Math.max(0, prevXP));
        if (prog.level > prevLevel) {
          setTimeout(() => {
            setLevelUpModal({ newLevel: prog.level, title: getLevelTitle(prog.level) });
            Animated.spring(levelUpScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
          }, 1500);
        }
      }
    });

    Animated.parallel([
      Animated.timing(scoreAnim, { toValue: conditionScore, duration: 1400, useNativeDriver: false }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.spring(rankScale, { toValue: 1, tension: 50, friction: 7, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // 레벨업 모달 애니메이션
  useEffect(() => {
    if (levelUpModal) {
      // 배경 펄스 (반복)
      luPulse.setValue(0.6);
      Animated.loop(
        Animated.sequence([
          Animated.timing(luPulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          Animated.timing(luPulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        ])
      ).start();

      // 레벨 숫자 바운스: 0 → 1.2 → 1.0
      levelNumScale.setValue(0);
      Animated.spring(levelNumScale, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }).start();

      // 파티클
      particles.forEach((p, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(1);
        Animated.parallel([
          Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 800, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * dist, duration: 800, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
      });
    } else {
      luPulse.stopAnimation();
    }
  }, [levelUpModal]);

  const handleShare = () => {
    const text = [
      `오늘의 Vital Quest 결과`,
      ``,
      `${rank.rank}등급 · ${conditionScore}점`,
      `"${feedback}"`,
      ``,
      `#VitalQuest #건강RPG`,
    ].join('\n');
    Clipboard.setString(text);
    Alert.alert('복사 완료', '결과 텍스트가 클립보드에 복사됐어요');
  };

  const isVictory = conditionScore >= 60;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: COLORS.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* 닫기 */}
        <View style={s.topBar}>
          <View style={{ width: 40 }} />
          <Text style={s.topLabel}>RESULT</Text>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>

        {/* ── RPG 풀발동 영역 ── */}
        <Animated.View style={[s.heroBlock, { opacity: fadeIn }]}>
          {/* 글로우 배경 */}
          <View style={[s.heroGlow, { backgroundColor: rank.glow }]} pointerEvents="none" />

          <Text style={[s.heroEyebrow, { color: rank.color }]}>
            {isVictory ? 'DUNGEON CLEARED' : 'KEEP GOING'}
          </Text>

          {/* 거대한 등급 글자 */}
          <Animated.Text style={[
            s.heroRank,
            {
              color: rank.color,
              textShadowColor: rank.glow,
              transform: [{ scale: rankScale }],
            },
          ]}>
            {rank.rank}
          </Animated.Text>

          <Text style={s.heroTitle}>{rank.label}</Text>
          <Text style={s.heroDate}>RANK {rank.rank} · {formatDate(log.date)}</Text>
        </Animated.View>

        {/* ── 점수 비교 카드 ── */}
        <View style={s.scoreCard}>
          <View>
            <Animated.Text style={[s.scoreNum, { color: rank.color }]}>
              {scoreAnim.interpolate({ inputRange: [0, conditionScore], outputRange: [0, conditionScore] }) as any}
            </Animated.Text>
            <Text style={s.scoreLabel}>TODAY SCORE</Text>
          </View>
          {previousScore != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.prevText}>어제 {previousScore}</Text>
              <View style={s.deltaRow}>
                {conditionScore > previousScore ? (
                  <Ionicons name="chevron-up" size={14} color={COLORS.good} />
                ) : conditionScore < previousScore ? (
                  <Ionicons name="chevron-down" size={14} color={COLORS.bad} />
                ) : null}
                <Text style={[
                  s.deltaText,
                  conditionScore > previousScore && { color: COLORS.good },
                  conditionScore < previousScore && { color: COLORS.bad },
                ]}>
                  {conditionScore > previousScore ? '+' : ''}{conditionScore - previousScore}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 스탯 게인 ── */}
        <View style={s.statsCard}>
          <Text style={s.cardTitle}>STAT GAINS</Text>
          <StatRow name="HP"  value={stats.hp}  color={COLORS.hp} />
          <StatRow name="STR" value={stats.stamina} color={COLORS.str} />
          <StatRow name="VIT" value={stats.recovery} color={COLORS.vit} />
          <StatRow name="MP"  value={stats.bloodSugarControl} color={COLORS.mp} />
        </View>

        {/* ── XP 진행 ── */}
        {xpProgress && (
          <View style={s.xpCard}>
            <View style={s.xpRow}>
              <Text style={s.xpLevel}>
                <Text style={s.xpLevelDim}>LV </Text>
                {xpProgress.level} · {getLevelTitle(xpProgress.level)}
              </Text>
              {log.xpGained && (
                <Text style={s.xpGain}>+{log.xpGained} XP</Text>
              )}
            </View>
            <View style={s.xpTrack}>
              <Animated.View style={[s.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: rank.color,
              }]} />
            </View>
            <Text style={s.xpDetails}>{xpProgress.current} / {xpProgress.needed} XP</Text>
          </View>
        )}

        {/* ── AI 코치 피드백 ── */}
        {coachData && permStatsAfter && (
          <AiCoachCard
            log={log}
            profile={coachData.profile}
            recentLogs={coachData.recentLogs}
            inbodyRecords={coachData.inbodyRecords}
            permStats={permStatsAfter}
            conditionInfo={coachData.conditionInfo}
            onOpenChat={() => navigation.navigate('Coach')}
          />
        )}

        {/* ── 정적 피드백 (별 아이콘) ── */}
        <View style={s.feedbackCard}>
          <View style={s.feedbackIcon}>
            <Ionicons name="star" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.feedbackTitle}>{getFeedbackTitle(conditionScore)}</Text>
            <Text style={s.feedbackBody}>{feedback}</Text>
          </View>
        </View>

        {/* ── 점수 분석 (점수 기여 요인) ── */}
        {factors.length > 0 && (
          <View style={s.factorsCard}>
            <Text style={s.cardTitle}>SCORE BREAKDOWN</Text>
            {factors.map((f, i) => (
              <View key={i} style={s.factorRow}>
                <Text style={[s.factorPoints, f.value >= 0 ? s.good : s.bad]}>
                  {f.value >= 0 ? '+' : ''}{f.value}
                </Text>
                <Text style={s.factorReason}>{f.emoji} {f.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 영구 스탯 게인 모먼트 ── */}
        {permGains.length > 0 && (
          <View style={s.permGainCard}>
            <Text style={s.cardTitle}>PERMANENT STAT GAINS</Text>
            <Text style={s.permGainSub}>이번 체크인으로 캐릭터가 영구히 강해졌어요</Text>
            {permGains.map(g => (
              <View key={g.key} style={s.permGainRow}>
                <Text style={[s.permGainAbbr, { color: g.color }]}>{STAT_LABEL[g.key]}</Text>
                <Text style={s.permGainName}>{STAT_FULLNAME[g.key]}</Text>
                <Text style={[s.permGainDelta, { color: g.color }]}>+{g.delta.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 액션 버튼 ── */}
        <View style={s.ctaWrap}>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={COLORS.textSub} />
            <Text style={s.shareBtnText}>결과 복사</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.homeBtn, { backgroundColor: rank.color }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.85}
          >
            <Ionicons name="home" size={18} color="#FFFFFF" />
            <Text style={s.homeBtnText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 레벨업 모달 */}
      {levelUpModal && (
        <Modal transparent animationType="fade">
          <View style={s.luOverlay}>
            <Animated.View style={[s.luSheet, { transform: [{ scale: levelUpScale }] }]}>
              {/* 펄스 배경 */}
              <Animated.View
                style={[s.luGlow, { opacity: luPulse }]}
                pointerEvents="none"
              />

              {/* 파티클 컨테이너 */}
              <View style={s.luParticleWrap} pointerEvents="none">
                {particles.map((p, i) => (
                  <Animated.Text
                    key={i}
                    style={[
                      s.luParticle,
                      {
                        opacity: p.opacity,
                        transform: [{ translateX: p.x }, { translateY: p.y }],
                      },
                    ]}
                  >
                    {i % 2 === 0 ? '✦' : '★'}
                  </Animated.Text>
                ))}
              </View>

              <Text style={s.luEyebrow}>LEVEL UP!</Text>

              {/* 레벨 숫자 바운스 */}
              <Animated.Text
                style={[s.luLevel, { transform: [{ scale: levelNumScale }] }]}
              >
                LV {levelUpModal.newLevel}
              </Animated.Text>

              <Text style={s.luTitle}>{levelUpModal.title}</Text>

              {/* 닫기 버튼 scale 피드백 */}
              <Animated.View style={{ transform: [{ scale: luBtnScale }] }}>
                <TouchableOpacity
                  style={s.luBtn}
                  onPress={() => {
                    Animated.sequence([
                      Animated.timing(luBtnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
                      Animated.timing(luBtnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
                    ]).start(() => setLevelUpModal(null));
                  }}
                  activeOpacity={1}
                >
                  <Text style={s.luBtnText}>확인</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function StatRow({ name, value, color }: { name: string; value: number; color: string }) {
  const pct = Math.min(100, value);
  return (
    <View style={s.statRow}>
      <Text style={[s.statName, { color }]}>{name}</Text>
      <View style={s.statTrack}>
        <View style={[s.statFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function getFeedbackTitle(score: number) {
  if (score >= 90) return '완벽한 하루였어요';
  if (score >= 75) return '좋은 컨디션 유지 중';
  if (score >= 60) return '양호한 상태';
  if (score >= 45) return '회복이 필요해요';
  return '오늘은 푹 쉬세요';
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: SPACING.xl },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  topLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 2, fontWeight: '600' },
  closeBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // 풀발동 히어로
  heroBlock: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.6,
  },
  heroEyebrow: {
    fontSize: 12, fontFamily: 'monospace',
    letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroRank: {
    fontSize: 130, fontWeight: '800',
    fontFamily: 'monospace',
    lineHeight: 130, letterSpacing: -8,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 40,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.text,
    letterSpacing: -0.5, marginTop: 4,
  },
  heroDate: {
    fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace',
    letterSpacing: 1.5, marginTop: 6,
  },

  // 점수 비교
  scoreCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md + 2,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scoreNum: {
    fontSize: 48, fontWeight: '700', fontFamily: 'monospace',
    letterSpacing: -2, lineHeight: 50,
  },
  scoreLabel: {
    fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace',
    letterSpacing: 2, fontWeight: '600', marginTop: 2,
  },
  prevText: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'monospace' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  deltaText: { fontSize: 18, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'monospace' },

  cardTitle: {
    fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace',
    letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600',
    marginBottom: 12,
  },

  // 스탯
  statsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  statName: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', width: 36 },
  statTrack: {
    flex: 1, height: 6,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  statFill: { height: '100%', borderRadius: RADIUS.full },
  statValue: {
    fontSize: 13, fontWeight: '700', color: COLORS.text,
    fontFamily: 'monospace', width: 32, textAlign: 'right',
  },

  // XP
  xpCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpLevel: { fontSize: 13, color: COLORS.text, fontFamily: 'monospace', fontWeight: '700' },
  xpLevelDim: { color: COLORS.textMuted, fontWeight: '500' },
  xpGain: {
    fontSize: 13, color: COLORS.amber, fontFamily: 'monospace', fontWeight: '800',
  },
  xpTrack: {
    height: 8, backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  xpFill: { height: '100%', borderRadius: RADIUS.full },
  xpDetails: {
    fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace',
    marginTop: 6, textAlign: 'right',
  },

  // 피드백
  feedbackCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.amberGlow,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  feedbackIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  feedbackTitle: { fontSize: 14, fontWeight: '700', color: COLORS.amber, marginBottom: 4 },
  feedbackBody: { fontSize: 12, color: COLORS.textSub, lineHeight: 18 },

  // 분석
  factorsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  factorPoints: {
    fontSize: 13, fontFamily: 'monospace', fontWeight: '800', width: 40,
  },
  good: { color: COLORS.good },
  bad: { color: COLORS.bad },
  factorReason: { fontSize: 13, color: COLORS.textSub, flex: 1 },

  // CTA
  ctaWrap: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: SPACING.md, marginTop: SPACING.sm,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSub },
  homeBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.md,
  },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  // 레벨업 모달
  luOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  luSheet: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', minWidth: 280,
    borderWidth: 1.5, borderColor: COLORS.amber,
    overflow: 'visible',
  },
  luGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.amberGlow,
    borderRadius: RADIUS.xl,
  },
  luParticleWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luParticle: {
    position: 'absolute',
    fontSize: 18,
    color: COLORS.amber,
  },
  luEyebrow: {
    fontSize: 13, color: COLORS.amber, fontFamily: 'monospace',
    letterSpacing: 4, fontWeight: '900', textTransform: 'uppercase',
  },
  luLevel: {
    fontSize: 64, color: COLORS.amber, fontWeight: '800',
    fontFamily: 'monospace', letterSpacing: -2, marginTop: 8, lineHeight: 66,
    textShadowColor: COLORS.amberGlow, textShadowRadius: 20,
  },
  luTitle: { fontSize: 18, color: COLORS.text, fontWeight: '700', marginTop: 4 },
  luBtn: {
    backgroundColor: COLORS.amber,
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: RADIUS.full, marginTop: SPACING.lg,
  },
  luBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  // 영구 스탯 게인 카드
  permGainCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  permGainSub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginBottom: 10 },
  permGainRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSub,
  },
  permGainAbbr: {
    fontFamily: 'monospace', fontSize: FONTS.xs, fontWeight: '900',
    letterSpacing: 1, width: 40,
  },
  permGainName: { color: COLORS.textSub, fontSize: FONTS.sm, fontWeight: '600', flex: 1 },
  permGainDelta: {
    fontFamily: 'monospace', fontSize: FONTS.md, fontWeight: '900',
  },
});

// ─── 헬퍼: 영구 스탯 diff 추출 ────────────────────────
type PermGain = { key: StatKey; delta: number; color: string };
const STAT_COLOR: Record<StatKey, string> = {
  str: COLORS.str,
  end: COLORS.primary,
  vit: COLORS.vit,
  agi: COLORS.agi,
  wis: COLORS.amber,
};
function computePermGainDiff(
  before?: PermanentStats,
  after?: PermanentStats,
): PermGain[] {
  if (!before || !after) return [];
  const keys: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];
  return keys
    .map(k => ({ key: k, delta: +(after[k] - before[k]).toFixed(1), color: STAT_COLOR[k] }))
    .filter(g => g.delta > 0);
}
