import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Clipboard, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, getAvatar, getRank, RADIUS, SPACING } from '../constants/theme';
import { MOOD_EMOJI, MOOD_LABEL, RootStackParamList, ScoreFactor } from '../types';
import { getConditionFeedback, getScoreFactors } from '../utils/feedback';
import { getLevelFromXP, getXPProgress, getLevelTitle } from '../utils/levelSystem';
import { getUserXP } from '../utils/storage';

type Route = RouteProp<RootStackParamList, 'Result'>;

// ─── RPG 스탯 바 ──────────────────────────────────────────
function RPGStatBar({ label, abbr, value, color }: { label: string; abbr: string; value: number; color: string }) {
  const pct = Math.min(100, value);
  return (
    <View style={r.statRow}>
      <Text style={r.statAbbr}>{abbr}</Text>
      <Text style={r.statLabel}>{label}</Text>
      <View style={r.statTrack}>
        <View style={[r.statFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[r.statVal, { color }]}>{value}</Text>
    </View>
  );
}

// ─── 데미지/힐 숫자 ───────────────────────────────────────
function DamageNum({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const isGain = value > 0;
  const color = isGain ? COLORS.teal : COLORS.red;
  return (
    <View style={r.dmgRow}>
      <Text style={r.dmgEmoji}>{emoji}</Text>
      <Text style={r.dmgLabel}>{label}</Text>
      <View style={[r.dmgBadge, { backgroundColor: color + '18' }]}>
        <Text style={[r.dmgVal, { color }]}>
          {isGain ? '+' : ''}{value}
        </Text>
      </View>
    </View>
  );
}

export default function ResultScreen() {
  const navigation = useNavigation();
  const { log } = useRoute<Route>().params;
  const { conditionScore, scoreBreakdown, stats } = log;
  const [xpProgress, setXpProgress] = useState<ReturnType<typeof getXPProgress> | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{ newLevel: number; title: string } | null>(null);
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;

  const rank = getRank(conditionScore);
  const avatar = getAvatar(conditionScore);
  const feedback = getConditionFeedback(conditionScore);
  const factors: ScoreFactor[] = getScoreFactors(scoreBreakdown, log);

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getUserXP().then(xp => {
      const prog = getXPProgress(xp.totalXP);
      setXpProgress(prog);
      Animated.timing(xpBarAnim, { toValue: prog.pct, duration: 1000, useNativeDriver: false }).start();

      // 레벨업 감지: xpGained 직전 레벨 vs 현재 레벨
      if (log.xpGained) {
        const prevXP = xp.totalXP - log.xpGained;
        const prevLevel = getLevelFromXP(Math.max(0, prevXP));
        if (prog.level > prevLevel) {
          setTimeout(() => {
            setLevelUpModal({ newLevel: prog.level, title: getLevelTitle(prog.level) });
            Animated.parallel([
              Animated.spring(levelUpScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
              Animated.timing(levelUpOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
          }, 1500);
        }
      }
    });
    Animated.parallel([
      Animated.timing(scoreAnim, { toValue: conditionScore, duration: 1200, useNativeDriver: false }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleShare = () => {
    const rankInfo = getRank(conditionScore);
    const exerciseTypes = log.exercise.types?.filter(t => t !== 'none') ?? [];
    const text = [
      `🏆 오늘의 Health RPG 결과`,
      ``,
      `${avatar} ${rankInfo.rank}등급  ${conditionScore}점`,
      `"${feedback}"`,
      ``,
      `📊 건강 지표`,
      `  HP: ${stats.hp}  |  지구력: ${stats.stamina}`,
      `  회복력: ${stats.recovery}  |  혈당조절: ${stats.bloodSugarControl}`,
      ``,
      `😴 수면 ${log.sleep.hours}h  💪 운동 ${exerciseTypes.length > 0 ? log.exercise.minutes + '분' : '없음'}`,
      log.alcohol.consumed ? `🍺 음주 있음` : `✅ 금주`,
      log.steps ? `🚶 ${log.steps.toLocaleString()}걸음` : '',
      log.xpGained ? `✨ +${log.xpGained} XP` : '',
    ].filter(Boolean).join('\n');
    Clipboard.setString(text);
  };

  const animatedScore = scoreAnim.interpolate({ inputRange: [0, 100], outputRange: ['0', '100'] });
  const gains = factors.filter(f => f.value > 0);
  const losses = factors.filter(f => f.value < 0);
  const neutral = factors.filter(f => f.value === 0);

  const isVictory = conditionScore >= 60;

  return (
    <SafeAreaView style={r.safe}>
      <ScrollView contentContainerStyle={r.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 전투 결과 헤더 ── */}
        <Animated.View style={[r.resultBanner, { opacity: fadeIn, transform: [{ translateY: slideUp }] }, { borderColor: rank.color + '66' }]}>
          <Text style={r.avatarText}>{avatar}</Text>
          <Text style={[r.resultLabel, { color: rank.color }]}>
            {isVictory ? '오늘의 컨디션' : '회복이 필요한 하루'}
          </Text>
          <Animated.Text style={[r.scoreNum, { color: rank.color }]}>
            {animatedScore}
          </Animated.Text>
          <Text style={r.scoreUnit}>/ 100</Text>
          <View style={[r.rankPill, { backgroundColor: rank.glow, borderColor: rank.color + '66' }]}>
            <Text style={[r.rankPillText, { color: rank.color }]}>{rank.rank}  {rank.label}</Text>
          </View>
          <Text style={r.feedbackText}>"{feedback}"</Text>
        </Animated.View>

        {/* ── 점수 상세 ── */}
        <View style={r.card}>
          <Text style={r.sectionTitle}>점수 상세</Text>
          <View style={r.baseRow}>
            <Text style={r.baseLabel}>기본 점수</Text>
            <Text style={r.baseVal}>+{scoreBreakdown.base} pts</Text>
          </View>

          {gains.length > 0 && (
            <>
              <Text style={[r.groupLabel, { color: COLORS.teal }]}>가점</Text>
              {gains.map((f, i) => <DamageNum key={i} value={f.value} label={f.label} emoji={f.emoji} />)}
            </>
          )}
          {losses.length > 0 && (
            <>
              <Text style={[r.groupLabel, { color: COLORS.red }]}>감점</Text>
              {losses.map((f, i) => <DamageNum key={i} value={f.value} label={f.label} emoji={f.emoji} />)}
            </>
          )}
          {neutral.length > 0 && neutral.map((f, i) => (
            <DamageNum key={i} value={f.value} label={f.label} emoji={f.emoji} />
          ))}

          <View style={r.divider} />
          <View style={r.totalRow}>
            <Text style={r.totalLabel}>TOTAL SCORE</Text>
            <Text style={[r.totalVal, { color: rank.color }]}>{conditionScore} pts</Text>
          </View>
        </View>

        {/* ── 스탯 업데이트 ── */}
        <View style={r.card}>
          <Text style={r.sectionTitle}>오늘의 건강 지표</Text>
          <RPGStatBar abbr="HP" label="체력" value={stats.hp} color={COLORS.hp} />
          <RPGStatBar abbr="MP" label="혈당 조절력" value={stats.bloodSugarControl} color={COLORS.mp} />
          <RPGStatBar abbr="STR" label="지구력" value={stats.stamina} color={COLORS.str} />
          <RPGStatBar abbr="VIT" label="회복력" value={stats.recovery} color={COLORS.vit} />
          <RPGStatBar abbr="CON" label="종합 컨디션" value={stats.condition} color={COLORS.agi} />
        </View>

        {/* ── 내일 제안 ── */}
        <View style={r.card}>
          <Text style={r.sectionTitle}>내일 이렇게 해보세요</Text>
          {conditionScore < 60 && <QuestTip icon="😴" tip="7-8시간 수면으로 VIT를 회복하세요" />}
          {scoreBreakdown.alcoholPenalty < -10 && <QuestTip icon="🚫" tip="오늘 하루 금주로 디버프를 해제하세요" />}
          {stats.stamina < 50 && <QuestTip icon="🚴" tip="자전거 30분으로 STR을 올려보세요" />}
          {scoreBreakdown.calorieBonus < 0 && <QuestTip icon="🍱" tip="목표 칼로리 범위에 맞춰 포션을 조절하세요" />}
          {stats.bloodSugarControl < 60 && <QuestTip icon="💧" tip="식후 10분 걷기로 MP를 높이세요" />}
          {conditionScore >= 80 && <QuestTip icon="🌟" tip="완벽한 루틴! 이 상태를 유지하세요" />}
        </View>

        {/* ── XP 획득 ── */}
        {log.xpGained != null && (
          <View style={r.xpCard}>
            <View style={r.xpHeader}>
              <Text style={r.xpTitle}>✨ 경험치 획득</Text>
              <Text style={r.xpGained}>+{log.xpGained} XP</Text>
            </View>
            {xpProgress && (
              <>
                <View style={r.xpLevelRow}>
                  <Text style={r.xpLevel}>Lv.{xpProgress.level}  {getLevelTitle(xpProgress.level)}</Text>
                  {!xpProgress.isMax && (
                    <Text style={r.xpNext}>{xpProgress.current} / {xpProgress.needed} XP</Text>
                  )}
                </View>
                <View style={r.xpTrack}>
                  <Animated.View style={[r.xpFill, {
                    width: xpBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any,
                  }]} />
                </View>
              </>
            )}
            {log.mood != null && (
              <Text style={r.moodRow}>오늘의 기분: {MOOD_EMOJI[log.mood]}  {MOOD_LABEL[log.mood]}</Text>
            )}
          </View>
        )}

        {/* ── 공유 + 홈 버튼 ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: SPACING.sm }}>
          <TouchableOpacity
            style={r.shareBtn}
            onPress={() => {
              handleShare();
              Alert.alert('복사 완료', '결과가 클립보드에 복사됐어요!\n친구에게 붙여넣기로 공유하세요 😎');
            }}
          >
            <Text style={r.shareBtnText}>📋 결과 공유</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[r.homeBtn, { borderColor: rank.color + '44', flex: 2 }]}
            onPress={() => (navigation as any).navigate('MainTabs')}
          >
            <Text style={[r.homeBtnText, { color: rank.color }]}>← 홈으로</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* 레벨업 모달 */}
      <Modal visible={!!levelUpModal} transparent animationType="none">
        <View style={r.levelUpOverlay}>
          <Animated.View style={[r.levelUpBox, { opacity: levelUpOpacity, transform: [{ scale: levelUpScale }] }]}>
            <Text style={r.levelUpStars}>✨🌟✨</Text>
            <Text style={r.levelUpTitle}>LEVEL UP!</Text>
            <Text style={r.levelUpLevel}>Lv.{levelUpModal?.newLevel}</Text>
            <Text style={r.levelUpSubtitle}>{levelUpModal?.title}</Text>
            <Text style={r.levelUpDesc}>새로운 칭호를 달성했습니다!</Text>
            <TouchableOpacity
              style={r.levelUpBtn}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(levelUpScale, { toValue: 0, duration: 200, useNativeDriver: true }),
                  Animated.timing(levelUpOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                ]).start(() => setLevelUpModal(null));
              }}
            >
              <Text style={r.levelUpBtnText}>확인</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function QuestTip({ icon, tip }: { icon: string; tip: string }) {
  return (
    <View style={r.questTip}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={r.questTipText}>{tip}</Text>
    </View>
  );
}

const r = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },

  // 결과 배너
  resultBanner: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 1 },
  resultLabel: { fontSize: FONTS.xs, fontWeight: '900', letterSpacing: 4, marginBottom: 8 },
  avatarText: { fontSize: 60, marginBottom: 4 },
  scoreNum: { fontSize: 80, fontWeight: '900', lineHeight: 86, fontFamily: 'monospace' },
  scoreUnit: { color: COLORS.textMuted, fontSize: FONTS.sm, marginBottom: 10 },
  rankPill: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 5, marginBottom: 12 },
  rankPillText: { fontSize: FONTS.sm, fontWeight: '700', letterSpacing: 1 },
  feedbackText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },

  // 카드
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },

  // 전투로그
  baseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub, marginBottom: 4 },
  baseLabel: { color: COLORS.textMuted, fontSize: FONTS.xs },
  baseVal: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '700' },
  groupLabel: { fontSize: FONTS.xxs, fontWeight: '900', letterSpacing: 2, marginTop: 10, marginBottom: 4 },
  dmgRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub },
  dmgEmoji: { fontSize: 14, width: 22, textAlign: 'center' },
  dmgLabel: { flex: 1, color: COLORS.text, fontSize: FONTS.sm },
  dmgBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  dmgVal: { fontSize: FONTS.sm, fontWeight: '900', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLORS.text, fontSize: FONTS.xs, fontWeight: '900', letterSpacing: 2 },
  totalVal: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace' },

  // 스탯 바
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statAbbr: { color: COLORS.textSub, fontSize: FONTS.xxs, fontWeight: '900', width: 30, fontFamily: 'monospace' },
  statLabel: { color: COLORS.textSub, fontSize: FONTS.xs, width: 64 },
  statTrack: { flex: 1, height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 4 },
  statVal: { fontSize: FONTS.xs, fontWeight: '900', width: 28, textAlign: 'right', fontFamily: 'monospace' },

  // 퀘스트 팁
  questTip: { flexDirection: 'row', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub, alignItems: 'flex-start' },
  questTipText: { flex: 1, color: COLORS.textSub, fontSize: FONTS.xs, lineHeight: 18 },

  // XP 카드
  xpCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.purple + '44' },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpTitle: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '800' },
  xpGained: { color: COLORS.purple, fontSize: FONTS.lg, fontWeight: '900', fontFamily: 'monospace' },
  xpLevelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  xpLevel: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700' },
  xpNext: { color: COLORS.textMuted, fontSize: FONTS.xxs },
  xpTrack: { height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 4 },
  moodRow: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },

  // 공유 + 귀환 버튼
  shareBtn: { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.bgHighlight, borderWidth: 1, borderColor: COLORS.border },
  shareBtnText: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.textSub },
  homeBtn: { borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1, backgroundColor: COLORS.bgCard },
  homeBtnText: { fontSize: FONTS.sm, fontWeight: '700', letterSpacing: 1 },

  // 레벨업 모달
  levelUpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  levelUpBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.gold,
    shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.5,
    minWidth: 260,
  },
  levelUpStars: { fontSize: 32, marginBottom: 4 },
  levelUpTitle: { fontSize: FONTS.xs, fontWeight: '900', letterSpacing: 6, color: COLORS.gold, marginBottom: 8 },
  levelUpLevel: { fontSize: 72, fontWeight: '900', color: COLORS.gold, lineHeight: 78, fontFamily: 'monospace' },
  levelUpSubtitle: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text, marginTop: 4, marginBottom: 4 },
  levelUpDesc: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.md },
  levelUpBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.full, paddingHorizontal: 40, paddingVertical: 12 },
  levelUpBtnText: { color: '#000', fontWeight: '900', fontSize: FONTS.sm },
});
