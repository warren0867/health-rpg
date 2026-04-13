/**
 * 사주 기반 오늘의 운세
 * - 생년월일로 나의 일간(日干) 계산
 * - 오늘 날짜로 오늘의 일간 계산
 * - 두 일간의 오행(五行) 관계로 운세 결정
 */

// ─── 천간 (Heavenly Stems) ─────────────────────────────────
const STEMS      = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_HJ   = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// ─── 지지 (Earthly Branches) ──────────────────────────────
const BRANCHES   = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BR_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const BR_EMOJI   = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'];

// ─── 오행 (Five Elements) ─────────────────────────────────
// 甲乙=木(0) 丙丁=火(1) 戊己=土(2) 庚辛=金(3) 壬癸=水(4)
const STEM_OHAENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const OH_NAME   = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
const OH_COLOR  = ['#2ECC71', '#FF5370', '#F5A623', '#9B6DFF', '#56B4F5'];
// 상극: i오행이 극하는 오행 인덱스 (木→土, 火→金, 土→水, 金→木, 水→火)
const KEUK      = [2, 3, 4, 0, 1];

// ─── 날짜 유틸 ─────────────────────────────────────────────
function daysSince2000(dateStr: string): number {
  const base   = new Date(2000, 0, 1).getTime();
  const target = new Date(dateStr).getTime();
  return Math.floor((target - base) / 86400000);
}

// ─── 일주 계산 ─────────────────────────────────────────────
// 기준: 2000-01-01 = 甲戌日 (천간0, 지지10, 60갑자 index 10)
function getDayPillar(dateStr: string) {
  const days   = daysSince2000(dateStr);
  const idx60  = ((days + 10) % 60 + 60) % 60;
  const stemIdx   = idx60 % 10;
  const branchIdx = idx60 % 12;
  return { stemIdx, branchIdx, stem: STEMS[stemIdx], stemHJ: STEMS_HJ[stemIdx], branch: BRANCHES[branchIdx] };
}

// ─── 년주 계산 ─────────────────────────────────────────────
// 기준: 1984년 = 甲子年 (천간0, 지지0)
function getYearPillar(year: number) {
  const diff      = year - 1984;
  const stemIdx   = ((diff % 10) + 10) % 10;
  const branchIdx = ((diff % 12) + 12) % 12;
  return { stemIdx, branchIdx, animal: BR_ANIMALS[branchIdx], emoji: BR_EMOJI[branchIdx] };
}

// ─── 오행 관계 ─────────────────────────────────────────────
// 0=비겁(같은 오행) 1=식상(내가 생함) 2=재성(내가 극함) 3=관성(나를 극함) 4=인성(나를 생함)
function getRelation(myOh: number, todayOh: number): number {
  if (myOh === todayOh)                return 0; // 비겁
  if ((myOh + 1) % 5 === todayOh)     return 1; // 식상 (내가 생함: 木→火)
  if ((todayOh + 1) % 5 === myOh)     return 4; // 인성 (나를 생함: 火→木이면 火가 나를 생)
  if (KEUK[myOh] === todayOh)         return 2; // 재성 (내가 극함)
  if (KEUK[todayOh] === myOh)         return 3; // 관성 (나를 극함)
  return 0;
}

// ─── 운세 텍스트 ───────────────────────────────────────────
// 각 관계별 5개 운세, 날짜 시드로 하나 선택
interface FortuneEntry { text: string; lucky: string; color: string; advice: string }

const FORTUNE_TABLE: Record<number, FortuneEntry[]> = {
  // 비겁 — 같은 기운, 자아가 강한 날, 주체적 행동 유리
  0: [
    { text: '오늘은 나 자신의 기운이 강하게 작용합니다. 타인보다 자신의 컨디션에 집중하세요. 혼자 하는 운동이 특히 효과적인 날입니다.', lucky: '흰색 계열 음식', color: OH_COLOR[2], advice: '오늘 목표를 스스로 정하고 달성해보세요' },
    { text: '자아가 뚜렷한 날입니다. 남의 말에 흔들리지 말고 자신만의 건강 루틴을 지켜나가세요. 의지력이 강한 날.', lucky: '단백질 식품', color: OH_COLOR[0], advice: '계획한 운동을 끝까지 완수하는 날' },
    { text: '경쟁심이 올라오는 날입니다. 어제의 나와 경쟁해보세요. 혈당, 수면, 운동 기록을 어제보다 0.1% 개선해보세요.', lucky: '견과류·씨앗', color: OH_COLOR[3], advice: '기록 경신에 도전하기 좋은 날' },
    { text: '주체적인 에너지가 넘칩니다. 새로운 건강 습관을 시작하기 좋은 날. 오늘 시작하면 지속할 가능성이 높습니다.', lucky: '녹색 채소', color: OH_COLOR[0], advice: '새 루틴 시작에 최적인 날' },
    { text: '자존감이 높은 날입니다. 자신에게 작은 보상을 해도 괜찮은 날. 단, 과식만 주의하세요.', lucky: '좋아하는 건강식', color: OH_COLOR[2], advice: '자신을 잘 돌보는 하루' },
  ],

  // 식상 — 내가 오늘 기운을 생함, 표현·활동·창의력 좋음
  1: [
    { text: '표현하고 움직이기 좋은 날입니다. 오늘 운동의 효율이 평소보다 높으니 계획한 훈련을 실행하세요. STR과 VIT 모두 상승하는 날.', lucky: '탄수화물 적정 섭취', color: OH_COLOR[1], advice: '운동 퍼포먼스가 좋은 날, 도전!' },
    { text: '창의적 에너지가 풍부한 날입니다. 새로운 식단 조합이나 운동 방식을 시도해보세요. 몸이 긍정적으로 반응할 것입니다.', lucky: '컬러풀한 채소·과일', color: OH_COLOR[0], advice: '새로운 건강 메뉴를 시도하는 날' },
    { text: '활동적인 에너지가 충만합니다. 가능하다면 야외 운동을 추천합니다. 햇빛과 바람이 오늘의 든든한 동료입니다.', lucky: '수분 충분히', color: OH_COLOR[4], advice: '야외 활동으로 에너지 발산하기' },
    { text: '표현력이 강한 날입니다. 건강 일기를 쓰거나 식단을 꼼꼼히 기록하면 통찰이 생깁니다. 오늘 기록한 데이터가 미래의 나를 도울 것입니다.', lucky: '오메가3 식품', color: OH_COLOR[4], advice: '꼼꼼한 기록이 빛을 발하는 날' },
    { text: '에너지 소비가 좋은 날입니다. 평소보다 10분 더 움직이세요. 식후 가벼운 산책이 혈당 조절에 탁월한 효과를 낼 것입니다.', lucky: '저GI 식품', color: OH_COLOR[2], advice: '식후 10분 걷기 실천하는 날' },
  ],

  // 재성 — 내가 오늘 기운을 극함, 성취·재물·통제력 발휘
  2: [
    { text: '통제력이 강한 날입니다. 식단과 혈당 관리가 가장 잘 되는 날 중 하나입니다. 목표 칼로리를 지키기 좋은 날.', lucky: '식이섬유 풍부 음식', color: OH_COLOR[0], advice: '절제와 계획대로 움직이기 좋은 날' },
    { text: '노력이 결실을 맺는 날입니다. 꾸준히 해온 건강 관리가 오늘 수치로 나타날 것입니다. 공복혈당을 꼭 체크해보세요.', lucky: '견과류', color: OH_COLOR[3], advice: '혈당 수치를 확인해볼 것' },
    { text: '주도권을 쥐는 날입니다. 외식 상황에서도 메뉴를 스스로 선택하고 조절하는 능력이 높습니다. 건강 메뉴 선택에 자신감을 가지세요.', lucky: '단백질 중심 식사', color: OH_COLOR[1], advice: '외식도 건강하게 컨트롤하는 날' },
    { text: '성과를 내기 좋은 날입니다. 작은 건강 목표를 하나 정해서 오늘 달성해보세요. 달성감이 다음 행동을 만듭니다.', lucky: '물 2리터', color: OH_COLOR[4], advice: '작은 목표 하나 완성하기' },
    { text: '집중력이 뛰어난 날입니다. 지금까지 미루던 건강 관련 결정을 내리기 좋습니다. 오늘 실행에 옮기면 지속됩니다.', lucky: '브로콜리·시금치', color: OH_COLOR[0], advice: '미뤄둔 건강 결정을 오늘 실행' },
  ],

  // 관성 — 오늘 기운이 나를 극함, 제약·도전·긴장의 날
  3: [
    { text: '다소 긴장감이 있는 날입니다. 무리한 계획보다는 기본에 충실하세요. 수면, 물 섭취, 공복혈당 이 세 가지만 지켜도 충분합니다.', lucky: '따뜻한 차', color: OH_COLOR[2], advice: '무리하지 말고 기본 3가지만 지킬 것' },
    { text: '스트레스 호르몬이 올라오기 쉬운 날입니다. 스트레스는 혈당을 올립니다. 심호흡 5분이 약보다 나은 날입니다.', lucky: '마그네슘 식품(바나나·아몬드)', color: OH_COLOR[4], advice: '심호흡·명상으로 마음 안정시키기' },
    { text: '압박감이 느껴지는 날일 수 있습니다. 운동 강도를 평소보다 낮추고 스트레칭과 회복에 집중하세요. 쉬어가는 것도 훈련입니다.', lucky: '가벼운 산책', color: OH_COLOR[0], advice: '회복의 날, 스트레칭 위주로' },
    { text: '규율이 강조되는 날입니다. 먹고 싶은 충동을 한 번 참아보세요. 오늘의 절제가 일주일치 노력을 지켜줄 수 있습니다.', lucky: '물·무가당 음료', color: OH_COLOR[4], advice: '충동적 식욕 조심, 절제의 날' },
    { text: '몸이 조금 무거울 수 있는 날입니다. 과도한 자기 비판은 금물. 오늘 조금 부족해도 내일이 있습니다. 수면에 특히 신경 쓰세요.', lucky: '숙면·7시간', color: OH_COLOR[3], advice: '자신에게 너그러운 날, 수면 우선' },
  ],

  // 인성 — 오늘 기운이 나를 생함, 배움·도움·회복의 날
  4: [
    { text: '회복과 재충전의 기운이 강한 날입니다. 충분한 수면이 오늘의 핵심입니다. 잠 잘 때 성장호르몬이 분비되어 VIT 스탯이 올라갑니다.', lucky: '수면 8시간', color: OH_COLOR[4], advice: '오늘은 일찍 자는 것이 최고의 전략' },
    { text: '주변의 도움을 받기 좋은 날입니다. 건강 정보를 찾아보거나 전문가의 조언을 구하면 잘 흡수됩니다. 오늘 배운 것이 오래 갑니다.', lucky: '독서·정보 탐색', color: OH_COLOR[4], advice: '건강 관련 지식을 습득하는 날' },
    { text: '몸이 회복력이 높은 날입니다. 어제 무리했다면 오늘 잘 회복될 것입니다. 단백질 보충과 충분한 수분 섭취를 권장합니다.', lucky: '고단백 식품·물', color: OH_COLOR[0], advice: '회복에 최적화된 날, 단백질 챙기기' },
    { text: '내면의 에너지가 차오르는 날입니다. 명상이나 가벼운 요가를 해보세요. 마음이 편안할 때 혈당도 안정됩니다.', lucky: '허브티·따뜻한 음료', color: OH_COLOR[1], advice: '요가·명상으로 내면을 채우는 날' },
    { text: '배움과 성장의 기운이 강합니다. 건강 루틴을 점검하고 개선할 부분을 찾아보세요. 오늘의 성찰이 다음 달의 나를 바꿉니다.', lucky: '채소 위주 식사', color: OH_COLOR[0], advice: '루틴을 점검하고 개선점 찾는 날' },
  ],
};

// ─── 메인 함수 ─────────────────────────────────────────────

export interface SajuFortune {
  text: string;
  lucky: string;
  color: string;
  advice: string;
  myPillar: string;         // 예: "갑(甲) · 목(木)"
  todayPillar: string;      // 예: "병(丙) · 화(火)"
  relation: string;         // 예: "식상 — 활동의 날"
  zodiac: string;           // 예: "🐯 호랑이띠"
  ohaeng: string;           // 예: "목(木) 일간"
}

const RELATION_NAMES = ['비겁 — 자아의 날', '식상 — 활동의 날', '재성 — 성취의 날', '관성 — 인내의 날', '인성 — 회복의 날'];

export function getSajuFortune(today: string, birthDate?: string): SajuFortune {
  const todayPillar = getDayPillar(today);
  const todayOh = STEM_OHAENG[todayPillar.stemIdx];

  // 생년월일 있으면 사주 기반, 없으면 년도 기반
  let myOh: number;
  let myPillarStr: string;
  let zodiacStr: string;

  if (birthDate) {
    const myPillar = getDayPillar(birthDate);
    myOh = STEM_OHAENG[myPillar.stemIdx];
    myPillarStr = `${myPillar.stem}(${myPillar.stemHJ}) · ${OH_NAME[myOh]}`;

    const birthYear = parseInt(birthDate.slice(0, 4));
    const yr = getYearPillar(birthYear);
    zodiacStr = `${yr.emoji} ${yr.animal}띠`;
  } else {
    // 생년월일 없으면 today 기반으로 임의 오행 (랜덤처럼 보이도록 date seed 활용)
    const seed = today.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    myOh = seed % 5;
    myPillarStr = OH_NAME[myOh];
    zodiacStr = '';
  }

  const relation = getRelation(myOh, todayOh);

  // 날짜 시드로 운세 5개 중 하나 선택 (같은 날은 항상 동일)
  const dateSeed = today.replace(/-/g, '').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 1);
  const pool = FORTUNE_TABLE[relation];
  const entry = pool[((dateSeed % pool.length) + pool.length) % pool.length];

  const todayPillarStr = `${todayPillar.stem}(${todayPillar.stemHJ}) · ${OH_NAME[todayOh]}`;

  return {
    text: entry.text,
    lucky: entry.lucky,
    color: entry.color,
    advice: entry.advice,
    myPillar: myPillarStr,
    todayPillar: todayPillarStr,
    relation: RELATION_NAMES[relation],
    zodiac: zodiacStr,
    ohaeng: OH_NAME[myOh],
  };
}
