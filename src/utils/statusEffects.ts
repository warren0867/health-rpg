import { DailyLog } from '../types';

export interface StatusEffect {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isDebuff: boolean;
  desc: string;
}

function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hasExercise(log: DailyLog): boolean {
  const types = log.exercise?.types?.filter(t => t !== 'none') ?? [];
  return types.length > 0 || (!!log.exercise?.type && log.exercise.type !== 'none');
}

export function calcStatusEffects(recentLogs: DailyLog[]): StatusEffect[] {
  const effects: StatusEffect[] = [];
  const sorted = [...recentLogs].sort((a, b) => b.date.localeCompare(a.date));

  const yesterday = getOffsetDateStr(1);
  const yesterdayLog = sorted.find(l => l.date === yesterday);

  // 숙취: 어제 음주
  if (yesterdayLog?.alcohol?.consumed) {
    effects.push({
      id: 'hangover',
      name: '숙취',
      emoji: '🤢',
      color: '#FF5370',
      isDebuff: true,
      desc: 'AGI·VIT 저하',
    });
  }

  // 수면 부족: 어제 5시간 미만 수면
  if (yesterdayLog && (yesterdayLog.sleep?.hours ?? 8) < 5) {
    effects.push({
      id: 'fatigue',
      name: '수면부족',
      emoji: '😴',
      color: '#A78BFA',
      isDebuff: true,
      desc: 'END·STR 저하',
    });
  }

  // 연속 금주 버프: 최근 3일 연속 금주
  const last3 = sorted.slice(0, 3);
  if (last3.length >= 3 && last3.every(l => l.alcohol && !l.alcohol.consumed)) {
    effects.push({
      id: 'sober',
      name: '청명한 정신',
      emoji: '✨',
      color: '#06D6A0',
      isDebuff: false,
      desc: 'WIS +3',
    });
  }

  // 연속 운동 버프: 최근 3일 연속 운동
  if (last3.length >= 3 && last3.every(hasExercise)) {
    effects.push({
      id: 'on_fire',
      name: '연속 운동',
      emoji: '🔥',
      color: '#F5A623',
      isDebuff: false,
      desc: 'STR +3',
    });
  }

  return effects;
}
