# 국기 따라 그리기

초등학생이 세계 여러 나라의 국기를 화면에서 크게 보고 종이에 따라 그리는 웹앱입니다.
대륙을 고르고 국기를 누르면 국기가 크게 나오고, 아래에 나라 이름·수도·인사말·지도·문화 3가지(사진과 쉬운 글)가 나옵니다.
"테두리만 보기"를 누르면 색이 빠진 밑그림을 볼 수 있습니다.

- 사이트: https://world-flags-drawing-seonbis-projects.vercel.app
- 나라: 77개 (아시아 20, 유럽 25, 아프리카 12, 북아메리카 8, 남아메리카 8, 오세아니아 4)
- 움직임과 소리가 없는 차분한 화면, 크롬북과 태블릿에서 쓰도록 큰 버튼

## 내용 고치기

나라 정보는 `data/countries.js`(이름·수도)와 `data/content/*.js`(인사말·문화)에 있습니다.
고칠 내용이 있으면 Claude에게 "일본 문화 글 바꿔 줘"처럼 부탁하면 됩니다.
GitHub에 올라가면 Vercel이 사이트를 자동으로 다시 배포합니다.

## 출처와 라이선스

- 국기: [hampusborgos/country-flags](https://github.com/hampusborgos/country-flags) (위키미디어 공용 기반, 퍼블릭 도메인). 페루·코스타리카는 위키미디어 공용 `File:Flag of Peru.svg`, `File:Flag of Costa Rica.svg`.
- 지도: [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, 퍼블릭 도메인). 크림반도는 우크라이나, 독도는 대한민국으로 표시합니다.
- 문화 사진: 위키미디어 공용. 사진마다 작가와 라이선스(퍼블릭 도메인, CC0, CC BY, CC BY-SA)를 화면에 표시합니다.

## 개발

```bash
npm install
npm test          # 데이터·국기·지도 검사
npm run test:e2e  # 화면 동작 검사 (Playwright)
python3 -m http.server   # http://localhost:8000 에서 보기
```

도구: `tools/fetch-flags.mjs`(국기 받기), `tools/build-maps.mjs`(지도 만들기), `tools/fetch-photo.mjs`(사진 받기).
