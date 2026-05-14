import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { BOSS_DEFS, WeeklyBossState } from '../utils/weeklyBoss';

interface Props {
  bossState: WeeklyBossState;
  onClaimReward?: () => void;
}

export default function WeeklyBossCard({ bossState, onClaimReward }: Props) {
  const boss = BOSS_DEFS[bossState.bossId] ?? BOSS_DEFS[0];
  const remaining = Math.max(0, bossState.maxHp - bossState.damageDealt);
  const hpPct = Math.round((remaining / bossState.maxHp) * 100);
  const isVictory = bossState.result === 'victory';
  const isDefeat = bossState.result === 'defeat';

  const statusColor = isVictory ? COLORS.good : isDefeat ? COLORS.bad : boss.color;
  const statusLabel = isVictory ? '승리!' : isDefeat ? '패배' : '전투중';

  return (
    <View style={[s.card, { borderColor: boss.color + '40' }]}>
      <View style={[s.bgTint, { backgroundColor: boss.bgColor }]} pointerEvents="none" />

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.weekLabel}>이번 주 보스전</Text>
        <View style={[s.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* 보스 정보 */}
      <View style={s.bossRow}>
        <Text style={s.bossEmoji}>{boss.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.bossName, { color: boss.color }]}>{boss.name}</Text>
          <Text style={s.bossSub}>{boss.subtitle}</Text>
        </View>
        <View style={s.weakBox}>
          <Text style={s.weakLabel}>약점</Text>
          <Text style={[s.weakVal, { color: boss.color }]}>{boss.weakness}</Text>
        </View>
      </View>

      {/* HP 바 */}
      <View style={s.hpSection}>
        <View style={s.hpLabelRow}>
          <Text style={s.hpLabel}>보스 HP</Text>
          <Text style={[s.hpVal, { color: boss.color }]}>
            {remaining} / {bossState.maxHp}
          </Text>
        </View>
        <View style={s.hpTrack}>
          {/* 남은 HP (보스 색) */}
          <View style={[s.hpFill, { width: `${hpPct}%`, backgroundColor: boss.color }]} />
        </View>

        {/* 가한 데미지 */}
        <View style={s.dmgRow}>
          <Text style={s.dmgLabel}>내가 가한 데미지</Text>
          <Text style={[s.dmgVal, { color: COLORS.amber }]}>⚔️  {bossState.damageDealt}</Text>
        </View>
      </View>

      {/* 승리 보상 버튼 */}
      {isVictory && !bossState.rewardClaimed && onClaimReward && (
        <TouchableOpacity
          style={[s.rewardBtn, { backgroundColor: COLORS.good }]}
          onPress={onClaimReward}
          activeOpacity={0.8}
        >
          <Text style={s.rewardBtnTxt}>보상 수령  +200 XP  🪙 +100G</Text>
        </TouchableOpacity>
      )}
      {isVictory && bossState.rewardClaimed && (
        <View style={s.claimedRow}>
          <Text style={s.claimedTxt}>✓  보상 수령 완료</Text>
        </View>
      )}
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
    overflow: 'hidden',
    position: 'relative',
  },
  bgTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekLabel: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusTxt: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },

  bossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  bossEmoji: { fontSize: 36 },
  bossName: { fontSize: FONTS.md, fontWeight: '800', marginBottom: 2 },
  bossSub: { fontSize: FONTS.xxs, color: COLORS.textMuted },
  weakBox: { alignItems: 'flex-end' },
  weakLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 2 },
  weakVal: { fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },

  hpSection: { marginBottom: 4 },
  hpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hpLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  hpVal: { fontSize: FONTS.xxs, fontFamily: 'monospace', fontWeight: '700' },
  hpTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: 8,
  },
  hpFill: { height: '100%', borderRadius: RADIUS.full },
  dmgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dmgLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  dmgVal: { fontSize: FONTS.xxs, fontWeight: '800', fontFamily: 'monospace' },

  rewardBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rewardBtnTxt: { color: '#000', fontWeight: '800', fontSize: FONTS.sm },
  claimedRow: { marginTop: SPACING.sm, alignItems: 'center' },
  claimedTxt: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
});
