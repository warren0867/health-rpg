import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { GachaBonus, PermanentStats } from '../types';
import PermanentStatPanel from './PermanentStatPanel';
import SkillPanel from './SkillPanel';
import StatGrid from './StatGrid';

interface Props {
  visible: boolean;
  onClose: () => void;
  permStats: PermanentStats;
  activeBonuses: GachaBonus[];
  level: number;
  todayStats: any | null;   // CharacterStats — 체크인 전이면 null
}

type Tab = 'stats' | 'skills' | 'today';

/**
 * 캐릭터 시트 — 능력치 / 스킬 / 오늘 컨디션 상세.
 * 홈에는 요약만 두고, 상세는 캐릭터를 탭했을 때 이 모달로 본다.
 */
export default function CharacterSheetModal({
  visible, onClose, permStats, activeBonuses, level, todayStats,
}: Props) {
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>캐릭터 정보</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={s.segmentRow}>
            {([
              { key: 'stats',  label: '능력치' },
              { key: 'skills', label: '스킬' },
              { key: 'today',  label: '오늘' },
            ] as const).map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.segmentBtn, tab === t.key && s.segmentBtnActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.segmentText, tab === t.key && s.segmentTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginHorizontal: -SPACING.md }}>
            {tab === 'stats' && (
              <PermanentStatPanel stats={permStats} activeBonuses={activeBonuses} />
            )}
            {tab === 'skills' && (
              <SkillPanel level={level} />
            )}
            {tab === 'today' && (
              todayStats ? (
                <StatGrid stats={todayStats} />
              ) : (
                <View style={s.empty}>
                  <Ionicons name="moon-outline" size={28} color={COLORS.textDisabled} />
                  <Text style={s.emptyText}>오늘 체크인하면 컨디션 스탯이 생성돼요</Text>
                </View>
              )
            )}
            <View style={{ height: SPACING.md }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
  },
  title: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    gap: 3,
    marginBottom: SPACING.sm + 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: COLORS.bgHighlight },
  segmentText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
  segmentTextActive: { color: COLORS.primaryDark, fontWeight: '800' },

  empty: {
    alignItems: 'center', gap: 8,
    paddingVertical: SPACING.xl,
  },
  emptyText: { fontSize: FONTS.xs, color: COLORS.textMuted },
});
