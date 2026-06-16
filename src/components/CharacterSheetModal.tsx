import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { GachaBonus, PermanentStats } from '../types';
import {
  GearItem, GearKind, GearState, GearTier, TIER_CFG,
  enhanceGoldCost, enhanceRate, gearStatText, getEquipped, getGearState,
  kindLabel, makeHeroSword, saveGearState, scrollCount, sellValue, setEquipped,
  spendScroll, tryEnhance,
} from '../utils/equipment';
import { addGold, getGold } from '../utils/gacha';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import { unlockAchievement } from '../utils/storage';
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

type Tab = 'gear' | 'stats' | 'skills' | 'today';

/**
 * 캐릭터 시트 — 장비(장착·강화·뽑기) / 능력치 / 스킬 / 오늘 컨디션.
 */
export default function CharacterSheetModal({
  visible, onClose, permStats, activeBonuses, level, todayStats,
}: Props) {
  const [tab, setTab] = useState<Tab>('gear');
  const [gear, setGear] = useState<GearState | null>(null);
  const [gold, setGold] = useState(0);
  const [flash, setFlash] = useState<{ msg: string; color: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      getGearState().then(setGear);
      getGold().then(setGold);
    }
  }, [visible]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  function showFlash(msg: string, color: string) {
    setFlash({ msg, color });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  }

  async function persist(next: GearState) {
    setGear({ ...next });
    await saveGearState(next);
  }

  // 웹(RN Web)에서는 Alert.alert의 버튼 콜백이 동작하지 않아 판매가 안 됐다.
  // 플랫폼별로 확인창을 분리해서 어디서든 판매되게 한다.
  function confirmAction(title: string, message: string, onConfirm: () => void) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: '취소', style: 'cancel' },
        { text: '판매', style: 'destructive', onPress: onConfirm },
      ]);
    }
  }

  // ─── 장착/해제 ──────────────────────────────────────
  async function equip(item: GearItem) {
    if (!gear) return;
    gear.inventory = gear.inventory.filter(i => i.id !== item.id);
    const prev = getEquipped(gear, item.kind);
    if (prev) gear.inventory.push(prev);
    setEquipped(gear, item.kind, item);
    hapticLight();
    await persist(gear);
  }

  async function unequip(kind: GearKind) {
    if (!gear) return;
    const item = getEquipped(gear, kind);
    if (!item) return;
    gear.inventory.push(item);
    setEquipped(gear, kind, null);
    await persist(gear);
  }

  // ─── 판매 ───────────────────────────────────────────
  function sell(item: GearItem) {
    const value = sellValue(item);
    confirmAction('판매', `${item.name}${item.enh > 0 ? ` +${item.enh}` : ''}을(를) ${value}G에 판매할까요?`, async () => {
      if (!gear) return;
      gear.inventory = gear.inventory.filter(i => i.id !== item.id);
      const newGold = await addGold(value);
      setGold(newGold);
      hapticLight();
      showFlash(`+${value}G`, COLORS.amber);
      await persist(gear);
    });
  }

  // 등급 일괄 판매 (장착 중인 장비는 인벤토리에 없으므로 대상 제외)
  function sellTier(tier: GearTier) {
    if (!gear) return;
    const items = gear.inventory.filter(i => i.tier === tier);
    if (items.length === 0) return;
    const total = items.reduce((sum, i) => sum + sellValue(i), 0);
    confirmAction(`${TIER_CFG[tier].label} 일괄 판매`, `${TIER_CFG[tier].label} 장비 ${items.length}개를 모두 ${total.toLocaleString()}G에 판매할까요?`, async () => {
      if (!gear) return;
      gear.inventory = gear.inventory.filter(i => i.tier !== tier);
      const newGold = await addGold(total);
      setGold(newGold);
      hapticSuccess();
      showFlash(`+${total.toLocaleString()}G  (${items.length}개 판매)`, COLORS.amber);
      await persist(gear);
    });
  }

  // ─── 강화 ───────────────────────────────────────────
  async function enhance(kind: GearKind) {
    if (!gear) return;
    const item = getEquipped(gear, kind);
    if (!item) return;
    if (scrollCount(gear, kind) <= 0) {
      Alert.alert('주문서 부족', `${kindLabel(kind)} 강화 주문서가 없어요.\n장비 뽑기나 사냥터에서 얻을 수 있어요!`);
      return;
    }
    const cost = enhanceGoldCost(item.enh);
    if (gold < cost) {
      Alert.alert('골드 부족', `강화 비용 ${cost}G가 필요해요.`);
      return;
    }

    // 주문서 + 골드 차감 후 시도
    spendScroll(gear, kind);
    const newGold = await addGold(-cost);
    setGold(newGold);

    const levels = tryEnhance(item);
    if (levels > 0) {
      hapticSuccess();
      if (levels >= 3)      showFlash(`🌟 트리플 대성공!! ${item.name} +${item.enh} (+3단계)`, COLORS.amber);
      else if (levels === 2) showFlash(`💫 대성공! ${item.name} +${item.enh} (+2단계)`, COLORS.amber);
      else                   showFlash(`✨ 강화 성공! ${item.name} +${item.enh}`, COLORS.good);
      await checkEnhanceAchievements(item);
    } else {
      hapticWarning();
      showFlash('💥 강화 실패... 주문서가 사라졌어요', COLORS.bad);
    }
    await persist(gear);
  }

  async function checkEnhanceAchievements(item: GearItem) {
    if (!gear) return;
    if (item.enh >= 5)  await unlockAchievement('enhance_5');
    if (item.enh >= 10) await unlockAchievement('enhance_10');
    if (item.enh >= 20) await unlockAchievement('enhance_20');
    if (item.enh >= 15) {
      const first = await unlockAchievement('enhance_15');
      if (first && !gear.swordRewarded) {
        gear.swordRewarded = true;
        const sword = makeHeroSword();
        gear.inventory.push(sword);
        Alert.alert(
          '🏆 전설의 대장장이!',
          `+15 강화 달성!\n업적 보상으로 최강의 무기 [전설] ${sword.name}(공격 +${sword.base})을 획득했어요!`,
        );
      }
    }
  }

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
              { key: 'gear',   label: '장비' },
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

          {/* 플래시 메시지 */}
          {flash && (
            <View style={[s.flashBar, { backgroundColor: flash.color + '18', borderColor: flash.color + '55' }]}>
              <Text style={[s.flashTxt, { color: flash.color }]}>{flash.msg}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={tab !== 'gear' ? { marginHorizontal: -SPACING.md } : undefined}>
            {/* ── 장비 탭 ── */}
            {tab === 'gear' && gear && (
              <View>
                {/* 골드 보유 */}
                <View style={s.resRow}>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>🪙</Text>
                    <Text style={s.resTxt}>{gold.toLocaleString()}G</Text>
                  </View>
                </View>
                {/* 강화 주문서 보유 */}
                <View style={s.resRow}>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>📜</Text>
                    <Text style={s.resTxt}>무기 x{gear.weaponScrolls}</Text>
                  </View>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>📘</Text>
                    <Text style={s.resTxt}>방어구 x{gear.armorScrolls}</Text>
                  </View>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>📒</Text>
                    <Text style={s.resTxt}>악세 x{gear.accessoryScrolls}</Text>
                  </View>
                </View>

                {/* 장착 슬롯 */}
                <View style={s.slotRow}>
                  <SlotCard
                    kind="weapon"
                    item={gear.weapon}
                    onEnhance={() => enhance('weapon')}
                    onUnequip={() => unequip('weapon')}
                  />
                  <SlotCard
                    kind="armor"
                    item={gear.armor}
                    onEnhance={() => enhance('armor')}
                    onUnequip={() => unequip('armor')}
                  />
                  <SlotCard
                    kind="accessory"
                    item={gear.accessory}
                    onEnhance={() => enhance('accessory')}
                    onUnequip={() => unequip('accessory')}
                  />
                </View>

                <Text style={s.pullHint}>새 장비는 뽑기의 '무기뽑기' 탭 또는 사냥터 드랍으로 획득해요</Text>

                {/* 인벤토리 */}
                <Text style={s.invTitle}>인벤토리 ({gear.inventory.length})</Text>

                {/* 등급 일괄 판매 */}
                {gear.inventory.length > 0 && (
                  <View style={s.bulkRow}>
                    {(['common', 'rare', 'epic', 'legendary'] as GearTier[]).map(t => {
                      const cnt = gear.inventory.filter(i => i.tier === t).length;
                      if (cnt === 0) return null;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[s.bulkBtn, { borderColor: TIER_CFG[t].color + '55', backgroundColor: TIER_CFG[t].color + '12' }]}
                          onPress={() => sellTier(t)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.bulkBtnTxt, { color: TIER_CFG[t].color }]}>{TIER_CFG[t].label} {cnt}개 판매</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {gear.inventory.length === 0 ? (
                  <View style={s.invEmpty}>
                    <Ionicons name="bag-outline" size={22} color={COLORS.textDisabled} />
                    <Text style={s.invEmptyTxt}>장비 뽑기나 사냥으로 장비를 모아보세요</Text>
                  </View>
                ) : (
                  gear.inventory.map(item => (
                    <View key={item.id} style={s.invRow}>
                      <Text style={s.invEmoji}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.invName}>
                          <Text style={{ color: TIER_CFG[item.tier].color, fontWeight: '800' }}>[{TIER_CFG[item.tier].label}]</Text>
                          {' '}{item.name}{item.enh > 0 ? ` +${item.enh}` : ''}
                        </Text>
                        <Text style={s.invStat}>{gearStatText(item)}</Text>
                      </View>
                      <TouchableOpacity style={s.invBtn} onPress={() => equip(item)}>
                        <Text style={s.invBtnTxt}>장착</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.invBtn, s.sellBtn]} onPress={() => sell(item)}>
                        <Text style={[s.invBtnTxt, { color: COLORS.amber }]}>{sellValue(item)}G</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                <View style={{ height: SPACING.md }} />
              </View>
            )}

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
            {tab !== 'gear' && <View style={{ height: SPACING.md }} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── 장착 슬롯 카드 ─────────────────────────────────────────
function SlotCard({ kind, item, onEnhance, onUnequip }: {
  kind: GearKind;
  item: GearItem | null;
  onEnhance: () => void;
  onUnequip: () => void;
}) {
  const label = kindLabel(kind);
  const emptyIcon = kind === 'weapon' ? 'flash-outline' : kind === 'armor' ? 'shield-outline' : 'diamond-outline';
  if (!item) {
    return (
      <View style={[s.slot, s.slotEmpty]}>
        <Ionicons name={emptyIcon} size={20} color={COLORS.textDisabled} />
        <Text style={s.slotEmptyTxt}>{label} 없음</Text>
        <Text style={s.slotEmptySub}>인벤토리에서 장착</Text>
      </View>
    );
  }
  const tier = TIER_CFG[item.tier];
  const rate = Math.round(enhanceRate(item.enh) * 100);
  const cost = enhanceGoldCost(item.enh);
  return (
    <View style={[s.slot, { borderColor: tier.color + '66' }]}>
      <Text style={[s.slotTier, { color: tier.color }]}>[{tier.label}] {label}</Text>
      <Text style={s.slotEmoji}>{item.emoji}</Text>
      <Text style={s.slotName} numberOfLines={1}>
        {item.name}{item.enh > 0 && <Text style={{ color: COLORS.amber }}> +{item.enh}</Text>}
      </Text>
      <Text style={s.slotStat}>{gearStatText(item)}</Text>
      <TouchableOpacity style={s.enhBtn} onPress={onEnhance} activeOpacity={0.8}>
        <Text style={s.enhBtnTxt}>강화 {rate}%</Text>
        <Text style={s.enhBtnCost}>📜1 + {cost}G</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onUnequip} hitSlop={6}>
        <Text style={s.unequipTxt}>해제</Text>
      </TouchableOpacity>
    </View>
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
    maxHeight: '88%',
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

  flashBar: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: SPACING.sm,
  },
  flashTxt: { fontSize: FONTS.xs, fontWeight: '800', textAlign: 'center' },

  // 자원
  resRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm + 2 },
  resPill: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 7,
  },
  resEmoji: { fontSize: 12 },
  resTxt: { fontSize: FONTS.xxs, fontWeight: '800', color: COLORS.textSub, fontFamily: 'monospace' },

  // 슬롯
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm + 2 },
  slot: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 8,
    gap: 3,
  },
  slotEmpty: { borderStyle: 'dashed', paddingVertical: 22 },
  slotEmptyTxt: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '700' },
  slotEmptySub: { fontSize: 9, color: COLORS.textDisabled },
  slotTier: { fontSize: 9, fontWeight: '900' },
  slotEmoji: { fontSize: 34 },
  slotName: { fontSize: FONTS.xs, fontWeight: '800', color: COLORS.text },
  slotStat: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  enhBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 7, paddingHorizontal: 14,
    alignItems: 'center',
  },
  enhBtnTxt: { fontSize: FONTS.xs, fontWeight: '900', color: '#FFFFFF' },
  enhBtnCost: { fontSize: 8, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  unequipTxt: { fontSize: 10, color: COLORS.textDisabled, marginTop: 5, textDecorationLine: 'underline' },

  // 뽑기
  pullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  pullBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
  pullCostPill: {
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  pullCostTxt: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  pullHint: { fontSize: 9, color: COLORS.textDisabled, textAlign: 'center', marginTop: 6, marginBottom: SPACING.sm },

  // 인벤토리
  invTitle: { fontSize: FONTS.xs, fontWeight: '800', color: COLORS.textSub, marginBottom: 6, marginTop: 4 },
  bulkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  bulkBtn: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  bulkBtnTxt: { fontSize: 10, fontWeight: '800' },
  invEmpty: {
    alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    paddingVertical: 22,
  },
  invEmptyTxt: { fontSize: FONTS.xxs, color: COLORS.textMuted },
  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 9, paddingHorizontal: 10,
    marginBottom: 6,
  },
  invEmoji: { fontSize: 22 },
  invName: { fontSize: FONTS.xs, color: COLORS.text, fontWeight: '600' },
  invStat: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 1 },
  invBtn: {
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.primaryLine,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  sellBtn: { backgroundColor: COLORS.amberGlow, borderColor: COLORS.amberLine },
  invBtnTxt: { fontSize: 10, fontWeight: '800', color: COLORS.primaryDark },

  empty: {
    alignItems: 'center', gap: 8,
    paddingVertical: SPACING.xl,
  },
  emptyText: { fontSize: FONTS.xs, color: COLORS.textMuted },
});
