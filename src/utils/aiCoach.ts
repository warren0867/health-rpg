import { getEvoStage } from '../components/AvatarEvo';
import { DailyLog, InBodyRecord, PermanentStats, UserProfile } from '../types';
import { RecentCondition } from './permanentStats';
import { getLocalCoachReply } from './localCoach';

const OR_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-8b:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-14b:free',
  'deepseek/deepseek-r1:free',
];
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  const xorRaw = 'REPLACE_WITH_XOR';
  if (!xorRaw.startsWith('REPLACE_')) {
    try {
      return xorRaw.split(',').map(s => String.fromCharCode(Number(s) ^ 83)).join('');
    } catch { return ''; }
  }
  return (process.env as any).EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
}

async function callGemini(system: string, userMessage: string, maxTokens = 400): Promise<string | null> {
  return callGeminiMessages(system, [{ role: 'user', content: userMessage }], maxTokens);
}

async function callGeminiMessages(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 600,
): Promise<string | null> {
  const body = JSON.stringify({
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: maxTokens,
  });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'HTTP-Referer': 'https://warren0867.github.io/health-rpg/',
  };

  for (const model of OR_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(OR_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...JSON.parse(body), model }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      continue;
    }
  }
  return null;
}

// ─── 컨텍스트 빌더 ────────────────────────────────────────

const GOAL_LABEL: Record<string, string> = {
  lose: '체중 감량',
  maintain: '체중 유지',
  gain: '근육 증가',
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: '거의 활동 없음',
  light: '가벼운 활동',
  moderate: '적당한 활동',
  active: '활발한 활동',
  very_active: '매우 활발한 활동',
};

function buildUserContext(
  profile: UserProfile,
  permStats: PermanentStats,
  recentLogs: DailyLog[],
  inbodyRecords: InBodyRecord[],
  conditionInfo?: RecentCondition,
): string {
  const evo = getEvoStage(permStats.totalGained);
  const latestInBody = inbodyRecords.length > 0
    ? [...inbodyRecords].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const avgScore = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((s, l) => s + l.conditionScore, 0) / recentLogs.length)
    : null;

  const exerciseDays = recentLogs.filter(l => {
    const types = l.exercise?.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise?.type && l.exercise.type !== 'none');
  }).length;

  const noAlcoholDays = recentLogs.filter(l => !l.alcohol?.consumed).length;

  let ctx = `## 사용자 프로필
- 이름: ${profile.name || '용사'}
- 나이: ${profile.age}세 / 성별: ${profile.gender === 'male' ? '남성' : '여성'}
- 키: ${profile.heightCm}cm / 현재 체중: ${profile.weightKg}kg
- 목표: ${GOAL_LABEL[profile.goal] ?? profile.goal}
- 활동 수준: ${ACTIVITY_LABEL[profile.activityLevel] ?? profile.activityLevel}
- 하루 목표 칼로리: ${profile.targetCalories}kcal${profile.targetWeightKg ? `\n- 목표 체중: ${profile.targetWeightKg}kg` : ''}

## RPG 캐릭터
- EVO ${evo.stage} "${evo.label}" (누적 성장: ${permStats.totalGained.toFixed(1)}p)
- STR ${permStats.str.toFixed(1)} · END ${permStats.end.toFixed(1)} · VIT ${permStats.vit.toFixed(1)} · AGI ${permStats.agi.toFixed(1)} · WIS ${permStats.wis.toFixed(1)}

`;

  if (latestInBody) {
    ctx += `## 최근 인바디 (${latestInBody.date})
- 인바디 점수: ${latestInBody.score}점
- 체중: ${latestInBody.weight}kg / BMI: ${latestInBody.bmi}
- 골격근량: ${latestInBody.skeletalMuscleMass}kg
- 체지방률: ${latestInBody.bodyFatPercentage}% / 체지방량: ${latestInBody.bodyFatMass}kg${latestInBody.visceralFatLevel !== undefined ? `\n- 내장지방레벨: ${latestInBody.visceralFatLevel}` : ''}

`;
  }

  if (recentLogs.length > 0) {
    ctx += `## 최근 건강 기록 (최근 ${recentLogs.length}일)
- 평균 점수: ${avgScore ?? '-'}점
- 운동한 날: ${exerciseDays}일 / 금주한 날: ${noAlcoholDays}일
`;
    if (conditionInfo) {
      const trendKo = conditionInfo.trend === 'up' ? '상승 중' : conditionInfo.trend === 'down' ? '하강 중' : '유지 중';
      ctx += `- 전체 컨디션: ${conditionInfo.label} (${conditionInfo.score}점, ${trendKo})\n`;
    }
  }

  return ctx;
}

export function buildSystemPrompt(
  profile: UserProfile,
  permStats: PermanentStats,
  recentLogs: DailyLog[],
  inbodyRecords: InBodyRecord[],
  conditionInfo?: RecentCondition,
): string {
  return `당신은 HealthRPG 한국어 건강 코치입니다.
CRITICAL RULE: 반드시 한국어로만 대답하세요. 영어, 러시아어, 중국어 등 다른 언어는 절대 사용 금지.
이모지 사용 금지. 짧고 임팩트 있게 답변. 수치 기반 칭찬. 목표(${GOAL_LABEL[profile.goal] ?? profile.goal}) 연결.

${buildUserContext(profile, permStats, recentLogs, inbodyRecords, conditionInfo)}`;
}

// ─── 체크인 피드백 ────────────────────────────────────────

export async function getCheckInFeedback(params: {
  log: DailyLog;
  profile: UserProfile;
  recentLogs: DailyLog[];
  inbodyRecords: InBodyRecord[];
  permStats: PermanentStats;
  conditionInfo?: RecentCondition;
}): Promise<string> {
  const { log, profile, recentLogs, inbodyRecords, permStats, conditionInfo } = params;

  const systemPrompt = buildSystemPrompt(profile, permStats, recentLogs, inbodyRecords, conditionInfo);

  const exerciseTypes = log.exercise?.types?.filter(t => t !== 'none') ?? [];
  const hasExercise = exerciseTypes.length > 0 || (log.exercise?.type && log.exercise.type !== 'none');

  const todayCtx = [
    `오늘(${log.date}) 체크인 결과:`,
    `- 점수: ${log.conditionScore}점`,
    `- 수면: ${log.sleep?.hours ?? 0}시간`,
    `- 운동: ${hasExercise ? `${exerciseTypes.join(', ')} ${log.exercise?.minutes ?? 0}분` : '없음'}`,
    `- 음주: ${log.alcohol?.consumed ? '있음' : '없음'}`,
    log.bloodPressure ? `- 혈압: ${log.bloodPressure.systolic}/${log.bloodPressure.diastolic}` : null,
    log.morningBSValue ? `- 공복혈당: ${log.morningBSValue}` : null,
    log.mood ? `- 기분: ${log.mood}/5` : null,
    log.xpGained ? `- 획득 XP: +${log.xpGained}` : null,
  ].filter(Boolean).join('\n');

  const text = await callGemini(
    systemPrompt,
    `${todayCtx}\n\n오늘 체크인 기반으로 개인 피드백 부탁해. 잘한 것 구체적으로 칭찬하고, 아쉬운 부분은 왜 그런지 설명해줘. 목표와 연결해서 200자 내외로 간결하게.`,
    400,
  );

  return text || '오늘도 체크인 수고했어요! 꾸준한 기록이 변화를 만들어요 💪';
}

// ─── 식단 자연어 파싱 ────────────────────────────────────────

export interface ParsedMealItem {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servings: number;
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  gi: 'low' | 'medium' | 'high';
}

export async function parseMealInput(description: string): Promise<ParsedMealItem[]> {
  const hour = new Date().getHours();
  const timeHint =
    hour >= 5 && hour < 10 ? '아침' :
    hour >= 10 && hour < 15 ? '점심' :
    hour >= 15 && hour < 19 ? '저녁' : '간식';

  const systemPrompt = `식단 파서입니다. JSON 배열만 반환하세요. 다른 텍스트 절대 금지.

형식(배열 한 줄 또는 여러 줄):
[{"name":"음식명","calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"servings":숫자,"mealTime":"lunch","gi":"medium"}]

규칙:
- 부분 섭취는 servings로 표현 (밥 20% = servings:0.2, 반 = servings:0.5)
- 세트메뉴는 구성요소별로 분리
- 한국 음식 일반 칼로리·영양소 기준으로 추정
- mealTime: breakfast/lunch/dinner/snack (현재 ${timeHint} 시간대 참고)
- servings는 기본 1인분 기준 (1인분=1.0)
- gi: low(채소·콩류·단백질), medium(현미·과일·유제품), high(흰쌀·빵·면·설탕·과자)`;

  const text = await callGemini(systemPrompt, description, 600);

  const match = text?.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('파싱 실패');
  return JSON.parse(match[0]) as ParsedMealItem[];
}

// ─── 체크인 대화 ──────────────────────────────────────────────

export interface CheckInData {
  sleep: { hours: number } | null;
  exercise: { types: string[]; minutes: number; intensity: string } | null;
  alcohol: { consumed: boolean } | null;
  mood: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  morningBS: number | null;
}

export const EMPTY_CHECKIN: CheckInData = {
  sleep: null, exercise: null, alcohol: null,
  mood: null, bloodPressure: null, morningBS: null,
};

export interface CheckInTurn {
  reply: string;
  data: CheckInData;
  complete: boolean;
}

export async function conductCheckIn(
  conversation: ChatMessage[],
  currentData: CheckInData,
): Promise<CheckInTurn> {
  const systemPrompt = `건강 체크인 어시스턴트. 대화로 오늘의 건강 데이터를 수집한다.
반드시 JSON만 반환. 다른 텍스트 절대 없이.

지금까지 수집된 데이터: ${JSON.stringify(currentData)}

수집 목표:
- sleep: {hours:숫자} — 수면 시간 (필수)
- exercise: {types:["walk"|"run"|"cycling"|"gym"|"swim"|"hiking"|"yoga"|"pilates"|"tennis"|"soccer"],minutes:숫자,intensity:"low"|"medium"|"high"} 또는 null
- alcohol: {consumed:true/false} — 음주 여부 (필수)
- mood: 1~5 정수 또는 null (선택, 굳이 물어보지 않아도 됨)
- bloodPressure: {systolic:숫자,diastolic:숫자} 또는 null (선택)
- morningBS: 공복혈당 숫자 또는 null (선택)

규칙:
- 이미 수집된 항목은 절대 다시 묻지 않는다
- 모호하면 확인 질문 ("헬스는 따로 안 하셨나요?" "몇 시간 주무셨어요?")
- 한 번에 1~2가지만 질문, 짧고 친근하게
- sleep + alcohol 모두 수집되면 complete:true

반환 형식 (반드시 이 형식만):
{"reply":"...","data":{...},"complete":false}`;

  const text = await callGeminiMessages(systemPrompt, conversation, 300);
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('체크인 파싱 실패');
  return JSON.parse(match[0]) as CheckInTurn;
}

// ─── 주간 리포트 생성 ──────────────────────────────────────

export async function generateWeeklyReport(
  logs: DailyLog[],
  profile: UserProfile | null,
): Promise<string> {
  if (logs.length < 3) {
    return '이번 주 기록이 부족합니다. 매일 체크인하면 리포트가 생성됩니다.';
  }

  const avgScore = Math.round(logs.reduce((s, l) => s + l.conditionScore, 0) / logs.length);
  const exerciseDays = logs.filter(l => {
    const types = l.exercise?.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise?.type && l.exercise.type !== 'none');
  }).length;
  const avgSleep = Math.round(logs.reduce((s, l) => s + (l.sleep?.hours ?? 0), 0) / logs.length * 10) / 10;
  const alcoholDays = logs.filter(l => l.alcohol?.consumed).length;

  // 긍정적 평가 또는 개선 포인트
  let evaluation = '';
  if (avgScore >= 80) {
    evaluation = `컨디션 점수 ${avgScore}점으로 이번 주 매우 훌륭했습니다. 지금 루틴을 유지하세요.`;
  } else if (exerciseDays >= 4) {
    evaluation = `운동을 ${exerciseDays}일이나 하셨네요. 꾸준한 운동 습관이 건강의 기반입니다.`;
  } else if (alcoholDays >= 3) {
    evaluation = `음주 일수(${alcoholDays}일)가 많습니다. 주 2일 이하로 줄이면 컨디션이 크게 개선됩니다.`;
  } else if (avgSleep < 6.5) {
    evaluation = `평균 수면이 ${avgSleep}시간으로 부족합니다. 7시간 이상 수면이 회복력에 핵심입니다.`;
  } else if (exerciseDays <= 1) {
    evaluation = `운동일이 ${exerciseDays}일로 적습니다. 이번 주는 하루 30분 걷기를 목표로 해보세요.`;
  } else {
    evaluation = `평균 ${avgScore}점으로 꾸준히 관리하고 있습니다. 좋은 루틴을 이어가세요.`;
  }

  // 다음 주 목표
  let nextGoal = '';
  if (alcoholDays >= 3) {
    nextGoal = '다음 주는 음주를 주 1회 이하로 줄여보세요.';
  } else if (exerciseDays <= 2) {
    nextGoal = `다음 주는 운동 ${Math.min(exerciseDays + 2, 5)}일을 목표로 잡아보세요.`;
  } else if (avgSleep < 7) {
    nextGoal = '취침 시간을 30분 앞당겨 7시간 수면에 도전해보세요.';
  } else if (avgScore < 70) {
    nextGoal = '매일 체크인을 유지하고, 수면과 운동 중 한 가지를 개선해보세요.';
  } else {
    nextGoal = `현재 루틴을 유지하며 운동 강도를 조금 높여보세요.`;
  }

  return `[이번 주 요약] 평균 컨디션 ${avgScore}점, 운동 ${exerciseDays}일, 수면 ${avgSleep}h 평균.\n${evaluation}\n다음 주 목표: ${nextGoal}`;
}

// ─── 채팅 ─────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(params: {
  messages: ChatMessage[];
  profile: UserProfile;
  recentLogs: DailyLog[];
  inbodyRecords: InBodyRecord[];
  permStats: PermanentStats;
  conditionInfo?: RecentCondition;
}): Promise<string> {
  const { messages, profile, recentLogs, inbodyRecords, permStats, conditionInfo } = params;

  const lastUserMessage = messages[messages.length - 1]?.content ?? '';

  // 1. 먼저 로컬 코치 시도
  const localReply = getLocalCoachReply(lastUserMessage, {
    logs: recentLogs,
    permStats,
    profile,
  });
  if (localReply) return localReply;

  // 2. OR API 시도
  const systemPrompt = buildSystemPrompt(profile, permStats, recentLogs, inbodyRecords, conditionInfo);

  const text = await callGeminiMessages(
    systemPrompt,
    messages.map(m => ({ role: m.role, content: m.content })),
    600,
  );

  if (text) return text;

  // OR API 실패 시 로컬 종합 조언 반환
  return getLocalCoachReply('어때', { logs: recentLogs, permStats, profile })
    ?? `${profile.name || '용사'}님, 지금 서버가 바빠요. 궁금한 점을 더 구체적으로 입력해주세요!\n예: "수면 분석해줘" / "운동 어때?" / "이번 주 점수 알려줘"`;
}
