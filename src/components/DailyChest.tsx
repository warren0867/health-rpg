import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess } from '../utils/haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { ChestReward, claimDailyChest } from '../utils/dailyChest';

interface Props {
  streak: number;
  /** 보상 지급 콜백 — 골드/XP 저장은 호출측 책임 */
  onClaimed: (reward: ChestReward) => void;
}

/**
 * 일일 보상 상자 — 하루 한 번, 연속 출석일수록 보상 증가.
 * 미수령: 상자가 흔들리며 어필 → 탭하면 개봉 연출 후 보상 표시 → 잠시 뒤 접힘.
 */
export default function DailyChest({ streak, onClaimed }: Props) {
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [hidden, setHidden] = useState(false);

  // 흔들림 어필 루프
  const wiggle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reward) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(wiggle, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reward, wiggle]);
  const wiggleRot = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });

  // 개봉 연출
  const burst = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const handleOpen = async () => {
    const r = await claimDailyChest(streak);
    if (!r) { setHidden(true); return; }
    hapticSuccess();
    setReward(r);
    onClaimed(r);

    burst.setValue(0);
    Animated.sequence([
      Animated.spring(burst, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(fadeOut, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setHidden(true));
  };

  if (hidden) return null;

  const bonusDays = Math.min(streak, 7);

  return (
    <Animated.View style={[s.card, { opacity: fadeOut }]}>
      {!reward ? (
        <Pressable style={s.row} onPress={handleOpen}>
          <Animated.View style={[s.chestBox, { transform: [{ rotate: wiggleRot }] }]}>
            <Ionicons name="gift" size={26} color={COLORS.amber} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>일일 보상이 도착했어요!</Text>
            <Text style={s.sub}>
              {bonusDays >= 2 ? `연속 ${streak}일 보너스 적용 중 · ` : ''}탭해서 열기
            </Text>
          </View>
          <View style={s.openBtn}>
            <Text style={s.openBtnText}>열기</Text>
          </View>
        </Pressable>
      ) : (
        <Animated.View style={[s.row, { transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <View style={[s.chestBox, reward.jackpot && s.chestBoxJackpot]}>
            <Ionicons name="sparkles" size={26} color={reward.jackpot ? COLORS.rankS : COLORS.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, reward.jackpot && { color: COLORS.rankS }]}>
              {reward.jackpot ? '잭팟! 보상 2배!' : '보상 획득!'}
            </Text>
            <Text style={s.rewardText}>
              <Text style={{ color: COLORS.amber, fontWeight: '800' }}>+{reward.gold}G</Text>
              <Text style={{ color: COLORS.textMuted }}>  ·  </Text>
              <Text style={{ color: COLORS.primary, fontWeight: '800' }}>+{reward.xp} XP</Text>
            </Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.amberGlow,
    borderWidth: 1,
    borderColor: COLORS.amberLine,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: SPACING.md - 2,
  },
  chestBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  chestBoxJackpot: { backgroundColor: 'rgba(255,215,0,0.22)' },
  title: { color: COLORS.amber, fontSize: FONTS.sm, fontWeight: '800' },
  sub: { color: COLORS.textMuted, fontSize: FONTS.xxs, marginTop: 2 },
  rewardText: { fontSize: FONTS.sm, fontFamily: 'monospace', marginTop: 2 },
  openBtn: {
    backgroundColor: COLORS.amber,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  openBtnText: { color: '#FFFFFF', fontSize: FONTS.xs, fontWeight: '900' },
});
