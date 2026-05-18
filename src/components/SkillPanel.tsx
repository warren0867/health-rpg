import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { SKILLS, getActiveSkills } from '../utils/skillSystem';

interface Props {
  level: number;
}

export default function SkillPanel({ level }: Props) {
  const active = getActiveSkills(level);
  const nextSkill = SKILLS.find(s => s.unlockLevel > level);

  if (level < 2) {
    return (
      <View style={s.card}>
        <Text style={s.emptyText}>레벨 2 달성 시 첫 스킬이 해금됩니다</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>패시브 스킬</Text>
        <View style={s.levelBadge}>
          <Text style={s.levelBadgeText}>Lv{level}</Text>
        </View>
      </View>

      {active.map(skill => (
        <View key={skill.id} style={s.row}>
          <View style={[s.iconBox, { backgroundColor: skill.color + '20' }]}>
            <Ionicons name={skill.icon} size={16} color={skill.color} />
          </View>
          <View style={s.textWrap}>
            <Text style={s.skillName}>{skill.name}</Text>
            <Text style={s.skillDesc}>{skill.desc}</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeText}>Lv.{skill.unlockLevel}</Text>
          </View>
        </View>
      ))}

      {nextSkill && (
        <View style={[s.row, s.lockedRow]}>
          <View style={[s.iconBox, { backgroundColor: COLORS.border }]}>
            <Ionicons name="lock-closed" size={16} color={COLORS.textDisabled} />
          </View>
          <View style={s.textWrap}>
            <Text style={[s.skillName, s.lockedText]}>{nextSkill.name}</Text>
            <Text style={[s.skillDesc, s.lockedText]}>{nextSkill.desc}</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeText}>Lv.{nextSkill.unlockLevel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 4,
  },
  title: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  levelBadge: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.primaryLine,
  },
  levelBadgeText: {
    fontSize: FONTS.xxs,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  lockedRow: {
    opacity: 0.35,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  skillName: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  skillDesc: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  lockedText: {
    color: COLORS.textDisabled,
  },
  badge: {
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FONTS.xxs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: 'monospace',
    paddingVertical: SPACING.sm,
  },
});
