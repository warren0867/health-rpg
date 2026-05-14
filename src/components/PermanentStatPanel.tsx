import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { EquipmentItem, EquipmentTier, GACHA_RARITY_COLOR, GachaBonus, PermanentStats, STAT_FULLNAME, STAT_LABEL, StatKey } from '../types';
import { TIER_LABEL, statTierProgress } from '../utils/permanentStats';

interface Props {
  stats: PermanentStats;
  activeBonuses?: GachaBonus[];
}

const STAT_META: Record<StatKey, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  str: { icon: 'flame',           color: COLORS.str  },
  end: { icon: 'pulse',            color: COLORS.primary },
  vit: { icon: 'shield-checkmark', color: COLORS.vit  },
  agi: { icon: 'flash',            color: COLORS.agi  },
  wis: { icon: 'sparkles',         color: COLORS.amber },
};

const STAT_ORDER: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];

const TIER_COLOR: Record<EquipmentTier, string> = {
  none:      COLORS.textDisabled,
  common:    COLORS.textMuted,
  rare:      COLORS.primary,
  epic:      COLORS.vit,
  legendary: COLORS.amber,
};

const DECAY_THRESHOLD: EquipmentTier[] = ['none', 'common']; // 부식 경고 대상

function EquipmentSlotRow({ item, slotName }: { item: EquipmentItem | null; slotName: string }) {
  const tier = item?.tier ?? 'none';
  const empty = tier === 'none';
  const isDecayed = DECAY_THRESHOLD.includes(tier);
  const tierColor = TIER_COLOR[tier];
  const bonusStr = item
    ? Object.entries(item.bonus).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' ')
    : '';

  return (
    <View style={[s.eqRow, isDecayed && s.eqRowDecay]}>
      <View style={s.eqEmojiWrap}>
        <Text style={[s.eqEmoji, isDecayed && { opacity: 0.4 }]}>{empty ? '▫️' : item!.emoji}</Text>
        {isDecayed && !empty && (
          <Text style={s.decayIcon}>🔧</Text>
        )}
      </View>
      <View style={s.eqInfo}>
        <Text style={[s.eqName, { color: empty ? COLORS.textDisabled : isDecayed ? COLORS.warn : COLORS.text }]}>
          {empty ? `${slotName} 없음` : item!.name}
          {isDecayed && !empty && <Text style={s.decayTag}>  부식중</Text>}
        </Text>
        {!empty && (
          <Text style={[s.eqTier, { color: tierColor }]}>
            {TIER_LABEL[item!.tier]} · {item!.days}일 · {bonusStr}
          </Text>
        )}
        {empty && (
          <Text style={s.eqTierMissing}>7일 내 기록 없음</Text>
        )}
      </View>
      {!empty && (
        <View style={[s.tierPill, { backgroundColor: tierColor + '22', borderColor: tierColor + '55' }]}>
          <Text style={[s.tierPillTxt, { color: tierColor }]}>{TIER_LABEL[item!.tier]}</Text>
        </View>
      )}
    </View>
  );
}

export default function PermanentStatPanel({ stats, activeBonuses = [] }: Props) {
  const eq = stats.equipment ?? { weapon: null, armor: null, ring: null, amulet: null };
  const hasInBody = stats.totalGained > 20;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>캐릭터 능력치</Text>
        <Text style={s.totalVal}>총 {stats.totalGained.toFixed(0)}p</Text>
      </View>
      <Text style={s.sub}>
        {hasInBody ? '인바디 기반 스탯 + 퀘스트 장비 보너스' : '인바디를 기록하면 스탯이 업데이트돼요'}
      </Text>

      {/* 스탯 바 */}
      <View style={s.list}>
        {STAT_ORDER.map(key => {
          const baseValue = stats[key];
          const gachaBonus = activeBonuses
            .filter(b => b.stat === key && b.expiresAt > new Date().toISOString())
            .reduce((acc, b) => acc + b.bonus, 0);
          const value = baseValue + gachaBonus;
          const meta = STAT_META[key];
          const tp = statTierProgress(value);
          return (
            <View key={key} style={s.row}>
              <View style={[s.iconBox, { backgroundColor: meta.color + '1F' }]}>
                <Ionicons name={meta.icon} size={14} color={meta.color} />
              </View>
              <View style={s.rowMid}>
                <View style={s.rowMidTop}>
                  <Text style={s.statName}>
                    <Text style={[s.statAbbr, { color: meta.color }]}>{STAT_LABEL[key]}</Text>
                    <Text style={s.statFull}>  {STAT_FULLNAME[key]}</Text>
                    {gachaBonus > 0 && (
                      <Text style={[s.gachaTag, { color: GACHA_RARITY_COLOR.epic }]}>  ✨+{gachaBonus}</Text>
                    )}
                  </Text>
                  <Text style={s.tierLabel}>{tp.tierLabel}</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${tp.pct}%`, backgroundColor: meta.color }]} />
                </View>
              </View>
              <Text style={[s.statVal, { color: meta.color }]}>{value.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>

      {/* 장비 슬롯 */}
      <View style={s.eqSection}>
        <Text style={s.eqTitle}>장비 슬롯 <Text style={s.eqTitleSub}>(최근 7일 퀘스트)</Text></Text>
        <EquipmentSlotRow item={eq.weapon} slotName="무기" />
        <EquipmentSlotRow item={eq.armor}  slotName="방어구" />
        <EquipmentSlotRow item={eq.ring}   slotName="반지" />
        <EquipmentSlotRow item={eq.amulet} slotName="부적" />
      </View>
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
    borderWidth: 1, borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '800' },
  totalVal: { color: COLORS.amber, fontSize: FONTS.sm, fontWeight: '800', fontFamily: 'monospace' },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 4, marginBottom: 12 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rowMid: { flex: 1 },
  rowMidTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 },
  statName: { fontSize: FONTS.xs },
  statAbbr: { fontWeight: '900', fontFamily: 'monospace', letterSpacing: 1 },
  statFull: { color: COLORS.textSub, fontWeight: '600' },
  gachaTag: { fontSize: FONTS.xxs - 1, fontWeight: '900', fontFamily: 'monospace' },
  tierLabel: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', letterSpacing: 0.5 },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  statVal: {
    fontFamily: 'monospace', fontSize: FONTS.md, fontWeight: '800',
    minWidth: 44, textAlign: 'right',
  },
  eqSection: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  eqTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700', marginBottom: 4 },
  eqTitleSub: { color: COLORS.textDisabled, fontWeight: '400' },
  eqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eqRowDecay: { opacity: 0.85 },
  eqEmojiWrap: { width: 30, alignItems: 'center', position: 'relative' },
  eqEmoji: { fontSize: 22, textAlign: 'center' },
  decayIcon: { fontSize: 10, position: 'absolute', bottom: -2, right: -2 },
  eqInfo: { flex: 1 },
  eqName: { fontSize: FONTS.xs, fontWeight: '700' },
  decayTag: { fontSize: FONTS.xxs - 1, color: COLORS.warn, fontWeight: '600' },
  eqTier: { fontSize: FONTS.xxs, fontFamily: 'monospace', marginTop: 1 },
  eqTierMissing: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', marginTop: 1 },
  tierPill: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  tierPillTxt: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },
});
