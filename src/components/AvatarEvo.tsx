import React from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { PermanentStats } from '../types';

export type EvoStage = 0 | 1 | 2 | 3 | 4 | 5;

interface Stage {
  stage: EvoStage;
  threshold: number;
  label: string;
  source: ImageSourcePropType;
  borderColor: string;
  bgColor: string;
  textColor: string;
  glowColor?: string;
}

export const EVO_STAGES: Stage[] = [
  { stage: 0, threshold: 0,
    label: '견습 모험가',
    source: require('../../assets/avatars/evo0.png'),
    borderColor: COLORS.border,        bgColor: COLORS.bgInput,
    textColor: COLORS.textMuted },
  { stage: 1, threshold: 60,
    label: '신참 전사',
    source: require('../../assets/avatars/evo1.png'),
    borderColor: COLORS.primaryLine,   bgColor: COLORS.primaryGlow,
    textColor: COLORS.primary },
  { stage: 2, threshold: 120,
    label: '정예 전사',
    source: require('../../assets/avatars/evo2.png'),
    borderColor: COLORS.vit + '55',    bgColor: COLORS.vit + '18',
    textColor: COLORS.vit },
  { stage: 3, threshold: 160,
    label: '용맹한 기사',
    source: require('../../assets/avatars/evo3.png'),
    borderColor: COLORS.agi + '66',    bgColor: COLORS.agi + '22',
    textColor: COLORS.agi },
  { stage: 4, threshold: 210,
    label: '전설의 영웅',
    source: require('../../assets/avatars/evo4.png'),
    borderColor: COLORS.amberLine,     bgColor: COLORS.amberGlow,
    textColor: COLORS.amber,
    glowColor: COLORS.amber },
  { stage: 5, threshold: 260,
    label: '신화의 용사',
    source: require('../../assets/avatars/evo5.png'),
    borderColor: COLORS.rankS + '88',  bgColor: COLORS.rankSGlow,
    textColor: COLORS.rankS,
    glowColor: COLORS.rankS },
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

// conditionPct(0~100)로 아바타 상태 결정
export type ConditionState = 'strong' | 'normal' | 'weak';

export function getConditionState(pct: number): ConditionState {
  if (pct >= 70) return 'strong';
  if (pct >= 40) return 'normal';
  return 'weak';
}

const CONDITION_DOT: Record<ConditionState, string> = {
  strong: COLORS.good,
  normal: COLORS.amber,
  weak:   COLORS.bad,
};

// weak 상태일 때 테두리/배경 오버라이드
const WEAK_BORDER = 'rgba(239,68,68,0.50)';
const WEAK_BG     = 'rgba(239,68,68,0.10)';

interface Props {
  stats: PermanentStats;
  size?: number;
  conditionPct?: number;  // 0~100. undefined = 상태 표시 없음
}

export default function AvatarEvo({ stats, size = 60, conditionPct }: Props) {
  const stage = getEvoStage(stats.totalGained);
  const innerSize = Math.round(size * 0.78);

  const condState: ConditionState | null =
    conditionPct !== undefined ? getConditionState(conditionPct) : null;

  const borderColor =
    condState === 'weak' ? WEAK_BORDER :
    condState === 'strong' ? COLORS.good + '88' :
    stage.borderColor;

  const bgColor =
    condState === 'weak' ? WEAK_BG : stage.bgColor;

  const imageOpacity = condState === 'weak' ? 0.50 : 1;

  const containerStyle: ViewStyle = {
    width: size, height: size,
    borderRadius: RADIUS.md + 2,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    borderColor,
    backgroundColor: bgColor,
    overflow: 'visible',
  };

  const dotSize = Math.round(size * 0.22);

  return (
    <View style={containerStyle}>
      {/* strong 상태 — 그린 글로우 */}
      {condState === 'strong' && (
        <View
          pointerEvents="none"
          style={[s.outerGlow, { backgroundColor: COLORS.good + '22', borderRadius: RADIUS.md + 8 }]}
        />
      )}
      {/* EVO 4+ 원래 글로우 (strong이 아닐 때만) */}
      {stage.glowColor && condState !== 'strong' && condState !== 'weak' && (
        <View
          pointerEvents="none"
          style={[s.outerGlow, { backgroundColor: stage.glowColor + '22', borderRadius: RADIUS.md + 8 }]}
        />
      )}

      <Image
        source={stage.source}
        style={{ width: innerSize, height: innerSize, opacity: imageOpacity, ...pixelated }}
        resizeMode="contain"
      />

      {/* 컨디션 상태 도트 (우측 상단) */}
      {condState !== null && (
        <View
          style={[
            s.statusDot,
            {
              width: dotSize, height: dotSize,
              borderRadius: dotSize / 2,
              top: -(dotSize / 2 - 2),
              right: -(dotSize / 2 - 2),
              backgroundColor: CONDITION_DOT[condState],
            },
          ]}
        />
      )}
    </View>
  );
}

const pixelated: any = Platform.select({
  web: { imageRendering: 'pixelated' },
  default: {},
});

const s = StyleSheet.create({
  outerGlow: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    opacity: 0.55,
  },
  statusDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#070912',  // bg 색과 같게 — 테두리로 분리감
  },
});
