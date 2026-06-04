import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

/**
 * 캐릭터 카드 — Apple Fitness 풍 미니멀 클린
 * 단색 카드, 절제된 컬러, 작은 글자, 큰 여백.
 */
export default function CharacterCard({
  name, score, rank, level, levelTitle,
  xpCurrent, xpNeeded, todayXp, permStats, conditionInfo, statusEffects, onEditName,
}: Props) {
  const [evoModalVisible, setEvoModalVisible] = useState(false);
  const rankColor = rank?.color ?? COLORS.textMuted;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNeeded) * 100));
  const ps = permStats ?? EMPTY_PERMANENT_STATS;
  const evo = getEvoStage(ps.totalGained);

  const cond = conditionInfo;
  const condColor =
    !cond ? COLORS.textMuted :
    cond.score >= 70 ? COLORS.good :
    cond.score >= 40 ? COLORS.amber :
    COLORS.bad;

  return (
    <View style={styles.card}>
      <EvoModal visible={evoModalVisible} totalGained={ps.totalGained} onClose={() => setEvoModalVisible(false)} />

      {/* 상단: 아바타 + 이름·레벨·점수 */}
      <View style={styles.topRow}>
        <Pressable onPress={() => setEvoModalVisible(true)}>
          <AvatarEvo stats={ps} size={56} conditionPct={cond?.score} />
        </Pressable>

        <View style={styles.midBlock}>
          <Pressable onPress={onEditName} style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name || '용사'}</Text>
            <Ionicons name="create-outline" size={13} color={COLORS.textDisabled} />
          </Pressable>
          <Text style={styles.subText}>
            Lv {level}  ·  {levelTitle}
          </Text>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={[styles.score, { color: rankColor }]}>
            {score ?? '–'}
          </Text>
          <Text style={styles.scoreLabel}>{rank?.rank ?? 'SCORE'}</Text>
        </View>
      </View>

      {/* XP 바 */}
      <View style={styles.xpRow}>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
        </View>
        <Text style={styles.xpMeta}>
          {todayXp != null && todayXp > 0 && (
            <Text style={styles.xpGain}>+{todayXp}  </Text>
          )}
          <Text style={styles.xpDim}>{xpCurrent}/{xpNeeded}</Text>
        </Text>
      </View>

      {/* 상태이상 또는 컨디션 (둘 다 있으면 상태이상만) */}
      {statusEffects && statusEffects.length > 0 ? (
        <View style={styles.effectRow}>
          {statusEffects.slice(0, 3).map(ef => (
            <View
              key={ef.id}
              style={[styles.effectBadge, { backgroundColor: ef.color + '18', borderColor: ef.color + '40' }]}
            >
              <Text style={styles.effectEmoji}>{ef.emoji}</Text>
              <Text style={[styles.effectName, { color: ef.color }]}>{ef.name}</Text>
            </View>
          ))}
        </View>
      ) : cond ? (
        <View style={styles.condRow}>
          <View style={[styles.condDot, { backgroundColor: condColor }]} />
          <Text style={[styles.condText, { color: condColor }]}>{cond.label}</Text>
          <View style={styles.condDivider} />
          <Text style={styles.evoText}>EVO {evo.stage}  {evo.label}</Text>
          {cond.trend !== 'flat' && (
            <Ionicons
              name={cond.trend === 'up' ? 'trending-up' : 'trending-down'}
              size={11}
              color={condColor}
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>
      ) : (
        <Text style={styles.placeholderText}>오늘 첫 체크인을 시작해보세요</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  midBlock: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: {
    color: COLORS.text,
    fontSize: FONTS.md,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  subText: {
    color: COLORS.textMuted,
    fontSize: FONTS.xxs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // 점수 (작게 — Apple Fitness 처럼)
  scoreBlock: { alignItems: 'flex-end', minWidth: 50 },
  score: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: -1,
    lineHeight: 30,
  },
  scoreLabel: {
    fontSize: 9,
    color: COLORS.textDisabled,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: 1,
  },

  // XP 바 — 얇고 깔끔
  xpRow: { gap: 5 },
  xpTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  xpMeta: { fontSize: 10, fontFamily: 'monospace', alignSelf: 'flex-end' },
  xpGain: { color: COLORS.amber, fontWeight: '700' },
  xpDim: { color: COLORS.textMuted, fontWeight: '600' },

  // 컨디션·EVO 한 줄
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  condDot: { width: 6, height: 6, borderRadius: 3 },
  condText: { fontSize: 11, fontWeight: '700' },
  condDivider: {
    width: 1, height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 2,
  },
  evoText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  // 상태이상 (있으면 보임)
  effectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  effectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  effectEmoji: { fontSize: 10 },
  effectName: { fontSize: 10, fontWeight: '700' },

  placeholderText: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
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
