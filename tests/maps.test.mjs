import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { geoContains } from "d3-geo";
import { COUNTRIES } from "../data/countries.js";
import {
  CRIMEA_POINT, DOKDO_POINT, SMALL_PX, loadFeatures, makeProjection, makePath, largestPart,
} from "../tools/map-data.mjs";

const mapUrl = (code) => new URL(`../assets/maps/${code}.svg`, import.meta.url);
const read = (code) => readFileSync(mapUrl(code), "utf8");
const count = (s, re) => (s.match(re) || []).length;

const features = loadFeatures();
const projection = makeProjection(features);
const path = makePath(projection);
const byNumeric = (n) => features.find((f) => f.id === n);
const byCode = (code) => byNumeric(COUNTRIES.find((c) => c.code === code).numeric);

test("모든 나라에 지도가 있고 target이 하나이며 글자가 없다", () => {
  for (const c of COUNTRIES) {
    assert.ok(existsSync(mapUrl(c.code)), `${c.code} 파일`);
    const svg = read(c.code);
    assert.match(svg, /viewBox="0 0 960 500"/, c.code);
    assert.equal(count(svg, /class="target"/g), 1, `${c.code} target`);
    assert.ok(!svg.includes("<text"), `${c.code} text`);
    assert.ok(count(svg, /class="land"/g) > 100, `${c.code} land`);
    assert.ok(!/fill=|stroke=|<style/.test(svg), `${c.code} 색은 CSS로만`);
  }
});

test("아주 작은 나라는 위치 동그라미가 있다", () => {
  for (const code of ["sg", "va"]) {
    assert.match(read(code), /class="marker"/, code);
  }
  for (const c of COUNTRIES) {
    const [[x0, y0], [x1, y1]] = path.bounds(largestPart(byNumeric(c.numeric).geometry));
    const small = x1 - x0 < SMALL_PX && y1 - y0 < SMALL_PX;
    assert.equal(/class="marker"/.test(read(c.code)), small, `${c.code} 동그라미`);
  }
});

test("큰 나라에는 위치 동그라미가 없다", () => {
  for (const code of ["kr", "ru", "au", "us", "cn"]) {
    assert.ok(!/class="marker"/.test(read(code)), code);
  }
});

test("독도 점이 kr 지도에 있다", () => {
  const svg = read("kr");
  const m = svg.match(/<circle class="marker dokdo" cx="([\d.]+)" cy="([\d.]+)" r="3"\/>/);
  assert.ok(m, "독도 원");
  const [x, y] = projection(DOKDO_POINT);
  assert.ok(Math.hypot(Number(m[1]) - x, Number(m[2]) - y) <= 3);
});

test("크림반도는 우크라이나 쪽이고 러시아 쪽이 아니다", () => {
  assert.equal(geoContains(byCode("ru"), CRIMEA_POINT), false);
  assert.equal(geoContains(byCode("ua"), CRIMEA_POINT), true);
  // 파일의 target 경로도 지형 데이터에서 만든 것과 같아야 한다
  const target = (code) => read(code).match(/<path class="target" d="([^"]+)"/)[1];
  assert.equal(target("ru"), path(byCode("ru")));
  assert.equal(target("ua"), path(byCode("ua")));
});

test("au는 오스트레일리아 본토를 칠한다 (애시모어 제도가 아님)", () => {
  const [[x0, y0], [x1, y1]] = path.bounds(byCode("au"));
  assert.ok(x1 - x0 > 50, `너비 ${x1 - x0}`);
  assert.ok(y1 - y0 > 40, `높이 ${y1 - y0}`);
  assert.ok(geoContains(byCode("au"), [134, -25]));
  assert.ok(!/class="marker"/.test(read("au")));
});
