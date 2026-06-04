import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { EMPTY_PERMANENT_STATS, PermanentStats } from '../types';
import { RecentCondition } from '../utils/permanentStats';
import { StatusEffect } from '../utils/statusEffects';
import AvatarEvo, { EVO_STAGES, getEvoStage, getNextEvoStage } from './AvatarEvo';

type Rank = { rank: string; label: string; color: string; glow: string };

interface Props {
  name: string;
  score: number | null;
  rank: Rank | null;
  level: number;
  levelTitle: string;
  xpCurrent: number;
  xpNeeded: number;
  todayXp: number | null;
  permStats?: PermanentStats;
  conditionInfo?: RecentCondition;
  statusEffects?: StatusEffect[];
  onEditName?: () => void;
}

const pixelated: any = Platform.select({ web: { imageRendering: 'pixelated' }, default: {} });

// ─── EVO 진화 모달 ────────────────────────────────────────────
function EvoModal({ visible, totalGained, onClose }: { visible: boolean; totalGained: number; onClose: () => void }) {
  const cur = getEvoStage(totalGained);
  const next = getNextEvoStage(totalGained);
  const toNext = next ? Math.max(0, next.threshold - totalGained) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={em.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={em.sheet}>
          <Text style={em.title}>EVO 진화 단계</Text>
          <Text style={em.sub}>누적 성장: <Text style={{ color: COLORS.primary }}>{totalGained.toFixed(1)}p</Text>{next ? `  ·  다음까지 ${toNext.toFixed(1)}p` : ''}</Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {EVO_STAGES.map((s, i) => {
              const isCurrent = s.stage === cur.stage;
              const isUnlocked = totalGained >= s.threshold;
              const next_ = EVO_STAGES[i + 1];
              const stagePct = isCurrent && next_
                ? Math.min(100, ((totalGained - s.threshold) / (next_.threshold - s.threshold)) * 100)
                : isUnlocked ? 100 : 0;

              return (
                <View key={s.stage} style={[em.row, isCurrent && { backgroundColor: s.bgColor, borderColor: s.borderColor, borderWidth: 1 }]}>
                  <View style={[em.imgBox, { borderColor: isUnlocked ? s.borderColor : COLORS.border, backgroundColor: isUnlocked ? s.bgColor : 'transparent', opacity: isUnlocked ? 1 : 0.35 }]}>
                    <Image source={s.source} style={{ width: 36, height: 36, ...pixelated }} resizeMode="contain" />
                  </View>
                  <View style={em.info}>
                    <View style={em.labelRow}>
                      <Text style={[em.stage, { color: isUnlocked ? s.textColor : COLORS.textDisabled }]}>EVO {s.stage}</Text>
                      <Text style={[em.label, { color: isUnlocked ? COLORS.text : COLORS.textDisabled }]}>{s.label}</Text>
                      {isCurrent && <View style={[em.curBadge, { backgroundColor: s.borderColor }]}><Text style={em.curText}>현재</Text></View>}
                    </View>
                    <Text style={[em.threshold, { color: COLORS.textMuted }]}>{s.threshold}p 이상</Text>
                    {(isCurrent || isUnlocked) && next_ && (
                      <View style={em.barTrack}>
                        <View style={[em.barFill, { width: `${stagePct}%`, backgroundColor: s.textColor }]} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={em.closeBtn}>
            <Text style={em.closeTxt}>닫기</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── 메인 히어로 배너 ────────────────────────────────────────
export default function CharacterCard({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, permStats, conditionInfo, statusEffects, onEditName,
}: Props) {
  const [evoModalVisible, setEvoModalVisible] = useState(false);
  const rankColor = rank?.color ?? COLORS.textMuted;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));
  const ps = permStats ?? EMPTY_PERMANENT_STATS;
  const evo = getEvoStage(ps.totalGained);
  const nextEvo = getNextEvoStage(ps.totalGained);
  const toNext = nextEvo ? Math.max(0, nextEvo.threshold - ps.totalGained) : 0;
  const evoPct = nextEvo
    ? Math.min(100, ((ps.totalGained - evo.threshold) / (nextEvo.threshold - evo.threshold)) * 100)
    : 100;

  const cond = conditionInfo;
  const condColor =
    !cond ? COLORS.textMuted :
    cond.score >= 70 ? COLORS.good :
    cond.score >= 40 ? COLORS.amber :
    COLORS.bad;

  // ─── 캐릭터 호흡 애니메이션 (살아있는 느낌) ───
  const breath = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // 호흡 — 미세하게 위아래
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
    // 샤인 스윕 — 5초마다 카드 위로 한번
    Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.delay(3600),
        Animated.timing(shine, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const breathY = breath.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const shineX = shine.interpolate({ inputRange: [-1, 1], outputRange: [-260, 320] });

  // 등급 라벨 (S/A/B/C/D/F)
  const rankLetter = rank?.rank ?? '–';
  const rankLabelText = rank?.label ?? '기록 없음';

  return (
    <View style={[styles.outer, { borderColor: rankColor + '55' } as ViewStyle]}>
      <EvoModal visible={evoModalVisible} totalGained={ps.totalGained} onClose={() => setEvoModalVisible(false)} />

      {/* === 배경 그라데이션 (3겹 페이크) === */}
      <View style={[styles.bgBase, { backgroundColor: rankColor + '14' }]} pointerEvents="none" />
      <View style={[styles.bgRadial, { backgroundColor: rankColor + '22' }]} pointerEvents="none" />
      <View style={styles.bgVignette} pointerEvents="none" />

      {/* === 데코 별/도형 === */}
      <View pointerEvents="none" style={styles.decoCluster}>
        <View style={[styles.decoStar, { backgroundColor: rankColor + '55', top: 18, left: 18 }]} />
        <View style={[styles.decoStar, { backgroundColor: rankColor + '33', top: 38, left: 44, width: 3, height: 3 }]} />
        <View style={[styles.decoDot, { backgroundColor: rankColor + '44', top: 110, left: 32 }]} />
        <View style={[styles.decoStar, { backgroundColor: rankColor + '66', top: 24, right: 110, width: 5, height: 5 }]} />
        <View style={[styles.decoDot, { backgroundColor: COLORS.amber + '66', top: 60, right: 130 }]} />
      </View>

      {/* === 샤인 스윕 === */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shine,
          { transform: [{ translateX: shineX }, { rotate: '-18deg' }] },
        ]}
      />

      {/* === 상단 라벨 줄 (이름 · EVO · 컨디션) === */}
      <View style={styles.topRow}>
        <Pressable onPress={onEditName} style={styles.nameWrap}>
          <Text style={styles.eyebrow}>VITAL QUEST  ·  HERO</Text>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>{name || '용사'}</Text>
            <Ionicons name="create-outline" size={14} color={COLORS.textDisabled} />
          </View>
          <Text style={styles.subTitle}>Lv {level}  ·  {levelTitle}</Text>
        </Pressable>

        {/* 등급 큰 글자 (S/A/B/C/D/F) */}
        <View style={[styles.rankBig, { borderColor: rankColor + '88', backgroundColor: rankColor + '18' }]}>
          <Text style={[styles.rankBigLetter, { color: rankColor }]}>{rankLetter}</Text>
          <Text style={[styles.rankBigLabel, { color: rankColor + 'CC' }]}>{rankLabelText}</Text>
        </View>
      </View>

      {/* === 메인 캐릭터 영역 === */}
      <View style={styles.mainBlock}>
        {/* 좌측 - 캐릭터 + 베이스 글로우 */}
        <Pressable onPress={() => setEvoModalVisible(true)} style={styles.charBlock}>
          {/* 캐릭터 베이스 글로우 */}
          <View style={[styles.charPedestal, { backgroundColor: rankColor + '22' }]} />
          <View style={[styles.charPedestal2, { borderColor: rankColor + '44' }]} />

          <Animated.View style={{ transform: [{ translateY: breathY }] }}>
            <AvatarEvo stats={ps} size={92} conditionPct={cond?.score} />
          </Animated.View>

          {/* EVO 뱃지 */}
          <View style={[styles.evoChip, { backgroundColor: evo.bgColor, borderColor: evo.borderColor }]}>
            <Text style={[styles.evoChipNum, { color: evo.textColor }]}>EVO {evo.stage}</Text>
            <Text style={[styles.evoChipLabel, { color: evo.textColor }]}>{evo.label}</Text>
          </View>
        </Pressable>

        {/* 우측 - 스코어 + 컨디션 */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabelTop}>오늘의 컨디션</Text>
          <View style={styles.scoreLine}>
            <Text style={[styles.scoreBig, { color: rankColor }]} adjustsFontSizeToFit numberOfLines={1}>
              {score ?? '--'}
            </Text>
            <Text style={styles.scoreUnit}>/ 100</Text>
          </View>

          {/* 컨디션 미니바 + 추세 */}
          {cond ? (
            <View style={styles.condInline}>
              <View style={styles.condTrack}>
                <View style={[styles.condFill, { width: `${Math.min(100, cond.score)}%`, backgroundColor: condColor }]} />
              </View>
              <View style={styles.condMeta}>
                <Ionicons
                  name={
                    cond.trend === 'up' ? 'trending-up' :
                    cond.trend === 'down' ? 'trending-down' : 'remove'
                  }
                  size={11}
                  color={condColor}
                />
                <Text style={[styles.condText, { color: condColor }]}>{cond.label}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.scoreSub}>첫 체크인을 시작해주세요</Text>
          )}
        </View>
      </View>

      {/* === 상태이상 배지 줄 === */}
      {statusEffects && statusEffects.length > 0 && (
        <View style={styles.effectRow}>
          {statusEffects.map(ef => (
            <View
              key={ef.id}
              style={[styles.effectBadge, { backgroundColor: ef.color + '22', borderColor: ef.color + '55' }]}
            >
              <Text style={styles.effectEmoji}>{ef.emoji}</Text>
              <Text style={[styles.effectName, { color: ef.color }]}>{ef.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* === EXP 바 (게임 풍 두꺼운 바) === */}
      <View style={styles.xpBlock}>
        <View style={styles.xpHeader}>
          <View style={styles.xpHeaderLeft}>
            <View style={styles.xpDot} />
            <Text style={styles.xpHeaderText}>EXP</Text>
            {todayXp != null && todayXp > 0 && (
              <View style={styles.xpGainPill}>
                <Text style={styles.xpGainTxt}>+{todayXp}</Text>
              </View>
            )}
          </View>
          <Text style={styles.xpNumbers}>
            <Text style={styles.xpCur}>{xpCurrent.toLocaleString()}</Text>
            <Text style={styles.xpDim}> / {xpNeeded.toLocaleString()}</Text>
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: COLORS.amber }]}>
            <View style={styles.xpFillShine} pointerEvents="none" />
          </View>
        </View>
      </View>

      {/* === EVO 진행 바 (게임 풍 작은 푸터) === */}
      {nextEvo && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setEvoModalVisible(true)} style={styles.evoFooter}>
          <View style={styles.evoFooterLeft}>
            <Ionicons name="sparkles" size={11} color={evo.textColor} />
            <Text style={[styles.evoFooterText, { color: evo.textColor }]}>다음 진화</Text>
            <Text style={styles.evoFooterSep}>·</Text>
            <Text style={styles.evoFooterRemain}>EVO {nextEvo.stage} {nextEvo.label}</Text>
          </View>
          <Text style={styles.evoFooterPct}>{evoPct.toFixed(0)}%  +{toNext.toFixed(0)}p</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    padding: SPACING.md,
    paddingTop: SPACING.md - 2,
    paddingBottom: SPACING.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── 배경 레이어 ──
  bgBase: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgRadial: {
    position: 'absolute',
    top: -40, right: -60,
    width: 220, height: 220,
    borderRadius: 110,
    opacity: 0.9,
  },
  bgVignette: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // ── 데코 ──
  decoCluster: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  decoStar: { position: 'absolute', width: 4, height: 4, transform: [{ rotate: '45deg' }] },
  decoDot:  { position: 'absolute', width: 5, height: 5, borderRadius: 3 },

  // ── 샤인 스윕 ──
  shine: {
    position: 'absolute',
    top: -50, left: 0,
    width: 100, height: 320,
    backgroundColor: COLORS.shimmer,
    opacity: 0.5,
  },

  // ── 상단 라벨 줄 ──
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  nameWrap: { flex: 1, paddingRight: 10 },
  eyebrow: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 2.2, fontWeight: '800', marginBottom: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { color: COLORS.text, fontSize: FONTS.xl, fontWeight: '900', letterSpacing: -0.8, flexShrink: 1 },
  subTitle: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: '700' },

  // ── 등급 큰 패치 ──
  rankBig: {
    width: 78, paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBigLetter: { fontSize: 36, fontWeight: '900', fontFamily: 'monospace', lineHeight: 38, letterSpacing: -2 },
  rankBigLabel: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5, marginTop: 2 },

  // ── 메인 블럭 ──
  mainBlock: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm + 2 },

  // ── 캐릭터 ──
  charBlock: {
    width: 110, height: 130,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  charPedestal: {
    position: 'absolute',
    bottom: 6,
    width: 92, height: 14,
    borderRadius: 46,
    opacity: 0.7,
    transform: [{ scaleY: 0.5 }],
  },
  charPedestal2: {
    position: 'absolute',
    bottom: 16, alignSelf: 'center',
    width: 102, height: 102,
    borderRadius: 51,
    borderWidth: 1.5,
    opacity: 0.4,
  },
  evoChip: {
    position: 'absolute',
    bottom: -2,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  evoChipNum: { fontSize: 9, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 0.5 },
  evoChipLabel: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },

  // ── 스코어 우측 ──
  scoreBlock: { flex: 1, justifyContent: 'center', gap: 4 },
  scoreLabelTop: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 1.8, fontWeight: '800' },
  scoreLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreBig: { fontSize: 64, fontWeight: '900', fontFamily: 'monospace', lineHeight: 64, letterSpacing: -3 },
  scoreUnit: { fontSize: FONTS.sm, color: COLORS.textMuted, fontFamily: 'monospace', fontWeight: '700' },
  scoreSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 4 },
  condInline: { gap: 5, marginTop: 2 },
  condTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.full, overflow: 'hidden' },
  condFill: { height: '100%', borderRadius: RADIUS.full },
  condMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  condText: { fontSize: 11, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.3 },

  // ── 상태이상 ──
  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  effectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  effectEmoji: { fontSize: 11 },
  effectName: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },

  // ── XP 바 ──
  xpBlock: { gap: 6 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.amber },
  xpHeaderText: { color: COLORS.amber, fontSize: 10, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 1.5 },
  xpGainPill: {
    backgroundColor: COLORS.amberGlow,
    borderWidth: 1, borderColor: COLORS.amberLine,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 1,
    marginLeft: 4,
  },
  xpGainTxt: { color: COLORS.amber, fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  xpNumbers: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  xpCur: { color: COLORS.text },
  xpDim: { color: COLORS.textMuted },
  xpTrack: { height: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  xpFill: { height: '100%', borderRadius: RADIUS.full, position: 'relative', overflow: 'hidden' },
  xpFillShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.30)' },

  // ── EVO 푸터 ──
  evoFooter: {
    marginTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  evoFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  evoFooterText: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5 },
  evoFooterSep: { fontSize: 10, color: COLORS.textDisabled },
  evoFooterRemain: { fontSize: 10, color: COLORS.textSub, fontFamily: 'monospace', fontWeight: '700' },
  evoFooterPct: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', fontWeight: '800' },
});

const em = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    width: '88%', maxWidth: 360,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '800', marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md, fontFamily: 'monospace' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: RADIUS.md, marginBottom: 6,
  },
  imgBox: { width: 48, height: 48, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  stage: { fontSize: FONTS.xxs, fontWeight: '900', fontFamily: 'monospace' },
  label: { fontSize: FONTS.xs, fontWeight: '700' },
  curBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADIUS.full },
  curText: { color: '#000', fontSize: 9, fontWeight: '900' },
  threshold: { fontSize: FONTS.xxs - 1, fontFamily: 'monospace', marginBottom: 4 },
  barTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 2 },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  closeBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center',
  },
  closeTxt: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.sm },
});
