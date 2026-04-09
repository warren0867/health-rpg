import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalorieGauge from '../components/CalorieGauge';
import { CATEGORY_LABELS, KOREAN_FOODS, searchFoods } from '../data/koreanFoods';
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

const MEAL_LABELS: Record<MealTime, string> = {
  breakfast: '🌅 아침',
  lunch: '☀️ 점심',
  dinner: '🌙 저녁',
  snack: '🍪 간식',
};
const MEAL_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SERVING_OPTIONS = [0.5, 1, 1.5, 2, 3];

const GI_CONFIG: Record<GlycemicIndex, { label: string; color: string; emoji: string }> = {
  low:    { label: 'GI 낮음', color: COLORS.teal,  emoji: '🟢' },
  medium: { label: 'GI 중간', color: COLORS.gold,  emoji: '🟡' },
  high:   { label: 'GI 높음', color: COLORS.red,   emoji: '🔴' },
};

type SearchTab = 'recent' | 'favorite' | 'search' | 'custom';

export default function CalorieScreen() {
  const today = getTodayKey();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFoodEntry[]>([]);

  // 검색 모달
  const [showSearch, setShowSearch] = useState(false);
  const [activeMeal, setActiveMeal] = useState<MealTime>('lunch');
  const [searchTab, setSearchTab] = useState<SearchTab>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  // 커스텀 음식 입력
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
      getUserProfile(),
      getFoodEntriesByDate(today),
      getCustomFoods(),
      getFavoriteFoodIds(),
      getRecentFoods(),
    ]);
    setProfile(p);
    setEntries(foodEntries);
    setSummary(sumFoodEntries(foodEntries));
    setCustomFoods(customs);
    setFavIds(favs);
    setRecentFoods(recents);
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSearch = (meal: MealTime) => {
    setActiveMeal(meal);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setServings(1);
    setSearchTab('recent');
    setShowSearch(true);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSearchResults(q.length >= 1 ? searchFoods(q, customFoods) : []);
    setSelectedFood(null);
    if (q.length >= 1) setSearchTab('search');
  };

  const handleSelectFood = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFood(food);
    setServings(1);
    setSearchQuery(food.name);
    setSearchResults([]);
  };

  const handleAddEntry = async () => {
    if (!selectedFood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: FoodEntry = {
      id: generateId(),
      date: today,
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
    setShowSearch(false);
    setSearchQuery('');
    setSelectedFood(null);
    load();
  };

  const handleToggleFav = async (foodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleFavoriteFood(foodId);
    const updated = await getFavoriteFoodIds();
    setFavIds(updated);
  };

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert('삭제', `${entry.foodName}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await deleteFoodEntry(entry.id); load(); } },
    ]);
  };

  const handleCopyYesterday = () => {
    Alert.alert('어제 식단 복사', '어제 기록한 음식을 오늘로 복사할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '복사', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const count = await copyYesterdayMeals(today, yesterday);
          if (count === 0) Alert.alert('알림', '어제 기록이 없어요');
          else load();
        }
      },
    ]);
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customCal) {
      Alert.alert('오류', '이름과 칼로리는 필수입니다');
      return;
    }
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
    load();
    // 바로 선택
    handleSelectFood(food);
  };

  const handleDeleteCustom = (food: FoodItem) => {
    Alert.alert('삭제', `"${food.name}" 커스텀 음식을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await deleteCustomFood(food.id); load(); } },
    ]);
  };

  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = calcMacroGoal(targetCal);
  const gaugeData = calcGaugeData(summary.calories, targetCal);
  const entriesByMeal = MEAL_ORDER.reduce<Record<MealTime, FoodEntry[]>>((acc, m) => {
    acc[m] = entries.filter(e => e.mealTime === m);
    return acc;
  }, { breakfast: [], lunch: [], dinner: [], snack: [] });

  // 즐겨찾기 음식 목록
  const favFoods = favIds
    .map(id => customFoods.find(f => f.id === id) ?? KOREAN_FOODS.find(f => f.id === id))
    .filter(Boolean) as FoodItem[];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>식단 & 칼로리</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyYesterday}>
            <Text style={styles.copyBtnText}>📋 어제 복사</Text>
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

        {/* 끼니별 기록 */}
        {MEAL_ORDER.map(meal => (
          <View key={meal} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
              <View style={styles.mealRight}>
                <Text style={styles.mealCalText}>
                  {entriesByMeal[meal].reduce((s, e) => s + e.calories, 0)} kcal
                </Text>
                <TouchableOpacity style={styles.addFoodBtn} onPress={() => openSearch(meal)}>
                  <Text style={styles.addFoodBtnText}>+ 추가</Text>
                </TouchableOpacity>
              </View>
            </View>

            {entriesByMeal[meal].length === 0 ? (
              <TouchableOpacity style={styles.emptyMealBtn} onPress={() => openSearch(meal)}>
                <Text style={styles.emptyMealText}>탭해서 음식 추가</Text>
              </TouchableOpacity>
            ) : (
              entriesByMeal[meal].map(entry => {
                const food = customFoods.find(f => f.id === entry.foodId) ?? KOREAN_FOODS.find(f => f.id === entry.foodId);
                const gi = food?.gi;
                return (
                  <TouchableOpacity key={entry.id} style={styles.entryRow} onLongPress={() => handleDelete(entry)}>
                    <View style={styles.entryLeft}>
                      <View style={styles.entryNameRow}>
                        <Text style={styles.entryName}>{entry.foodName}</Text>
                        {gi && <Text style={styles.giDot}>{GI_CONFIG[gi].emoji}</Text>}
                        {food?.isCustom && <Text style={styles.customBadge}>MY</Text>}
                      </View>
                      <Text style={styles.entryMeta}>
                        {entry.servings}인분 · 탄 {entry.carbs}g · 단 {entry.protein}g · 지 {entry.fat}g
                      </Text>
                    </View>
                    <Text style={styles.entryCal}>{entry.calories} kcal</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ))}

        {/* 커스텀 음식 관리 */}
        {customFoods.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>내 음식 목록</Text>
            {customFoods.map(food => (
              <TouchableOpacity key={food.id} style={styles.customFoodRow} onLongPress={() => handleDeleteCustom(food)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{food.name}</Text>
                  <Text style={styles.entryMeta}>{food.serving} · {food.cal} kcal</Text>
                </View>
                <Text style={[styles.giDot, { fontSize: 16 }]}>{GI_CONFIG[food.gi].emoji}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.hintText}>길게 누르면 삭제</Text>
          </View>
        )}

        {/* 혈당 관리 팁 */}
        <View style={[styles.card, { borderColor: COLORS.orange + '44' }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.orange }]}>🩸 혈당 관리 팁</Text>
          {[
            `오늘 탄수화물 목표: ${macroGoal.carbs}g (${Math.round(macroGoal.carbs / 3)}g/끼)`,
            '채소 → 단백질 → 탄수화물 순으로 드세요',
            '🟢 GI 낮은 음식을 우선 선택하세요',
            '식후 10-15분 산책이 혈당을 낮춰줍니다',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipText}>• {tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* ── 음식 검색 모달 ── */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>{MEAL_LABELS[activeMeal]}에 추가</Text>
                <TouchableOpacity onPress={() => { setShowSearch(false); setShowCustomForm(false); }}>
                  <Text style={styles.closeX}>✕</Text>
                </TouchableOpacity>
              </View>

              {!selectedFood && !showCustomForm && (
                <>
                  {/* 검색창 */}
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="음식 검색 (예: 라면, 삼각김밥)"
                    placeholderTextColor={COLORS.textDisabled}
                    autoFocus
                    returnKeyType="search"
                  />

                  {/* 탭 */}
                  <View style={styles.tabRow}>
                    {(['recent', 'favorite', 'search', 'custom'] as SearchTab[]).map(tab => (
                      <TouchableOpacity
                        key={tab}
                        style={[styles.tab, searchTab === tab && styles.tabActive]}
                        onPress={() => { setSearchTab(tab); setSearchQuery(''); setSearchResults([]); }}
                      >
                        <Text style={[styles.tabText, searchTab === tab && { color: COLORS.purple }]}>
                          {tab === 'recent' ? '최근' : tab === 'favorite' ? '즐겨찾기' : tab === 'search' ? '검색' : '직접입력'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 최근 음식 */}
                  {searchTab === 'recent' && (
                    <FlatList
                      data={recentFoods}
                      keyExtractor={item => item.foodId}
                      style={styles.resultList}
                      ListEmptyComponent={<Text style={styles.emptyTabText}>아직 기록이 없어요{'\n'}음식을 추가하면 여기 표시됩니다</Text>}
                      renderItem={({ item }) => {
                        const food = customFoods.find(f => f.id === item.foodId) ?? KOREAN_FOODS.find(f => f.id === item.foodId);
                        if (!food) return null;
                        return <FoodRow food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} showCount useCount={item.useCount} />;
                      }}
                    />
                  )}

                  {/* 즐겨찾기 */}
                  {searchTab === 'favorite' && (
                    <FlatList
                      data={favFoods}
                      keyExtractor={item => item.id}
                      style={styles.resultList}
                      ListEmptyComponent={<Text style={styles.emptyTabText}>즐겨찾기가 없어요{'\n'}검색 결과의 ⭐를 눌러 추가하세요</Text>}
                      renderItem={({ item }) => (
                        <FoodRow food={item} isFav onSelect={handleSelectFood} onFav={handleToggleFav} />
                      )}
                    />
                  )}

                  {/* 검색 결과 */}
                  {searchTab === 'search' && (
                    <FlatList
                      data={searchResults}
                      keyExtractor={item => item.id}
                      style={styles.resultList}
                      keyboardShouldPersistTaps="handled"
                      ListEmptyComponent={
                        searchQuery.length > 0
                          ? <Text style={styles.emptyTabText}>"{searchQuery}" 검색 결과 없음{'\n'}직접 입력 탭에서 추가해보세요</Text>
                          : <Text style={styles.emptyTabText}>위 검색창에 음식 이름을 입력하세요</Text>
                      }
                      renderItem={({ item }) => (
                        <FoodRow food={item} isFav={favIds.includes(item.id)} onSelect={handleSelectFood} onFav={handleToggleFav} />
                      )}
                    />
                  )}

                  {/* 직접 입력 탭 */}
                  {searchTab === 'custom' && (
                    <View style={styles.customTabContainer}>
                      <Text style={styles.customTabDesc}>DB에 없는 음식을 직접 등록하세요{'\n'}한번 등록하면 검색에서 바로 나와요</Text>
                      <TouchableOpacity style={styles.newCustomBtn} onPress={() => setShowCustomForm(true)}>
                        <Text style={styles.newCustomBtnText}>+ 새 음식 등록</Text>
                      </TouchableOpacity>
                      {customFoods.length > 0 && (
                        <>
                          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>등록된 내 음식</Text>
                          {customFoods.map(food => (
                            <FoodRow key={food.id} food={food} isFav={favIds.includes(food.id)} onSelect={handleSelectFood} onFav={handleToggleFav} />
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* 커스텀 음식 입력 폼 */}
              {showCustomForm && (
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalTitle}>음식 직접 등록</Text>
                  <CustomField label="음식 이름 *" value={customName} onChange={setCustomName} placeholder="예: 엄마표 된장찌개" />
                  <CustomField label="칼로리 (kcal) *" value={customCal} onChange={setCustomCal} placeholder="예: 250" numeric />
                  <CustomField label="1회 제공량" value={customServing} onChange={setCustomServing} placeholder="예: 1인분" />
                  <CustomField label="탄수화물 (g)" value={customCarbs} onChange={setCustomCarbs} placeholder="예: 30" numeric />
                  <CustomField label="단백질 (g)" value={customProtein} onChange={setCustomProtein} placeholder="예: 15" numeric />
                  <CustomField label="지방 (g)" value={customFat} onChange={setCustomFat} placeholder="예: 8" numeric />
                  <Text style={styles.formLabel}>혈당 영향 (GI)</Text>
                  <View style={styles.giRow}>
                    {(['low', 'medium', 'high'] as GlycemicIndex[]).map(gi => (
                      <TouchableOpacity
                        key={gi}
                        style={[styles.giBtn, customGi === gi && { borderColor: GI_CONFIG[gi].color, backgroundColor: GI_CONFIG[gi].color + '22' }]}
                        onPress={() => setCustomGi(gi)}
                      >
                        <Text style={[styles.giBtnText, customGi === gi && { color: GI_CONFIG[gi].color }]}>
                          {GI_CONFIG[gi].emoji} {GI_CONFIG[gi].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.formBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustomForm(false)}>
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCustom}>
                      <Text style={styles.confirmBtnText}>등록 & 추가</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {/* 인분 선택 */}
              {selectedFood && (
                <View style={styles.selectedContainer}>
                  <View style={styles.selectedInfo}>
                    <View style={styles.selectedNameRow}>
                      <Text style={styles.selectedName}>{selectedFood.name}</Text>
                      <Text style={styles.selectedGi}>
                        {GI_CONFIG[selectedFood.gi].emoji} {GI_CONFIG[selectedFood.gi].label}
                      </Text>
                    </View>
                    <Text style={styles.selectedServing}>{selectedFood.serving}</Text>
                    {selectedFood.gi === 'high' && (
                      <Text style={styles.giWarning}>⚠️ GI가 높아 혈당을 빠르게 올릴 수 있어요</Text>
                    )}
                  </View>

                  <Text style={styles.servingLabel}>인분 선택</Text>
                  <View style={styles.servingRow}>
                    {SERVING_OPTIONS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.servingBtn, servings === s && styles.servingBtnActive]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setServings(s); }}
                      >
                        <Text style={[styles.servingBtnText, servings === s && { color: COLORS.purple }]}>{s}인분</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.nutriPreview}>
                    <NutriItem label="칼로리" value={`${Math.round(selectedFood.cal * servings)}`} unit="kcal" color={COLORS.gold} />
                    <NutriItem label="탄수화물" value={`${Math.round(selectedFood.carbs * servings)}`} unit="g" color={COLORS.orange} />
                    <NutriItem label="단백질" value={`${Math.round(selectedFood.protein * servings)}`} unit="g" color={COLORS.teal} />
                    <NutriItem label="지방" value={`${Math.round(selectedFood.fat * servings)}`} unit="g" color={COLORS.textMuted} />
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => handleToggleFav(selectedFood.id)}
                    >
                      <Text style={styles.favBtnText}>{favIds.includes(selectedFood.id) ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddEntry}>
                      <Text style={styles.addBtnText}>추가하기</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedFood(null); setSearchQuery(''); }}>
                    <Text style={styles.backBtnText}>← 다시 선택</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── 공통 컴포넌트 ──

function FoodRow({ food, isFav, onSelect, onFav, showCount, useCount }: {
  food: FoodItem; isFav: boolean;
  onSelect: (f: FoodItem) => void;
  onFav: (id: string) => void;
  showCount?: boolean;
  useCount?: number;
}) {
  const gi = GI_CONFIG[food.gi];
  return (
    <TouchableOpacity style={styles.resultItem} onPress={() => onSelect(food)}>
      <View style={styles.resultLeft}>
        <View style={styles.resultNameRow}>
          <Text style={styles.resultName}>{food.name}</Text>
          {food.isCustom && <Text style={styles.customBadge}>MY</Text>}
          {showCount && useCount && useCount > 1 && (
            <Text style={styles.useCountBadge}>{useCount}회</Text>
          )}
        </View>
        <Text style={styles.resultMeta}>{food.serving} · {CATEGORY_LABELS[food.category] ?? food.category}</Text>
        <Text style={styles.resultMacro}>탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g</Text>
      </View>
      <View style={styles.resultRight}>
        <Text style={[styles.resultCal, { color: gi.color }]}>{food.cal}</Text>
        <Text style={styles.resultCalUnit}>kcal</Text>
        <Text style={{ fontSize: 16 }}>{gi.emoji}</Text>
        <TouchableOpacity onPress={() => onFav(food.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 16 }}>{isFav ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function NutriItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontWeight: '700', fontSize: FONTS.md }}>{value}</Text>
      <Text style={{ color: COLORS.textDisabled, fontSize: 10 }}>{unit}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>{label}</Text>
    </View>
  );
}

function CustomField({ label, value, onChange, placeholder, numeric }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text },
  copyBtn: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  copyBtnText: { color: COLORS.textMuted, fontSize: FONTS.sm, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  carbWarning: {
    backgroundColor: COLORS.orange + '22', borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.orange + '44',
  },
  carbWarningText: { color: COLORS.orange, fontSize: FONTS.sm, textAlign: 'center', fontWeight: '600' },
  mealSection: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  mealTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700' },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCalText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  addFoodBtn: {
    backgroundColor: COLORS.purple + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.purple,
  },
  addFoodBtnText: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '700' },
  emptyMealBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center',
  },
  emptyMealText: { color: COLORS.textDisabled, fontSize: FONTS.sm },
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  entryLeft: { flex: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  giDot: { fontSize: 12 },
  customBadge: {
    backgroundColor: COLORS.purple + '33', borderRadius: 4,
    paddingHorizontal: 4, color: COLORS.purple, fontSize: 9, fontWeight: '900',
  },
  entryMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  entryCal: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.sm },
  customFoodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  hintText: { color: COLORS.textDisabled, fontSize: 10, marginTop: 4 },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  tipRow: { marginBottom: 4 },
  tipText: { color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 20 },
  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md, maxHeight: '92%',
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.sm },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  modalTitle: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text },
  closeX: { color: COLORS.textMuted, fontSize: FONTS.xl, fontWeight: '300' },
  searchInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.md, padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  tab: {
    flex: 1, paddingVertical: 7, alignItems: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  resultList: { maxHeight: 320 },
  emptyTabText: { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center', paddingVertical: 24, lineHeight: 22 },
  resultItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  resultLeft: { flex: 1 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  useCountBadge: {
    backgroundColor: COLORS.teal + '33', borderRadius: 4,
    paddingHorizontal: 4, color: COLORS.teal, fontSize: 9, fontWeight: '700',
  },
  resultMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  resultMacro: { color: COLORS.textDisabled, fontSize: 10, marginTop: 1 },
  resultRight: { alignItems: 'flex-end', gap: 2 },
  resultCal: { fontSize: FONTS.lg, fontWeight: '900' },
  resultCalUnit: { color: COLORS.textMuted, fontSize: FONTS.xs },
  // 커스텀 탭
  customTabContainer: { paddingBottom: SPACING.md },
  customTabDesc: { color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 20, marginBottom: SPACING.sm },
  newCustomBtn: {
    backgroundColor: COLORS.purple, borderRadius: RADIUS.xl,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  newCustomBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
  // 커스텀 폼
  formLabel: { color: COLORS.textMuted, fontSize: FONTS.sm, marginBottom: 4 },
  formInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONTS.md, padding: SPACING.sm,
  },
  giRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  giBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center',
    backgroundColor: COLORS.bgInput,
  },
  giBtnText: { color: COLORS.textMuted, fontSize: FONTS.xs, fontWeight: '600' },
  formBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  // 선택된 음식
  selectedContainer: { gap: SPACING.sm },
  selectedInfo: { backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.md, padding: SPACING.sm },
  selectedNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedName: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '700', flex: 1 },
  selectedGi: { fontSize: FONTS.sm, fontWeight: '600' },
  selectedServing: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  giWarning: { color: COLORS.red, fontSize: FONTS.xs, marginTop: 4 },
  servingLabel: { color: COLORS.textMuted, fontSize: FONTS.sm },
  servingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  servingBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bgInput,
  },
  servingBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  servingBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  nutriPreview: {
    flexDirection: 'row', backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  favBtn: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xl,
    paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  favBtnText: { fontSize: 20 },
  addBtn: {
    flex: 1, backgroundColor: COLORS.purple, borderRadius: RADIUS.xl,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  cancelBtn: {
    flex: 1, borderRadius: RADIUS.xl, paddingVertical: 14,
    alignItems: 'center', backgroundColor: COLORS.bgHighlight,
  },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.md },
  confirmBtn: {
    flex: 2, borderRadius: RADIUS.xl, paddingVertical: 14,
    alignItems: 'center', backgroundColor: COLORS.purple,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
});
