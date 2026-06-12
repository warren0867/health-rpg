import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import PressableScale from './PressableScale';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import {
  GACHA_RARITY_COLOR, GACHA_RARITY_LABEL,
  GachaBonus, GachaInventory, GachaPullResult, GachaScroll,
  PermanentStats, STAT_FULLNAME, STAT_LABEL, StatKey,
} from '../types';
import {
  SINGLE_COST, TEN_COST,
  addGold, applyXpPotions, canDailyFreePull, doDailyFreePull, doPull,
  fuseScrolls, getGachaInventory, useScroll,
} from '../utils/gacha';
import {
  GEAR_PULL_COST, GearState, PullResult, TIER_CFG,
  gearAtk, gearDef, gearHp, getGearState, pullGear, rollGear, saveGearState,
} from '../utils/equipment';

// 등급별 아이콘 매핑
const RARITY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  common:    'document-outline',
  rare:      'albums-outline',
  epic:      'diamond-outline',
  legendary: 'star',
};
const STAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  str: 'flame',
  end: 'pulse',
  vit: 'shield-checkmark',
  agi: 'flash',
  wis: 'sparkles',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  addXpFn: (xp: number) => Promise<any>;
  onInventoryChanged: () => void;
  initialTab?: Tab;
  permStats?: PermanentStats;
}

type Tab = 'pull' | 'gear' | 'inventory' | 'bonus';

const GEAR_TEN_COST = 1350; // 10연 10% 할인 + 희귀 이상 1개 보장

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
        <View style={[rc.iconBox, { backgroundColor: COLORS.amber + '20' }]}>
          <Ionicons name="flask" size={26} color={COLORS.amber} />
        </View>
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
        <View style={[rc.iconBox, { backgroundColor: COLORS.bgHighlight }]}>
          <Ionicons name="logo-bitcoin" size={26} color={COLORS.textMuted} />
        </View>
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
      <View style={[rc.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={RARITY_ICON[scroll.rarity]} size={26} color={color} />
      </View>
      <Text style={[rc.name, { color }]}>{scroll.name}</Text>
      <Text style={rc.sub}>{STAT_LABEL[scroll.stat]} +{scroll.bonus}</Text>
      <Text style={[rc.dur, { color: color + 'AA' }]}>{scroll.durationDays}일</Text>
      <View style={[rc.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[rc.pillTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
      </View>
    </Animated.View>
  );
}

// ── 인벤토리 주문서 카드 ──────────────────────────────────────
function ScrollCard({
  scroll, currentStatVal, activeBonusForStat, onUse,
}: {
  scroll: GachaScroll;
  currentStatVal: number;
  activeBonusForStat: number;
  onUse: () => Promise<void>;
}) {
  const color = GACHA_RARITY_COLOR[scroll.rarity];
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const doneAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    if (state !== 'idle') return;
    setState('loading');
    // 버튼 눌림 피드백
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    await onUse();
    setState('done');
    Animated.spring(doneAnim, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }).start();
  };

  const baseVal = currentStatVal - activeBonusForStat; // 버프 제외 순수 기본값
  const afterVal = baseVal + activeBonusForStat + scroll.bonus;

  return (
    <Animated.View style={[ic.card, { borderColor: color + '44', transform: [{ scale: scaleAnim }] }]}>
      <View style={[ic.glowBg, { backgroundColor: color + '0C' }]} pointerEvents="none" />

      {/* 완료 오버레이 */}
      {state === 'done' && (
        <Animated.View style={[ic.doneOverlay, { opacity: doneAnim }]}>
          <Animated.View style={{ transform: [{ scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
            <View style={ic.doneIconBox}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={ic.doneTxt}>강화 완료!</Text>
            <Text style={ic.doneSub}>{STAT_FULLNAME[scroll.stat]} +{scroll.bonus} 적용됨</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* 상단: 아이콘 + 이름 + 등급 */}
      <View style={ic.top}>
        <View style={[ic.iconBox, { backgroundColor: color + '20', borderColor: color + '40', borderWidth: 1.5 }]}>
          <Ionicons name={RARITY_ICON[scroll.rarity]} size={26} color={color} />
        </View>
        <View style={ic.topRight}>
          <Text style={[ic.name, { color }]} numberOfLines={1}>{scroll.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={[ic.rarePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={[ic.rareTxt, { color }]}>{GACHA_RARITY_LABEL[scroll.rarity]}</Text>
            </View>
            <Text style={ic.dur}>{scroll.durationDays}일 지속</Text>
          </View>
        </View>
      </View>

      {/* 스탯 임팩트 표시 */}
      <View style={[ic.impactBox, { borderColor: color + '30', backgroundColor: color + '08' }]}>
        <Text style={ic.impactLabel}>사용 시 변화</Text>
        <View style={ic.impactRow}>
          <View style={ic.impactStatBox}>
            <Text style={[ic.impactStatKey, { color: color + 'AA' }]}>{STAT_LABEL[scroll.stat]}</Text>
            <Text style={[ic.impactStatName, { color: COLORS.textMuted }]}>{STAT_FULLNAME[scroll.stat]}</Text>
          </View>
          {/* 현재값 */}
          <View style={ic.impactValBox}>
            <Text style={ic.impactValLabel}>현재</Text>
            <Text style={[ic.impactVal, { color: COLORS.textSub }]}>{Math.floor(currentStatVal)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={color} style={{ marginTop: 10 }} />
          {/* 사용 후 */}
          <View style={ic.impactValBox}>
            <Text style={ic.impactValLabel}>사용 후</Text>
            <Text style={[ic.impactVal, { color }]}>{Math.floor(afterVal)}</Text>
          </View>
          {/* 증가량 */}
          <View style={[ic.deltaBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[ic.deltaTxt, { color }]}>+{scroll.bonus}</Text>
          </View>
        </View>
        {activeBonusForStat > 0 && (
          <Text style={ic.impactNote}>
            <Ionicons name="flash" size={10} color={COLORS.amber} />
            {' '}현재 {STAT_LABEL[scroll.stat]} 버프 {activeBonusForStat}pt 포함됨 — 사용 시 교체
          </Text>
        )}
      </View>

      {/* 사용 버튼 */}
      <TouchableOpacity
        style={[ic.useBtn, { backgroundColor: state === 'done' ? COLORS.good : color }, state === 'loading' && { opacity: 0.7 }]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={state !== 'idle'}
      >
        {state === 'loading' ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : state === 'done' ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={ic.useBtnTxt}>강화 완료</Text>
          </>
        ) : (
          <>
            <Text style={ic.useBtnTxt}>사용하기</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── 활성 버프 카드 ────────────────────────────────────────────
function BonusCard({ bonus }: { bonus: GachaBonus }) {
  const color = GACHA_RARITY_COLOR[bonus.rarity];
  const expires = new Date(bonus.expiresAt);
  const remainMs = Math.max(0, expires.getTime() - Date.now());
  const remainDays = Math.ceil(remainMs / 86400000);
  const totalMs = 7 * 86400000;
  const pct = Math.min(100, Math.round((remainMs / totalMs) * 100));
  const urgency = remainDays <= 1 ? COLORS.bad : remainDays <= 3 ? COLORS.warn : COLORS.good;

  return (
    <View style={[bc.card, { borderColor: color + '44' }]}>
      <View style={[bc.glowBg, { backgroundColor: color + '09' }]} pointerEvents="none" />
      <View style={bc.body}>
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
export default function GachaModal({ visible, onClose, addXpFn, onInventoryChanged, initialTab, permStats }: Props) {
  const [tab, setTab]         = useState<Tab>(initialTab ?? 'pull');
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState<GachaPullResult[] | null>(null);
  const [inv, setInv]         = useState<GachaInventory | null>(null);
  const [canFree, setCanFree] = useState(false);
  const sheetAnim             = useRef(new Animated.Value(0)).current;

  // 무기뽑기 (장비)
  const [gearState, setGearState]       = useState<GearState | null>(null);
  const [gearResults, setGearResults]   = useState<PullResult[] | null>(null);

  // 합성 모드
  const [fuseMode, setFuseMode]         = useState(false);
  const [selected, setSelected]         = useState<string[]>([]); // scrollId[]
  const [fusing, setFusing]             = useState(false);
  const [fuseResult, setFuseResult]     = useState<GachaScroll | null>(null);
  const fuseResultAnim                  = useRef(new Animated.Value(0)).current;

  const loadInv = async () => {
    const data = await getGachaInventory();
    setInv(data);
    setCanFree(await canDailyFreePull());
    setGearState(await getGearState());
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

  // initialTab이 바뀌면 탭도 바꿈 (홈에서 다른 타일 누를 때)
  useEffect(() => {
    if (visible && initialTab) setTab(initialTab);
  }, [initialTab]);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t !== 'pull') { setResults(null); loadInv(); }
    if (t !== 'gear') setGearResults(null);
  };

  // ── 무기뽑기 ──────────────────────────────────────────
  const handleGearPull = async (count: 1 | 10) => {
    if (!inv || !gearState || pulling) return;
    const cost = count === 1 ? GEAR_PULL_COST : GEAR_TEN_COST;
    if (inv.gold < cost) return;
    setPulling(true); setGearResults(null);
    try {
      await addGold(-cost);
      const results: PullResult[] = [];
      for (let i = 0; i < count; i++) results.push(pullGear());
      // 10연 보장: 희귀 이상 장비가 없으면 하나를 희귀로 교체
      if (count === 10 && !results.some(r => r.type === 'gear' && r.item.tier !== 'common')) {
        const idx = results.findIndex(r => r.type === 'gear');
        results[idx >= 0 ? idx : 0] = { type: 'gear', item: rollGear(undefined, 'rare') };
      }
      const gear = await getGearState();
      for (const r of results) {
        if (r.type === 'scroll') {
          if (r.kind === 'weapon') gear.weaponScrolls++;
          else gear.armorScrolls++;
        } else {
          gear.inventory.push(r.item);
        }
      }
      await saveGearState(gear);
      setGearState(gear);
      setGearResults(results);
      setInv(await getGachaInventory());
      onInventoryChanged();
    } finally { setPulling(false); }
  };

  const handleFreePull = async () => {
    setPulling(true); setResults(null);
    try {
      const result = await doDailyFreePull();
      if (!result) return;
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
    if (inv.gold < cost) return;
    setPulling(true); setResults(null);
    try {
      const res = await doPull(count);
      if (!res) return;
      await applyXpPotions(res.results, addXpFn);
      setResults(res.results);
      setInv(await getGachaInventory());
      onInventoryChanged();
    } finally { setPulling(false); }
  };

  // 강화 완료 애니메이션이 보이도록 loadInv를 1200ms 지연
  const handleUseScroll = async (scrollId: string) => {
    const result = await useScroll(scrollId);
    if (result) {
      onInventoryChanged();
      setTimeout(() => loadInv(), 1200);
    }
  };

  // 합성 선택 토글
  const toggleSelect = (scrollId: string, rarity: string) => {
    setSelected(prev => {
      if (prev.includes(scrollId)) return prev.filter(id => id !== scrollId);
      if (prev.length >= 3) return prev; // 최대 3개
      // 이미 선택된 등급과 다르면 무시
      if (prev.length > 0) {
        const firstRarity = inv?.scrolls.find(s => s.id === prev[0])?.rarity;
        if (firstRarity && firstRarity !== rarity) return prev;
      }
      return [...prev, scrollId];
    });
  };

  const handleFuse = async () => {
    if (selected.length !== 3 || fusing) return;
    setFusing(true);
    fuseResultAnim.setValue(0);
    const newScroll = await fuseScrolls(selected);
    setFusing(false);
    setSelected([]);
    if (newScroll) {
      setFuseResult(newScroll);
      Animated.spring(fuseResultAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
      await loadInv();
      onInventoryChanged();
    }
  };

  const closeFuseResult = () => { setFuseResult(null); fuseResultAnim.setValue(0); };

  const selectedRarity = selected.length > 0 ? inv?.scrolls.find(s => s.id === selected[0])?.rarity : null;
  const RARITY_NEXT_LABEL: Record<string, string> = { common: '→ 희귀', rare: '→ 영웅', epic: '→ 전설' };

  const hasScrollsInResult = results?.some(r => r.type === 'scroll') ?? false;
  const scrollCount = inv?.scrolls.length ?? 0;
  const bonusCount  = inv?.activeBonuses.length ?? 0;

  // 스탯별 현재 활성 버프 합산
  const activeBonusByStatMap: Partial<Record<StatKey, number>> = {};
  for (const b of inv?.activeBonuses ?? []) {
    activeBonusByStatMap[b.stat] = (activeBonusByStatMap[b.stat] ?? 0) + b.bonus;
  }

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.headerIconBox}>
                  <Ionicons name="flask" size={16} color="#A78BFA" />
                </View>
                <Text style={s.title}>{tab === 'gear' ? '무기 뽑기' : '마법 뽑기'}</Text>
              </View>
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
              { key: 'pull',      label: '마법뽑기',  icon: 'dice-outline' },
              { key: 'gear',      label: '무기뽑기',  icon: 'hammer-outline' },
              { key: 'inventory', label: '인벤토리',  icon: 'bag-outline',   badge: scrollCount },
              { key: 'bonus',     label: '버프',      icon: 'flash-outline', badge: bonusCount },
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
              <View style={s.rateCard}>
                <Text style={s.rateTitle}>아이템 등급 확률</Text>
                <View style={s.rateGrid}>
                  {([
                    { label: '일반',     color: GACHA_RARITY_COLOR.common,    pct: '40%' },
                    { label: '희귀',     color: GACHA_RARITY_COLOR.rare,      pct: '28%' },
                    { label: '영웅',     color: GACHA_RARITY_COLOR.epic,      pct: '18%' },
                    { label: '전설',     color: GACHA_RARITY_COLOR.legendary, pct: '2.5%' },
                    { label: 'XP 물약',  color: COLORS.amber,                 pct: '8%' },
                    { label: '꽝(골드)', color: COLORS.textDisabled,          pct: '3.5%' },
                  ] as { label: string; color: string; pct: string }[]).map(r => (
                    <View key={r.label} style={s.rateItem}>
                      <View style={[s.rateDot, { backgroundColor: r.color }]} />
                      <Text style={[s.ratePct, { color: r.color }]}>{r.pct}</Text>
                      <Text style={s.rateLabel}>{r.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.rateNote}>◆ 10연 뽑기: 희귀 이상 1개 보장</Text>
              </View>

              <PressableScale
                style={[s.freePullBtn, !canFree && s.freePullBtnDone]}
                onPress={handleFreePull}
                disabled={!canFree || pulling}
              >
                <View style={[s.freePullIconBox, !canFree && { opacity: 0.4 }]}>
                  <Ionicons name="gift" size={28} color={canFree ? COLORS.good : COLORS.textDisabled} />
                </View>
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
              </PressableScale>

              <View style={s.pullRow}>
                <PressableScale style={[s.pullBtn, pulling && { opacity: 0.5 }]} onPress={() => handlePull(1)} disabled={pulling}>
                  {pulling ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                      <Text style={s.pullLabel}>단일 뽑기</Text>
                      <Text style={s.pullCost}>{SINGLE_COST} G</Text>
                    </>
                  )}
                </PressableScale>
                <PressableScale style={[s.pullBtn, s.pullBtnTen, pulling && { opacity: 0.5 }]} onPress={() => handlePull(10)} disabled={pulling}>
                  {pulling ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="layers" size={28} color="#FFFFFF" />
                      <Text style={s.pullLabel}>10연 뽑기</Text>
                      <Text style={s.pullCost}>{TEN_COST} G</Text>
                      <View style={s.savePill}><Text style={s.saveTxt}>10% 절약</Text></View>
                    </>
                  )}
                </PressableScale>
              </View>

              {results && (
                <View style={s.resultSection}>
                  <Text style={s.resultTitle}>◆ 뽑기 결과</Text>
                  <View style={s.resultGrid}>
                    {results.map((r, i) => <ResultCard key={i} result={r} />)}
                  </View>
                  {hasScrollsInResult && (
                    <PressableScale style={s.goInventoryBtn} onPress={() => switchTab('inventory')}>
                      <Ionicons name="bag-outline" size={16} color={COLORS.primary} />
                      <Text style={s.goInventoryTxt}>인벤토리에서 주문서 사용하기</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                    </PressableScale>
                  )}
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ── 무기뽑기 탭 ── */}
          {tab === 'gear' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 확률표 */}
              <View style={s.rateCard}>
                <Text style={s.rateTitle}>장비 등급 확률</Text>
                <View style={s.rateGrid}>
                  {([
                    { label: '일반',   color: TIER_CFG.common.color,    pct: '40%' },
                    { label: '희귀',   color: TIER_CFG.rare.color,      pct: '22%' },
                    { label: '영웅',   color: TIER_CFG.epic.color,      pct: '8%' },
                    { label: '전설',   color: TIER_CFG.legendary.color, pct: '2%' },
                    { label: '무기 주문서', color: COLORS.info,        pct: '14%' },
                    { label: '방어구 주문서', color: COLORS.info,      pct: '14%' },
                  ] as { label: string; color: string; pct: string }[]).map(r => (
                    <View key={r.label} style={s.rateItem}>
                      <View style={[s.rateDot, { backgroundColor: r.color }]} />
                      <Text style={[s.ratePct, { color: r.color }]}>{r.pct}</Text>
                      <Text style={s.rateLabel}>{r.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.rateNote}>◆ 10연 뽑기: 희귀 이상 장비 1개 보장</Text>
              </View>

              {/* 보유 주문서 */}
              <View style={s.gearScrollRow}>
                <View style={s.gearScrollPill}>
                  <Text style={s.gearScrollEmoji}>📜</Text>
                  <Text style={s.gearScrollTxt}>무기 주문서 x{gearState?.weaponScrolls ?? 0}</Text>
                </View>
                <View style={s.gearScrollPill}>
                  <Text style={s.gearScrollEmoji}>📘</Text>
                  <Text style={s.gearScrollTxt}>방어구 주문서 x{gearState?.armorScrolls ?? 0}</Text>
                </View>
              </View>

              {/* 뽑기 버튼 */}
              <View style={s.pullRow}>
                <PressableScale style={[s.pullBtn, (pulling || (inv?.gold ?? 0) < GEAR_PULL_COST) && { opacity: 0.5 }]} onPress={() => handleGearPull(1)} disabled={pulling || (inv?.gold ?? 0) < GEAR_PULL_COST}>
                  {pulling ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Text style={s.pullLabel}>1회 뽑기</Text>
                      <Text style={s.pullCost}>{GEAR_PULL_COST} G</Text>
                    </>
                  )}
                </PressableScale>
                <PressableScale style={[s.pullBtn, s.pullBtnTen, (pulling || (inv?.gold ?? 0) < GEAR_TEN_COST) && { opacity: 0.5 }]} onPress={() => handleGearPull(10)} disabled={pulling || (inv?.gold ?? 0) < GEAR_TEN_COST}>
                  {pulling ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Text style={s.pullLabel}>10연 뽑기</Text>
                      <Text style={s.pullCost}>{GEAR_TEN_COST} G</Text>
                    </>
                  )}
                </PressableScale>
              </View>

              {/* 결과 */}
              {gearResults && (
                <View style={s.resultSection}>
                  <Text style={s.resultTitle}>◆ 뽑기 결과</Text>
                  {gearResults.map((r, i) => (
                    r.type === 'scroll' ? (
                      <View key={i} style={s.gearResultRow}>
                        <Text style={s.gearResultEmoji}>{r.kind === 'weapon' ? '📜' : '📘'}</Text>
                        <Text style={s.gearResultName}>{r.kind === 'weapon' ? '무기' : '방어구'} 강화 주문서</Text>
                      </View>
                    ) : (
                      <View key={i} style={[s.gearResultRow, { borderColor: TIER_CFG[r.item.tier].color + '55', backgroundColor: TIER_CFG[r.item.tier].color + '0D' }]}>
                        <Text style={s.gearResultEmoji}>{r.item.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.gearResultName}>
                            <Text style={{ color: TIER_CFG[r.item.tier].color, fontWeight: '900' }}>[{TIER_CFG[r.item.tier].label}]</Text>
                            {' '}{r.item.name}
                          </Text>
                          <Text style={s.gearResultStat}>
                            {r.item.kind === 'weapon' ? `공격 +${gearAtk(r.item)}` : `방어 +${gearDef(r.item)} · HP +${gearHp(r.item)}`}
                          </Text>
                        </View>
                      </View>
                    )
                  ))}
                  <Text style={s.gearResultHint}>장착·강화는 캐릭터 카드의 스탯 칩 → 장비 탭에서!</Text>
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ── 인벤토리 탭 ── */}
          {tab === 'inventory' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 현재 스탯 미니 패널 */}
              {permStats && (
                <View style={s.statMiniPanel}>
                  <Text style={s.statMiniTitle}>현재 영구 능력치</Text>
                  <View style={s.statMiniRow}>
                    {(['str','end','vit','agi','wis'] as StatKey[]).map(k => (
                      <View key={k} style={s.statMiniCell}>
                        <Text style={s.statMiniKey}>{STAT_LABEL[k]}</Text>
                        <Text style={s.statMiniVal}>{Math.floor(permStats[k])}</Text>
                        {(activeBonusByStatMap[k] ?? 0) > 0 && (
                          <Text style={s.statMiniBonus}>+{activeBonusByStatMap[k]}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(!inv || inv.scrolls.length === 0) ? (
                <View style={s.empty}>
                  <View style={s.emptyIconBox}>
                    <Ionicons name="file-tray-outline" size={40} color={COLORS.textDisabled} />
                  </View>
                  <Text style={s.emptyTxt}>보유한 주문서가 없어요</Text>
                  <Text style={s.emptySub}>뽑기 탭에서 주문서를 획득하세요</Text>
                  <PressableScale style={s.emptyGoBtn} onPress={() => switchTab('pull')}>
                    <Text style={s.emptyGoBtnTxt}>뽑기하러 가기</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </PressableScale>
                </View>
              ) : (
                <>
                  {/* 헤더 + 합성 토글 */}
                  <View style={s.invHeader}>
                    <Text style={s.listHeader}>{inv.scrolls.length}개 주문서 보유</Text>
                    <TouchableOpacity
                      style={[s.fuseToggleBtn, fuseMode && { backgroundColor: '#A78BFA', borderColor: '#A78BFA' }]}
                      onPress={() => { setFuseMode(m => !m); setSelected([]); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="git-merge-outline" size={14} color={fuseMode ? '#000' : COLORS.textSub} />
                      <Text style={[s.fuseToggleTxt, fuseMode && { color: '#FFFFFF' }]}>
                        {fuseMode ? '합성 취소' : '합성하기'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* 합성 안내 */}
                  {fuseMode && (
                    <View style={s.fuseGuide}>
                      <Ionicons name="information-circle" size={14} color="#A78BFA" />
                      <Text style={s.fuseGuideTxt}>
                        같은 등급 주문서 3개를 선택하면 한 단계 위 등급으로 합성돼요
                        {selectedRarity ? `  ✦ ${RARITY_NEXT_LABEL[selectedRarity] ?? ''}` : ''}
                      </Text>
                    </View>
                  )}

                  {inv.scrolls.map(scroll => {
                    const isSelected = selected.includes(scroll.id);
                    const isDisabled = fuseMode && !isSelected && selected.length === 3;
                    const isWrongRarity = fuseMode && selected.length > 0 &&
                      inv.scrolls.find(s => s.id === selected[0])?.rarity !== scroll.rarity;

                    if (fuseMode) {
                      const color = GACHA_RARITY_COLOR[scroll.rarity];
                      return (
                        <TouchableOpacity
                          key={scroll.id}
                          onPress={() => toggleSelect(scroll.id, scroll.rarity)}
                          activeOpacity={0.8}
                          disabled={isDisabled || isWrongRarity}
                          style={[
                            s.fuseCard,
                            { borderColor: isSelected ? color : COLORS.border },
                            isSelected && { backgroundColor: color + '18' },
                            (isDisabled || isWrongRarity) && { opacity: 0.35 },
                          ]}
                        >
                          {/* 선택 체크 */}
                          <View style={[s.fuseCheck, isSelected && { backgroundColor: color, borderColor: color }]}>
                            {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                          </View>
                          <View style={[s.fuseCardIconBox, { backgroundColor: color + '20' }]}>
                            <Ionicons name={RARITY_ICON[scroll.rarity]} size={20} color={color} />
                          </View>
                          <View style={s.fuseCardInfo}>
                            <Text style={[s.fuseCardName, { color: isSelected ? color : COLORS.text }]} numberOfLines={1}>{scroll.name}</Text>
                            <Text style={s.fuseCardSub}>{GACHA_RARITY_LABEL[scroll.rarity]}  ·  {STAT_LABEL[scroll.stat]} +{scroll.bonus}</Text>
                          </View>
                          {isSelected && (
                            <View style={[s.fuseSelNum, { backgroundColor: color }]}>
                              <Text style={s.fuseSelNumTxt}>{selected.indexOf(scroll.id) + 1}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <ScrollCard
                        key={scroll.id}
                        scroll={scroll}
                        currentStatVal={permStats ? permStats[scroll.stat] : 0}
                        activeBonusForStat={activeBonusByStatMap[scroll.stat] ?? 0}
                        onUse={() => handleUseScroll(scroll.id)}
                      />
                    );
                  })}

                  {/* 합성 실행 버튼 */}
                  {fuseMode && (
                    <PressableScale
                      style={[s.fuseBtn, selected.length === 3 && s.fuseBtnActive, fusing && { opacity: 0.6 }]}
                      onPress={handleFuse}
                      disabled={selected.length !== 3 || fusing}
                    >
                      {fusing
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <>
                            <Ionicons name="git-merge-outline" size={18} color={selected.length === 3 ? '#000' : COLORS.textDisabled} />
                            <Text style={[s.fuseBtnTxt, selected.length === 3 && { color: '#FFFFFF' }]}>
                              {selected.length}/3 선택 {selected.length === 3 ? '— 합성하기!' : '— 같은 등급 3개 선택'}
                            </Text>
                          </>
                      }
                    </PressableScale>
                  )}
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* 합성 결과 오버레이 */}
          {fuseResult && (
            <Animated.View style={[s.fuseResultOverlay, { opacity: fuseResultAnim, transform: [{ scale: fuseResultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
              <TouchableOpacity style={s.fuseResultBg} onPress={closeFuseResult} activeOpacity={1} />
              <View style={[s.fuseResultCard, { borderColor: GACHA_RARITY_COLOR[fuseResult.rarity] + '88' }]}>
                <View style={[s.fuseResultGlow, { backgroundColor: GACHA_RARITY_COLOR[fuseResult.rarity] + '20' }]} pointerEvents="none" />
                <Text style={s.fuseResultTitle}>◆ 합성 성공!</Text>
                <View style={[s.fuseResultIconBox, { backgroundColor: GACHA_RARITY_COLOR[fuseResult.rarity] + '25' }]}>
                  <Ionicons name={RARITY_ICON[fuseResult.rarity]} size={56} color={GACHA_RARITY_COLOR[fuseResult.rarity]} />
                </View>
                <Text style={[s.fuseResultName, { color: GACHA_RARITY_COLOR[fuseResult.rarity] }]}>{fuseResult.name}</Text>
                <View style={[s.fuseResultPill, { backgroundColor: GACHA_RARITY_COLOR[fuseResult.rarity] + '22', borderColor: GACHA_RARITY_COLOR[fuseResult.rarity] + '66' }]}>
                  <Text style={[s.fuseResultRarity, { color: GACHA_RARITY_COLOR[fuseResult.rarity] }]}>{GACHA_RARITY_LABEL[fuseResult.rarity]}</Text>
                </View>
                <Text style={s.fuseResultStat}>{STAT_LABEL[fuseResult.stat]} +{fuseResult.bonus}  ·  {fuseResult.durationDays}일</Text>
                <PressableScale style={[s.fuseResultBtn, { backgroundColor: GACHA_RARITY_COLOR[fuseResult.rarity] }]} onPress={closeFuseResult}>
                  <Text style={s.fuseResultBtnTxt}>인벤토리에 추가됨!</Text>
                </PressableScale>
              </View>
            </Animated.View>
          )}

          {/* ── 활성 버프 탭 ── */}
          {tab === 'bonus' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.guideBanner}>
                <Ionicons name="flash" size={14} color={COLORS.amber} />
                <Text style={s.guideTxt}>
                  활성 버프는 <Text style={{ color: COLORS.amber, fontWeight: '800' }}>홈 화면 영구 능력치</Text>에 실시간 반영됩니다
                </Text>
              </View>

              {(!inv || inv.activeBonuses.length === 0) ? (
                <View style={s.empty}>
                  <View style={s.emptyIconBox}>
                    <Ionicons name="flash-off-outline" size={40} color={COLORS.textDisabled} />
                  </View>
                  <Text style={s.emptyTxt}>활성 버프가 없어요</Text>
                  <Text style={s.emptySub}>인벤토리에서 주문서를 사용하면{'\n'}스탯이 강화됩니다</Text>
                  <PressableScale style={s.emptyGoBtn} onPress={() => switchTab('inventory')}>
                    <Text style={s.emptyGoBtnTxt}>인벤토리 확인</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </PressableScale>
                </View>
              ) : (
                <>
                  <Text style={s.listHeader}>{inv.activeBonuses.length}개 버프 활성 중</Text>
                  {inv.activeBonuses.map(b => <BonusCard key={b.id} bonus={b} />)}
                  <View style={s.summaryCard}>
                    <Text style={s.summaryTitle}>현재 총 보너스</Text>
                    {inv.activeBonuses.map(b => (
                      <View key={b.id} style={s.summaryRow}>
                        <Text style={s.summaryKey}>{STAT_FULLNAME[b.stat]}</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    maxHeight: '93%',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.border,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  headerLeft: { gap: 4 },
  headerIconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#A78BFA20', alignItems: 'center', justifyContent: 'center' },
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
  tabBadgeTxt: { fontSize: 9, color: '#FFFFFF', fontWeight: '900' },

  // 확률표
  rateCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  rateTitle: { color: COLORS.textSub, fontSize: FONTS.xs, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  rateItem: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  rateDot: { width: 8, height: 8, borderRadius: 4 },
  ratePct: { fontSize: FONTS.xs, fontFamily: 'monospace', fontWeight: '900', minWidth: 36 },
  rateLabel: { fontSize: FONTS.xxs, color: COLORS.textMuted, flex: 1 },
  rateNote: { fontSize: FONTS.xxs, color: COLORS.primary, fontFamily: 'monospace', fontWeight: '700', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },

  freePullBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.goodGlow, borderWidth: 1, borderColor: COLORS.good + '44', borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  freePullBtnDone: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  freePullIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' },
  freePullLabel: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.good },
  freePullSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, marginTop: 2 },
  freeBadge: { backgroundColor: COLORS.good + '28', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.good + '55' },
  freeBadgeDone: { backgroundColor: COLORS.bgInput, borderColor: COLORS.border },
  freeBadgeTxt: { fontSize: 11, fontWeight: '900', color: COLORS.good, fontFamily: 'monospace' },

  pullRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },

  // 무기뽑기 탭
  gearScrollRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  gearScrollPill: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 8,
  },
  gearScrollEmoji: { fontSize: 13 },
  gearScrollTxt: { fontSize: FONTS.xxs, fontWeight: '800', color: COLORS.textSub, fontFamily: 'monospace' },
  gearResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 9, paddingHorizontal: 12,
    marginBottom: 6,
  },
  gearResultEmoji: { fontSize: 22 },
  gearResultName: { fontSize: FONTS.xs, color: COLORS.text, fontWeight: '600' },
  gearResultStat: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 1 },
  gearResultHint: { fontSize: 9, color: COLORS.textDisabled, textAlign: 'center', marginTop: 8 },
  pullBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', gap: 4 },
  pullBtnTen: { backgroundColor: COLORS.amber },
  pullLabel: { color: '#FFFFFF', fontSize: FONTS.sm, fontWeight: '900' },
  pullCost: { color: '#FFFFFF', fontSize: FONTS.xxs, fontWeight: '700', fontFamily: 'monospace' },
  savePill: { backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  saveTxt: { fontSize: 9, color: '#FFFFFF', fontWeight: '900' },

  resultSection: { marginTop: SPACING.sm },
  resultTitle: { color: COLORS.amber, fontSize: FONTS.md, fontWeight: '900', textAlign: 'center', marginBottom: SPACING.sm, fontFamily: 'monospace', letterSpacing: 1 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  goInventoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.md, backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.md, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.primaryLine },
  goInventoryTxt: { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.primary },

  // 현재 스탯 미니 패널
  statMiniPanel: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statMiniTitle: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  statMiniRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statMiniCell: { alignItems: 'center', gap: 2, flex: 1 },
  statMiniKey: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  statMiniVal: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text, fontFamily: 'monospace' },
  statMiniBonus: { fontSize: 10, color: COLORS.amber, fontFamily: 'monospace', fontWeight: '800' },

  guideBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  guideTxt: { flex: 1, fontSize: FONTS.xxs, color: COLORS.textMuted, lineHeight: 16 },
  listHeader: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800', marginBottom: SPACING.sm, textTransform: 'uppercase' },

  empty: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTxt: { color: COLORS.textSub, fontSize: FONTS.sm, fontWeight: '700' },
  emptySub: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18 },
  emptyGoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 10 },
  emptyGoBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: FONTS.xs },

  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  summaryTitle: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: FONTS.sm, color: COLORS.textSub, fontWeight: '700' },
  summaryVal: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },

  // 합성 UI
  invHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  fuseToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fuseToggleTxt: { fontSize: FONTS.xxs, fontWeight: '800', color: COLORS.textSub, fontFamily: 'monospace' },

  fuseGuide: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#A78BFA14', borderRadius: RADIUS.md, padding: 10,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#A78BFA33',
  },
  fuseGuideTxt: { flex: 1, fontSize: FONTS.xxs, color: '#A78BFA', lineHeight: 16, fontFamily: 'monospace' },

  fuseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1.5, padding: 12, marginBottom: 8,
  },
  fuseCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  fuseCardIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fuseCardInfo: { flex: 1, gap: 3 },
  fuseCardName: { fontSize: FONTS.sm, fontWeight: '800' },
  fuseCardSub: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  fuseSelNum: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  fuseSelNumTxt: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },

  fuseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    paddingVertical: 16, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fuseBtnActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  fuseBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: COLORS.textDisabled, fontFamily: 'monospace' },

  // 합성 결과 팝업
  fuseResultOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  fuseResultBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  fuseResultCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    borderWidth: 2, padding: SPACING.lg + 4,
    alignItems: 'center', gap: 10, width: 260,
    overflow: 'hidden',
  },
  fuseResultGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fuseResultTitle: { fontSize: FONTS.sm, fontWeight: '900', color: COLORS.amber, fontFamily: 'monospace', letterSpacing: 1 },
  fuseResultIconBox: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  fuseResultName: { fontSize: FONTS.lg, fontWeight: '900', textAlign: 'center' },
  fuseResultPill: { borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1 },
  fuseResultRarity: { fontSize: FONTS.xs, fontWeight: '900', fontFamily: 'monospace' },
  fuseResultStat: { fontSize: FONTS.sm, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 2 },
  fuseResultBtn: { borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  fuseResultBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
});

// ── 결과 카드 스타일 ──────────────────────────────────────────
const rc = StyleSheet.create({
  card: { width: 100, borderRadius: RADIUS.md, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
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
  // 완료 오버레이
  doneOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.good + 'EE',
    zIndex: 10, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.lg,
  },
  doneIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  doneTxt: { fontSize: FONTS.xl, fontWeight: '900', color: '#FFFFFF' },
  doneSub: { fontSize: FONTS.sm, color: '#FFFFFF', fontWeight: '700', opacity: 0.8 },
  // 카드 본체
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topRight: { flex: 1, gap: 6 },
  name: { fontSize: FONTS.md, fontWeight: '900' },
  rarePill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  rareTxt: { fontSize: 10, fontWeight: '900', fontFamily: 'monospace' },
  dur: { fontSize: FONTS.xxs, color: COLORS.textMuted, fontFamily: 'monospace' },
  // 임팩트 박스
  impactBox: { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, gap: 10 },
  impactLabel: { fontSize: 10, color: COLORS.textDisabled, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  impactRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  impactStatBox: { alignItems: 'center', marginBottom: 2 },
  impactStatKey: { fontSize: 11, fontFamily: 'monospace', fontWeight: '900', letterSpacing: 1 },
  impactStatName: { fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
  impactValBox: { alignItems: 'center', gap: 2 },
  impactValLabel: { fontSize: 9, color: COLORS.textDisabled, fontFamily: 'monospace' },
  impactVal: { fontSize: FONTS.xl, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -1 },
  deltaBadge: {
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, marginBottom: 4,
  },
  deltaTxt: { fontSize: FONTS.sm, fontWeight: '900', fontFamily: 'monospace' },
  impactNote: { fontSize: FONTS.xxs, color: COLORS.textDisabled, lineHeight: 16 },
  // 사용 버튼
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 14 },
  useBtnTxt: { fontSize: FONTS.sm, fontWeight: '900', color: '#FFFFFF' },
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
  timeTrack: { height: 6, backgroundColor: 'rgba(15,23,42,0.06)', borderRadius: RADIUS.full, overflow: 'hidden' },
  timeFill: { height: '100%', borderRadius: RADIUS.full },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLeft: { fontSize: FONTS.xs, fontWeight: '800', fontFamily: 'monospace' },
  timeExpiry: { fontSize: FONTS.xxs, color: COLORS.textDisabled, fontFamily: 'monospace' },
});
