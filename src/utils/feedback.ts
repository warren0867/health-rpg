import { DailyLog, ScoreBreakdown, ScoreFactor } from '../types';

// ─────────────────────────────────────────────
//  점수 기반 한 줄 피드백
// ─────────────────────────────────────────────

const FEEDBACK_90 = [
  '완벽한 하루! 당신은 전설의 용사입니다.',
  '오늘 컨디션 최상! 이 기세 유지하세요.',
  '몸이 보내는 신호: "나 진짜 좋아!" 입니다.',
];

const FEEDBACK_75 = [
  '오늘 꽤 잘 챙겼네요. 내일도 이렇게만 해주세요.',
  '착실한 용사의 하루. 혈당도 웃고 있습니다.',
  '좋은 루틴이 쌓이고 있어요.',
];

const FEEDBACK_60 = [
  '평범한 하루, 하지만 내일은 더 잘할 수 있어요.',
  '균형이 살짝 흔들렸지만 괜찮아요.',
  '한 가지만 더 신경 써봐요.',
];

const FEEDBACK_45 = [
  '오늘 몸이 조금 힘들어했네요. 충분히 쉬세요.',
  '혈당 관리, 내일 한 번 더 신경 써볼까요?',
  '작은 습관 하나를 바꾸면 점수가 달라져요.',
];

const FEEDBACK_30 = [
  '컨디션이 좋지 않은 하루였어요. 수면이 열쇠입니다.',
  '몸이 쉬고 싶다고 하는 것 같아요.',
  '술은 혈당을 흔들어요. 내일은 물 한 잔으로 시작!',
];

const FEEDBACK_LOW = [
  '오늘은 정말 힘든 날이었군요. 푹 쉬세요.',
  '쓰러진 병사도 다시 일어납니다. 내일 화이팅!',
  '걱정 마세요. 하루가 지나면 새로운 기회가 옵니다.',
];

export function getConditionFeedback(score: number): string {
  let pool: string[];
  if (score >= 90) pool = FEEDBACK_90;
  else if (score >= 75) pool = FEEDBACK_75;
  else if (score >= 60) pool = FEEDBACK_60;
  else if (score >= 45) pool = FEEDBACK_45;
  else if (score >= 30) pool = FEEDBACK_30;
  else pool = FEEDBACK_LOW;

  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ─────────────────────────────────────────────
//  오늘의 운세 (날짜 기반 시드)
// ─────────────────────────────────────────────

const FORTUNES = [
  { text: '오늘 식후 산책 10분이 혈당을 지킵니다.', lucky: '운동화' },
  { text: '물 8잔이 오늘의 행운을 가져옵니다.', lucky: '물병' },
  { text: '잡곡밥 한 그릇이 당신을 강하게 합니다.', lucky: '밥그릇' },
  { text: '일찍 자는 자에게 좋은 혈당이 찾아옵니다.', lucky: '베개' },
  { text: '오늘 술 한 방울을 참으면 내일 몸이 노래합니다.', lucky: '녹차' },
  { text: '작은 운동도 큰 변화를 만듭니다. 일어나세요!', lucky: '자전거' },
  { text: '채소 한 접시가 오늘의 행운을 부릅니다.', lucky: '브로콜리' },
  { text: '혈당 체크가 오늘의 첫 번째 무기입니다.', lucky: '혈당계' },
  { text: '7시간 수면이 당신의 최강 아이템입니다.', lucky: '수면안대' },
  { text: '식사 후 바로 앉지 마세요. 몸이 기뻐합니다.', lucky: '걷기' },
  { text: '오늘 단 음식을 피하면 3일 뒤 몸이 달라집니다.', lucky: '견과류' },
  { text: '스트레스도 혈당을 올립니다. 잠깐 숨 고르세요.', lucky: '심호흡' },
];

export function getTodayFortune(date: string): typeof FORTUNES[0] {
  const seed = date.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FORTUNES[seed % FORTUNES.length];
}

// ─────────────────────────────────────────────
//  가점 / 감점 요인 리스트
// ─────────────────────────────────────────────

export function getScoreFactors(breakdown: ScoreBreakdown, log: DailyLog): ScoreFactor[] {
  const factors: ScoreFactor[] = [];

  if (breakdown.sleepBonus > 0) {
    factors.push({ label: `수면 ${log.sleep.hours}시간`, value: breakdown.sleepBonus, emoji: '😴' });
  } else if (breakdown.sleepBonus < 0) {
    factors.push({ label: `수면 부족 (${log.sleep.hours}시간)`, value: breakdown.sleepBonus, emoji: '😵' });
  }

  if (breakdown.exerciseBonus > 0) {
    const typeLabel = log.exercise.type === 'cycling' ? '자전거' : log.exercise.type === 'gym' ? '헬스' : '운동';
    factors.push({ label: `${typeLabel} ${log.exercise.minutes}분`, value: breakdown.exerciseBonus, emoji: '💪' });
  }

  if (breakdown.mealBonus !== 0) {
    if (breakdown.mealBonus > 0) {
      factors.push({ label: '건강한 식단', value: breakdown.mealBonus, emoji: '🥗' });
    } else {
      factors.push({ label: '불량 식단', value: breakdown.mealBonus, emoji: '🍟' });
    }
  }

  if (breakdown.alcoholPenalty < 0) {
    factors.push({ label: `음주 ${log.alcohol.liters}L`, value: breakdown.alcoholPenalty, emoji: '🍺' });
  } else {
    factors.push({ label: '금주', value: 0, emoji: '✅' });
  }

  if (breakdown.bloodSugarBonus > 0) {
    factors.push({ label: '혈당 양호', value: breakdown.bloodSugarBonus, emoji: '📊' });
  } else if (breakdown.bloodSugarBonus < 0) {
    factors.push({ label: '혈당 주의', value: breakdown.bloodSugarBonus, emoji: '⚠️' });
  }

  if (breakdown.calorieBonus > 0) {
    factors.push({ label: '칼로리 목표 달성', value: breakdown.calorieBonus, emoji: '🎯' });
  } else if (breakdown.calorieBonus < 0) {
    factors.push({ label: '칼로리 불균형', value: breakdown.calorieBonus, emoji: '⚖️' });
  }

  return factors;
}

// ─────────────────────────────────────────────
//  혈당 전용 조언
// ─────────────────────────────────────────────

export function getBloodSugarAdvice(value: number, timing: string): string {
  if (timing === 'fasting') {
    if (value < 100) return '공복혈당 정상이에요! 오늘도 좋은 식단 유지해요.';
    if (value < 126) return '공복혈당이 살짝 높아요. 전날 저녁 탄수화물을 줄여보세요.';
    return '공복혈당이 높습니다. 의사와 상담을 권장해요.';
  }
  if (timing === 'after_meal_2h') {
    if (value < 140) return '식후 혈당 완벽! 식단이 혈당 조절에 도움됐어요.';
    if (value < 200) return '식후 혈당이 조금 높아요. 식사 후 10분 산책을 해보세요.';
    return '식후 혈당이 많이 높습니다. 탄수화물 섭취량 확인이 필요해요.';
  }
  return '혈당 기록이 쌓일수록 패턴이 보입니다. 계속 기록해요!';
}
