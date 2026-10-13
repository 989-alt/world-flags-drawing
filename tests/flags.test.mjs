import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { COUNTRIES } from "../data/countries.js";

const root = new URL("../", import.meta.url);
const read = (code) => readFileSync(new URL(`assets/flags/${code}.svg`, root), "utf8");
const ratio = (code) => {
  const m = read(code).match(/<svg[^>]*\sviewBox="([^"]+)"/);
  assert.ok(m, `${code} viewBox`);
  const [, , w, h] = m[1].trim().split(/[\s,]+/).map(Number);
  return w / h;
};

test("모든 나라의 국기 파일이 올바르다", () => {
  for (const c of COUNTRIES) {
    assert.ok(existsSync(new URL(`assets/flags/${c.code}.svg`, root)), `${c.code} 파일`);
    const svg = read(c.code);
    const tag = svg.match(/<svg[^>]*>/)[0];
    assert.match(tag, /viewBox=/, `${c.code} viewBox`);
    assert.doesNotMatch(tag, /\swidth=|\sheight=/, `${c.code} width/height`);
    assert.doesNotMatch(svg, /<script/i, `${c.code} script`);
  }
});

test("비율 샘플", () => {
  assert.ok(Math.abs(ratio("ch") - 1) < 0.01);
  assert.ok(ratio("np") < 1);
  assert.ok(Math.abs(ratio("kr") - 1.5) < 0.01);
  assert.ok(Math.abs(ratio("us") - 1.9) < 0.01);
  assert.ok(Math.abs(ratio("gb") - 2) < 0.01);
  assert.ok(Math.abs(ratio("pe") - 1.5) < 0.01);
  assert.ok(Math.abs(ratio("cr") - 5 / 3) < 0.01);
});

// 페루·코스타리카는 문장 없는 일반 국기. 도형이 줄무늬 수준(3개 이하)이어야 한다.
test("pe, cr 국기에는 문장이 없다", () => {
  for (const code of ["pe", "cr"]) {
    const svg = read(code);
    const shapes = (svg.match(/<(path|rect|circle|ellipse|polygon|polyline|line|use|image|g)\b/g) || []).length;
    assert.ok(shapes <= 3, `${code} 도형 ${shapes}개`);
    assert.ok(svg.length < 1000, `${code} 크기 ${svg.length}`);
  }
});
