// 국기 SVG를 받아 assets/flags/{code}.svg 로 저장한다. (개발용)
// 출처: hampusborgos/country-flags (위키미디어 공용 기반, 퍼블릭 도메인)
import { mkdirSync, writeFileSync } from "node:fs";
import { COUNTRIES } from "../data/countries.js";

const COMMIT = "c09927e63705529bbf59ca6684cd9b23225dddad";
const BASE = `https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@${COMMIT}/svg`;
// 예외: 페루·코스타리카는 문장(coat of arms)이 없는 일반 국기를 쓴다(따라 그리기 쉬움).
// hampusborgos 버전은 문장이 있는 국가기라서, 위키미디어 공용의 본 파일로 덮어쓴다.
const OVERRIDES = {
  pe: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Peru.svg",
  cr: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Costa_Rica.svg",
};
const HEADERS = { "User-Agent": "world-flags-drawing/1.0 (education)" };

const outDir = new URL("../assets/flags/", import.meta.url);

export function normalize(svg) {
  svg = svg.replace(/<!DOCTYPE[^>]*>/i, "");
  const m = svg.match(/<svg\b[^>]*>/);
  if (!m) throw new Error("no <svg> root");
  let tag = m[0];
  const attr = (n) => (tag.match(new RegExp(`\\s${n}="([^"]*)"`)) || [])[1];
  const num = (v) => parseFloat(v);
  let viewBox = attr("viewBox");
  if (!viewBox) {
    const w = num(attr("width")), h = num(attr("height"));
    if (!(w > 0 && h > 0)) throw new Error("no viewBox and no usable width/height");
    viewBox = `0 0 ${w} ${h}`;
    tag = tag.replace(/<svg\b/, `<svg viewBox="${viewBox}"`);
  }
  tag = tag.replace(/\s(width|height)="[^"]*"/g, "");
  return svg.replace(m[0], tag);
}

mkdirSync(outDir, { recursive: true });
for (const { code } of COUNTRIES) {
  const res = await fetch(OVERRIDES[code] ?? `${BASE}/${code}.svg`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  writeFileSync(new URL(`${code}.svg`, outDir), normalize(await res.text()));
  console.log("ok", code);
}
