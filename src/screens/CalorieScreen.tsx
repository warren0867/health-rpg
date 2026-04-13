import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalorieGauge from '../components/CalorieGauge';
import { KOREAN_FOODS, CATEGORY_LABELS, searchFoods } from '../data/koreanFoods';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { FoodEntry, FoodItem, GlycemicIndex, RecentFoodEntry, UserProfile } from '../types';
import { calcGaugeData, calcMacroGoal } from '../utils/calorieCalculator';
import {
  copyYesterdayMeals,
  deleteFoodEntry,
  deleteCustomFood,
  generateId,
  getCustomFoods,
  getFavoriteFoodIds,
  getFoodEntriesByDate,
  getRecentFoods,
  getTodayKey,
  getUserProfile,
  saveCustomFood,
  saveFoodEntry,
  sumFoodEntries,
  toggleFavoriteFood,
  trackRecentFood,
} from '../utils/storage';

type MealTime = FoodEntry['mealTime'];
type SearchTab = 'recent' | 'favorite' | 'search' | 'custom';

const MEAL_LABELS: Record<MealTime, string> = {
  breakfast: '🌅 아침',
  lunch: '☀️ 점심',
  dinner: '🌙 저녁',
  snack: '🍪 간식',
};
const MEAL_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SERVING_OPTIONS = [0.5, 1, 1.5, 2, 3];

const GI_CONFIG: Record<GlycemicIndex, { label: string; color: string; emoji: string }> = {
  low:    { label: 'GI 낮음', color: COLORS.teal, emoji: '🟢' },
  medium: { label: 'GI 중간', color: COLORS.gold, emoji: '🟡' },
  high:   { label: 'GI 높음', color: COLORS.red,  emoji: '🔴' },
};

// 최근 N일 날짜 목록
function getDateOptions(n = 7): string[] {
  const opts: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    opts.push(d.toISOString().split('T')[0]);
  }
  return opts;
}

function dateLabel(dateStr: string, todayStr: string): string {
  const diff = Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${diff}일 전`;
}

export default function CalorieScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const today = getTodayKey();

  const [selectedDate, setSelectedDate] = useState(today);
  const dateOptions = getDateOptions(7);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFoodEntry[]>([]);

  // 인라인 입력 상태
  const [activeMeal, setActiveMeal] = useState<MealTime | null>(null);
  const [searchTab, setSearchTab] = useState<SearchTab>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  // 커스텀 입력 폼
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServing, setCustomServing] = useState('1인분');
  const [customGi, setCustomGi] = useState<GlycemicIndex>('medium');

  const load = useCallback(async () => {
    const [p, foodEntries, customs, favs, recents] = await Promise.all([
      getUserProfile(), getFoodEntriesByDate(selectedDate),
      getCustomFoods(), getFavoriteFoodIds(), getRecentFoods(),
    ]);
    setProfile(p);
    setEntries(foodEntries);
    setSummary(sumFoodEntries(foodEntries));
    setCustomFoods(customs);
    setFavIds(favs);
    setRecentFoods(recents);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openInput = (meal: MealTime) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeMeal === meal) {
      // 같은 끼니 다시 탭하면 닫기
      setActiveMeal(null);
      setSelectedFood(null);
      setSearchQuery('');
      return;
    }
    setActiveMeal(meal);
    setSearchTab('recent');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setServings(1);
    setShowCustomForm(false);
    // 스크롤을 해당 위치로
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const closeInput = () => {
    setActiveMeal(null);
    setSelectedFood(null);
    setSearchQuery('');
    setShowCustomForm(false);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSelectedFood(null);
    if (q.length >= 1) {
      setSearchResults(searchFoods(q, customFoods));
      setSearchTab('search');
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectFood = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFood(food);
    setServings(1);
  };

  const handleAddEntry = async () => {
    if (!selectedFood || !activeMeal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: FoodEntry = {
      id: generateId(),
      date: selectedDate,
      timestamp: new Date().toISOString(),
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      servings,
      calories: Math.round(selectedFood.cal * servings),
      carbs: Math.round(selectedFood.carbs * servings * 10) / 10,
      protein: Math.round(selectedFood.protein * servings * 10) / 10,
      fat: Math.round(selectedFood.fat * servings * 10) / 10,
      mealTime: activeMeal,
    };
    await saveFoodEntry(entry);
    await trackRecentFood(selectedFood.id, selectedFood.name);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchTab('recent');
    load();
  };

  const handleToggleFav = async (foodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleFavoriteFood(foodId);
    setFavIds(await getFavoriteFoodIds());
  };

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert('삭제', `${entry.foodName}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await deleteFoodEntry(entry.id); load(); } },
    ]);
  };

  const handleCopyYesterday = () => {
    const prevDay = (() => {
      const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();
    const fromLabel = dateLabel(prevDay, today);
    Alert.alert(`${fromLabel} 식단 복사`, `${fromLabel} 기록을 ${dateLabel(selectedDate, today)}로 복사할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '복사', onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const count = await copyYesterdayMeals(selectedDate, prevDay);
        if (count === 0) Alert.alert('알림', `${fromLabel} 기록이 없어요`);
        else load();
      }},
    ]);
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customCal) { Alert.alert('오류', '이름과 칼로리는 필수입니다'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const food: FoodItem = {
      id: `custom_${generateId()}`,
      name: customName.trim(),
      nameSearch: customName.trim().toLowerCase(),
      cal: parseInt(customCal) || 0,
      serving: customServing || '1인분',
      carbs: parseFloat(customCarbs) || 0,
      protein: parseFloat(customProtein) || 0,
      fat: parseFloat(customFat) || 0,
      gi: customGi,
      category: 'korean',
      isCustom: true,
    };
    await saveCustomFood(food);
    setShowCustomForm(false);
    setCustomName(''); setCustomCal(''); setCustomCarbs('');
    setCustomProtein(''); setCustomFat(''); setCustomServing('1인분');
    const updated = await getCustomFoods();
    setCustomFoods(updated);
    handleSelectFood(food);
  };

  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = calcMacroGoal(targetCal);
  const gaugeData = calcGaugeData(summary.calories, targetCal);
  const entriesByMeal = MEAL_ORDER.reduce<Record<MealTime, FoodEntry[]>>((acc, m) => {
    acc[m] = entries.filter(e => e.mealTime === m);
    return acc;
  }, { breakfast: [], lunch: [], dinner: [], snack: [] });

  const favFoods = favIds
    .map(id => customFoods.find(f => f.id === id) ?? KOREAN_FOODS.find(f => f.id === id))
    .filter(Boolean) as FoodItem[];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 날짜 선택 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {dateOptions.map(date => {
              const isSelected = date === selectedDate;
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(date);
                    setActiveMeal(null);
                    setSelectedFood(null);
                  }}
                >
                  <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelSel]}>
                    {dateLabel(date, today)}
                  </Text>
                  <Text style={[styles.dateChipDate, isSelected && { color: COLORS.teal }]}>
                    {date.slice(5).replace('-', '/')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>
            {dateLabel(selectedDate, today)} 식단
          </Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyYesterday}>
            <Text style={styles.copyBtnText}>📋 전날 복사</Text>
          </TouchableOpacity>
        </View>

        {/* 칼로리 게이지 */}
        <View style={styles.card}>
          <CalorieGauge
            data={gaugeData}
            carbs={Math.round(summary.carbs)}
            protein={Math.round(summary.protein)}
            fat={Math.round(summary.fat)}
            carbsGoal={macroGoal.carbs}
            proteinGoal={macroGoal.protein}
            fatGoal={macroGoal.fat}
          />
          {summary.carbs > macroGoal.carbs && (
            <View style={styles.carbWarning}>
              <Text style={styles.carbWarningText}>
                ⚠️ 탄수화물 목표 초과 (+{Math.round(summary.carbs - macroGoal.carbs)}g) — 혈당 주의
              </Text>
            </View>
          )}
        </View>

        {/* 끼니별 카드 */}
        {MEAL_ORDER.map(meal => {
          const isActive = activeMeal === meal;
          const mealEntries = entriesByMeal[meal];
          return (
            <View key={meal} style={[styles.mealSection, isActive && styles.mealSectionActive]}>
              {/* 끼니 헤더 */}
              <TouchableOpacity style={styles.mealHeader} onPress={() => openInput(meal)} activeOpacity={0.7}>
                <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                <View style={styles.mealRight}>
                  <Text style={styles.mealCalText}>
                    {mealEntries.reduce((s, e) => s + e.calories, 0)} kcal
                  </Text>
                  <View style={[styles.addFoodBtn, isActive && styles.addFoodBtnActive]}>
                    <Text style={[styles.addFoodBtnText, isActive && { color: COLORS.text }]}>
                      {isActive ? '✕ 닫기' : '+ 추가'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* 기존 항목 */}
              {mealEntries.map(entry => {
                const food = customFoods.find(f => f.id === entry.foodId) ?? KOREAN_FOODS.find(f => f.id === entry.foodId);
                return (
                  <View key={entry.id} style={styles.entryRow}>
                    <View style={styles.entryLeft}>
                      <View style={styles.entryNameRow}>
                        <Text style={styles.entryName}>{entry.foodName}</Text>
                        {food?.gi && <Text>{GI_CONFIG[food.gi].emoji}</Text>}
                        {food?.isCustom && <Text style={styles.customBadge}>MY</Text>}
                      </View>
                      <Text style={styles.entryMeta}>
                        {entry.servings}인분 · 탄 {entry.carbs}g · 단 {entry.protein}g · 지 {entry.fat}g
                      </Text>
                    </View>
                    <Text style={styles.entryCal}>{entry.calories} kcal</Text>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(entry)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* ── 인라인 입력 패널 ── */}
              {isActive && (
                <View style={styles.inputPanel}>

                  {!selectedFood && !showCustomForm && (
                    <>
                      {/* 검색창 */}
                      <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="음식 검색 (예: 라면, 삼각김밥)"
                        placeholderTextColor={COLORS.textDisabled}
                        returnKeyType="search"
                        autoFocus={false}
                      />

                      {/* 탭 */}
                      <View style={styles.tabRow}>
                        {(['recent', 'favorite', 'search', 'custom'] as SearchTab[]).map(tab => (
                          <TouchableOpacity
                            key={tab}
                            style={[styles.tab, searchTab === tab && styles.tabActive]}
                            onPress={() => { setSearchTab(tab); if (tab !== 'search') { setSearchQuery(''); setSearchResults([]); } }}
                          >
                            <Text style={[styles.tabText, searchTab === tab && { color: COLORS.purple }]}>
                              {tab === 'recent' ? '최근' : tab === 'favorite' ? '즐겨찾기' : tab === 'search' ? '검색' : '직접입력'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* 최근 */}
                      {searchTab === 'recent' && (
                        recentFoods.length === 0
                          ? <Text style={styles.emptyTabText}>아직 기록이 없어요</Text>
                          : recentFoods.map(item => {
                            const food = customFoods.find(f => f.id === item.foodId) ?? KOREAN_FOODS.find(f => f.id === item.foodId);
                            if (!food) return null;
                            return <FoodRow key={item.foodId} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} useCount={item.useCount} />;
                          })
                      )}

                      {/* 즐겨찾기 */}
                      {searchTab === 'favorite' && (
                        favFoods.length === 0
                          ? <Text style={styles.emptyTabText}>⭐를 눌러 즐겨찾기 추가</Text>
                          : favFoods.map(food => (
                            <FoodRow key={food.id} food={food} isFav onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))
                      )}

                      {/* 검색 결과 */}
                      {searchTab === 'search' && (
                        searchResults.length === 0
                          ? <Text style={styles.emptyTabText}>{searchQuery ? `"${searchQuery}" 결과 없음` : '위에서 검색하세요'}</Text>
                          : searchResults.map(food => (
                            <FoodRow key={food.id} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))
                      )}

                      {/* 직접 입력 */}
                      {searchTab === 'custom' && (
                        <View>
                          <TouchableOpacity style={styles.newCustomBtn} onPress={() => setShowCustomForm(true)}>
                            <Text style={styles.newCustomBtnText}>+ 새 음식 등록</Text>
                          </TouchableOpacity>
                          {customFoods.map(food => (
                            <FoodRow key={food.id} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* 커스텀 폼 */}
                  {showCustomForm && (
                    <View>
                      <Text style={styles.formTitle}>음식 직접 등록</Text>
                      <CustomField label="음식 이름 *" value={customName} onChange={setCustomName} placeholder="예: 엄마 된장찌개" />
                      <CustomField label="칼로리 (kcal) *" value={customCal} onChange={setCustomCal} placeholder="예: 250" numeric />
                      <CustomField label="1회 제공량" value={customServing} onChange={setCustomServing} placeholder="예: 1인분" />
                      <View style={styles.macroRow}>
                        <View style={{ flex: 1 }}>
                          <CustomField label="탄수화물 g" value={customCarbs} onChange={setCustomCarbs} placeholder="30" numeric />
                        </View>
                        <View style={{ flex: 1 }}>
                          <CustomField label="단백질 g" value={customProtein} onChange={setCustomProtein} placeholder="15" numeric />
                        </View>
                        <View style={{ flex: 1 }}>
                          <CustomField label="지방 g" value={customFat} onChange={setCustomFat} placeholder="8" numeric />
                        </View>
                      </View>
                      <Text style={styles.formLabel}>혈당 영향 (GI)</Text>
                      <View style={styles.giRow}>
                        {(['low', 'medium', 'high'] as GlycemicIndex[]).map(gi => (
                          <TouchableOpacity
                            key={gi}
                            style={[styles.giBtn, customGi === gi && { borderColor: GI_CONFIG[gi].color, backgroundColor: GI_CONFIG[gi].color + '22' }]}
                            onPress={() => setCustomGi(gi)}
                          >
                            <Text style={[styles.giBtnText, customGi === gi && { color: GI_CONFIG[gi].color }]}>
                              {GI_CONFIG[gi].emoji} {gi === 'low' ? '낮음' : gi === 'medium' ? '중간' : '높음'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.formBtns}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustomForm(false)}>
                          <Text style={styles.cancelBtnText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCustom}>
                          <Text style={styles.confirmBtnText}>등록 & 선택</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 인분 선택 + 추가 */}
                  {selectedFood && (
                    <View style={styles.selectedPanel}>
                      <View style={styles.selectedInfoRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedName}>{selectedFood.name}</Text>
                          <Text style={styles.selectedServing}>{selectedFood.serving}</Text>
                        </View>
                        <Text style={{ fontSize: 20 }}>{GI_CONFIG[selectedFood.gi].emoji}</Text>
                        <TouchableOpacity onPress={() => handleToggleFav(selectedFood.id)}>
                          <Text style={{ fontSize: 20 }}>{favIds.includes(selectedFood.id) ? '⭐' : '☆'}</Text>
                        </TouchableOpacity>
                      </View>
                      {selectedFood.gi === 'high' && (
                        <Text style={styles.giWarning}>⚠️ GI 높음 — 혈당을 빠르게 올릴 수 있어요</Text>
                      )}

                      {/* 인분 */}
                      <View style={styles.servingRow}>
                        {SERVING_OPTIONS.map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.servingBtn, servings === s && styles.servingBtnActive]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setServings(s); }}
                          >
                            <Text style={[styles.servingBtnText, servings === s && { color: COLORS.purple }]}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* 영양 미리보기 */}
                      <View style={styles.nutriRow}>
                        <NutriChip label="칼로리" value={`${Math.round(selectedFood.cal * servings)}kcal`} color={COLORS.gold} />
                        <NutriChip label="탄" value={`${Math.round(selectedFood.carbs * servings)}g`} color={COLORS.orange} />
                        <NutriChip label="단" value={`${Math.round(selectedFood.protein * servings)}g`} color={COLORS.teal} />
                        <NutriChip label="지" value={`${Math.round(selectedFood.fat * servings)}g`} color={COLORS.textMuted} />
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedFood(null)}>
                          <Text style={styles.backBtnText}>← 다시</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddEntry}>
                          <Text style={styles.addBtnText}>추가하기 ✓</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* 팁 */}
        <View style={[styles.card, { borderColor: COLORS.orange + '44' }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.orange }]}>🩸 혈당 관리 팁</Text>
          {[
            `탄수화물 목표: ${macroGoal.carbs}g (${Math.round(macroGoal.carbs / 3)}g/끼니)`,
            '🟢 낮은 GI 음식을 우선 선택하세요',
            '채소 → 단백질 → 탄수화물 순서로 드세요',
            '식후 10분 산책이 혈당을 낮춰줍니다',
          ].map((tip, i) => (
            <Text key={i} style={styles.tipText}>• {tip}</Text>
          ))}
        </View>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 공통 컴포넌트 ──

function FoodRow({ food, isFav, onSelect, onFav, useCount }: {
  food: FoodItem; isFav: boolean;
  onSelect: (f: FoodItem) => void;
  onFav: (id: string) => void;
  useCount?: number;
}) {
  const gi = GI_CONFIG[food.gi];
  return (
    <TouchableOpacity style={styles.foodRow} onPress={() => onSelect(food)}>
      <View style={styles.foodRowLeft}>
        <View style={styles.foodNameRow}>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.isCustom && <Text style={styles.customBadge}>MY</Text>}
          {useCount && useCount > 1 && <Text style={styles.countBadge}>{useCount}회</Text>}
        </View>
        <Text style={styles.foodMeta}>{food.serving} · {CATEGORY_LABELS[food.category] ?? ''} · 탄 {food.carbs}g · 단 {food.protein}g</Text>
      </View>
      <View style={styles.foodRowRight}>
        <Text style={[styles.foodCal, { color: gi.color }]}>{food.cal}</Text>
        <Text style={styles.foodCalUnit}>kcal</Text>
        <Text style={{ fontSize: 14 }}>{gi.emoji}</Text>
        <TouchableOpacity onPress={() => onFav(food.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 16 }}>{isFav ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function NutriChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.nutriChip}>
      <Text style={[styles.nutriValue, { color }]}>{value}</Text>
      <Text style={styles.nutriLabel}>{label}</Text>
    </View>
  );
}

function CustomField({ label, value, onChange, placeholder, numeric }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDisabled}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },

  // 날짜 선택
  dateChip: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bgCard,
    alignItems: 'center', minWidth: 60,
  },
  dateChipSelected: { borderColor: COLORS.teal, backgroundColor: COLORS.teal + '18' },
  dateChipLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '700' },
  dateChipLabelSel: { color: COLORS.teal },
  dateChipDate: { color: COLORS.textDisabled, fontSize: FONTS.xxs, marginTop: 2 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  copyBtn: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  copyBtnText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  carbWarning: {
    backgroundColor: COLORS.orange + '22', borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.orange + '44',
  },
  carbWarningText: { color: COLORS.orange, fontSize: FONTS.sm, textAlign: 'center', fontWeight: '600' },

  // 끼니 카드
  mealSection: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  mealSectionActive: { borderColor: COLORS.purple },
  mealHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md,
  },
  mealTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700' },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCalText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  addFoodBtn: {
    backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.purple,
  },
  addFoodBtnActive: { backgroundColor: COLORS.bgHighlight, borderColor: COLORS.border },
  addFoodBtnText: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '700' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  entryLeft: { flex: 1 },
  deleteBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.red + '18', borderWidth: 1, borderColor: COLORS.red + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: COLORS.red, fontSize: 12, fontWeight: '900', lineHeight: 14 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  customBadge: {
    backgroundColor: COLORS.purple + '33', borderRadius: 4,
    paddingHorizontal: 4, color: COLORS.purple, fontSize: 9, fontWeight: '900',
  },
  entryMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  entryCal: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.sm },

  // 인라인 입력 패널
  inputPanel: {
    borderTopWidth: 1, borderTopColor: COLORS.purple + '44',
    backgroundColor: COLORS.bgInput, padding: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.md, padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  tab: {
    flex: 1, paddingVertical: 7, alignItems: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  emptyTabText: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', paddingVertical: 20 },

  // 음식 행
  foodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  foodRowLeft: { flex: 1, marginRight: 8 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foodName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  countBadge: {
    backgroundColor: COLORS.teal + '33', borderRadius: 4,
    paddingHorizontal: 4, color: COLORS.teal, fontSize: 9, fontWeight: '700',
  },
  foodMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  foodRowRight: { alignItems: 'flex-end', gap: 2 },
  foodCal: { fontSize: FONTS.md, fontWeight: '900' },
  foodCalUnit: { color: COLORS.textMuted, fontSize: FONTS.xs },

  // 선택된 음식 패널
  selectedPanel: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.sm, gap: SPACING.sm,
  },
  selectedInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedName: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700' },
  selectedServing: { color: COLORS.textMuted, fontSize: FONTS.xs },
  giWarning: { color: COLORS.red, fontSize: FONTS.xs },
  servingRow: { flexDirection: 'row', gap: 8 },
  servingBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center',
    backgroundColor: COLORS.bgInput,
  },
  servingBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  servingBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONTS.sm },
  nutriRow: { flexDirection: 'row', gap: 6 },
  nutriChip: {
    flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md,
    padding: 6, alignItems: 'center',
  },
  nutriValue: { fontSize: FONTS.sm, fontWeight: '900' },
  nutriLabel: { color: COLORS.textMuted, fontSize: 10 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  backBtn: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xl,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  backBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  addBtn: {
    flex: 1, backgroundColor: COLORS.purple, borderRadius: RADIUS.xl,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },

  // 커스텀 폼
  formTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  formLabel: { color: COLORS.textMuted, fontSize: FONTS.xs, marginBottom: 3 },
  formInput: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.sm, padding: SPACING.sm,
  },
  macroRow: { flexDirection: 'row', gap: 6 },
  giRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  giBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingVertical: 6, alignItems: 'center',
    backgroundColor: COLORS.bgCard,
  },
  giBtnText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  formBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 1, borderRadius: RADIUS.xl, paddingVertical: 12,
    alignItems: 'center', backgroundColor: COLORS.bgHighlight,
  },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  confirmBtn: {
    flex: 2, borderRadius: RADIUS.xl, paddingVertical: 12,
    alignItems: 'center', backgroundColor: COLORS.purple,
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.sm },

  newCustomBtn: {
    backgroundColor: COLORS.purple, borderRadius: RADIUS.xl,
    paddingVertical: 10, alignItems: 'center', marginBottom: SPACING.sm,
  },
  newCustomBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sm },

  sectionTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  tipText: { color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 22 },
});
