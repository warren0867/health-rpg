import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalorieGauge from '../components/CalorieGauge';
import { CATEGORY_LABELS, searchFoods } from '../data/koreanFoods';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { FoodEntry, FoodItem, UserProfile } from '../types';
import { calcGaugeData, calcMacroGoal } from '../utils/calorieCalculator';
import {
  deleteFoodEntry,
  generateId,
  getFoodEntriesByDate,
  getTodayKey,
  getUserProfile,
  saveFoodEntry,
  sumFoodEntries,
} from '../utils/storage';

type MealTime = FoodEntry['mealTime'];

const MEAL_LABELS: Record<MealTime, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

const MEAL_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SERVING_OPTIONS = [0.5, 1, 1.5, 2, 3];

export default function CalorieScreen() {
  const today = getTodayKey();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });

  // 검색 모달
  const [showSearch, setShowSearch] = useState(false);
  const [activeMeal, setActiveMeal] = useState<MealTime>('lunch');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);

  const load = useCallback(async () => {
    const [p, foodEntries] = await Promise.all([getUserProfile(), getFoodEntriesByDate(today)]);
    setProfile(p);
    setEntries(foodEntries);
    setSummary(sumFoodEntries(foodEntries));
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSearchResults(q.length >= 1 ? searchFoods(q) : []);
    setSelectedFood(null);
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
    setShowSearch(false);
    setSearchQuery('');
    setSelectedFood(null);
    load();
  };

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert('삭제', `${entry.foodName}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await deleteFoodEntry(entry.id); load(); } },
    ]);
  };

  const targetCal = profile?.targetCalories ?? 2000;
  const macroGoal = calcMacroGoal(targetCal);
  const gaugeData = calcGaugeData(summary.calories, targetCal);

  const entriesByMeal = MEAL_ORDER.reduce<Record<MealTime, FoodEntry[]>>((acc, m) => {
    acc[m] = entries.filter(e => e.mealTime === m);
    return acc;
  }, { breakfast: [], lunch: [], dinner: [], snack: [] });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>식단 & 칼로리</Text>

        {/* 원형 칼로리 게이지 */}
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
          {/* 당뇨 전단계 탄수화물 경고 */}
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
                <TouchableOpacity
                  style={styles.addFoodBtn}
                  onPress={() => {
                    setActiveMeal(meal);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedFood(null);
                    setServings(1);
                    setShowSearch(true);
                  }}
                >
                  <Text style={styles.addFoodBtnText}>+ 추가</Text>
                </TouchableOpacity>
              </View>
            </View>

            {entriesByMeal[meal].length === 0 ? (
              <Text style={styles.emptyMeal}>아직 기록이 없어요</Text>
            ) : (
              entriesByMeal[meal].map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryRow}
                  onLongPress={() => handleDelete(entry)}
                >
                  <View style={styles.entryLeft}>
                    <Text style={styles.entryName}>{entry.foodName}</Text>
                    <Text style={styles.entryMeta}>
                      {entry.servings}인분 · 탄 {entry.carbs}g · 단 {entry.protein}g · 지 {entry.fat}g
                    </Text>
                  </View>
                  <Text style={styles.entryCal}>{entry.calories} kcal</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}

        {/* 식단 팁 (당뇨 전단계) */}
        <View style={[styles.card, { borderColor: COLORS.orange + '44', marginTop: SPACING.sm }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.orange }]}>혈당 관리 식단 팁</Text>
          {[
            '채소 → 단백질 → 탄수화물 순으로 드세요',
            `오늘 탄수화물 목표: ${macroGoal.carbs}g (${Math.round(macroGoal.carbs / 3)}g/끼)`,
            '흰쌀밥 대신 잡곡밥·현미밥을 선택하세요',
            '식후 10-15분 산책이 혈당을 낮춰줍니다',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>

      {/* 음식 검색 모달 */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{MEAL_LABELS[activeMeal]}에 추가</Text>

            {/* 검색창 */}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="음식 이름 검색 (예: 흰쌀밥, 라면)"
              placeholderTextColor={COLORS.textDisabled}
              autoFocus
              returnKeyType="search"
            />

            {/* 검색 결과 */}
            {searchResults.length > 0 && !selectedFood && (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                style={styles.resultList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectFood(item)}>
                    <View style={styles.resultLeft}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMeta}>{item.serving} · {CATEGORY_LABELS[item.category]}</Text>
                      <Text style={styles.resultMacro}>
                        탄 {item.carbs}g · 단 {item.protein}g · 지 {item.fat}g
                      </Text>
                    </View>
                    <View style={styles.resultRight}>
                      <Text style={[styles.resultCal, {
                        color: item.gi === 'high' ? COLORS.red : item.gi === 'medium' ? COLORS.gold : COLORS.teal
                      }]}>{item.cal}</Text>
                      <Text style={styles.resultCalUnit}>kcal</Text>
                      <Text style={[styles.resultGI, {
                        color: item.gi === 'high' ? COLORS.red : item.gi === 'medium' ? COLORS.gold : COLORS.teal
                      }]}>
                        GI {item.gi === 'high' ? '높음' : item.gi === 'medium' ? '중간' : '낮음'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* 선택된 음식 + 인분 선택 */}
            {selectedFood && (
              <View style={styles.selectedContainer}>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedFood.name}</Text>
                  <Text style={styles.selectedServing}>{selectedFood.serving}</Text>
                </View>

                {/* 인분 선택 */}
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

                {/* 영양 미리보기 */}
                <View style={styles.nutriPreview}>
                  <NutriItem label="칼로리" value={`${Math.round(selectedFood.cal * servings)} kcal`} color={COLORS.gold} />
                  <NutriItem label="탄수화물" value={`${Math.round(selectedFood.carbs * servings)}g`} color={COLORS.orange} />
                  <NutriItem label="단백질" value={`${Math.round(selectedFood.protein * servings)}g`} color={COLORS.teal} />
                  <NutriItem label="지방" value={`${Math.round(selectedFood.fat * servings)}g`} color={COLORS.textMuted} />
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={handleAddEntry}>
                  <Text style={styles.addBtnText}>추가하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 닫기 */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSearch(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NutriItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontWeight: '700', fontSize: FONTS.sm }}>{value}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: FONTS.xs }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md },
  pageTitle: { fontSize: FONTS.xxl, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  carbWarning: {
    backgroundColor: COLORS.orange + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.orange + '44',
  },
  carbWarningText: { color: COLORS.orange, fontSize: FONTS.sm, textAlign: 'center', fontWeight: '600' },
  mealSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  mealTitle: { color: COLORS.text, fontSize: FONTS.md, fontWeight: '700' },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealCalText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  addFoodBtn: {
    backgroundColor: COLORS.purple + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  addFoodBtnText: { color: COLORS.purple, fontSize: FONTS.xs, fontWeight: '700' },
  emptyMeal: { color: COLORS.textDisabled, fontSize: FONTS.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  entryLeft: { flex: 1 },
  entryName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  entryMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  entryCal: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.sm },
  sectionTitle: { fontSize: FONTS.md, fontWeight: '700', marginBottom: SPACING.sm },
  tipRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tipBullet: { color: COLORS.orange, fontSize: FONTS.sm },
  tipText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sm, lineHeight: 20 },
  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: FONTS.lg, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONTS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  resultList: { maxHeight: 300 },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultLeft: { flex: 1 },
  resultName: { color: COLORS.text, fontSize: FONTS.sm, fontWeight: '600' },
  resultMeta: { color: COLORS.textMuted, fontSize: FONTS.xs, marginTop: 2 },
  resultMacro: { color: COLORS.textDisabled, fontSize: 10, marginTop: 1 },
  resultRight: { alignItems: 'flex-end' },
  resultCal: { fontSize: FONTS.lg, fontWeight: '900' },
  resultCalUnit: { color: COLORS.textMuted, fontSize: FONTS.xs },
  resultGI: { fontSize: FONTS.xs, fontWeight: '600' },
  selectedContainer: { gap: SPACING.sm },
  selectedInfo: {
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  selectedName: { color: COLORS.text, fontSize: FONTS.lg, fontWeight: '700' },
  selectedServing: { color: COLORS.textMuted, fontSize: FONTS.xs },
  servingLabel: { color: COLORS.textMuted, fontSize: FONTS.sm },
  servingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  servingBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bgInput,
  },
  servingBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22' },
  servingBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sm },
  nutriPreview: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  addBtn: {
    backgroundColor: COLORS.purple, borderRadius: RADIUS.xl, paddingVertical: 14, alignItems: 'center',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: FONTS.md },
  closeBtn: {
    backgroundColor: COLORS.bgHighlight, borderRadius: RADIUS.xl, paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  closeBtnText: { color: COLORS.textMuted, fontWeight: '600' },
});
