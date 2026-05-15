import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import {
  GACHA_RARITY_COLOR, GACHA_RARITY_LABEL,
  GachaBonus, GachaInventory, GachaPullResult, GachaScroll, STAT_LABEL,
} from '../types';
import {
  SINGLE_COST, TEN_COST,
  applyXpPotions, canDailyFreePull, doDailyFreePull, doPull,
  getGachaInventory, useScroll,
} from '../utils/gacha';

interface Props {
  visible: boolean;
  onClose: () => void;
  addXpFn: (xp: number) => Promise<any>;
  onInventoryChanged: () => void;
  initialTab?: Tab;
}

type Tab = 'pull' | 'inventory' | 'bonus';

// ── 뽑기 결과 카드 ────────────────────────────────────────────
function ResultCard({ result }: { result: GachaPullResult }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  }, []);

  if (result.type === 'xp_potion') {
    return (
      <Animated.View style={[rc.card, { borderColor: COLORS.amber + '88', backgroundColor: COLORS.amberGlow,
        transform: [{ scale: anim }], opacity: anim }]}>
        <Text style={rc.emoji}>⚗️</Text>
        <Text style={[rc.name, { color: COLORS.amber }]}>경험치 물약</Text>
        <Text style={rc.sub}>+{result.amount} XP</Text>
        <View style={[rc.pill, { backgroundColor: COLORS.amber + '22', borderColor: COLORS.amber + '55' }]}>
          <Text style={[rc.pillTxt, { color: COLORS.amber }]}>즉시 적용</Text>
        </View>
      </Animated.View>
    );
  }
  if (result.type === 'gold') {
    return (
      <Animated.View style={[rc.card, { borderColor: COLORS.textMuted + '44', backgroundColor: COLORS.bgInput,
        transform: [{ scale: anim }], opacity: anim }]}>
        <Text style={rc.emoji}>🪙</Text>
        <Text style={[rc.name, { color: COLORS.textSub }]}>골드 반환</Text>
        <Text style={rc.sub}>+{result.amount} G</Text>
        <View style={[rc.pill, { backgroundColor: COLORS.bgHighlight, borderColor: COLORS.border }]}>
          <Text style={[rc.pillTxt, { color: COLORS.textMuted }]}>꽝</Text>
        </View>
      </Animated.View>
    );
  }
  const { scroll } = result;
  const color = GACHA_RARITY_COLOR[scroll.rarity];
  return (
    <Animated.View style={[rc.card, { borderColor: color + '88', backgroundColor: color + '14',
      transform: [{ scale: anim }], opacity: anim }]}>
      <Text style={rc.emoji}>{scroll.emoji}</Text>
      <Text style={[rc.name, { color }]}>{scroll.name}</Text>
      <Text style={rc.sub}>{STAT_LABEL[scroll.stat]} +{scroll.bonus}</Text>
      <Text style={[rc.dur, { color: color + 'AA' }]}>{scroll.durationDays}일</Text>
      <View style={[rc.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[rc.pillTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
      </View>
    </Animated.View>
  );
}

// ── 인벤토리 주문서 카드 (대형) ───────────────────────────────
function ScrollCard({ scroll, onUse }: { scroll: GachaScroll; onUse: () => void }) {
  const color = GACHA_RARITY_COLOR[scroll.rarity];
  return (
    <View style={[ic.card, { borderColor: color + '44' }]}>
      <View style={[ic.glowBg, { backgroundColor: color + '0C' }]} pointerEvents="none" />

      {/* 상단: 이모지 + 이름 + 등급 */}
      <View style={ic.top}>
        <View style={[ic.emojiBox, { backgroundColor: color + '22', borderColor: color + '55', borderWidth: 1.5 }]}>
          <Text style={ic.emoji}>{scroll.emoji}</Text>
        </View>
        <View style={ic.topRight}>
          <View style={ic.nameRow}>
            <Text style={[ic.name, { color }]} numberOfLines={1}>{scroll.name}</Text>
          </View>
          <View style={[ic.rarePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[ic.rareTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
          </View>
          <Text style={ic.dur}>{scroll.durationDays}일 지속 주문서</Text>
        </View>
      </View>

      {/* 효과 미리보기 */}
      <View style={[ic.effectBox, { borderColor: color + '30', backgroundColor: color + '08' }]}>
        <Text style={ic.effectLabel}>사용 효과</Text>
        <View style={ic.effectRow}>
          <View style={[ic.statChip, { backgroundColor: color + '28', borderColor: color + '55', borderWidth: 1 }]}>
            <Text style={[ic.statChipTxt, { color }]}>{STAT_LABEL[scroll.stat]}</Text>
          </View>
          <Text style={[ic.effectVal, { color }]}>+{scroll.bonus} 포인트</Text>
          <Text style={ic.effectFor}>{scroll.durationDays}일간 유지</Text>
        </View>
        <Text style={ic.effectNote}>
          <Ionicons name="information-circle-outline" size={11} color={COLORS.textDisabled} />
          {' '}홈 화면 영구 능력치에 즉시 반영됩니다
        </Text>
      </View>

      {/* 사용 버튼 */}
      <TouchableOpacity style={[ic.useBtn, { backgroundColor: color }]} onPress={onUse} activeOpacity={0.8}>
        <Text style={ic.useBtnTxt}>사용하기</Text>
        <Ionicons name="arrow-forward" size={16} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

// ── 활성 버프 카드 ────────────────────────────────────────────
function BonusCard({ bonus }: { bonus: GachaBonus }) {
  const color = GACHA_RARITY_COLOR[bonus.rarity];
  const expires = new Date(bonus.expiresAt);
  const remainMs = Math.max(0, expires.getTime() - Date.now());
  const remainDays = Math.ceil(remainMs / 86400000);
  // GachaBonus has no durationDays — assume 7-day bonuses for progress bar
  const totalMs = 7 * 86400000;
  const pct = Math.min(100, Math.round((remainMs / totalMs) * 100));
  const urgency = remainDays <= 1 ? COLORS.bad : remainDays <= 3 ? COLORS.warn : COLORS.good;

  return (
    <View style={[bc.card, { borderColor: color + '44' }]}>
      <View style={[bc.glowBg, { backgroundColor: color + '09' }]} pointerEvents="none" />
      <View style={bc.body}>
        {/* 스탯 박스 */}
        <View style={[bc.statBox, { backgroundColor: color + '1C', borderColor: color + '44', borderWidth: 1 }]}>
          <Text style={[bc.statKey, { color: color + 'BB' }]}>{STAT_LABEL[bonus.stat]}</Text>
          <Text style={[bc.statVal, { color }]}>+{bonus.bonus}</Text>
        </View>

        <View style={bc.mid}>
          <View style={bc.titleRow}>
            <Text style={[bc.buffName, { color: COLORS.text }]} numberOfLines={1}>{bonus.name}</Text>
            <View style={[bc.activePill, { backgroundColor: COLORS.good + '20', borderColor: COLORS.good + '44' }]}>
              <View style={[bc.dot, { backgroundColor: COLORS.good }]} />
              <Text style={[bc.activeTxt, { color: COLORS.good }]}>활성</Text>
            </View>
          </View>

          {/* 남은 시간 바 */}
          <View style={bc.timeTrack}>
            <View style={[bc.timeFill, { width: `${pct}%` as any, backgroundColor: urgency }]} />
          </View>

          <View style={bc.timeRow}>
            <Text style={[bc.timeLeft, { color: urgency }]}>
              {remainDays > 0 ? `${remainDays}일 남음` : '오늘 만료'}
            </Text>
            <Text style={bc.timeExpiry}>
              {expires.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 만료
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function GachaModal({ visible, onClose, addXpFn, onInventoryChanged, initialTab }: Props) {
  const [tab, setTab]         = useState<Tab>(initialTab ?? 'pull');
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState<GachaPullResult[] | null>(null);
  const [inv, setInv]         = useState<GachaInventory | null>(null);
  const [canFree, setCanFree] = useState(false);
  const sheetAnim             = useRef(new Animated.Value(0)).current;

  const loadInv = async () => {
    const data = await getGachaInventory();
    setInv(data);
    setCanFree(await canDailyFreePull());
  };

  useEffect(() => {
    if (visible) {
      loadInv();
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }).start();
    } else {
      sheetAnim.setValue(0);
      setResults(null);
      setTab(initialTab ?? 'pull');
    }
  }, [visible]);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t !== 'pull') { setResults(null); loadInv(); }
  };

  const handleFreePull = async () => {
    setPulling(true); setResults(null);
    try {
      const result = await doDailyFreePull();
      if (!result) { Alert.alert('오늘 이미 무료 뽑기 했어요!'); return; }
      if (result.type === 'xp_potion') await addXpFn(result.amount);
      setResults([result]);
      setInv(await getGachaInventory());
      setCanFree(false);
      onInventoryChanged();
    } finally { setPulling(false); }
  };

  const handlePull = async (count: 1 | 10) => {
    if (!inv) return;
    const cost = count === 1 ? SINGLE_COST : TEN_COST;
    if (inv.gold < cost) {
      Alert.alert('골드 부족', `뽑기에는 ${cost}G가 필요해요.\n현재: ${inv.gold}G\n\n퀘스트를 완료해서 골드를 모으세요!`);
      return;
    }
    setPulling(true); setResults(null);
    try {
      const res = await doPull(count);
      if (!res) { Alert.alert('골드 부족!'); return; }
      await applyXpPotions(res.results, addXpFn);
      setResults(res.results);
      setInv(await getGachaInventory());
      onInventoryChanged();
    } finally { setPulling(false); }
  };

  const handleUseScroll = (scrollId: string, scrollName: string, stat: string, bonus: number, days: number) => {
    Alert.alert(
      '주문서 사용',
      `[${scrollName}]\n\n✦ ${stat} +${bonus} 포인트\n✦ ${days}일간 영구 능력치에 반영\n\n사용하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기', onPress: async () => {
            const bonus_result = await useScroll(scrollId);
            if (bonus_result) {
              const exp = new Date(bonus_result.expiresAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
              Alert.alert(
                '✦ 강화 완료!',
                `${stat} +${bonus} 효과 활성화\n${exp}까지 영구 능력치에 반영됩니다.\n\n홈 화면에서 스탯 변화를 확인하세요!`
              );
              await loadInv();
              onInventoryChanged();
            }
          }
        }
      ]
    );
  };

  // 결과에 주문서가 있는지
  const hasScrollsInResult = results?.some(r => r.type === 'scroll') ?? false;
  const scrollCount = inv?.scrolls.length ?? 0;
  const bonusCount  = inv?.activeBonuses.length ?? 0;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View style={[s.sheet, {
          transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          opacity: sheetAnim,
        }]}>

          {/* 헤더 */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.title}>⚗️  마법 뽑기</Text>
              <View style={s.goldRow}>
                <Ionicons name="ellipse" size={10} color={COLORS.amber} />
                <Text style={s.goldTxt}>{inv?.gold ?? 0} G 보유</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 탭 */}
          <View style={s.tabRow}>
            {([
              { key: 'pull',      label: '뽑기',      icon: 'dice-outline' },
              { key: 'inventory', label: '인벤토리',  icon: 'bag-outline',     badge: scrollCount },
              { key: 'bonus',     label: '활성 버프', icon: 'flash-outline',   badge: bonusCount },
            ] as { key: Tab; label: string; icon: any; badge?: number }[]).map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, tab === t.key && s.tabActive]}
                onPress={() => switchTab(t.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={t.icon} size={14} color={tab === t.key ? COLORS.primary : COLORS.textDisabled} />
                <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
                {(t.badge ?? 0) > 0 && (
                  <View style={[s.tabBadge, tab === t.key && { backgroundColor: COLORS.primary }]}>
                    <Text style={s.tabBadgeTxt}>{t.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── 뽑기 탭 ── */}
          {tab === 'pull' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 확률표 */}
              <View style={s.rateCard}>
                <Text style={s.rateTitle}>아이템 등급 확률</Text>
                <View style={s.rateGrid}>
                  {([
                    { label: '일반',   color: GACHA_RARITY_COLOR.common,    pct: '40%' },
                    { label: '희귀',   color: GACHA_RARITY_COLOR.rare,      pct: '28%' },
                    { label: '영웅',   color: GACHA_RARITY_COLOR.epic,      pct: '18%' },
                    { label: '전설',   color: GACHA_RARITY_COLOR.legendary, pct: '2.5%' },
                    { label: 'XP 물약', color: COLORS.amber,                pct: '8%' },
                    { label: '꽝(골드)', color: COLORS.textDisabled,         pct: '3.5%' },
                  ] as { label: string; color: string; pct: string }[]).map(r => (
                    <View key={r.label} style={s.rateItem}>
                      <View style={[s.rateDot, { backgroundColor: r.color }]} />
                      <Text style={[s.ratePct, { color: r.color }]}>{r.pct}</Text>
                      <Text style={s.rateLabel}>{r.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.rateNote}>✦ 10연 뽑기: 희귀 이상 1개 보장</Text>
              </View>

              {/* 무료 뽑기 */}
              <TouchableOpacity
                style={[s.freePullBtn, !canFree && s.freePullBtnDone]}
                onPress={handleFreePull}
                disabled={!canFree || pulling}
                activeOpacity={0.8}
              >
                <Text style={s.freePullEmoji}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.freePullLabel, !canFree && { color: COLORS.textDisabled }]}>
                    일일 무료 뽑기
                  </Text>
                  <Text style={s.freePullSub}>
                    {canFree ? '오늘 무료 뽑기 가능!' : '내일 다시 도전하세요'}
                  </Text>
                </View>
                <View style={[s.freeBadge, !canFree && s.freeBadgeDone]}>
                  <Text style={[s.freeBadgeTxt, !canFree && { color: COLORS.textDisabled }]}>
                    {canFree ? 'FREE' : 'DONE'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 뽑기 버튼 */}
              <View style={s.pullRow}>
                <TouchableOpacity
                  style={[s.pullBtn, pulling && { opacity: 0.5 }]}
                  onPress={() => handlePull(1)}
                  disabled={pulling}
                  activeOpacity={0.8}
                >
                  {pulling ? <ActivityIndicator color="#000" /> : (
                    <>
                      <Text style={s.pullEmoji}>🎰</Text>
                      <Text style={s.pullLabel}>단일 뽑기</Text>
                      <Text style={s.pullCost}>🪙 {SINGLE_COST}G</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.pullBtn, s.pullBtnTen, pulling && { opacity: 0.5 }]}
                  onPress={() => handlePull(10)}
                  disabled={pulling}
                  activeOpacity={0.8}
                >
                  {pulling ? <ActivityIndicator color="#000" /> : (
                    <>
                      <Text style={s.pullEmoji}>🎲</Text>
                      <Text style={s.pullLabel}>10연 뽑기</Text>
                      <Text style={s.pullCost}>🪙 {TEN_COST}G</Text>
                      <View style={s.savePill}><Text style={s.saveTxt}>10% 절약</Text></View>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 결과 */}
              {results && (
                <View style={s.resultSection}>
                  <Text style={s.resultTitle}>✦ 뽑기 결과</Text>
                  <View style={s.resultGrid}>
                    {results.map((r, i) => <ResultCard key={i} result={r} />)}
                  </View>

                  {/* 주문서 있으면 인벤토리로 안내 */}
                  {hasScrollsInResult && (
                    <TouchableOpacity
                      style={s.goInventoryBtn}
                      onPress={() => switchTab('inventory')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="bag-outline" size={16} color={COLORS.primary} />
                      <Text style={s.goInventoryTxt}>인벤토리에서 주문서 사용하기</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ── 인벤토리 탭 ── */}
          {tab === 'inventory' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 안내 배너 */}
              <View style={s.guideBanner}>
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={s.guideTxt}>
                  주문서를 사용하면 <Text style={{ color: COLORS.primary, fontWeight: '800' }}>영구 능력치</Text>가 일시적으로 강화됩니다
                </Text>
              </View>

              {(!inv || inv.scrolls.length === 0) ? (
                <View style={s.empty}>
                  <Text style={s.emptyEmoji}>📭</Text>
                  <Text style={s.emptyTxt}>보유한 주문서가 없어요</Text>
                  <Text style={s.emptySub}>뽑기 탭에서 주문서를 획득하세요</Text>
                  <TouchableOpacity style={s.emptyGoBtn} onPress={() => switchTab('pull')} activeOpacity={0.8}>
                    <Text style={s.emptyGoBtnTxt}>뽑기하러 가기</Text>
                    <Ionicons name="arrow-forward" size={14} color="#000" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.listHeader}>{inv.scrolls.length}개 주문서 보유</Text>
                  {inv.scrolls.map(scroll => (
                    <ScrollCard
                      key={scroll.id}
                      scroll={scroll}
                      onUse={() => handleUseScroll(
                        scroll.id, scroll.name,
                        STAT_LABEL[scroll.stat], scroll.bonus, scroll.durationDays
                      )}
                    />
                  ))}
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ── 활성 버프 탭 ── */}
          {tab === 'bonus' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 버프 설명 */}
              <View style={s.guideBanner}>
                <Ionicons name="flash" size={14} color={COLORS.amber} />
                <Text style={s.guideTxt}>
                  활성 버프는 <Text style={{ color: COLORS.amber, fontWeight: '800' }}>홈 화면 영구 능력치</Text>에 실시간 반영됩니다
                </Text>
              </View>

              {(!inv || inv.activeBonuses.length === 0) ? (
                <View style={s.empty}>
                  <Text style={s.emptyEmoji}>💤</Text>
                  <Text style={s.emptyTxt}>활성 버프가 없어요</Text>
                  <Text style={s.emptySub}>인벤토리에서 주문서를 사용하면\n스탯이 강화됩니다</Text>
                  <TouchableOpacity style={s.emptyGoBtn} onPress={() => switchTab('inventory')} activeOpacity={0.8}>
                    <Text style={s.emptyGoBtnTxt}>인벤토리 확인</Text>
                    <Ionicons name="arrow-forward" size={14} color="#000" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.listHeader}>{inv.activeBonuses.length}개 버프 활성 중</Text>
                  {inv.activeBonuses.map(b => <BonusCard key={b.id} bonus={b} />)}

                  {/* 효과 요약 */}
                  <View style={s.summaryCard}>
                    <Text style={s.summaryTitle}>현재 총 보너스</Text>
                    {inv.activeBonuses.map(b => (
                      <View key={b.id} style={s.summaryRow}>
                        <Text style={s.summaryKey}>{STAT_LABEL[b.stat]}</Text>
                        <Text style={[s.summaryVal, { color: GACHA_RARITY_COLOR[b.rarity] }]}>+{b.bonus}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── 스타일 ────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    maxHeight: '93%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: { gap: 4 },
  title: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '900', letterSpacing: -0.3 },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goldTxt: { color: COLORS.amber, fontSize: FONTS.sm, fontWeight: '800', fontFamily: 'monospace' },
  closeBtn: { width: 34, height: 34, backgroundColor: COLORS.bgCard, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },

  tabRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full },
  tabActive: { backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primaryLine },
  tabTxt: { fontSize: FONTS.xs, color: COLORS.textDisabled, fontWeight: '600' },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  tabBadge: { backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeTxt: { fontSize: 9, color: '#000', fontWeight: '900' },

  // 확률표
  rateCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  rateTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  rateItem: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  rateDot: { width: 8, height: 8, borderRadius: 4 },
  ratePct: { fontSize: FONTS.xs, fontFamily: 'monospace', fontWeight: '900', minWidth: 36 },
  rateLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, flex: 1 },
  rateNote: { fontSize: FONTS.xxs, color: COLORS.primary, fontFamily: 'monospace', fontWeight: '700', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },

  // 무료 뽑기
  freePullBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.goodGlow, borderWidth: 1, borderColor: COLORS.good + '44', borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  freePullBtnDone: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  freePullEmoji: { fontSize: 30 },
  freePullLabel: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.good },
  freePullSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, marginTop: 2 },
  freeBadge: { backgroundColor: COLORS.good + '28', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.good + '55' },
  freeBadgeDone: { backgroundColor: COLORS.bgInput, borderColor: COLORS.border },
  freeBadgeTxt: { fontSize: 11, fontWeight: '900', color: COLORS.good, fontFamily: 'monospace' },

  // 뽑기 버튼
  pullRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  pullBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', gap: 4 },
  pullBtnTen: { backgroundColor: COLORS.amber },
  pullEmoji: { fontSize: 26 },
  pullLabel: { color: '#000', fontSize: FONTS.sm, fontWeight: '900' },
  pullCost: { color: '#000', fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },
  savePill: { backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  saveTxt: { fontSize: 9, color: '#000', fontWeight: '900' },

  // 결과
  resultSection: { marginTop: SPACING.sm },
  resultTitle: { color: COLORS.amber, fontSize: FONTS.md, fontWeight: '900', textAlign: 'center', marginBottom: SPACING.sm, fontFamily: 'monospace', letterSpacing: 1 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  goInventoryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: SPACING.md,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.primaryLine,
  },
  goInventoryTxt: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.primary },

  // 인벤토리/버프 공통
  guideBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  guideTxt: { flex: 1, fontSize: FONTS.xxs, color: COLORS.textMuted, lineHeight: 16 },
  listHeader: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800', marginBottom: SPACING.sm, textTransform: 'uppercase' },

  empty: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTxt: { color: COLORS.textSub, fontSize: FONTS.sm, fontWeight: '700' },
  emptySub: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18 },
  emptyGoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 10 },
  emptyGoBtnTxt: { color: '#000', fontWeight: '800', fontSize: FONTS.xs },

  // 버프 요약
  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  summaryTitle: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: FONTS.sm, color: COLORS.textSub, fontWeight: '700' },
  summaryVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
});

// ── 결과 카드 스타일 ──────────────────────────────────────────
const rc = StyleSheet.create({
  card: { width: 100, borderRadius: RADIUS.md, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  emoji: { fontSize: 30 },
  name: { fontSize: 10, fontWeight: '800', textAlign: 'center', fontFamily: 'monospace' },
  sub: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'monospace' },
  dur: { fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  pill: { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  pillTxt: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },
});

// ── 인벤토리 카드 스타일 ──────────────────────────────────────
const ic = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, marginBottom: 12, overflow: 'hidden',
    position: 'relative', padding: SPACING.md, gap: 12,
  },
  glowBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30 },
  topRight: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: FONTS.md, fontWeight: '900', flex: 1 },
  rarePill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  rareTxt: { fontSize: 10, fontWeight: '900', fontFamily: 'monospace' },
  dur: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  effectBox: { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, gap: 8 },
  effectLabel: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statChip: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  statChipTxt: { fontSize: FONTS.xs, fontWeight: '900', fontFamily: 'monospace' },
  effectVal: { fontSize: FONTS.lg, fontWeight: '900', fontFamily: 'monospace' },
  effectFor: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace', flex: 1 },
  effectNote: { fontSize: FONTS.xxs, color: COLORS.textDisabled, lineHeight: 16 },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14 },
  useBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#000' },
});

// ── 버프 카드 스타일 ──────────────────────────────────────────
const bc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, marginBottom: 12, overflow: 'hidden',
    position: 'relative', padding: SPACING.md,
  },
  glowBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statBox: { width: 68, height: 68, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statKey: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  statVal: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -1 },
  mid: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  buffName: { fontSize: FONTS.sm, fontWeight: '700', flex: 1 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeTxt: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },
  timeTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.full, overflow: 'hidden' },
  timeFill: { height: '100%', borderRadius: RADIUS.full },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLeft: { fontSize: FONTS.xs, fontWeight: '800', fontFamily: 'monospace' },
  timeExpiry: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace' },
});
