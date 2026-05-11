import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { PermanentStats } from '../types';

// 영구 스탯 totalGained 기반 6단계 진화.
// 핵심 인사이트: 누적이 늘면 → 등급이 오르고 → 컬러/아이콘이 변형.
// 외부 의존 없이 Ionicons + 컬러 변형으로 표현.
export type EvoStage = 0 | 1 | 2 | 3 | 4 | 5;

interface Stage {
  stage: EvoStage;
  threshold: number;          // 이 단계 진입에 필요한 totalGained
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}

export const EVO_STAGES: Stage[] = [
  { stage: 0, threshold: 0,   label: '견습 모험가', icon: 'person-outline',   iconColor: COLORS.textMuted, borderColor: COLORS.border,           bgColor: COLORS.bgInput },
  { stage: 1, threshold: 20,  label: '신참 전사',   icon: 'walk',             iconColor: COLORS.primary,   borderColor: COLORS.primaryLine,      bgColor: COLORS.primaryGlow },
  { stage: 2, threshold: 50,  label: '정예 전사',   icon: 'flash',            iconColor: COLORS.vit,       borderColor: COLORS.vit + '55',       bgColor: COLORS.vit + '18' },
  { stage: 3, threshold: 100, label: '용맹한 기사', icon: 'shield-checkmark', iconColor: COLORS.agi,       borderColor: COLORS.agi + '66',       bgColor: COLORS.agi + '22' },
  { stage: 4, threshold: 200, label: '전설의 영웅', icon: 'flame',            iconColor: COLORS.amber,     borderColor: COLORS.amberLine,        bgColor: COLORS.amberGlow },
  { stage: 5, threshold: 400, label: '신화의 용사', icon: 'star',             iconColor: COLORS.rankS,     borderColor: COLORS.rankS + '88',     bgColor: COLORS.rankSGlow },
];

export function getEvoStage(totalGained: number): Stage {
  let cur = EVO_STAGES[0];
  for (const s of EVO_STAGES) {
    if (totalGained >= s.threshold) cur = s;
    else break;
  }
  return cur;
}

export function getNextEvoStage(totalGained: number): Stage | null {
  const cur = getEvoStage(totalGained);
  const next = EVO_STAGES[cur.stage + 1];
  return next ?? null;
}

interface Props {
  stats: PermanentStats;
  size?: number;
}

export default function AvatarEvo({ stats, size = 60 }: Props) {
  const stage = getEvoStage(stats.totalGained);
  const iconSize = Math.round(size * 0.53);
  const containerStyle: ViewStyle = {
    width: size, height: size,
    borderRadius: RADIUS.md + 2,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    borderColor: stage.borderColor,
    backgroundColor: stage.bgColor,
  };
  return (
    <View style={containerStyle}>
      {/* 최고 단계 때 두 겹 글로우 */}
      {stage.stage >= 4 && (
        <View style={[s.outerGlow, { backgroundColor: stage.iconColor + '22', borderRadius: RADIUS.md + 6 }]} pointerEvents="none" />
      )}
      <Ionicons name={stage.icon} size={iconSize} color={stage.iconColor} />
    </View>
  );
}

const s = StyleSheet.create({
  outerGlow: {
    position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
    opacity: 0.6,
  },
});
