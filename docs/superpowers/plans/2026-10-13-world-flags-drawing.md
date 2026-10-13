# 세계 국기 따라 그리기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대륙별 국기를 골라 크게(색/테두리만) 보여 주고, 그 아래 나라 이름·수도·지도·인사말·문화 3가지(사진+쉬운 한 단락)를 보여 주는 정적 웹앱을 약 77개 나라 분량으로 만든다.

**Architecture:** 빌드 단계 없는 정적 사이트(저장소 루트 = GitHub Pages 루트). 나라 정보는 `data/countries.js` 한 파일(ES 모듈)에 모으고, 국기·지도·사진은 `assets/`에 미리 받아 둔다. 국기·지도 SVG는 `fetch`로 읽어 인라인으로 넣어서 CSS로 "테두리만 보기"를 만든다. 지도와 국기 받기, 사진 받기는 개발용 Node 스크립트(`tools/`)가 한다.

**Tech Stack:** HTML, CSS, 바닐라 JS(ES modules). 개발용: Node 22, `node:test`, Playwright 1.56.1(설치된 Chromium 사용), `d3-geo@3.1.1`, `topojson-client@3.1.0`, `world-atlas@2.0.2`.

**Spec:** `docs/superpowers/specs/2026-10-13-world-flags-drawing-design.md`

## Global Constraints

- 애니메이션·전환 효과·소리 없음. `transition`, `animation`, `<audio>`, `scroll-behavior: smooth` 금지.
- 누르는 곳 최소 높이 56px, 본문 글씨 20px 이상, 나라 이름은 더 크게.
- 강조색 하나, 차분한 색, 넓은 여백(시안: https://claude.ai/artifact/TypSxM2RcT7xtD7iv7TL47 분위기).
- 크롬북 가로, 태블릿 가로·세로에서 가로 스크롤 없음.
- 국기는 원래 비율 그대로, 국기 전체가 한 화면(뷰포트)에 들어오게. 국기 화면은 늘 "색 보기"로 시작.
- 한국어만. 문화 글은 "~이에요/~해요" 말투, 3~4문장, 쉬운 낱말.
- 사진은 위키미디어 공용에서, 라이선스는 Public domain / CC0 / CC BY / CC BY-SA만. 사진 아래 작가·라이선스 표시. 가로 800px 사본을 저장소에.
- 넣지 않는 나라: 대만, 북한, 팔레스타인, 코소보. 지도에는 글자 없음, 독도는 대한민국 색, 분쟁 국경 표시 없음.
- 외부 사이트를 런타임에 부르지 않는다(웹 글꼴 Google Fonts만 예외, 실패해도 시스템 글꼴로 읽힘).
- 국기 출처: `hampusborgos/country-flags` commit `c09927e63705529bbf59ca6684cd9b23225dddad`의 `svg/{code}.svg` (위키미디어 공용 기반, 퍼블릭 도메인).
- 지도 출처: `world-atlas@2.0.2/countries-50m.json` (Natural Earth, 퍼블릭 도메인).

## 나라 목록 (고정, 77개, ISO 3166-1 alpha-2 소문자)

- **asia (20):** kr 대한민국, jp 일본, cn 중국, mn 몽골, vn 베트남, th 태국, ph 필리핀, id 인도네시아, my 말레이시아, sg 싱가포르, kh 캄보디아, in 인도, np 네팔, pk 파키스탄, sa 사우디아라비아, ae 아랍에미리트, qa 카타르, ir 이란, kz 카자흐스탄, uz 우즈베키스탄
- **europe (25):** gb 영국, fr 프랑스, de 독일, it 이탈리아, es 스페인, pt 포르투갈, nl 네덜란드, be 벨기에, ch 스위스, at 오스트리아, se 스웨덴, no 노르웨이, fi 핀란드, dk 덴마크, is 아이슬란드, pl 폴란드, cz 체코, hu 헝가리, ro 루마니아, gr 그리스, ie 아일랜드, ua 우크라이나, ru 러시아, tr 튀르키예, va 바티칸
- **africa (12):** eg 이집트, za 남아프리카 공화국, ng 나이지리아, ke 케냐, et 에티오피아, gh 가나, ma 모로코, tz 탄자니아, sn 세네갈, dz 알제리, cm 카메룬, mg 마다가스카르
- **namerica (8):** us 미국, ca 캐나다, mx 멕시코, cu 쿠바, jm 자메이카, pa 파나마, cr 코스타리카, gt 과테말라
- **samerica (8):** br 브라질, ar 아르헨티나, cl 칠레, pe 페루, co 콜롬비아, ve 베네수엘라, uy 우루과이, ec 에콰도르
- **oceania (4):** au 오스트레일리아, nz 뉴질랜드, fj 피지, pg 파푸아뉴기니

대륙 표시 순서와 이름·색: asia 아시아 `#e4a23c`, europe 유럽 `#4d7fc4`, africa 아프리카 `#4f9a5e`, namerica 북아메리카 `#c95b4f`, samerica 남아메리카 `#8a62b8`, oceania 오세아니아 `#3aa0a6`.

## 데이터 형태 (`data/countries.js`)

```js
export const CONTINENTS = [{ id: "asia", name: "아시아", color: "#e4a23c" }, /* … 6개, 위 순서 */];
export const COUNTRIES = [
  {
    code: "kr",            // ISO alpha-2, 파일 이름에 씀
    numeric: "410",        // ISO numeric, world-atlas 지도 id와 맞춤
    continent: "asia",
    name: "대한민국",
    capital: "서울",
    greeting: { text: "안녕하세요", reading: "안녕하세요" },
    culture: [             // 정확히 3개
      { title: "김치", text: "…3~4문장…",
        photo: { file: "kr-1.jpg", source: "https://commons.wikimedia.org/wiki/File:…",
                 author: "…", license: "CC BY-SA 4.0" } },
    ],
  },
];
```

## Review Focus

- 아주 작은 나라(sg, va, qa, jm 등)의 지도: 칠한 부분이 안 보여도 위치 동그라미가 보여야 한다 → Task 3 테스트.
- 크림반도: Natural Earth 데이터에서 러시아에 속해 있으면 ru를 칠할 때 크림까지 칠해진다. 한국 교과서 기준(우크라이나 영토)과 어긋난다 → Task 3에서 크림을 우크라이나로 그리는 테스트.
- 세로로 긴 화면/가로로 긴 화면에서 국기가 화면 밖으로 넘침(예: 네팔은 세로가 더 김) → Task 4 e2e 테스트(1366×768, 768×1024 둘 다).
- 테두리만 보기에서 `fill="none"`인 선 도형이 흰색으로 덮여 문양이 사라짐 → Task 4에서 fill이 없는 도형은 그대로 두는 테스트.
- 사진 파일이나 출처 누락 → Task 1 데이터 테스트가 모든 나라·모든 문화에 대해 검사.

---

### Task 1: 프로젝트 뼈대, 데이터 모델, 데이터 검사

**Files:**
- Create: `package.json`, `.gitignore`, `js/model.js`, `data/countries.js`, `tests/data.test.mjs`, `tests/model.test.mjs`

**Interfaces:**
- Produces:
  - `js/model.js`: `countriesIn(continentId: string): Country[]`(데이터 파일 순서 유지), `findCountry(code: string): Country | undefined`
  - `data/countries.js`: `CONTINENTS`, `COUNTRIES` (위 "데이터 형태")
  - `npm test` = `node --test tests/*.test.mjs`
- 이 Task에서 `COUNTRIES`에는 77개 나라를 모두 넣되 `code, numeric, continent, name, capital`만 채운다. `greeting`과 `culture`는 Task 6~10에서 채운다.

- [ ] **Step 1: `package.json` 만들기.** `"type": "module"`, scripts `test`(위), `test:e2e`(`node --test tests/e2e/*.test.mjs`), devDependencies `playwright@1.56.1`, `d3-geo@3.1.1`, `topojson-client@3.1.0`, `world-atlas@2.0.2`. `.gitignore`에 `node_modules/`, `.superpowers/`. `npm install`.
- [ ] **Step 2: 실패하는 테스트 작성** `tests/model.test.mjs`: `countriesIn("asia").length === 20`, 첫 항목 `code === "kr"`; `findCountry("fr").name === "프랑스"`; `findCountry("zz") === undefined`.
  `tests/data.test.mjs`:
  - 대륙별 개수가 위 목록과 같다(20/25/12/8/8/4), 전체 77, `code` 중복 없음.
  - 금지 코드 `tw, kp, ps, xk`가 없다.
  - 모든 `numeric`이 `world-atlas` countries-50m의 geometry id 중 하나다.
  - `greeting`/`culture`가 있는 나라에 한해: `greeting.text`·`reading`이 빈 문자열이 아니다; `culture.length === 3`; 각 `text`는 마침표로 끝나는 3~4문장(`text.trim().split(/(?<=[.!?])\s+/).length`가 3~4); `photo.license`는 `["Public domain","CC0","CC BY 2.0","CC BY 3.0","CC BY 4.0","CC BY-SA 2.0","CC BY-SA 3.0","CC BY-SA 4.0"]` 중 하나(필요하면 버전 추가 가능, 계열은 이 넷만); `photo.source`는 `https://commons.wikimedia.org/wiki/File:`로 시작; `assets/photos/{photo.file}`이 존재.
  - 모든 나라에 `assets/flags/{code}.svg`, `assets/maps/{code}.svg`가 존재 — 이 두 검사는 Task 2·3에서 파일이 생기므로 **Task 2·3 끝까지는 `{ todo: true }`로 두고 각 Task에서 todo를 푼다.**
  - 최종 완성 검사 `test("모든 나라가 내용을 갖췄다")`: 모든 나라에 greeting과 culture가 있다 — Task 10에서 todo를 푼다.
- [ ] **Step 3: `npm test` 실행 → model 테스트 FAIL("Cannot find module")**
- [ ] **Step 4: `js/model.js`, `data/countries.js` 작성** (77개 나라 기본 항목, 수도는 스펙 기준: 오스트레일리아 캔버라, 튀르키예 앙카라, 남아프리카 공화국 프리토리아(행정 수도), 탄자니아 도도마, 나이지리아 아부자, 카자흐스탄 아스타나, 베트남 하노이, 스위스 베른, 네덜란드 암스테르담).
- [ ] **Step 5: `npm test` → PASS (todo 제외)**
- [ ] **Step 6: Commit** `feat: add country data model and data checks`

### Task 2: 국기 SVG 받기

**Files:**
- Create: `tools/fetch-flags.mjs`, `assets/flags/*.svg`(77개), `tests/flags.test.mjs`
- Modify: `tests/data.test.mjs` (국기 파일 todo 해제)

**Interfaces:**
- Consumes: `COUNTRIES` (Task 1)
- Produces: `assets/flags/{code}.svg` — 루트 `<svg>`에 `viewBox`가 있고 `width`/`height` 속성은 지운다(크기는 CSS가 정함).

- [ ] **Step 1: 실패하는 테스트** `tests/flags.test.mjs`: 모든 나라에 대해 파일이 있고, 루트 `<svg`에 `viewBox`가 있고, `<script`가 없다. 비율 샘플: `ch` viewBox 가로:세로 = 1:1, `np`는 세로 > 가로, `kr` 3:2, `us` 1.9:1(±0.01).
- [ ] **Step 2: `node --test tests/flags.test.mjs` → FAIL**
- [ ] **Step 3: `tools/fetch-flags.mjs` 작성.** `https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@c09927e63705529bbf59ca6684cd9b23225dddad/svg/{code}.svg`를 받아 `width`/`height`만 제거하고 저장. viewBox가 없으면 `width`/`height`로 `0 0 w h`를 만든다. 실행: `node tools/fetch-flags.mjs`.
- [ ] **Step 4: 테스트 PASS 확인, `tests/data.test.mjs`의 국기 todo 해제 후 `npm test` PASS**
- [ ] **Step 5: 정확성 대조.** 77개 국기를 한 장의 확인용 HTML(`.superpowers/flag-sheet.html`, 커밋 안 함)에 이름과 함께 늘어놓고 Playwright로 스크린샷을 찍어 각 나라 위키백과 국기 문서의 그림과 비교한다(색 순서, 별 개수, 문양 방향). 다른 것이 있으면 기록하고 위키미디어 공용의 해당 국기 파일로 교체한다.
- [ ] **Step 6: Commit** `feat: add accurate flag SVGs`

### Task 3: 위치 지도 SVG 만들기

**Files:**
- Create: `tools/build-maps.mjs`, `assets/maps/*.svg`(77개), `tests/maps.test.mjs`
- Modify: `tests/data.test.mjs` (지도 파일 todo 해제)

**Interfaces:**
- Consumes: `COUNTRIES[].numeric`, `code`
- Produces: `assets/maps/{code}.svg` — `viewBox="0 0 960 500"`, 배경 바다 없음(투명), 모든 나라 `<path class="land">`, 대상 나라 `<path class="target">`, 작은 나라 표시 `<circle class="marker">`. 색은 SVG에 넣지 않고 CSS 클래스로만(`land`, `target`, `marker`).

- [ ] **Step 1: 실패하는 테스트** `tests/maps.test.mjs`:
  - 모든 나라에 파일이 있고 `class="target"`이 정확히 1개, `<text`가 없다.
  - `sg`, `va`, `qa`, `jm`, `fj`, `cr`, `sn` 등 칠한 면적의 bounding box가 가로·세로 모두 6px 미만인 나라는 `class="marker"`가 있다(테스트는 sg, va를 명시적으로 검사).
  - `kr` 파일에 독도 표시 `class="target"` 경로 또는 `class="marker dokdo"` 원이 있고 그 중심이 경도 131.87°, 위도 37.24°를 투영한 점에서 3px 이내.
  - `ru` 파일의 target 경로는 크림반도 중심(34.1°E, 45.3°N)의 투영점을 포함하지 않고, `ua` 파일의 target 경로는 포함한다(`d3-geo`의 `geoContains`로 원 지형 데이터 기준 검사).
- [ ] **Step 2: FAIL 확인**
- [ ] **Step 3: `tools/build-maps.mjs` 작성.** `geoNaturalEarth1().fitSize([960,500], 전체)`, 남극 제외. 크림: countries-50m에서 크림이 러시아(643)에 속해 있으면, 러시아 멀티폴리곤 중 크림 폴리곤(위 중심점을 포함하는 것)을 떼어 우크라이나(804)에 붙인다. 독도: 데이터에 없으면 `kr` 지도에 `<circle class="marker dokdo" r="3">`를 그린다. 작은 나라: target의 투영 bounding box가 6px 미만이면 중심에 `<circle class="marker" r="10">`(채움 없음, CSS로 선).
- [ ] **Step 4: 테스트 PASS, data todo 해제, `npm test` PASS**
- [ ] **Step 5: Commit** `feat: add country locator maps`

### Task 4: 화면(목록·국기 화면·테두리 보기)

**Files:**
- Create: `index.html`, `css/app.css`, `js/app.js`, `js/svg.js`, `tests/svg.test.mjs`, `tests/e2e/app.test.mjs`, `tests/e2e/server.mjs`

**Interfaces:**
- Consumes: `CONTINENTS`, `countriesIn`, `findCountry`, `assets/flags`, `assets/maps`
- Produces:
  - `js/svg.js`: `prepareSvg(text: string): string` — 받은 SVG 문자열에서 `width`/`height` 제거, `<script>`와 `on*` 속성 제거, 루트에 `preserveAspectRatio="xMidYMid meet"`.
  - 주소(해시 토큰): 대륙 목록은 `#asia` 같은 대륙 id, 국기 화면은 `#kr` 같은 나라 code. 그 밖의 해시나 빈 해시는 아시아 목록.
  - DOM id(e2e가 씀): `#continents`(대륙 버튼, `aria-pressed`), `#grid`(카드 `button.card[data-code]`), `#detail`, `#back`, `#mode-color`, `#mode-outline`(`aria-pressed`), `#flag`(인라인 국기, outline 모드면 `.outline` 클래스), `#f-name`, `#f-capital`, `#f-greeting`, `#map`, `#culture`(문화 3개 `article`).

- [ ] **Step 1: `tests/svg.test.mjs` 실패 테스트:** `prepareSvg('<svg width="10" height="5" viewBox="0 0 10 5" onload="x()"><script>1</script></svg>')` 결과에 `width=`, `onload`, `<script`가 없고 `viewBox="0 0 10 5"`와 `preserveAspectRatio="xMidYMid meet"`가 있다.
- [ ] **Step 2: `tests/e2e/app.test.mjs` 실패 테스트** (`tests/e2e/server.mjs`는 `node:http`로 저장소 루트를 서빙하는 작은 정적 서버; 테스트마다 임의 포트):
  - 첫 화면: 대륙 버튼 6개, 아시아 `aria-pressed="true"`, 카드 20개, 첫 카드 글자 "대한민국".
  - "유럽" 누르면 카드 25개, 해시 `#europe`.
  - 카드 "일본" 누르면 `#detail` 보임, `#f-name` "일본", `#f-capital` "도쿄", `#mode-color` 눌린 상태, 해시 `#jp`.
  - "테두리만 보기" 누르면 `#flag.outline`; 국기 안의 `fill`이 있는 도형의 계산된 fill이 `rgb(255, 255, 255)`이고 stroke가 있음; 원래 `fill="none"`인 도형은 계산된 fill이 `none` 그대로(Review Focus).
  - 다른 나라를 열면 다시 "색 보기"로 시작.
  - "← 국기 고르기" 누르면 목록, 직전 대륙 유지.
  - 뷰포트 1366×768과 768×1024에서 `np`, `ch`, `us`, `kr` 국기의 bounding box가 뷰포트 안에 다 들어온다(국기 위쪽 막대 포함), `document.documentElement.scrollWidth <= innerWidth`.
  - 페이지 전체에서 계산된 `animation-name`이 모두 `none`, `transition-duration`이 모두 `0s`이고 `<audio>`가 없다.
  - 모든 버튼·카드 높이 ≥ 56px.
  - `index.html#kr`로 바로 열면 대한민국 국기 화면.
  - 문화가 채워진 나라에서 `#culture article` 3개, 각각 `img`와 작가·라이선스 글자(`.credit`)가 있다(Task 6 이후 kr로 확인; Task 4 시점에는 테스트용 가짜 데이터가 아니라 `{ skip: "내용은 Task 6에서" }`로 두고 Task 6에서 푼다).
- [ ] **Step 3: FAIL 확인** (`npm test`, `npm run test:e2e`)
- [ ] **Step 4: 구현.** 시안의 구조·색·글꼴(Jua 제목, Nanum Gothic 본문)을 따른다. 국기 영역 높이는 `calc(100dvh - 위쪽 막대 높이 - 여백)` 이하로 제한하고 SVG는 `max-width:100%; max-height:그 값`. 테두리 모드 CSS는 `fill`이 `none`이 아닌 도형만 흰색으로: `prepareSvg` 단계에서 원래 `fill="none"`인 요소에 `data-nofill` 속성을 달고 CSS `.outline :not([data-nofill])`. 문화 사진은 `loading="lazy"`, `alt`는 문화 제목. 내용이 아직 없는 나라(greeting/culture 없음)는 해당 칸을 숨긴다.
- [ ] **Step 5: 모든 테스트 PASS**
- [ ] **Step 6: Commit** `feat: add flag list and flag detail screens`

### Task 5: 사진 받기 도구

**Files:**
- Create: `tools/fetch-photo.mjs`, `tests/fetch-photo.test.mjs`

**Interfaces:**
- Produces: `node tools/fetch-photo.mjs "<File:이름.jpg>" <저장파일명>` → `assets/photos/<저장파일명>`(가로 800px JPEG)을 저장하고, 표준출력에 `{"source","author","license"}` JSON. 내보내는 순수 함수 `normalizeLicense(shortName: string): string | null`, `plainAuthor(html: string): string`.

- [ ] **Step 1: 실패 테스트:** `normalizeLicense("CC BY-SA 4.0") === "CC BY-SA 4.0"`, `normalizeLicense("Public domain") === "Public domain"`, `normalizeLicense("CC0") === "CC0"`, `normalizeLicense("GFDL") === null`, `normalizeLicense("CC BY-NC 2.0") === null`; `plainAuthor('<a href="//x">Jane Doe</a>') === "Jane Doe"`.
- [ ] **Step 2: FAIL 확인**
- [ ] **Step 3: 구현.** Commons API `action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=…`(User-Agent 헤더 필수: `world-flags-drawing/1.0 (education)`), `thumburl`을 받는다. 라이선스가 null이면 저장하지 않고 종료 코드 1.
- [ ] **Step 4: PASS 확인 + 실제 파일 하나로 수동 실행해 결과 확인**
- [ ] **Step 5: Commit** `feat: add Wikimedia Commons photo fetch tool`

### Task 6–10: 대륙별 내용 채우기

각 Task 하나가 한 묶음: **Task 6 asia(20), Task 7 europe(25), Task 8 africa(12), Task 9 namerica+samerica(16), Task 10 oceania(4) + 최종 완성 todo 해제.**

**Files:** Modify `data/countries.js`; Create `assets/photos/{code}-{1|2|3}.jpg`

**Interfaces:** Consumes Task 1 데이터 형태, Task 5 도구.

각 나라마다:
- [ ] **Step 1: 인사말** — 가장 널리 쓰는 말 하나, 현지 글자 + 한글 발음(예: `{ text: "Bonjour", reading: "봉주르" }`). 한국은 `{ text: "안녕하세요", reading: "안녕하세요" }`.
- [ ] **Step 2: 문화 3가지 고르기** — 서로 다른 갈래 3개(음식 / 옷·축제·전통 / 유명한 장소·동물·자연). 고정관념이나 종교·정치 논쟁거리는 피한다.
- [ ] **Step 3: 한 단락씩 쓰기** — 3~4문장, "~이에요/~해요", 쉬운 낱말, 첫 문장은 "○○는 …이에요."처럼 무엇인지 말한다.
- [ ] **Step 4: 사실 확인** — 수도·인사말·문화 글의 사실을 두 번째 자료(한국어/영어 위키백과 해당 문서)와 대조.
- [ ] **Step 5: 사진** — 위키미디어 공용에서 그 내용이 분명히 보이는 사진을 골라 `tools/fetch-photo.mjs`로 받고 출력 JSON을 `photo`에 넣는다. 사람 얼굴이 크게 나온 사진은 피한다.
- [ ] **Step 6: `npm test` PASS**(그 대륙 나라는 todo가 아닌 실제 검사가 돈다). Task 6에서는 Task 4 e2e의 문화·출처 표시 테스트 skip도 푼다.
- [ ] **Step 7: 대표 3개 나라를 브라우저로 열어 스크린샷 확인**(사진 비율, 글 줄바꿈)
- [ ] **Step 8: Commit** `content: add <대륙> countries`

Task 10은 끝에 `tests/data.test.mjs`의 "모든 나라가 내용을 갖췄다" todo를 풀고 `npm test`, `npm run test:e2e` 모두 PASS를 확인한다.

### Task 11: 자동 검사와 배포 안내

**Files:**
- Create: `.github/workflows/test.yml`, `README.md`

- [ ] **Step 1: 워크플로** — push와 PR에서 Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm test`, `npm run test:e2e`.
- [ ] **Step 2: `README.md`** — 무엇인지, 링크로 여는 법, GitHub Pages 켜는 법(Settings → Pages → Branch `main` / `/ (root)`), 국기·지도·사진 출처와 라이선스, 내용 고치기는 Claude에게 부탁하면 된다는 안내.
- [ ] **Step 3: 로컬에서 `npm test && npm run test:e2e` PASS**
- [ ] **Step 4: Commit** `chore: add CI and README`
