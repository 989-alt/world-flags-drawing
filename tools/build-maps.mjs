// 나라마다 위치 지도 SVG(assets/maps/{code}.svg)를 만든다. 실행: node tools/build-maps.mjs
// 색은 넣지 않는다. CSS 클래스 land / target / marker 로만 칠한다. 글자도 넣지 않는다.
import { mkdirSync, writeFileSync } from "node:fs";
import { COUNTRIES } from "../data/countries.js";
import {
  WIDTH, HEIGHT, DOKDO_POINT, loadFeatures, makeProjection, makePath, smallMarker, landOnly,
} from "./map-data.mjs";

const outDir = new URL("../assets/maps/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const features = loadFeatures();
const projection = makeProjection(features);
const path = makePath(projection);
const lands = features
  .map((f) => ({ f, shape: landOnly(f, path) }))
  .filter((x) => x.shape)
  .map(({ f, shape }) => ({ f, d: path(shape) }))
  .filter((x) => x.d);

const r1 = (n) => Math.round(n * 10) / 10;
const markers = [];

for (const c of COUNTRIES) {
  const target = features.find((f) => f.id === c.numeric);
  if (!target) throw new Error(`지형 없음: ${c.code} ${c.numeric}`);
  const parts = lands
    .filter(({ f }) => f !== target)
    .map(({ d }) => `<path class="land" d="${d}"/>`);
  parts.push(`<path class="target" d="${path(target)}"/>`);

  const center = smallMarker(target, path);
  if (center) {
    parts.push(`<circle class="marker" cx="${r1(center[0])}" cy="${r1(center[1])}" r="10"/>`);
    markers.push(c.code);
  }
  if (c.code === "kr") {
    // 독도는 지형 데이터에 없어서 대한민국 색 점으로 따로 그린다.
    const [x, y] = projection(DOKDO_POINT);
    parts.push(`<circle class="marker dokdo" cx="${r1(x)}" cy="${r1(y)}" r="3"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">\n${parts.join("\n")}\n</svg>\n`;
  writeFileSync(new URL(`${c.code}.svg`, outDir), svg);
}
console.log(`${COUNTRIES.length}개 지도를 만들었어요. 동그라미: ${markers.join(" ")}`);
