# Vital Quest 배포 가이드

이 zip의 파일들로 기존 HealthRPG 코드를 갈아엎고 GitHub Pages에 배포하는 절차입니다.

---

## 1단계: 파일 교체

기존 `HealthRPG/` 프로젝트에서:

```
HealthRPG/
├── App.tsx               ← 이 zip의 App.tsx 로 덮어쓰기
└── src/
    ├── components/       ← 이 zip의 components/ 로 통째 교체 (파일 4개 추가됨)
    ├── constants/
    │   └── theme.ts      ← 이 zip의 theme.ts 로 덮어쓰기
    └── screens/          ← 이 zip의 screens/ 로 통째 교체 (8개 모두)
```

**유지되는 파일** (건드리면 안 됨):
- `src/utils/*` — 데이터 저장/계산 로직, 그대로 사용
- `src/data/*` — 한국 음식 DB
- `src/context/*` — RefreshContext
- `src/types/*` — TypeScript 타입
- `package.json`, `app.json`, `tsconfig.json`

---

## 2단계: 의존성 확인

이번 변경은 **새 의존성을 추가하지 않습니다.** 기존 `package.json` 그대로 동작합니다.
- SVG는 사용 X (Ionicons만)
- 모든 기존 export 호환 (theme.ts에 레거시 변수까지 포함)

따라서 `npm install` 다시 안 해도 됨. 다만 처음 push 후 GitHub Actions 빌드한다면 자동으로 설치되니 신경 X.

---

## 3단계: 로컬 테스트

```bash
cd HealthRPG
npx expo start --web
```

브라우저에서 새 디자인 확인. 모바일 시뮬레이터(`--ios`/`--android`)도 가능.

---

## 4단계: 웹 빌드

```bash
npx expo export -p web
```

→ `dist/` 폴더가 생성됨 (정적 파일).

---

## 5단계: GitHub Pages 배포

### 옵션 A: gh-pages 브랜치 (가장 안전)

```bash
# 1. dist 폴더만 별도 브랜치로 push
cd dist
git init
git add .
git commit -m "deploy: vital quest design v1"
git branch -M gh-pages
git remote add origin https://github.com/warren0867/health-rpg.git
git push -f origin gh-pages

# 2. GitHub repo Settings → Pages → Source: gh-pages 브랜치 / root 폴더
```

### 옵션 B: docs 폴더 (main 브랜치에 함께)

```bash
# dist를 docs로 복사
cp -r dist docs

# main 브랜치에 push
git add docs
git commit -m "deploy: vital quest design v1"
git push origin main

# GitHub repo Settings → Pages → Source: main / docs 폴더
```

배포 후 1-2분 뒤 `https://warren0867.github.io/health-rpg/` 에 새 디자인이 반영됩니다.

---

## 6단계: SPA 라우팅 처리 (선택, 권장)

React Navigation은 history API를 쓰는데 GitHub Pages는 SPA 라우팅을 모릅니다. 새로고침이나 직접 URL 접근 시 404가 뜰 수 있어요. 해결:

```bash
# dist (또는 docs) 안에 404.html을 index.html과 동일하게 만들면 됨
cp dist/index.html dist/404.html
```

---

## 7단계: base path (필요 시)

`https://warren0867.github.io/health-rpg/` 에 배포한다면 base path가 `/health-rpg/` 인데, Expo가 자동으로 처리합니다. 만약 자산 경로가 깨지면 `app.json` 에 다음 추가:

```json
{
  "expo": {
    "experiments": {
      "baseUrl": "/health-rpg"
    }
  }
}
```

---

## 변경 요약 (이번 디자인)

### 디자인 시스템 (theme.ts)
- 베이스: 미드나잇 다크 (`#070912`)
- 헬스 액센트: 사이안 (`#22D3EE`) — 80% 사용
- RPG 액센트: 앰버 (`#F59E0B`) — 20% 사용 (보상 모먼트)
- 등급별 컬러: S/A/B/C/D/F 6단계
- 레거시 변수(purple, gold 등) 호환 유지 → 기존 화면도 자동 색상 적용

### 새로 작성된 화면 (3개)
1. **HomeScreen.tsx** (1,284줄 → 535줄)
   - 9개 카드 → 5개 카드로 정리
   - 새 컴포넌트 4개 분리 (CharacterCard / DailyRings / StatGrid / QuestList)
   - 이모지 모두 제거 → Ionicons
2. **OnboardingScreen.tsx** (406줄 → 533줄)
   - Vital Quest 인트로 페이지 추가 (6단계)
   - 신체정보 입력 시 BMI 즉시 표시
3. **ResultScreen.tsx** (357줄 → 474줄)
   - **RPG 풀발동 모먼트** — 거대한 등급 글자 + 글로우
   - DUNGEON CLEARED 카피
   - 스탯 게인 시각화 강화

### 새 컴포넌트 (4개)
- `CharacterCard.tsx` — 캐릭터 + XP 통합 카드
- `DailyRings.tsx` — 칼로리/수분/퀘스트 3링 (현재는 막대 형태, SVG 의존성 추가 시 진짜 링으로 변경 가능)
- `StatGrid.tsx` — HP/STR/VIT/MP 2x2 그리드
- `QuestList.tsx` — 오늘의 퀘스트 체크리스트

### 자동 적용 (5개 화면)
구조 변경 없이 새 theme로 색만 자동 통일:
- InputScreen
- CalorieScreen
- BloodSugarScreen
- HistoryScreen
- IllnessScreen

이 5개는 **다음 라운드에서 디자인 개편 예정**. 일단 색만 통일된 상태로 배포 → 실사용 → 어떤 화면이 가장 어색한지 피드백 받고 우선순위 정해서 작업.

---

## 알려진 한계 (의도적)

1. **DailyRings는 막대 형태**: 진짜 원형 링은 `react-native-svg` 필요. 의존성 추가 원하시면 별도 요청.
2. **5개 화면(Input/Calorie/등) 디자인은 그대로**: 색만 통일됨. 실제 사용해보고 어색한 곳 지목해주시면 그것부터 개편.
3. **이모지가 일부 화면에 잔존**: 위 5개 화면. 위와 같은 이유.
4. **레벨업 모달의 글로우 애니메이션**: 정적. 더 화려하게 가려면 별도 요청.

---

## 다음 단계 권장

1. 일단 위 절차로 배포 → 실제 모바일에서 사용
2. 1주일 사용 후 피드백 수집 ("이 화면 어색해 / 이 부분 좋아")
3. 가장 자주 보는 화면(Calorie, BloodSugar)부터 다음 라운드 개편

이게 PM 관점에서 가장 효율적인 흐름입니다. 한 번에 다 갈아엎으면 좋아진 건지 안 좋아진 건지 알 수가 없어요. 한 번에 한 영역씩 변경 → 데이터 측정 → 다음.
