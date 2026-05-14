import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import {
  GACHA_RARITY_COLOR, GACHA_RARITY_LABEL,
  GachaBonus, GachaInventory, GachaPullResult, GachaScroll, StatKey, STAT_LABEL,
} from '../types';
import { SINGLE_COST, TEN_COST, applyXpPotions, doPull, getGachaInventory, useScroll } from '../utils/gacha';

interface Props {
  visible: boolean;
  onClose: () => void;
  addXpFn: (xp: number) => Promise<any>;
  onInventoryChanged: () => void;
}

type Tab = 'pull' | 'inventory' | 'bonus';

function ResultCard({ result }: { result: GachaPullResult }) {
  if (result.type === 'xp_potion') {
    return (
      <View style={[rc.card, { borderColor: COLORS.amber + '88', backgroundColor: COLORS.amberGlow }]}>
        <Text style={rc.emoji}>⚗️</Text>
        <Text style={[rc.name, { color: COLORS.amber }]}>경험치 물약</Text>
        <Text style={rc.sub}>+{result.amount} XP</Text>
        <View style={[rc.pill, { backgroundColor: COLORS.amber + '22', borderColor: COLORS.amber + '55' }]}>
          <Text style={[rc.pillTxt, { color: COLORS.amber }]}>즉시 적용</Text>
        </View>
      </View>
    );
  }
  if (result.type === 'gold') {
    return (
      <View style={[rc.card, { borderColor: COLORS.textMuted + '44', backgroundColor: COLORS.bgInput }]}>
        <Text style={rc.emoji}>🪙</Text>
        <Text style={[rc.name, { color: COLORS.textSub }]}>골드 반환</Text>
        <Text style={rc.sub}>+{result.amount} G</Text>
        <View style={[rc.pill, { backgroundColor: COLORS.bgHighlight, borderColor: COLORS.border }]}>
          <Text style={[rc.pillTxt, { color: COLORS.textMuted }]}>꽝</Text>
        </View>
      </View>
    );
  }
  const { scroll } = result;
  const color = GACHA_RARITY_COLOR[scroll.rarity];
  return (
    <View style={[rc.card, { borderColor: color + '88', backgroundColor: color + '12' }]}>
      <Text style={rc.emoji}>{scroll.emoji}</Text>
      <Text style={[rc.name, { color }]}>{scroll.name}</Text>
      <Text style={rc.sub}>{STAT_LABEL[scroll.stat]} +{scroll.bonus} · {scroll.durationDays}일</Text>
      <View style={[rc.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[rc.pillTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
      </View>
    </View>
  );
}

function ScrollRow({ scroll, onUse }: { scroll: GachaScroll; onUse: () => void }) {
  const color = GACHA_RARITY_COLOR[scroll.rarity];
  return (
    <View style={[sr.row, { borderColor: color + '33' }]}>
      <Text style={sr.emoji}>{scroll.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[sr.name, { color }]}>{scroll.name}</Text>
        <Text style={sr.sub}>{STAT_LABEL[scroll.stat]} +{scroll.bonus} · {scroll.durationDays}일 지속</Text>
      </View>
      <View style={[sr.rarePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[sr.rareTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
      </View>
      <TouchableOpacity style={sr.useBtn} onPress={onUse} activeOpacity={0.7}>
        <Text style={sr.useTxt}>사용</Text>
      </TouchableOpacity>
    </View>
  );
}

function BonusRow({ bonus }: { bonus: GachaBonus }) {
  const color = GACHA_RARITY_COLOR[bonus.rarity];
  const expires = new Date(bonus.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));
  return (
    <View style={[sr.row, { borderColor: color + '55', backgroundColor: color + '08' }]}>
      <Text style={sr.emoji}>{bonus.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[sr.name, { color }]}>{STAT_LABEL[bonus.stat]} +{bonus.bonus}</Text>
        <Text style={sr.sub}>{daysLeft}일 남음</Text>
      </View>
      <View style={[sr.rarePill, { backgroundColor: COLORS.good + '22', borderColor: COLORS.good + '55' }]}>
        <Text style={[sr.rareTxt, { color: COLORS.good }]}>활성중</Text>
      </View>
    </View>
  );
}

export default function GachaModal({ visible, onClose, addXpFn, onInventoryChanged }: Props) {
  const [tab, setTab] = useState<Tab>('pull');
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState<GachaPullResult[] | null>(null);
  const [inv, setInv] = useState<GachaInventory | null>(null);

  const loadInv = async () => {
    const data = await getGachaInventory();
    setInv(data);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t !== 'pull') { setResults(null); loadInv(); }
  };

  const handlePull = async (count: 1 | 10) => {
    if (!inv) return;
    const cost = count === 1 ? SINGLE_COST : TEN_COST;
    if (inv.gold < cost) {
      Alert.alert('골드 부족', `뽑기에는 ${cost}G가 필요해요.\n현재: ${inv.gold}G`);
      return;
    }
    setPulling(true);
    setResults(null);
    try {
      const res = await doPull(count);
      if (!res) { Alert.alert('골드 부족!'); return; }
      await applyXpPotions(res.results, addXpFn);
      setResults(res.results);
      setInv(await getGachaInventory());
      onInventoryChanged();
    } finally {
      setPulling(false);
    }
  };

  const handleUseScroll = async (scrollId: string, scrollName: string) => {
    Alert.alert('주문서 사용', `[${scrollName}]을 사용할까요?\n7일간 스탯이 강화됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '사용', onPress: async () => {
          const bonus = await useScroll(scrollId);
          if (bonus) {
            Alert.alert('강화 완료!', `${STAT_LABEL[bonus.stat]} +${bonus.bonus} 효과가 ${new Date(bonus.expiresAt).toLocaleDateString('ko-KR')}까지 적용됩니다.`);
            loadInv();
            onInventoryChanged();
          }
        }
      }
    ]);
  };

  // visible 시 인벤토리 로드
  React.useEffect(() => {
    if (visible) loadInv();
  }, [visible]);

  const goldColor = COLORS.amber;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* 헤더 */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>⚗️  마법 뽑기</Text>
              <Text style={s.goldBadge}>
                🪙 {inv?.gold ?? 0} G
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 탭 */}
          <View style={s.tabRow}>
            {(['pull', 'inventory', 'bonus'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tab, tab === t && s.tabActive]}
                onPress={() => handleTabChange(t)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                  {t === 'pull' ? '뽑기' : t === 'inventory' ? '인벤토리' : '활성 버프'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 뽑기 탭 */}
          {tab === 'pull' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 확률표 */}
              <View style={s.rateCard}>
                <Text style={s.rateTitle}>아이템 등급 확률</Text>
                {(
                  [
                    { label: '일반 주문서',   color: GACHA_RARITY_COLOR.common,    pct: '40%' },
                    { label: '희귀 주문서',   color: GACHA_RARITY_COLOR.rare,      pct: '28%' },
                    { label: '영웅 주문서',   color: GACHA_RARITY_COLOR.epic,      pct: '18%' },
                    { label: '전설 주문서',   color: GACHA_RARITY_COLOR.legendary, pct: '2.5%' },
                    { label: '경험치 물약',   color: COLORS.amber,                 pct: '8%' },
                    { label: '골드 반환(꽝)', color: COLORS.textMuted,             pct: '3.5%' },
                  ] as {label:string;color:string;pct:string}[]
                ).map(r => (
                  <View key={r.label} style={s.rateRow}>
                    <View style={[s.rateDot, { backgroundColor: r.color }]} />
                    <Text style={s.rateLabel}>{r.label}</Text>
                    <Text style={[s.ratePct, { color: r.color }]}>{r.pct}</Text>
                  </View>
                ))}
                <Text style={s.rateNote}>10연 뽑기: 희귀 이상 1개 보장</Text>
              </View>

              {/* 뽑기 버튼 */}
              <View style={s.pullBtnRow}>
                <TouchableOpacity
                  style={[s.pullBtn, pulling && { opacity: 0.5 }]}
                  onPress={() => handlePull(1)}
                  disabled={pulling}
                  activeOpacity={0.8}
                >
                  {pulling ? <ActivityIndicator color="#000" /> : (
                    <>
                      <Text style={s.pullBtnEmoji}>🎰</Text>
                      <Text style={s.pullBtnLabel}>단일 뽑기</Text>
                      <Text style={s.pullBtnCost}>🪙 {SINGLE_COST}G</Text>
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
                      <Text style={s.pullBtnEmoji}>🎲</Text>
                      <Text style={s.pullBtnLabel}>10연 뽑기</Text>
                      <Text style={s.pullBtnCost}>🪙 {TEN_COST}G  <Text style={s.pullBtnSave}>10% 절약</Text></Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 결과 */}
              {results && (
                <View style={s.resultSection}>
                  <Text style={s.resultTitle}>뽑기 결과!</Text>
                  <View style={s.resultGrid}>
                    {results.map((r, i) => <ResultCard key={i} result={r} />)}
                  </View>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* 인벤토리 탭 */}
          {tab === 'inventory' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {(!inv || inv.scrolls.length === 0) ? (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>보유한 주문서가 없어요</Text>
                  <Text style={s.emptySub}>뽑기를 해서 주문서를 획득하세요</Text>
                </View>
              ) : (
                inv.scrolls.map(scroll => (
                  <ScrollRow
                    key={scroll.id}
                    scroll={scroll}
                    onUse={() => handleUseScroll(scroll.id, scroll.name)}
                  />
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* 활성 버프 탭 */}
          {tab === 'bonus' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {(!inv || inv.activeBonuses.length === 0) ? (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>활성 버프가 없어요</Text>
                  <Text style={s.emptySub}>주문서를 사용하면 스탯이 강화돼요</Text>
                </View>
              ) : (
                inv.activeBonuses.map(b => <BonusRow key={b.id} bonus={b} />)
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl ?? 24,
    borderTopRightRadius: RADIUS.xl ?? 24,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  title: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '800' },
  goldBadge: {
    color: COLORS.amber,
    fontSize: FONTS.sm,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  closeTxt: { color: COLORS.textSub, fontWeight: '700' },

  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  tabActive: { backgroundColor: COLORS.primary + '22' },
  tabTxt: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },

  rateCard: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rateTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '700', marginBottom: 8 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rateDot: { width: 8, height: 8, borderRadius: 4 },
  rateLabel: { flex: 1, fontSize: FONTS.xxs, color: COLORS.textMuted },
  ratePct: { fontSize: FONTS.xxs, fontFamily: 'monospace', fontWeight: '700' },
  rateNote: {
    marginTop: 6,
    fontSize: FONTS.xxs - 1,
    color: COLORS.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },

  pullBtnRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  pullBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  pullBtnTen: { backgroundColor: COLORS.amber },
  pullBtnEmoji: { fontSize: 24 },
  pullBtnLabel: { color: '#000', fontSize: FONTS.sm, fontWeight: '800' },
  pullBtnCost: { color: '#000', fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },
  pullBtnSave: { color: '#000', fontWeight: '900' },

  resultSection: { marginTop: SPACING.sm },
  resultTitle: {
    color: COLORS.amber,
    fontSize: FONTS.md,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },

  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyTxt: { color: COLORS.textSub, fontSize: FONTS.sm, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace' },
});

const rc = StyleSheet.create({
  card: {
    width: 100,
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
  },
  emoji: { fontSize: 28 },
  name: { fontSize: 10, fontWeight: '800', textAlign: 'center', fontFamily: 'monospace' },
  sub: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'monospace' },
  pill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },
});

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: 8,
    borderWidth: 1,
  },
  emoji: { fontSize: 22, width: 28, textAlign: 'center' },
  name: { fontSize: FONTS.xs, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  rarePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  rareTxt: { fontSize: 9, fontWeight: '800', fontFamily: 'monospace' },
  useBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  useTxt: { color: '#000', fontSize: FONTS.xxs, fontWeight: '800' },
});
