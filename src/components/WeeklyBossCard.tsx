import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { BOSS_DEFS, WeeklyBossState } from '../utils/weeklyBoss';
import { Ionicons } from '@expo/vector-icons';

interface Props { bossState: WeeklyBossState; onClaimReward?: () => void; }

export default function WeeklyBossCard({ bossState, onClaimReward }: Props) {
  const boss = BOSS_DEFS[bossState.bossId] ?? BOSS_DEFS[0];
  const remaining = Math.max(0, bossState.maxHp - bossState.damageDealt);
  const hpPct = Math.round((remaining / bossState.maxHp) * 100);
  const dmgPct = Math.min(100, Math.round((bossState.damageDealt / bossState.maxHp) * 100));
  const isVictory = bossState.result === 'victory';
  const isDefeat  = bossState.result === 'defeat';
  const statusColor = isVictory ? COLORS.good : isDefeat ? COLORS.bad : boss.color;
  const hpColor = hpPct > 50 ? boss.color : hpPct > 25 ? COLORS.warn : COLORS.bad;

  return (
    <View style={[s.card, { borderColor: boss.color + '44' }]}>
      {/* 배경 틴트 */}
      <View style={[s.bgFull, { backgroundColor: boss.color + '0A' }]} pointerEvents="none" />
      {/* 상단 색 스트라이프 */}
      <View style={[s.stripe, { backgroundColor: boss.color + '22' }]} pointerEvents="none" />

      {/* 헤더: 라벨 + 상태 */}
      <View style={s.header}>
        <Text style={s.weekLabel}>WEEKLY BOSS</Text>
        <View style={[s.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
          <Ionicons
            name={isVictory ? 'trophy' : isDefeat ? 'skull-outline' : 'flame'}
            size={11}
            color={statusColor}
          />
          <Text style={[s.statusTxt, { color: statusColor }]}>
            {isVictory ? '승리!' : isDefeat ? '패배' : '전투중'}
          </Text>
        </View>
      </View>

      {/* 보스 메인 섹션 */}
      <View style={s.bossMain}>
        <View style={[s.emojiBox, { backgroundColor: boss.color + '18', borderColor: boss.color + '44' }]}>
          <Text style={s.bossEmoji}>{boss.emoji}</Text>
        </View>
        <View style={s.bossInfo}>
          <Text style={[s.bossName, { color: boss.color }]}>{boss.name}</Text>
          <Text style={s.bossSub}>{boss.subtitle}</Text>
          <View style={s.weakRow}>
            <View style={[s.weakPill, { backgroundColor: boss.color + '1A', borderColor: boss.color + '44' }]}>
              <Ionicons name="alert-circle-outline" size={10} color={boss.color} />
              <Text style={[s.weakTxt, { color: boss.color }]}>약점: {boss.weakness}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* HP 바 섹션 */}
      <View style={s.hpSection}>
        <View style={s.hpLabelRow}>
          <Text style={s.hpLabel}>BOSS HP</Text>
          <Text style={[s.hpVal, { color: hpColor }]}>
            {remaining.toLocaleString()} <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xxs }}>/ {bossState.maxHp.toLocaleString()}</Text>
          </Text>
        </View>
        {/* HP 바 — 두꺼운 그라데이션 느낌 */}
        <View style={s.hpTrack}>
          <View style={[s.hpFill, { width: `${hpPct}%`, backgroundColor: hpColor }]} />
          {/* 상단 하이라이트 */}
          <View style={s.hpShine} pointerEvents="none" />
        </View>
        <View style={s.hpNumbers}>
          <Text style={[s.hpPct, { color: hpColor }]}>{hpPct}%</Text>
          <Text style={s.hpRemain}>HP 잔여</Text>
        </View>
      </View>

      {/* 내 데미지 */}
      <View style={[s.dmgPanel, { backgroundColor: COLORS.amberGlow, borderColor: COLORS.amberLine }]}>
        <View style={s.dmgLeft}>
          <Ionicons name="flash" size={16} color={COLORS.amber} />
          <View>
            <Text style={s.dmgLabel}>내가 가한 데미지</Text>
            <View style={s.dmgBarTrack}>
              <View style={[s.dmgBarFill, { width: `${dmgPct}%` }]} />
            </View>
          </View>
        </View>
        <Text style={s.dmgVal}>{bossState.damageDealt.toLocaleString()}</Text>
      </View>

      {/* 보상 버튼 */}
      {isVictory && !bossState.rewardClaimed && onClaimReward && (
        <TouchableOpacity style={s.rewardBtn} onPress={onClaimReward} activeOpacity={0.8}>
          <Ionicons name="trophy" size={16} color="#000" />
          <Text style={s.rewardBtnTxt}>보상 수령  +200 XP  +100G</Text>
        </TouchableOpacity>
      )}
      {isVictory && bossState.rewardClaimed && (
        <View style={s.claimedRow}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.good} />
          <Text style={s.claimedTxt}>보상 수령 완료</Text>
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
    gap: 14,
  },
  bgFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabel: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 2, fontWeight: '800' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusTxt: { fontSize: 11, fontWeight: '800', fontFamily: 'monospace' },
  bossMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiBox: {
    width: 70, height: 70, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  bossEmoji: { fontSize: 48 },
  bossInfo: { flex: 1, gap: 4 },
  bossName: { fontSize: FONTS.lg, fontWeight: '900', letterSpacing: -0.3 },
  bossSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  weakRow: { marginTop: 2 },
  weakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  weakTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  hpSection: { gap: 6 },
  hpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hpLabel: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800' },
  hpVal: { fontSize: FONTS.md, fontFamily: 'monospace', fontWeight: '900' },
  hpTrack: {
    height: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.sm, overflow: 'hidden', position: 'relative',
  },
  hpFill: { height: '100%', borderRadius: RADIUS.sm },
  hpShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  hpNumbers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hpPct: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  hpRemain: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  dmgPanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1,
  },
  dmgLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dmgLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 4 },
  dmgBarTrack: { height: 3, width: 80, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  dmgBarFill: { height: '100%', backgroundColor: COLORS.amber, borderRadius: RADIUS.full },
  dmgVal: { fontSize: FONTS.xl, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace' },
  rewardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.good,
    borderRadius: RADIUS.md, paddingVertical: 14,
  },
  rewardBtnTxt: { color: '#000', fontWeight: '900', fontSize: FONTS.sm },
  claimedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  claimedTxt: { fontSize: FONTS.xs, color: COLORS.good, fontFamily: 'monospace', fontWeight: '700' },
});
