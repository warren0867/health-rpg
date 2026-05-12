import React from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { PermanentStats } from '../types';

// 영구 스탯 totalGained 기반 6단계 진화.
// 스프라이트 출처: Kenney "Tiny Dungeon" (CC0). assets/avatars/LICENSE.txt 참고.
// 모든 스프라이트는 16×16 픽셀아트 — 큰 사이즈로 키워도 픽셀 보존되도록 렌더.
export type EvoStage = 0 | 1 | 2 | 3 | 4 | 5;

interface Stage {
  stage: EvoStage;
  threshold: number;
  label: string;
  source: ImageSourcePropType;
  borderColor: string;
  bgColor: string;
  textColor: string;    // 라벨/뱃지 컬러
  glowColor?: string;   // 4단계 이상만
}

// require()는 런타임 X — 빌드 타임에 정적으로 번들됨. 그래서 객체 안에 그대로.
export const EVO_STAGES: Stage[] = [
  { stage: 0, threshold: 0,
    label: '견습 모험가',
    source: require('../../assets/avatars/evo0.png'),
    borderColor: COLORS.border,        bgColor: COLORS.bgInput,
    textColor: COLORS.textMuted },
  { stage: 1, threshold: 20,
    label: '신참 전사',
    source: require('../../assets/avatars/evo1.png'),
    borderColor: COLORS.primaryLine,   bgColor: COLORS.primaryGlow,
    textColor: COLORS.primary },
  { stage: 2, threshold: 50,
    label: '정예 전사',
    source: require('../../assets/avatars/evo2.png'),
    borderColor: COLORS.vit + '55',    bgColor: COLORS.vit + '18',
    textColor: COLORS.vit },
  { stage: 3, threshold: 100,
    label: '용맹한 기사',
    source: require('../../assets/avatars/evo3.png'),
    borderColor: COLORS.agi + '66',    bgColor: COLORS.agi + '22',
    textColor: COLORS.agi },
  { stage: 4, threshold: 200,
    label: '전설의 영웅',
    source: require('../../assets/avatars/evo4.png'),
    borderColor: COLORS.amberLine,     bgColor: COLORS.amberGlow,
    textColor: COLORS.amber,
    glowColor: COLORS.amber },
  { stage: 5, threshold: 400,
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

interface Props {
  stats: PermanentStats;
  size?: number;
}

export default function AvatarEvo({ stats, size = 60 }: Props) {
  const stage = getEvoStage(stats.totalGained);
  // 16×16 픽셀아트 → 큰 사이즈로 확대 시 픽셀 흐려지지 않게.
  // 웹: imageRendering: 'pixelated' (CSS). 네이티브: Image의 resizeMethod=resize는
  // 자동 안티엘리어싱을 적용해버리므로, scale을 정수배(예: 48 = 16*3)로 두면 자연스러움.
  const innerSize = Math.round(size * 0.78);

  const containerStyle: ViewStyle = {
    width: size, height: size,
    borderRadius: RADIUS.md + 2,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    borderColor: stage.borderColor,
    backgroundColor: stage.bgColor,
    overflow: 'visible',
  };

  return (
    <View style={containerStyle}>
      {/* 4단계 이상 — 두 겹 글로우 */}
      {stage.glowColor && (
        <View
          pointerEvents="none"
          style={[
            s.outerGlow,
            { backgroundColor: stage.glowColor + '22', borderRadius: RADIUS.md + 8 },
          ]}
        />
      )}
      <Image
        source={stage.source}
        style={{ width: innerSize, height: innerSize, ...pixelated }}
        resizeMode="contain"
        // RN web 한정 — CSS image-rendering 적용
      />
    </View>
  );
}

// 픽셀아트 보존 — 웹에선 CSS, 네이티브엔 무영향
const pixelated: any = Platform.select({
  web: { imageRendering: 'pixelated' },
  default: {},
});

const s = StyleSheet.create({
  outerGlow: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    opacity: 0.55,
  },
});
