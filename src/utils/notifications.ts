import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_NOTIF_SETTINGS = 'hrpg_notif_settings';

export interface NotifSettings {
  enabled: boolean;
  morningBS: boolean;      // 공복혈당 알림
  morningBSHour: number;
  mealLog: boolean;        // 식단 기록 알림
  eveningLog: boolean;     // 저녁 기록 알림
  eveningLogHour: number;
}

const DEFAULT_SETTINGS: NotifSettings = {
  enabled: false,
  morningBS: true,
  morningBSHour: 7,
  mealLog: true,
  eveningLog: true,
  eveningLogHour: 21,
};

export async function getNotifSettings(): Promise<NotifSettings> {
  const raw = await AsyncStorage.getItem(KEY_NOTIF_SETTINGS);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveNotifSettings(settings: NotifSettings): Promise<void> {
  await AsyncStorage.setItem(KEY_NOTIF_SETTINGS, JSON.stringify(settings));
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleAllNotifications(settings: NotifSettings): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const granted = await requestPermissions();
  if (!granted) return;

  // 공복혈당 알림
  if (settings.morningBS) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚔️ 오늘의 첫 번째 퀘스트',
        body: '공복혈당을 기록해서 오늘의 전투를 시작하세요!',
        data: { screen: 'Home' },
      },
      trigger: {
        hour: settings.morningBSHour,
        minute: 0,
        repeats: true,
      } as any,
    });
  }

  // 점심 식단 알림
  if (settings.mealLog) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍱 포션 보충 시간',
        body: '점심 식단을 기록해서 HP를 채우세요!',
        data: { screen: 'Calorie' },
      },
      trigger: { hour: 12, minute: 30, repeats: true } as any,
    });
  }

  // 저녁 기록 알림
  if (settings.eveningLog) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 오늘의 퀘스트 완료하기',
        body: '운동·음주·수면을 기록하고 오늘 점수를 확인하세요!',
        data: { screen: 'Input' },
      },
      trigger: { hour: settings.eveningLogHour, minute: 0, repeats: true } as any,
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
