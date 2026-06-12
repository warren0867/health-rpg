import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { GachaBonus, PermanentStats } from '../types';
import {
  GEAR_PULL_COST, GearItem, GearKind, GearState, TIER_CFG,
  enhanceGoldCost, enhanceRate, gearAtk, gearDef, gearHp, getGearState,
  makeHeroSword, pullGear, saveGearState, sellValue, tryEnhance,
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

  // ─── 뽑기 ───────────────────────────────────────────
  async function handlePull() {
    if (!gear) return;
    if (gold < GEAR_PULL_COST) {
      Alert.alert('골드 부족', `장비 뽑기에는 ${GEAR_PULL_COST}G가 필요해요.\n퀘스트·사냥·게임으로 골드를 모아보세요!`);
      return;
    }
    const newGold = await addGold(-GEAR_PULL_COST);
    setGold(newGold);
    const result = pullGear();
    hapticLight();
    if (result.type === 'scroll') {
      if (result.kind === 'weapon') gear.weaponScrolls++;
      else gear.armorScrolls++;
      showFlash(result.kind === 'weapon' ? '📜 무기 강화 주문서 획득!' : '📘 방어구 강화 주문서 획득!', COLORS.info);
    } else {
      gear.inventory.push(result.item);
      const t = TIER_CFG[result.item.tier];
      showFlash(`${result.item.emoji} [${t.label}] ${result.item.name} 획득!`, t.color);
      if (result.item.tier === 'legendary' || result.item.tier === 'epic') hapticSuccess();
    }
    await persist(gear);
  }

  // ─── 장착/해제 ──────────────────────────────────────
  async function equip(item: GearItem) {
    if (!gear) return;
    gear.inventory = gear.inventory.filter(i => i.id !== item.id);
    const prev = item.kind === 'weapon' ? gear.weapon : gear.armor;
    if (prev) gear.inventory.push(prev);
    if (item.kind === 'weapon') gear.weapon = item;
    else gear.armor = item;
    hapticLight();
    await persist(gear);
  }

  async function unequip(kind: GearKind) {
    if (!gear) return;
    const item = kind === 'weapon' ? gear.weapon : gear.armor;
    if (!item) return;
    gear.inventory.push(item);
    if (kind === 'weapon') gear.weapon = null;
    else gear.armor = null;
    await persist(gear);
  }

  // ─── 판매 ───────────────────────────────────────────
  function sell(item: GearItem) {
    const value = sellValue(item);
    Alert.alert('판매', `${item.name}${item.enh > 0 ? ` +${item.enh}` : ''}을(를) ${value}G에 판매할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '판매', style: 'destructive',
        onPress: async () => {
          if (!gear) return;
          gear.inventory = gear.inventory.filter(i => i.id !== item.id);
          const newGold = await addGold(value);
          setGold(newGold);
          showFlash(`+${value}G`, COLORS.amber);
          await persist(gear);
        },
      },
    ]);
  }

  // ─── 강화 ───────────────────────────────────────────
  async function enhance(kind: GearKind) {
    if (!gear) return;
    const item = kind === 'weapon' ? gear.weapon : gear.armor;
    if (!item) return;
    const scrolls = kind === 'weapon' ? gear.weaponScrolls : gear.armorScrolls;
    if (scrolls <= 0) {
      Alert.alert('주문서 부족', `${kind === 'weapon' ? '무기' : '방어구'} 강화 주문서가 없어요.\n장비 뽑기나 사냥터에서 얻을 수 있어요!`);
      return;
    }
    const cost = enhanceGoldCost(item.enh);
    if (gold < cost) {
      Alert.alert('골드 부족', `강화 비용 ${cost}G가 필요해요.`);
      return;
    }

    // 주문서 + 골드 차감 후 시도
    if (kind === 'weapon') gear.weaponScrolls--;
    else gear.armorScrolls--;
    const newGold = await addGold(-cost);
    setGold(newGold);

    const ok = tryEnhance(item);
    if (ok) {
      hapticSuccess();
      showFlash(`✨ 강화 성공! ${item.name} +${item.enh}`, COLORS.good);
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
                {/* 골드 / 주문서 보유 */}
                <View style={s.resRow}>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>🪙</Text>
                    <Text style={s.resTxt}>{gold.toLocaleString()}G</Text>
                  </View>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>📜</Text>
                    <Text style={s.resTxt}>무기 x{gear.weaponScrolls}</Text>
                  </View>
                  <View style={s.resPill}>
                    <Text style={s.resEmoji}>📘</Text>
                    <Text style={s.resTxt}>방어구 x{gear.armorScrolls}</Text>
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
                </View>

                <Text style={s.pullHint}>새 장비는 뽑기의 '무기뽑기' 탭 또는 사냥터 드랍으로 획득해요</Text>

                {/* 인벤토리 */}
                <Text style={s.invTitle}>인벤토리 ({gear.inventory.length})</Text>
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
                        <Text style={s.invStat}>
                          {item.kind === 'weapon' ? `공격 +${gearAtk(item)}` : `방어 +${gearDef(item)} · 체력 +${gearHp(item)}`}
                        </Text>
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
  const label = kind === 'weapon' ? '무기' : '방어구';
  if (!item) {
    return (
      <View style={[s.slot, s.slotEmpty]}>
        <Ionicons name={kind === 'weapon' ? 'flash-outline' : 'shield-outline'} size={20} color={COLORS.textDisabled} />
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
      <Text style={s.slotStat}>
        {kind === 'weapon' ? `공격 +${gearAtk(item)}` : `방어 +${gearDef(item)} · HP +${gearHp(item)}`}
      </Text>
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
