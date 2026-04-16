import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState, useEffect } from 'react';
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
import { estimateBGRise, GI_NUM } from './BloodSugarScreen';
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
  syncDailyLogCalories,
  toggleFavoriteFood,
  trackRecentFood,
} from '../utils/storage';

type MealTime = FoodEntry['mealTime'];
type SearchTab = 'recent' | 'favorite' | 'custom';

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

  // 편집 모드 (끼니별)
  const [editMeal, setEditMeal] = useState<MealTime | null>(null);
  // 추가 완료 배너
  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 인라인 입력 상태
  const [activeMeal, setActiveMeal] = useState<MealTime | null>(null);
  const [searchTab, setSearchTab] = useState<SearchTab>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [eatPct, setEatPct] = useState(100);

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
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectFood = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFood(food);
    setServings(1);
    setEatPct(100);
  };

  const handleAddEntry = async () => {
    if (!selectedFood || !activeMeal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const cal = Math.round(selectedFood.cal * servings * eatPct / 100);
    const entry: FoodEntry = {
      id: generateId(),
      date: selectedDate,
      timestamp: new Date().toISOString(),
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      servings,
      calories: cal,
      carbs: Math.round(selectedFood.carbs * servings * eatPct / 100 * 10) / 10,
      protein: Math.round(selectedFood.protein * servings * eatPct / 100 * 10) / 10,
      fat: Math.round(selectedFood.fat * servings * eatPct / 100 * 10) / 10,
      mealTime: activeMeal,
    };
    await saveFoodEntry(entry);
    await trackRecentFood(selectedFood.id, selectedFood.name);
    await syncDailyLogCalories(selectedDate);
    // 배너 표시
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setAddedBanner(`${selectedFood.name}  +${cal} kcal`);
    bannerTimer.current = setTimeout(() => setAddedBanner(null), 2200);
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

  const handleDelete = async (entry: FoodEntry) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // 스토리지에서 삭제
    await deleteFoodEntry(entry.id);
    await syncDailyLogCalories(selectedDate);
    // 화면 즉시 업데이트
    const fresh = await getFoodEntriesByDate(selectedDate);
    setEntries(fresh);
    setSummary(sumFoodEntries(fresh));
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
      {/* 추가 완료 배너 */}
      {addedBanner && (
        <View style={styles.addedBanner}>
          <Text style={styles.addedBannerText}>✓  {addedBanner}</Text>
        </View>
      )}
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
              <View style={styles.mealHeader}>
                <TouchableOpacity onPress={() => openInput(meal)} activeOpacity={0.7} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                  <Text style={styles.mealCalText}>  {mealEntries.reduce((s, e) => s + e.calories, 0)} kcal</Text>
                </TouchableOpacity>
                <View style={styles.mealRight}>
                  {mealEntries.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditMeal(editMeal === meal ? null : meal);
                      }}
                      style={[styles.editBtn, editMeal === meal && styles.editBtnActive]}
                    >
                      <Text style={[styles.editBtnText, editMeal === meal && { color: COLORS.red }]}>
                        {editMeal === meal ? '완료' : '편집'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openInput(meal)} activeOpacity={0.7}>
                    <View style={[styles.addFoodBtn, isActive && styles.addFoodBtnActive]}>
                      <Text style={[styles.addFoodBtnText, isActive && { color: COLORS.text }]}>
                        {isActive ? '✕ 닫기' : '+ 추가'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 기존 항목 */}
              {mealEntries.map(entry => {
                const food = customFoods.find(f => f.id === entry.foodId) ?? KOREAN_FOODS.find(f => f.id === entry.foodId);
                const isEditing = editMeal === meal;
                return (
                  <View key={entry.id} style={styles.entryRow}>
                    {isEditing && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          handleDelete(entry);
                        }}
                      >
                        <Text style={styles.deleteBtnText}>−</Text>
                      </TouchableOpacity>
                    )}
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
                        placeholder="🔍  음식 검색"
                        placeholderTextColor={COLORS.textDisabled}
                        returnKeyType="search"
                        autoFocus={false}
                      />

                      {/* 탭 — 검색 중이면 숨김 */}
                      {!searchQuery && (
                        <View style={styles.tabRow}>
                          {(['recent', 'favorite', 'custom'] as SearchTab[]).map(tab => (
                            <TouchableOpacity
                              key={tab}
                              style={[styles.tab, searchTab === tab && styles.tabActive]}
                              onPress={() => setSearchTab(tab)}
                            >
                              <Text style={[styles.tabText, searchTab === tab && { color: COLORS.purple }]}>
                                {tab === 'recent' ? '최근' : tab === 'favorite' ? '즐겨찾기' : '직접입력'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* 검색 결과 (타이핑 중) */}
                      {searchQuery.length > 0 && (
                        searchResults.length === 0
                          ? <Text style={styles.emptyTabText}>"{searchQuery}" 결과 없음</Text>
                          : searchResults.map(food => (
                            <FoodRow key={food.id} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))
                      )}

                      {/* 최근 */}
                      {!searchQuery && searchTab === 'recent' && (
                        recentFoods.length === 0
                          ? <Text style={styles.emptyTabText}>아직 기록이 없어요{'\n'}검색해서 음식을 추가해보세요</Text>
                          : recentFoods.map(item => {
                            const food = customFoods.find(f => f.id === item.foodId) ?? KOREAN_FOODS.find(f => f.id === item.foodId);
                            if (!food) return null;
                            return <FoodRow key={item.foodId} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} useCount={item.useCount} />;
                          })
                      )}

                      {/* 즐겨찾기 */}
                      {!searchQuery && searchTab === 'favorite' && (
                        favFoods.length === 0
                          ? <Text style={styles.emptyTabText}>⭐를 눌러 즐겨찾기 추가</Text>
                          : favFoods.map(food => (
                            <FoodRow key={food.id} food={food} isFav onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))
                      )}

                      {/* 직접 입력 */}
                      {!searchQuery && searchTab === 'custom' && (
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

                      {/* 섭취 비율 (밥/면류) */}
                      {(selectedFood.category === 'rice' || selectedFood.category === 'noodle') && (
                        <View style={styles.pctSection}>
                          <Text style={styles.pctLabel}>섭취량  <Text style={{ color: COLORS.orange, fontWeight: '900' }}>{eatPct}%</Text></Text>
                          <View style={styles.pctRow}>
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
                              <TouchableOpacity
                                key={p}
                                style={[styles.pctBtn, eatPct === p && styles.pctBtnActive]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEatPct(p); }}
                              >
                                <Text style={[styles.pctBtnText, eatPct === p && { color: COLORS.orange }]}>{p}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* 영양 미리보기 */}
                      <View style={styles.nutriRow}>
                        <NutriChip label="칼로리" value={`${Math.round(selectedFood.cal * servings * eatPct / 100)}kcal`} color={COLORS.gold} />
                        <NutriChip label="탄" value={`${Math.round(selectedFood.carbs * servings * eatPct / 100)}g`} color={COLORS.orange} />
                        <NutriChip label="단" value={`${Math.round(selectedFood.protein * servings * eatPct / 100)}g`} color={COLORS.teal} />
                        <NutriChip label="지" value={`${Math.round(selectedFood.fat * servings * eatPct / 100)}g`} color={COLORS.textMuted} />
                      </View>

                      {/* 혈당 예측 */}
                      {(() => {
                        const actualCarbs = Math.round(selectedFood.carbs * servings * eatPct / 100);
                        const est = estimateBGRise(actualCarbs, selectedFood.gi);
                        const color = selectedFood.gi === 'high' ? COLORS.red : selectedFood.gi === 'medium' ? COLORS.gold : COLORS.teal;
                        return (
                          <View style={[styles.bgEstCard, { borderColor: color + '44', backgroundColor: color + '0C' }]}>
                            <View style={styles.bgEstTop}>
                              <Text style={[styles.bgEstTitle, { color }]}>🩸 예상 혈당 상승</Text>
                              <Text style={[styles.bgEstRange, { color }]}>+{est.min} ~ +{est.max} mg/dL</Text>
                            </View>
                            <View style={styles.bgEstBar}>
                              <View style={[styles.bgEstFill, { width: `${Math.min(100, est.max / 2)}%` as any, backgroundColor: color }]} />
                            </View>
                            <Text style={styles.bgEstNote}>
                              당부하지수(GL) {est.gl} · 개인차가 있는 대략적 추정치입니다
                            </Text>
                          </View>
                        );
                      })()}

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

        {/* 혈당 영향 요약 */}
        {(() => {
          const totalGL = entries.reduce((sum, e) => {
            const food = customFoods.find(f => f.id === e.foodId) ?? KOREAN_FOODS.find(f => f.id === e.foodId);
            if (!food) return sum;
            return sum + ((GI_NUM[food.gi] ?? 60) * e.carbs / 100);
          }, 0);
          const glRounded = Math.round(totalGL);
          const glColor = glRounded < 60 ? COLORS.teal : glRounded < 100 ? COLORS.gold : COLORS.red;
          const glLabel = glRounded < 60 ? '혈당 영향 낮음' : glRounded < 100 ? '혈당 영향 보통' : '혈당 영향 높음';
          return entries.length > 0 ? (
            <View style={[styles.card, { borderColor: glColor + '44' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionTitle, { color: glColor, marginBottom: 0 }]}>🩸 오늘 혈당 부하</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: glColor, fontSize: FONTS.xxl, fontWeight: '900', fontFamily: 'monospace' }}>GL {glRounded}</Text>
                  <Text style={{ color: glColor, fontSize: FONTS.xxs, fontWeight: '700' }}>{glLabel}</Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: COLORS.bgHighlight, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <View style={{ width: `${Math.min(100, Math.round(glRounded / 150 * 100))}%` as any, height: '100%', backgroundColor: glColor, borderRadius: 4 }} />
              </View>
              {[
                `탄수화물 목표: ${macroGoal.carbs}g · 끼니당 ${Math.round(macroGoal.carbs / 3)}g`,
                'GL 60 이하: 혈당 안정  ·  GL 100+: 스파이크 주의',
                '🟢 GI 낮은 음식을 골라 GL을 낮추세요',
                '식후 10분 산책이 혈당을 낮춰줍니다',
              ].map((tip, i) => (
                <Text key={i} style={styles.tipText}>• {tip}</Text>
              ))}
            </View>
          ) : (
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
          );
        })()}

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
    <TouchableOpacity style={styles.foodRow} onPress={() => onSelect(food)} activeOpacity={0.65}>
      {/* GI 컬러 인디케이터 */}
      <View style={[styles.foodGiBar, { backgroundColor: gi.color }]} />
      <View style={styles.foodRowLeft}>
        <View style={styles.foodNameRow}>
          <Text style={styles.foodName} numberOfLines={1}>{food.name}</Text>
          {food.isCustom && <Text style={styles.customBadge}>MY</Text>}
          {useCount && useCount > 1 && <Text style={styles.countBadge}>{useCount}회</Text>}
        </View>
        <Text style={styles.foodMeta} numberOfLines={1}>{food.serving}  ·  탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g</Text>
      </View>
      <View style={styles.foodRowRight}>
        <Text style={[styles.foodCal, { color: gi.color }]}>{food.cal}<Text style={styles.foodCalUnit}> kcal</Text></Text>
        <TouchableOpacity onPress={() => onFav(food.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.favIcon}>{isFav ? '⭐' : '☆'}</Text>
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

  // 추가 완료 배너
  addedBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: COLORS.teal, paddingVertical: 10, paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  addedBannerText: { color: '#fff', fontSize: FONTS.sm, fontWeight: '800', letterSpacing: 0.5 },

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
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
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
  editBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.bgHighlight, marginRight: 6 },
  editBtnActive: { backgroundColor: COLORS.red + '18' },
  editBtnText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '700' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  deleteBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
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
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.sm, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8,
  },
  tabRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 6, alignItems: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.xxs, fontWeight: '700', letterSpacing: 0.5 },
  emptyTabText: { color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center', paddingVertical: 16, lineHeight: 20 },

  // 음식 행 (compact)
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderSub,
  },
  foodGiBar: { width: 3, height: 32, borderRadius: 2, marginRight: 8 },
  foodRowLeft: { flex: 1, marginRight: 6 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foodName: { color: COLORS.text, fontSize: FONTS.xs, fontWeight: '700', flexShrink: 1 },
  countBadge: {
    backgroundColor: COLORS.teal + '33', borderRadius: 3,
    paddingHorizontal: 4, color: COLORS.teal, fontSize: 9, fontWeight: '700',
  },
  foodMeta: { color: COLORS.textDisabled, fontSize: 10, marginTop: 1 },
  foodRowRight: { alignItems: 'flex-end', gap: 3 },
  foodCal: { fontSize: FONTS.xs, fontWeight: '900', fontFamily: 'monospace' },
  foodCalUnit: { color: COLORS.textMuted, fontSize: 10 },
  favIcon: { fontSize: 13, color: COLORS.textMuted },

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
  pctSection: { marginTop: 6, marginBottom: 2 },
  pctLabel: { color: COLORS.textSub, fontSize: FONTS.xs, marginBottom: 6 },
  pctRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pctBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 5, backgroundColor: COLORS.bgInput,
  },
  pctBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + '22' },
  pctBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONTS.xs },
  nutriRow: { flexDirection: 'row', gap: 6 },
  nutriChip: {
    flex: 1, backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md,
    padding: 6, alignItems: 'center',
  },
  nutriValue: { fontSize: FONTS.sm, fontWeight: '900' },
  nutriLabel: { color: COLORS.textMuted, fontSize: 10 },
  // 혈당 예측 카드
  bgEstCard: {
    borderRadius: RADIUS.md, borderWidth: 1.5,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  bgEstTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bgEstTitle: { fontSize: FONTS.xs, fontWeight: '700' },
  bgEstRange: { fontSize: FONTS.md, fontWeight: '900', fontFamily: 'monospace' },
  bgEstBar: { height: 5, backgroundColor: COLORS.bgHighlight, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  bgEstFill: { height: '100%', borderRadius: 3, opacity: 0.7 },
  bgEstNote: { color: COLORS.textDisabled, fontSize: FONTS.xxs },
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
