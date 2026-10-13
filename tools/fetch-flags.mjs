// 국기 SVG를 받아 assets/flags/{code}.svg 로 저장한다. (개발용)
// 출처: hampusborgos/country-flags (위키미디어 공용 기반, 퍼블릭 도메인)
import { mkdirSync, writeFileSync } from "node:fs";
import { COUNTRIES } from "../data/countries.js";

const COMMIT = "c09927e63705529bbf59ca6684cd9b23225dddad";
const BASE = `https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@${COMMIT}/svg`;
const outDir = new URL("../assets/flags/", import.meta.url);

export function normalize(svg) {
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
  const res = await fetch(`${BASE}/${code}.svg`);
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  writeFileSync(new URL(`${code}.svg`, outDir), normalize(await res.text()));
  console.log("ok", code);
}
