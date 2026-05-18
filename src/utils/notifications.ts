import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_NOTIF_SETTINGS = 'hrpg_notif_settings';

export interface NotifSettings {
  enabled: boolean;
  morningBS: boolean;       // 공복혈당 알림
  morningBSHour: number;
  breakfastLog: boolean;    // 아침 식단 알림
  breakfastLogHour: number;
  mealLog: boolean;         // 점심 식단 기록 알림
  dinnerLog: boolean;       // 저녁 식단 알림
  dinnerLogHour: number;
  eveningLog: boolean;      // 저녁 종합 기록 알림
  eveningLogHour: number;
}

const DEFAULT_SETTINGS: NotifSettings = {
  enabled: false,
  morningBS: true,
  morningBSHour: 7,
  breakfastLog: true,
  breakfastLogHour: 8,
  mealLog: true,
  dinnerLog: true,
  dinnerLogHour: 18,
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

// ─── 알림 메시지 풀 (랜덤 선택용) ──────────────────
const MESSAGES = {
  morningBS: [
    { title: '공복혈당 퀘스트', body: '아침 공복 혈당을 측정하고 오늘의 퀘스트를 시작하세요. 10 XP 보상!' },
    { title: '공복혈당 퀘스트', body: '혈당 측정으로 오늘 하루를 열어보세요! 데이터가 쌓일수록 캐릭터가 강해집니다.' },
  ],
  breakfastLog: [
    { title: '아침 식단 기록', body: '아침 식사를 기록하면 HP가 회복됩니다. 포션을 보충하세요!' },
    { title: '아침 식단 기록', body: '오늘의 첫 번째 식단 기록! 아침을 채워야 하루 HP가 유지됩니다.' },
  ],
  mealLog: [
    { title: '점심 포션 보충 시간', body: '점심 식사를 기록하고 칼로리 목표를 확인하세요. 식단 기록 20 XP!' },
    { title: '점심 포션 보충 시간', body: '점심을 빠짐없이 기록하면 일일 퀘스트 보너스를 받을 수 있어요!' },
  ],
  dinnerLog: [
    { title: '저녁 식단 기록', body: '저녁 식사를 기록하고 오늘 총 칼로리를 확인하세요.' },
    { title: '저녁 식단 기록', body: '오늘 마지막 포션! 저녁 식사를 기록하고 칼로리 목표를 마무리하세요.' },
  ],
  eveningLog: [
    { title: '오늘의 체크인 마감', body: '운동, 수면, 음주를 기록하고 오늘 점수를 받으세요! 최대 100 XP 획득 가능!' },
    { title: '오늘의 체크인 마감', body: '오늘 퀘스트 완료 전에 마감 시간이 얼마 남지 않았어요!' },
  ],
};

function pickMessage(pool: { title: string; body: string }[]) {
  return pool[Math.random() < 0.5 ? 1 : 0];
}

export async function scheduleAllNotifications(settings: NotifSettings): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const granted = await requestPermissions();
  if (!granted) return;

  // 공복혈당 알림
  if (settings.morningBS) {
    const msg = pickMessage(MESSAGES.morningBS);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { screen: 'Home' },
      },
      trigger: { hour: settings.morningBSHour, minute: 0, repeats: true } as any,
    });
  }

  // 아침 식단 알림
  if (settings.breakfastLog) {
    const msg = pickMessage(MESSAGES.breakfastLog);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { screen: 'Calorie' },
      },
      trigger: { hour: settings.breakfastLogHour, minute: 0, repeats: true } as any,
    });
  }

  // 점심 식단 알림
  if (settings.mealLog) {
    const msg = pickMessage(MESSAGES.mealLog);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { screen: 'Calorie' },
      },
      trigger: { hour: 12, minute: 30, repeats: true } as any,
    });
  }

  // 저녁 식단 알림
  if (settings.dinnerLog) {
    const msg = pickMessage(MESSAGES.dinnerLog);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: { screen: 'Calorie' },
      },
      trigger: { hour: settings.dinnerLogHour, minute: 0, repeats: true } as any,
    });
  }

  // 저녁 종합 기록 알림
  if (settings.eveningLog) {
    const msg = pickMessage(MESSAGES.eveningLog);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
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
