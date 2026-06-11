import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import PressableScale from './PressableScale';

export interface Quest {
  label: string;
  sub: string;
  done: boolean;
  xp: number;
  gold?: number;
  action?: () => void;
}

interface Props {
  quests: Quest[];
}

/**
 * 퀘스트 완료 시 "+XX XP" 텍스트가 위로 떠오르며 사라지는 서브컴포넌트
 */
function FloatingXP({ xp, done }: { xp: number; done: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prevDoneRef = useRef(done);

  useEffect(() => {
    const wasDone = prevDoneRef.current;
    prevDoneRef.current = done;

    // false → true 로 바뀔 때만 애니메이션 트리거
    if (!wasDone && done) {
      translateY.setValue(0);
      opacity.setValue(1);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [done]);

  return (
    <Animated.Text
      style={[
        styles.floatingXP,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      +{xp} XP
    </Animated.Text>
  );
}

/**
 * 오늘의 퀘스트 리스트.
 * 클리어 = 앰버색 체크박스 + 라벨 strikethrough.
 * 미완료 = 빈 체크박스, 탭하면 해당 화면으로 이동(action prop).
 */
export default function QuestList({ quests }: Props) {
  const done = quests.filter(q => q.done).length;
  const total = quests.length;
  const pct = Math.round((done / Math.max(1, total)) * 100);
  const allDone = done === total && total > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>오늘의 퀘스트</Text>
          {allDone && <View style={styles.allDonePill}><Text style={styles.allDoneTxt}>ALL CLEAR</Text></View>}
        </View>
        <Text style={styles.progress}>
          <Text style={[styles.progressDone, { color: allDone ? COLORS.amber : COLORS.primary }]}>{done}</Text>
          <Text style={styles.progressDim}> / {total}</Text>
        </Text>
      </View>

      {/* 진행 바 */}
      <View style={styles.barWrap}>
        <View style={styles.bar}>
          <View style={[styles.barFill, {
            width: `${pct}%`,
            backgroundColor: allDone ? COLORS.amber : COLORS.primary,
          }]} />
        </View>
        <Text style={[styles.barPct, { color: allDone ? COLORS.amber : COLORS.primary }]}>{pct}%</Text>
      </View>

      {quests.map((q, i) => (
        <PressableScale
          key={i}
          style={[styles.row, i === quests.length - 1 && styles.rowLast, q.done && styles.rowDone]}
          onPress={q.action}
          disabled={!q.action}
          scale={q.action ? 0.93 : 1}
        >
          {/* FloatingXP 오버레이 */}
          <View style={styles.floatingXPContainer} pointerEvents="none">
            <FloatingXP xp={q.xp} done={q.done} />
          </View>

          <View style={[styles.checkbox, q.done && styles.checkboxDone]}>
            {q.done
              ? <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              : <Ionicons name="chevron-forward" size={11} color={COLORS.textDisabled} />
            }
          </View>
          <View style={styles.text}>
            <Text style={[styles.label, q.done && styles.labelDone]}>{q.label}</Text>
            <Text style={[styles.sub, q.done && { color: COLORS.good + 'CC' }]}>{q.done ? '✓  CLEARED' : q.sub}</Text>
          </View>
          <View style={styles.rewardGroup}>
            <View style={[styles.xpPill, q.done && styles.pillDone]}>
              <Text style={[styles.xpText, q.done && styles.doneText]}>+{q.xp} XP</Text>
            </View>
            {(q.gold ?? 0) > 0 && (
              <View style={[styles.goldPill, q.done && styles.pillDone]}>
                <Ionicons name="logo-bitcoin" size={9} color={q.done ? COLORS.good : COLORS.amber} />
                <Text style={[styles.goldText, q.done && styles.doneText]}>{q.gold}G</Text>
              </View>
            )}
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.text },
  allDonePill: {
    backgroundColor: COLORS.amberGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  allDoneTxt: { fontSize: 8, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace', letterSpacing: 1 },
  progress: { fontFamily: 'monospace', fontSize: FONTS.xxs },
  progressDone: { fontWeight: '900', fontSize: FONTS.sm },
  progressDim: { color: COLORS.textMuted },

  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md + 2,
    marginBottom: SPACING.sm,
    gap: 8,
  },
  bar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  barPct: { fontSize: 9, fontFamily: 'monospace', fontWeight: '800', minWidth: 30, textAlign: 'right' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSub,
    position: 'relative',
  },
  rowLast: { borderBottomWidth: 0 },
  rowDone: { backgroundColor: 'rgba(16,185,129,0.03)' },
  floatingXPContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingXP: {
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: COLORS.amber,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.textDisabled,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.good, borderColor: COLORS.good },
  text: { flex: 1 },
  label: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  labelDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  sub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2 },
  rewardGroup: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  xpPill: {
    paddingVertical: 3, paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.amberGlow,
    borderWidth: 1, borderColor: COLORS.amberLine,
  },
  pillDone: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.25)' },
  xpText: { fontFamily: 'monospace', fontSize: FONTS.xxs, fontWeight: '700', color: COLORS.amber },
  doneText: { color: COLORS.good },
  goldPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingVertical: 3, paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)',
  },
  goldText: { fontFamily: 'monospace', fontSize: FONTS.xxs, fontWeight: '700', color: '#F59E0B' },
});
