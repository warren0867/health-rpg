import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

// 웹에서는 expo-haptics가 rejected Promise/예외를 던진다.
// 게임 루프 안에서 호출돼도 절대 죽지 않도록 전부 여기로 감싼다.
const enabled = Platform.OS !== 'web';

function safe(run: () => Promise<unknown>) {
  if (!enabled) return;
  try { run().catch(() => {}); } catch {}
}

export function hapticLight()   { safe(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light)); }
export function hapticMedium()  { safe(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)); }
export function hapticSuccess() { safe(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success)); }
export function hapticWarning() { safe(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning)); }
