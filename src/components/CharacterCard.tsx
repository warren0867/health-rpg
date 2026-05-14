import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
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

function EvoModal({ visible, totalGained, onClose }: { visible: boolean; totalGained: number; onClose: () => void }) {
  const cur = getEvoStage(totalGained);
  const next = getNextEvoStage(totalGained);
  const toNext = next ? Math.max(0, next.threshold - totalGained) : 0;
  const pct = next
    ? Math.min(100, ((totalGained - cur.threshold) / (next.threshold - cur.threshold)) * 100)
    : 100;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={em.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={em.sheet}>
          <Text style={em.title}>EVO 진화 단계</Text>
          <Text style={em.sub}>누적 성장 포인트: <Text style={{ color: COLORS.primary }}>{totalGained.toFixed(1)}p</Text></Text>

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
                    {isCurrent && next_ && (
                      <Text style={[em.toNext, { color: COLORS.textMuted }]}>다음까지 {toNext.toFixed(1)}p</Text>
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

export default function CharacterCard({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, permStats, conditionInfo, statusEffects, onEditName,
}: Props) {
  const [evoModalVisible, setEvoModalVisible] = useState(false);
  const rankColor = rank?.color ?? COLORS.textMuted;
  const rankGlow = rank?.glow ?? COLORS.primaryGlow;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));
  const ps = permStats ?? EMPTY_PERMANENT_STATS;
  const evo = getEvoStage(ps.totalGained);
  const nextEvo = getNextEvoStage(ps.totalGained);
  const toNext = nextEvo ? Math.max(0, nextEvo.threshold - ps.totalGained) : 0;

  const cond = conditionInfo;
  const condColor =
    !cond ? COLORS.textMuted :
    cond.score >= 70 ? COLORS.good :
    cond.score >= 40 ? COLORS.amber :
    COLORS.bad;

  const trendIcon =
    !cond ? 'remove-outline' :
    cond.trend === 'up' ? 'trending-up-outline' :
    cond.trend === 'down' ? 'trending-down-outline' :
    'remove-outline';

  const condBarPct = cond ? Math.round(cond.score) : 0;

  return (
    <View style={[styles.card, { borderColor: rankColor + '33' } as ViewStyle]}>
      <EvoModal visible={evoModalVisible} totalGained={ps.totalGained} onClose={() => setEvoModalVisible(false)} />
      {/* 등급 컬러 글로우 (배경) */}
      <View style={[styles.glow, { backgroundColor: rankGlow }]} pointerEvents="none" />

      <View style={styles.row}>
        <View style={styles.left}>
          {/* 아바타 — conditionPct 연동 */}
          <AvatarEvo stats={ps} size={60} conditionPct={cond?.score} />

          <View style={styles.charInfo}>
            <TouchableOpacity onPress={onEditName} style={styles.nameRow} activeOpacity={0.7}>
              <Text style={styles.name}>{name || '용사'}</Text>
              <Ionicons name="create-outline" size={14} color={COLORS.textDisabled} />
            </TouchableOpacity>

            {/* EVO 등급 뱃지 — 탭으로 진화 단계 모달 */}
            <TouchableOpacity
              onPress={() => setEvoModalVisible(true)}
              style={[styles.rankPill, { backgroundColor: evo.bgColor, borderColor: evo.borderColor }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.evoStage, { color: evo.textColor }]}>EVO {evo.stage}</Text>
              <Text style={[styles.rankLabel, { color: evo.textColor }]}>{evo.label}</Text>
              <Ionicons name="chevron-forward" size={10} color={evo.textColor} style={{ opacity: 0.7 }} />
            </TouchableOpacity>

            {/* 상태이상 뱃지 */}
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

            {/* 컨디션 상태 행 */}
            {cond && (
              <View style={styles.condRow}>
                <Ionicons name={trendIcon as any} size={11} color={condColor} />
                <Text style={[styles.condLabel, { color: condColor }]}>{cond.label}</Text>
                {cond.daysInactive >= 3 && (
                  <View style={[styles.inactiveBadge, { borderColor: COLORS.bad + '66' }]}>
                    <Text style={styles.inactiveText}>{cond.daysInactive}d 미기록</Text>
                  </View>
                )}
              </View>
            )}

            {/* 컨디션 바 */}
            {cond && (
              <View style={styles.condTrack}>
                <View style={[styles.condFill, { width: `${condBarPct}%`, backgroundColor: condColor }]} />
              </View>
            )}

            {/* 다음 진화 (컨디션 바가 있으면 숨김 — 공간 절약) */}
            {!cond && nextEvo && (
              <Text style={styles.nextEvo}>다음 진화까지 {toNext.toFixed(1)}</Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.score, { color: rankColor }]}>{score ?? '--'}</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
          {/* 다음 진화 — 컨디션 바 있을 때 이쪽에 작게 */}
          {cond && nextEvo && (
            <Text style={styles.nextEvoSmall}>EVO{evo.stage + 1} ↑ {toNext.toFixed(0)}</Text>
          )}
        </View>
      </View>

      {/* XP 바 */}
      <View style={styles.xpBlock}>
        <View style={styles.xpRow}>
          <Text style={styles.xpLevel}>
            <Text style={styles.xpLevelDim}>LV </Text>
            {level} · {levelTitle}
          </Text>
          <Text style={styles.xpNum}>
            {todayXp != null && todayXp > 0 && (
              <Text style={styles.xpGain}>+{todayXp} XP </Text>
            )}
            <Text style={styles.xpDim}>{xpCurrent} / {xpNeeded}</Text>
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: rankColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 4,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute', top: 0, right: 0, left: 0, bottom: 0,
    opacity: 0.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  charInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { color: COLORS.text, fontSize: FONTS.xl - 2, fontWeight: '800', letterSpacing: -0.5 },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingRight: 12, paddingLeft: 5,
    borderRadius: RADIUS.full, borderWidth: 1, alignSelf: 'flex-start',
    marginBottom: 5,
  },
  rankLabel: { fontSize: FONTS.xs, fontWeight: '800' },
  evoStage: {
    fontFamily: 'monospace',
    fontSize: FONTS.xxs, fontWeight: '900', letterSpacing: 0.8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
  effectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  effectEmoji: { fontSize: 10 },
  effectName: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  condLabel: { fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },
  inactiveBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 2 },
  inactiveText: { fontSize: FONTS.xxs - 2, color: COLORS.bad, fontWeight: '700', fontFamily: 'monospace' },
  condTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' },
  condFill: { height: '100%', borderRadius: RADIUS.full },
  nextEvo: { color: COLORS.textMuted, fontSize: FONTS.xxs - 1, marginTop: 2, fontFamily: 'monospace' },
  right: { alignItems: 'flex-end' },
  score: { fontSize: 52, fontWeight: '900', fontFamily: 'monospace', lineHeight: 54, letterSpacing: -2 },
  scoreLabel: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 2.5, fontWeight: '700', marginTop: 2 },
  nextEvoSmall: { fontSize: FONTS.xxs - 2, color: COLORS.textDisabled, fontFamily: 'monospace', marginTop: 4, letterSpacing: 0.5 },
  xpBlock: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpLevel: { fontSize: FONTS.xs, color: COLORS.text, fontWeight: '700', fontFamily: 'monospace' },
  xpLevelDim: { color: COLORS.textMuted, fontWeight: '500' },
  xpNum: { fontSize: FONTS.xxs, fontFamily: 'monospace' },
  xpGain: { color: COLORS.amber, fontWeight: '800' },
  xpDim: { color: COLORS.textMuted },
  xpTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: RADIUS.full },
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
  toNext: { fontSize: FONTS.xxs - 1, fontFamily: 'monospace' },
  closeBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center',
  },
  closeTxt: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.sm },
});
