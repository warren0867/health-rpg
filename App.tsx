import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, FONTS } from './src/constants/theme';
import { RefreshProvider } from './src/context/RefreshContext';
import BloodSugarScreen from './src/screens/BloodSugarScreen';
import CalorieScreen from './src/screens/CalorieScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import IllnessScreen from './src/screens/IllnessScreen';
import InputScreen from './src/screens/InputScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ResultScreen from './src/screens/ResultScreen';
import { MainTabParamList, RootStackParamList } from './src/types';
import { getUserProfile } from './src/utils/storage';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.purple,
        tabBarInactiveTintColor: COLORS.textDisabled,
        tabBarLabelStyle: { fontSize: FONTS.xs, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Input: focused ? 'create' : 'create-outline',
            Calorie: focused ? 'restaurant' : 'restaurant-outline',
            BloodSugar: focused ? 'water' : 'water-outline',
            History: focused ? 'bar-chart' : 'bar-chart-outline',
            Illness: focused ? 'medkit' : 'medkit-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Input" component={InputScreen} options={{ title: '기록' }} />
      <Tab.Screen name="Calorie" component={CalorieScreen} options={{ title: '식단' }} />
      <Tab.Screen name="BloodSugar" component={BloodSugarScreen} options={{ title: '혈당' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: '기록' }} />
      <Tab.Screen name="Illness" component={IllnessScreen} options={{ title: '건강상태' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    getUserProfile().then(profile => {
      setInitialRoute(profile ? 'MainTabs' : 'Onboarding');
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <SafeAreaProvider>
      <RefreshProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </RefreshProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgCard,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
  },
});
