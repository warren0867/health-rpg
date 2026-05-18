import { DailyLog, PermanentStats, UserProfile, STAT_FULLNAME, StatKey } from '../types';

export interface CoachContext {
  logs: DailyLog[];
  permStats: PermanentStats;
  profile: UserProfile;
}

// ─── 헬퍼 함수 ─────────────────────────────────────────────

function getRecentLogs(logs: DailyLog[], days: number): DailyLog[] {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, days);
}

function avgSleepHours(logs: DailyLog[]): number | null {
  const valid = logs.filter(l => l.sleep?.hours != null && l.sleep.hours > 0);
  if (valid.length === 0) return null;
  return valid.reduce((s, l) => s + l.sleep.hours, 0) / valid.length;
}

function exerciseDaysCount(logs: DailyLog[]): number {
  return logs.filter(l => {
    const types = l.exercise?.types?.filter(t => t !== 'none') ?? [];
    return types.length > 0 || (l.exercise?.type && l.exercise.type !== 'none');
  }).length;
}

function currentStreak(logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const logDate = new Date(sorted[i].date);
    const diffDays = Math.round((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === i || diffDays === i + 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function noAlcoholStreak(logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const l of sorted) {
    if (!l.alcohol?.consumed) streak++;
    else break;
  }
  return streak;
}

function avgScore(logs: DailyLog[]): number | null {
  if (logs.length === 0) return null;
  return logs.reduce((s, l) => s + l.conditionScore, 0) / logs.length;
}

function lowestStat(permStats: PermanentStats): { key: StatKey; value: number } {
  const keys: StatKey[] = ['str', 'end', 'vit', 'agi', 'wis'];
  let lowest = keys[0];
  for (const k of keys) {
    if (permStats[k] < permStats[lowest]) lowest = k;
  }
  return { key: lowest, value: permStats[lowest] };
}

function formatStatLabel(key: StatKey): string {
  return `${key.toUpperCase()}(${STAT_FULLNAME[key]})`;
}

// ─── 키워드별 응답 생성 ──────────────────────────────────────

function replyGreeting(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const avg = avgScore(recent7);
  const exDays = exerciseDaysCount(recent7);
  const streak = currentStreak(ctx.logs);
  const name = ctx.profile.name || '용사';

  let msg = `안녕하세요, ${name}님! 헬스RPG 코치입니다 ⚔️\n\n`;

  if (recent7.length === 0) {
    msg += '아직 기록이 없네요. 오늘부터 기록을 시작해보세요!';
  } else {
    msg += `최근 7일 현황:\n`;
    if (avg !== null) msg += `• 평균 컨디션 ${avg.toFixed(0)}점\n`;
    msg += `• 운동 ${exDays}일 / 7일\n`;
    if (streak > 0) msg += `• 연속 기록 ${streak}일 🔥\n`;
    msg += `\n${name}님의 캐릭터가 성장하고 있어요! 뭐가 궁금하신가요?`;
  }
  return msg;
}

function replySleep(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const avg = avgSleepHours(recent7);

  if (recent7.length === 0 || avg === null) {
    return '수면 기록이 아직 없네요. 오늘 수면 데이터를 입력해보세요!\n\n수면은 VIT(체력) 회복의 핵심이에요 💤';
  }

  let msg = `최근 7일 수면 분석 💤\n\n`;
  msg += `• 평균 수면: ${avg.toFixed(1)}시간\n`;

  const good = recent7.filter(l => l.sleep?.hours >= 7).length;
  msg += `• 7시간 이상 달성: ${good}일 / ${recent7.length}일\n\n`;

  if (avg >= 7.5) {
    msg += `수면이 훌륭해요! 이 수면 퀄리티가 VIT(체력)를 쑥쑥 키우고 있어요. 계속 유지하세요 💪`;
  } else if (avg >= 6.5) {
    msg += `수면이 조금 부족해요. 목표는 7~8시간! 30분만 더 일찍 자는 것부터 시작해보세요. VIT(체력) 성장이 기다리고 있어요.`;
  } else if (avg >= 5.5) {
    msg += `수면 평균 ${avg.toFixed(1)}시간은 많이 부족한 편이에요 😔 수면이 부족하면 회복력과 VIT(체력)가 깎여요. 오늘은 더 일찍 자봐요!`;
  } else {
    msg += `수면이 심각하게 부족해요! ${avg.toFixed(1)}시간은 너무 적어요. 건강 회복을 위해 수면을 최우선으로 챙겨주세요. VIT(체력)가 위험 수준이에요 🚨`;
  }

  return msg;
}

function replyExercise(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const recent30 = getRecentLogs(ctx.logs, 30);
  const exDays7 = exerciseDaysCount(recent7);
  const exDays30 = exerciseDaysCount(recent30);
  const streak = currentStreak(ctx.logs);
  const { str, end } = ctx.permStats;

  let msg = `최근 운동 분석 💪\n\n`;
  msg += `• 최근 7일: ${exDays7}일 운동\n`;
  if (recent30.length > 7) msg += `• 최근 30일: ${exDays30}일 운동\n`;
  msg += `• STR(근력) ${str.toFixed(1)} / END(지구력) ${end.toFixed(1)}\n\n`;

  if (exDays7 >= 5) {
    msg += `운동 루틴이 완벽해요! 최근 7일 중 ${exDays7}일 운동했네요. STR과 END가 계속 성장 중이에요 ⚔️`;
  } else if (exDays7 >= 3) {
    msg += `좋은 페이스예요! 이번 주 ${exDays7}일 운동했네요. 5일 이상이 목표라면 앞으로 ${5 - exDays7}일 더 도전해봐요.`;
  } else if (exDays7 >= 1) {
    msg += `운동을 시작했군요! ${exDays7}일 운동 완료. 규칙적으로 이어가면 STR과 END가 눈에 띄게 성장해요 🔥`;
  } else {
    msg += `이번 주는 운동이 없었네요. 오늘 10분 산책부터 시작해봐요. END(지구력)가 기다리고 있어요!`;
  }

  if (streak >= 7) {
    msg += `\n\n${streak}일 연속 기록 중! 이 의지력이 WIS(의지)를 키우고 있어요 👑`;
  }

  return msg;
}

function replyBloodSugar(ctx: CoachContext): string {
  const recent = ctx.logs.filter(l => l.morningBSValue != null && l.morningBSValue > 0);

  if (recent.length === 0) {
    return '공복혈당 기록이 아직 없네요. 혈당 탭에서 기록을 시작해보세요!\n\n혈당 관리는 VIT(체력)와 장기 건강의 핵심이에요.';
  }

  const sorted = [...recent].sort((a, b) => b.date.localeCompare(a.date));
  const recent7 = sorted.slice(0, 7);
  const values = recent7.map(l => l.morningBSValue as number);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const latest = values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);

  let msg = `최근 혈당 분석 🩸\n\n`;
  msg += `• 최근 공복혈당 평균: ${avg.toFixed(0)}mg/dL\n`;
  msg += `• 최근 기록: ${latest}mg/dL\n`;
  if (values.length > 1) msg += `• 범위: ${min}~${max}mg/dL (최근 ${values.length}회)\n\n`;

  if (avg < 100) {
    msg += `공복혈당이 정상 범위예요! 혈당 관리를 잘하고 있어요. VIT(체력)가 안정적으로 유지되고 있어요 ✅`;
  } else if (avg < 126) {
    msg += `공복혈당이 ${avg.toFixed(0)}mg/dL로 약간 높아요. 당류와 정제 탄수화물 섭취를 줄이고, 식후 가벼운 운동을 추천해요.`;
  } else {
    msg += `공복혈당이 ${avg.toFixed(0)}mg/dL로 높은 편이에요 🚨 전문의 상담을 권장해요. 당류 줄이기와 꾸준한 운동이 도움이 돼요.`;
  }

  return msg;
}

function replyStats(ctx: CoachContext): string {
  const { str, end, vit, agi, wis, totalGained } = ctx.permStats;
  const low = lowestStat(ctx.permStats);

  let msg = `캐릭터 영구 스탯 분석 ⚔️\n\n`;
  msg += `• STR(근력): ${str.toFixed(1)}\n`;
  msg += `• END(지구력): ${end.toFixed(1)}\n`;
  msg += `• VIT(체력): ${vit.toFixed(1)}\n`;
  msg += `• AGI(민첩): ${agi.toFixed(1)}\n`;
  msg += `• WIS(의지): ${wis.toFixed(1)}\n`;
  msg += `• 누적 성장: ${totalGained.toFixed(1)}p\n\n`;

  if (totalGained < 1) {
    msg += `아직 스탯 성장이 시작 단계예요. 운동, 수면, 꾸준한 기록으로 캐릭터를 키워봐요!`;
  } else {
    msg += `가장 낮은 스탯은 ${formatStatLabel(low.key)} (${low.value.toFixed(1)})이에요.\n`;
    if (low.key === 'str') {
      msg += '웨이트나 수영으로 근력 운동을 늘려보세요!';
    } else if (low.key === 'end') {
      msg += '달리기, 사이클, 걷기 등 유산소로 지구력을 키워봐요!';
    } else if (low.key === 'vit') {
      msg += '수면 7시간+ 와 규칙적인 운동이 VIT의 핵심이에요!';
    } else if (low.key === 'agi') {
      msg += '요가, 필라테스, 테니스로 민첩성을 키워봐요!';
    } else if (low.key === 'wis') {
      msg += '꾸준한 기록과 금주가 WIS(의지)를 성장시켜요!';
    }
  }

  return msg;
}

function replyAdvice(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const avgSlp = avgSleepHours(recent7);
  const exDays = exerciseDaysCount(recent7);
  const noAlcStreak = noAlcoholStreak(ctx.logs);
  const avg = avgScore(recent7);

  // 가장 부족한 부분 파악
  const issues: Array<{ label: string; advice: string; priority: number }> = [];

  if (avgSlp !== null && avgSlp < 6.5) {
    issues.push({
      label: `수면 부족 (평균 ${avgSlp.toFixed(1)}시간)`,
      advice: '수면을 7시간 이상으로 늘리는 것이 지금 가장 중요해요. 모든 스탯 회복의 기반이에요.',
      priority: 3,
    });
  }

  if (exDays < 2) {
    issues.push({
      label: `운동 부족 (7일 중 ${exDays}일)`,
      advice: '주 3회 이상 운동을 목표로 해봐요. 10분 산책도 카운트돼요!',
      priority: 2,
    });
  }

  if (noAlcStreak === 0) {
    issues.push({
      label: '최근 음주 기록 있음',
      advice: '금주 streak을 쌓으면 WIS(의지)가 성장하고 체력 회복이 빨라져요.',
      priority: 1,
    });
  }

  if (issues.length === 0) {
    const avg7 = avg !== null ? avg.toFixed(0) : '-';
    return `훌륭해요! 평균 ${avg7}점으로 균형 잡힌 건강 관리를 하고 있어요 🎯\n\n다음 목표: 더 높은 점수를 위해 수면 질을 높이거나 운동 강도를 높여봐요. 캐릭터가 계속 성장 중이에요!`;
  }

  // 우선순위 높은 것 먼저
  issues.sort((a, b) => b.priority - a.priority);
  const top = issues[0];

  let msg = `지금 가장 집중해야 할 것 🎯\n\n`;
  msg += `⚠️ ${top.label}\n\n`;
  msg += `${top.advice}\n\n`;

  if (issues.length > 1) {
    msg += `그 다음 개선 포인트:\n`;
    issues.slice(1).forEach(i => {
      msg += `• ${i.label}\n`;
    });
  }

  return msg;
}

function replyScore(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const recent14 = getRecentLogs(ctx.logs, 14);

  if (recent7.length === 0) {
    return '아직 점수 기록이 없어요. 오늘 체크인을 완료해보세요!';
  }

  const avg7 = avgScore(recent7);
  const avg14 = recent14.length > 7 ? avgScore(recent14.slice(7)) : null;

  let msg = `최근 컨디션 점수 추이 📊\n\n`;

  const scores = recent7.map(l => `${l.date.slice(5)}: ${l.conditionScore}점`);
  msg += scores.join('\n') + '\n\n';

  if (avg7 !== null) {
    msg += `• 최근 7일 평균: ${avg7.toFixed(0)}점\n`;
    if (avg14 !== null) {
      const diff = avg7 - avg14;
      const trend = diff > 2 ? '상승 중 📈' : diff < -2 ? '하락 중 📉' : '유지 중 →';
      msg += `• 추세: ${trend} (이전 7일 대비 ${diff > 0 ? '+' : ''}${diff.toFixed(0)}점)\n`;
    }
    msg += '\n';
    if (avg7 >= 80) {
      msg += '최고의 상태예요! 이 루틴을 유지하면 캐릭터가 계속 진화해요 ⚔️';
    } else if (avg7 >= 65) {
      msg += '좋은 컨디션이에요. 수면이나 운동 한 가지를 더 개선하면 80점대 진입 가능해요!';
    } else if (avg7 >= 50) {
      msg += '아직 성장 여지가 많아요. 수면부터 잡아봐요!';
    } else {
      msg += '컨디션이 낮네요. 무리하지 말고 수면과 휴식을 우선으로 챙겨봐요.';
    }
  }

  return msg;
}

function replyAlcohol(ctx: CoachContext): string {
  const recent14 = getRecentLogs(ctx.logs, 14);
  const drinkDays = recent14.filter(l => l.alcohol?.consumed).length;
  const noAlcStreak = noAlcoholStreak(ctx.logs);

  let msg = `음주 현황 분석 🍺\n\n`;
  msg += `• 최근 14일 중 음주: ${drinkDays}일\n`;
  msg += `• 현재 금주 연속: ${noAlcStreak}일\n\n`;

  if (drinkDays === 0) {
    msg += `완벽한 금주 중이에요! WIS(의지)가 쑥쑥 성장하고 있어요. 금주 연속 기록이 업적으로 이어질 수 있어요 🧘`;
  } else if (drinkDays <= 3) {
    msg += `음주 횟수가 적당한 편이에요. 주 2~3회 이하 유지를 목표로 해봐요. 금주일이 늘수록 WIS(의지)가 올라가요!`;
  } else if (drinkDays <= 7) {
    msg += `최근 2주 중 ${drinkDays}일 음주했네요. 조금 많은 편이에요. 음주는 수면 질을 낮추고 컨디션 회복을 방해해요. 3일 연속 금주부터 도전해봐요!`;
  } else {
    msg += `음주 빈도가 상당히 높아요 🚨 ${drinkDays}일/14일이면 거의 매일 음주하는 수준이에요. VIT(체력)와 WIS(의지) 성장이 막히고 있어요. 오늘부터 금주 챌린지를 시작해봐요!`;
  }

  return msg;
}

// ─── 메인 로컬 코치 함수 ────────────────────────────────────

export function getLocalCoachReply(userMessage: string, ctx: CoachContext): string | null {
  const msg = userMessage.toLowerCase().trim();

  // 인사·짧은 메시지 (야·오 제거 — 해야돼·앞으로 등 내부에서 오탐)
  if (/안녕|하이|ㅎㅇ|ㅎㅎ|반가|hi|hello|처음|시작/.test(msg) ||
      msg.length <= 3 ||
      /^(야|오|이봐|헤이)$/.test(msg)) {
    return replyGreeting(ctx);
  }

  // 수면
  if (/수면|잠|수면시간|sleep|자다|자고|못 잠|못잠|피곤/.test(msg)) {
    return replySleep(ctx);
  }

  // 운동
  if (/운동|헬스|달리기|걷기|exercise|뛰|런|gym|헬스장|근육|근력|유산소/.test(msg)) {
    return replyExercise(ctx);
  }

  // 혈당
  if (/혈당|blood.?sugar|공복|당뇨/.test(msg)) {
    return replyBloodSugar(ctx);
  }

  // 스탯
  if (/스탯|능력치|강해|stat|str|end|vit|agi|wis|캐릭터|성장|레벨/.test(msg)) {
    return replyStats(ctx);
  }

  // 점수·컨디션
  if (/점수|컨디션|score|condition|상태|몸 상태|몸상태/.test(msg)) {
    return replyScore(ctx);
  }

  // 음주
  if (/음주|술|알코올|drink|alcohol|막걸리|소주|맥주/.test(msg)) {
    return replyAlcohol(ctx);
  }

  // 코칭·평가·피드백 요청 → 종합 조언
  if (/코치|코칭|피드백|평가|어때|어때요|잘하|잘 하|조언|어떻게|뭐가|뭐해야|어떡|추천|알려줘|분석|봐줘|봐 줘|말해줘/.test(msg)) {
    return replyAdvice(ctx);
  }

  // "해줘", "해봐", "알려줘" 같은 단독 명령 → 종합 조언
  if (/^(해줘|해봐|해|알려줘|알려|봐줘|분석해|분석해줘|도와줘|도와|도움|부탁해|부탁)$/.test(msg.replace(/[!?~.,]/g, ''))) {
    return replyAdvice(ctx);
  }

  // 매칭 없어도 짧은 메시지(한 단어 수준)는 조언 반환
  if (msg.length <= 10) {
    return replyAdvice(ctx);
  }

  // 긴 메시지 → OR API 시도
  return null;
}

// ─── 일일 자동 리포트 ────────────────────────────────────────

export function getDailyLocalReport(ctx: CoachContext): string {
  const recent7 = getRecentLogs(ctx.logs, 7);
  const avgSlp = avgSleepHours(recent7);
  const exDays = exerciseDaysCount(recent7);
  const streak = currentStreak(ctx.logs);
  const avg = avgScore(recent7);
  const { str, end, vit, agi, wis } = ctx.permStats;
  const name = ctx.profile.name || '용사';

  let report = `📋 오늘의 코치 리포트\n\n`;
  report += `안녕하세요, ${name}님! 최근 7일 기록을 분석했어요.\n\n`;

  // 수면 분석
  report += `💤 수면\n`;
  if (avgSlp !== null) {
    report += `• 7일 평균: ${avgSlp.toFixed(1)}시간`;
    if (avgSlp >= 7) report += ' ✅ 좋아요!';
    else if (avgSlp >= 6) report += ' ⚠️ 조금 부족해요';
    else report += ' 🚨 많이 부족해요';
    report += '\n';
  } else {
    report += '• 기록 없음\n';
  }

  // 운동 분석
  report += `\n🏃 운동\n`;
  report += `• 7일 중 ${exDays}일 운동 완료\n`;

  // 연속 기록
  report += `\n🔥 기록 연속\n`;
  report += `• ${streak}일 연속 기록 중\n`;

  // 스탯 현황
  report += `\n⚔️ 캐릭터 스탯\n`;
  report += `• STR ${str.toFixed(1)} / END ${end.toFixed(1)} / VIT ${vit.toFixed(1)} / AGI ${agi.toFixed(1)} / WIS ${wis.toFixed(1)}\n`;

  // 평균 점수
  if (avg !== null) {
    report += `\n📊 평균 컨디션\n`;
    report += `• 최근 7일 평균: ${avg.toFixed(0)}점\n`;
  }

  // 가장 개선 필요한 항목
  report += '\n🎯 오늘의 개선 포인트\n';

  if (avgSlp !== null && avgSlp < 6.5) {
    report += `• 수면 우선! 평균 ${avgSlp.toFixed(1)}시간 → 목표 7시간+`;
  } else if (exDays < 3) {
    report += `• 운동 늘리기! 이번 주 ${exDays}일 → 목표 3일+`;
  } else if (avg !== null && avg < 65) {
    report += `• 컨디션 관리 필요. 수면과 음주를 점검해봐요`;
  } else {
    const low = lowestStat(ctx.permStats);
    report += `• ${formatStatLabel(low.key)} 성장에 집중! 현재 ${low.value.toFixed(1)}`;
  }

  report += '\n\n꾸준한 기록이 캐릭터를 진화시켜요. 오늘도 화이팅! 💪';

  return report;
}
