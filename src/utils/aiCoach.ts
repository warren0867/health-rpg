import { getEvoStage } from '../components/AvatarEvo';
import { DailyLog, InBodyRecord, PermanentStats, UserProfile } from '../types';
import { RecentCondition } from './permanentStats';

const OR_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-7b-instruct:free',
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

async function callGemini(system: string, userMessage: string, maxTokens = 400): Promise<string> {
  return callGeminiMessages(system, [{ role: 'user', content: userMessage }], maxTokens);
}

async function callGeminiMessages(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 600,
): Promise<string> {
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
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...JSON.parse(body), model }),
    });
    if (res.status === 429) continue;
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
  throw new Error('모든 모델이 일시적으로 혼잡해요. 잠시 후 다시 시도해주세요.');
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
  return `당신은 HealthRPG 앱의 전담 AI 건강 코치입니다.
사용자의 실제 건강 데이터를 기반으로 따뜻하고 구체적인 피드백을 줍니다.

[핵심 원칙]
1. 칭찬은 구체적으로 — "잘했어요"가 아닌 "수면 7.5시간 덕분에 회복이 완벽했어요"처럼 수치 기반
2. 비판 대신 설명 — "이건 나빠요"가 아닌 "음주 후 혈당이 올라가는 이유"를 알려주기
3. 목표 연결 — 오늘의 행동이 사용자 목표(${GOAL_LABEL[profile.goal] ?? profile.goal})에 어떤 영향인지 연결
4. RPG 언어 자연스럽게 — EVO 단계, 스탯 성장을 게임처럼 표현
5. 짧고 임팩트 있게 — 핵심만. 이모지 적절히 활용

[인바디 분석]
- 골격근량이 적으면 근육 증가에 도움되는 구체적 행동 제안
- 체지방률이 높으면 식이·운동 전략 제안
- 개선이 있으면 수치로 직접 칭찬

[응답] 반드시 한국어로만 응답

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
}

export async function parseMealInput(description: string): Promise<ParsedMealItem[]> {
  const hour = new Date().getHours();
  const timeHint =
    hour >= 5 && hour < 10 ? '아침' :
    hour >= 10 && hour < 15 ? '점심' :
    hour >= 15 && hour < 19 ? '저녁' : '간식';

  const systemPrompt = `식단 파서입니다. JSON 배열만 반환하세요. 다른 텍스트 절대 금지.

형식(배열 한 줄 또는 여러 줄):
[{"name":"음식명","calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"servings":숫자,"mealTime":"lunch"}]

규칙:
- 부분 섭취는 servings로 표현 (밥 20% = servings:0.2, 반 = servings:0.5)
- 세트메뉴는 구성요소별로 분리
- 한국 음식 일반 칼로리·영양소 기준으로 추정
- mealTime: breakfast/lunch/dinner/snack (현재 ${timeHint} 시간대 참고)
- servings는 기본 1인분 기준 (1인분=1.0)`;

  const text = await callGemini(systemPrompt, description, 600);

  const match = text.match(/\[[\s\S]*\]/);
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
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('체크인 파싱 실패');
  return JSON.parse(match[0]) as CheckInTurn;
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

  const systemPrompt = buildSystemPrompt(profile, permStats, recentLogs, inbodyRecords, conditionInfo);

  const text = await callGeminiMessages(
    systemPrompt,
    messages.map(m => ({ role: m.role, content: m.content })),
    600,
  );

  return text || '응답을 받지 못했어요. 다시 시도해주세요.';
}
