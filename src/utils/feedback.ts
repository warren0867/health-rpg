import { DailyLog, ScoreBreakdown, ScoreFactor } from '../types';
import { ALCOHOL_LABELS, EXERCISE_LABELS, calcAlcoholCalories } from './scoreCalculator';
import { getSajuFortune } from './saju';
export type { SajuFortune } from './saju';

// ─────────────────────────────────────────────
//  점수 기반 한 줄 피드백
// ─────────────────────────────────────────────

const FEEDBACK_90 = [
  '완벽한 하루! 당신은 전설의 용사입니다.',
  '오늘 컨디션 최상! 이 기세 유지하세요.',
  '몸이 보내는 신호: "나 진짜 좋아!" 입니다.',
  '황금 루틴이 완성됐어요. 내일도 똑같이!',
];

const FEEDBACK_75 = [
  '오늘 꽤 잘 챙겼네요. 내일도 이렇게만 해주세요.',
  '착실한 용사의 하루. 몸이 웃고 있습니다.',
  '좋은 루틴이 쌓이고 있어요.',
  '이 정도면 상위 20%! 자신을 칭찬해줘요.',
];

const FEEDBACK_60 = [
  '평범한 하루, 하지만 내일은 더 잘할 수 있어요.',
  '균형이 살짝 흔들렸지만 괜찮아요.',
  '한 가지만 더 신경 써봐요. 분명 달라져요.',
  '유지도 실력이에요. 내일 한 단계 업!',
];

const FEEDBACK_45 = [
  '오늘 몸이 조금 힘들어했네요. 충분히 쉬세요.',
  '작은 습관 하나를 바꾸면 점수가 달라져요.',
  '수면이 부족하면 음식도 더 당기죠. 일찍 자봐요.',
  '오늘은 몸이 회복 중. 내일 더 강해집니다.',
];

const FEEDBACK_30 = [
  '컨디션이 좋지 않은 하루였어요. 수면이 열쇠입니다.',
  '몸이 쉬고 싶다고 하는 것 같아요.',
  '음주 다음날은 특히 수분 보충이 중요해요.',
  '지금 이 순간이 바닥입니다. 내일 반등 시작!',
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
//  오늘의 운세 (생년월일 + 날짜 기반)
// ─────────────────────────────────────────────

const FORTUNE_POOL = [
  { text: '오늘 식후 산책 10분이 최고의 보약입니다.', lucky: '운동화', color: '#4ECDC4' },
  { text: '물 8잔이 오늘의 행운을 가져옵니다.', lucky: '물병', color: '#4ECDC4' },
  { text: '잡곡밥 한 그릇이 당신을 강하게 합니다.', lucky: '밥그릇', color: '#FFB800' },
  { text: '일찍 자는 자에게 좋은 컨디션이 찾아옵니다.', lucky: '베개', color: '#7B2FBE' },
  { text: '오늘 술을 참으면 내일 몸이 노래합니다.', lucky: '녹차', color: '#2ECC71' },
  { text: '작은 운동도 큰 변화를 만듭니다. 일어나세요!', lucky: '자전거', color: '#FFB800' },
  { text: '채소 한 접시가 오늘의 행운을 부릅니다.', lucky: '브로콜리', color: '#2ECC71' },
  { text: '혈당 체크가 오늘의 첫 번째 무기입니다.', lucky: '혈당계', color: '#FF4757' },
  { text: '7시간 수면이 당신의 최강 아이템입니다.', lucky: '수면안대', color: '#7B2FBE' },
  { text: '식사 후 바로 앉지 마세요. 몸이 기뻐합니다.', lucky: '걷기', color: '#4ECDC4' },
  { text: '오늘 단 음식을 피하면 3일 뒤 몸이 달라집니다.', lucky: '견과류', color: '#FFB800' },
  { text: '스트레스도 건강에 영향줍니다. 잠깐 숨 고르세요.', lucky: '심호흡', color: '#7B2FBE' },
  { text: '아침 단백질이 하루 에너지를 결정합니다.', lucky: '달걀', color: '#FFB800' },
  { text: '계단 오르기가 오늘의 최고 운동입니다.', lucky: '계단', color: '#4ECDC4' },
  { text: '오늘 저녁은 일찍 먹는 것이 좋겠습니다.', lucky: '시계', color: '#2ECC71' },
  { text: '신선한 과일 한 조각이 비타민 운을 가져옵니다.', lucky: '블루베리', color: '#7B2FBE' },
  { text: '무릎 건강을 위해 스트레칭 5분을 추가해보세요.', lucky: '요가 매트', color: '#4ECDC4' },
  { text: '오늘 커피 1잔은 괜찮지만 3잔은 자제하세요.', lucky: '아메리카노', color: '#FFB800' },
  { text: '기분 좋은 운동이 최고의 약입니다. 즐기세요!', lucky: '이어폰', color: '#2ECC71' },
  { text: '소금 섭취를 줄이면 오늘 몸이 가벼워집니다.', lucky: '허브', color: '#4ECDC4' },
  { text: '햇빛 10분이 비타민D와 행운을 동시에 줍니다.', lucky: '선글라스', color: '#FFB800' },
  { text: '점심 후 눈을 10분 감으면 오후가 달라집니다.', lucky: '눈베개', color: '#7B2FBE' },
  { text: '오늘 걸음 수 7,000보가 건강 목표입니다.', lucky: '만보기', color: '#4ECDC4' },
  { text: '따뜻한 물 한 잔으로 하루를 시작하세요.', lucky: '텀블러', color: '#2ECC71' },
  { text: '오늘 등이나 어깨 스트레칭이 특히 좋겠습니다.', lucky: '폼롤러', color: '#4ECDC4' },
  { text: '간식은 견과류 한 줌이 최선입니다.', lucky: '아몬드', color: '#FFB800' },
  { text: '오늘 운동 후 단백질 보충이 회복을 빠르게 합니다.', lucky: '닭가슴살', color: '#2ECC71' },
  { text: '늦은 야식은 내일 아침을 무겁게 만듭니다.', lucky: '사과', color: '#FF4757' },
  { text: '오늘 마음의 여유가 몸의 긴장을 풀어줍니다.', lucky: '음악', color: '#7B2FBE' },
  { text: '반찬 한 가지를 채소로 바꾸면 점수가 오릅니다.', lucky: '시금치', color: '#2ECC71' },
  { text: '오늘은 엘리베이터 대신 계단을 선택해봐요.', lucky: '운동화', color: '#4ECDC4' },
  { text: '충분한 수면이 내일의 식욕을 조절합니다.', lucky: '라벤더', color: '#7B2FBE' },
  { text: '오늘 점심 국물보다 건더기를 더 먹어보세요.', lucky: '젓가락', color: '#FFB800' },
  { text: '저녁 7시 이후 탄수화물은 줄이는 게 좋겠어요.', lucky: '두부', color: '#2ECC71' },
  { text: '오늘 몸이 보내는 신호에 귀 기울여 보세요.', lucky: '청진기', color: '#7B2FBE' },
  { text: '5분 명상이 오늘 스트레스를 절반으로 줄입니다.', lucky: '향초', color: '#7B2FBE' },
  { text: '오늘 친구와 걷는 운동이 2배의 효과입니다.', lucky: '러닝화', color: '#4ECDC4' },
  { text: '건강한 아침 식사가 오늘 하루를 결정합니다.', lucky: '오트밀', color: '#FFB800' },
  { text: '오늘 과식보다 천천히 꼭꼭 씹어 드세요.', lucky: '나무 젓가락', color: '#2ECC71' },
  { text: '수분 섭취가 피로 회복의 비결입니다.', lucky: '스포츠음료', color: '#4ECDC4' },
  { text: '오늘 조금 일찍 자면 내일 아침이 달라집니다.', lucky: '베개', color: '#7B2FBE' },
  { text: '오늘 몸이 원하는 운동을 선택해보세요.', lucky: '헬스장', color: '#FFB800' },
  { text: '소화가 잘 되는 가벼운 저녁이 오늘의 정답입니다.', lucky: '된장국', color: '#2ECC71' },
  { text: '오늘 한 끼는 채소 위주로 먹어보세요.', lucky: '샐러드', color: '#4ECDC4' },
  { text: '규칙적인 식사 시간이 건강의 기초입니다.', lucky: '시계', color: '#FFB800' },
  { text: '오늘 발 뒤꿈치 들기 30회가 종아리 건강 지킴이.', lucky: '슬리퍼', color: '#4ECDC4' },
  { text: '당신의 꾸준함이 가장 강력한 무기입니다.', lucky: '다이어리', color: '#7B2FBE' },
  { text: '오늘 하루도 기록하는 것 자체가 대단합니다.', lucky: '펜', color: '#2ECC71' },
  { text: '한 가지 좋은 습관이 열 가지 나쁜 습관을 이깁니다.', lucky: '캘린더', color: '#FFB800' },
  { text: '오늘의 작은 선택이 미래의 건강을 만듭니다.', lucky: '저울', color: '#4ECDC4' },
];

// 사주 기반 오늘의 운세 (생년월일 → 천간지지 → 오행 관계 → 운세)
export function getTodayFortune(date: string, birthDate?: string) {
  return getSajuFortune(date, birthDate);
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
    const types = log.exercise.types?.filter(t => t !== 'none') ?? [];
    const legacyType = log.exercise.type;
    const activeTypes = types.length > 0 ? types : (legacyType && legacyType !== 'none' ? [legacyType] : []);
    const typeLabel = activeTypes.map(t => EXERCISE_LABELS[t] ?? t).join('+');
    factors.push({ label: `${typeLabel || '운동'} ${log.exercise.minutes}분`, value: breakdown.exerciseBonus, emoji: '💪' });
  }

  if (breakdown.mealBonus !== 0) {
    factors.push({ label: breakdown.mealBonus > 0 ? '건강한 식단' : '불량 식단', value: breakdown.mealBonus, emoji: breakdown.mealBonus > 0 ? '🥗' : '🍟' });
  }

  if (breakdown.alcoholPenalty < 0) {
    const items = log.alcohol.items ?? [];
    const drinkSummary = items.length > 0
      ? items.slice(0, 2).map(i => ALCOHOL_LABELS[i.type] ?? i.type).join('+')
      : `${log.alcohol.liters ?? 0}L`;
    factors.push({ label: `음주 (${drinkSummary})`, value: breakdown.alcoholPenalty, emoji: '🍺' });
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
