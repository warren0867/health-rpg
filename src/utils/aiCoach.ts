import Anthropic from '@anthropic-ai/sdk';
import { getEvoStage } from '../components/AvatarEvo';
import { DailyLog, InBodyRecord, PermanentStats, UserProfile } from '../types';
import { RecentCondition } from './permanentStats';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

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
      ctx += `- 전체 컨디션: ${conditionInfo.label} (${conditionInfo.score}점, ${trendKo})
`;
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

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 400,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${todayCtx}\n\n오늘 체크인 기반으로 개인 피드백 부탁해. 잘한 것 구체적으로 칭찬하고, 아쉬운 부분은 왜 그런지 설명해줘. 목표와 연결해서 200자 내외로 간결하게.`,
      },
    ],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? '오늘도 체크인 수고했어요! 꾸준한 기록이 변화를 만들어요 💪';
}

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

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? '죄송해요, 잠깐 문제가 있었어요. 다시 물어봐 주세요.';
}
