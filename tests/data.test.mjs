import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CONTINENTS, COUNTRIES } from "../data/countries.js";

const root = new URL("../", import.meta.url);
const atlas = JSON.parse(
  readFileSync(new URL("node_modules/world-atlas/countries-50m.json", root), "utf8"),
);
const atlasIds = new Set(atlas.objects.countries.geometries.map((g) => g.id));

const LICENSES = [
  "Public domain", "CC0", "CC BY 1.0", "CC BY 2.0", "CC BY 2.5", "CC BY 3.0", "CC BY 4.0",
  "CC BY-SA 1.0", "CC BY-SA 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0",
];

test("대륙은 여섯 개이고 순서가 정해져 있다", () => {
  assert.deepEqual(CONTINENTS.map((c) => c.id),
    ["asia", "europe", "africa", "namerica", "samerica", "oceania"]);
});

test("대륙별 나라 수와 전체 수", () => {
  const expected = { asia: 20, europe: 25, africa: 12, namerica: 8, samerica: 8, oceania: 4 };
  for (const [id, n] of Object.entries(expected)) {
    assert.equal(COUNTRIES.filter((c) => c.continent === id).length, n, id);
  }
  assert.equal(COUNTRIES.length, 77);
});

test("code가 중복되지 않는다", () => {
  assert.equal(new Set(COUNTRIES.map((c) => c.code)).size, COUNTRIES.length);
});

test("넣지 않는 나라가 없다", () => {
  for (const code of ["tw", "kp", "ps", "xk"]) {
    assert.ok(!COUNTRIES.some((c) => c.code === code), code);
  }
});

test("모든 나라에 기본 항목이 있다", () => {
  const ids = new Set(CONTINENTS.map((c) => c.id));
  for (const c of COUNTRIES) {
    assert.match(c.code, /^[a-z]{2}$/, c.code);
    assert.ok(ids.has(c.continent), c.code);
    assert.ok(c.name && c.capital, c.code);
  }
});

test("모든 numeric이 world-atlas 지도 id에 있다", () => {
  for (const c of COUNTRIES) {
    assert.ok(atlasIds.has(c.numeric), `${c.code} ${c.numeric}`);
  }
  assert.equal(new Set(COUNTRIES.map((c) => c.numeric)).size, COUNTRIES.length);
});

test("greeting과 culture가 있는 나라는 형식을 지킨다", () => {
  for (const c of COUNTRIES) {
    if (c.greeting) {
      assert.ok(c.greeting.text.trim() !== "", `${c.code} greeting.text`);
      assert.ok(c.greeting.reading.trim() !== "", `${c.code} greeting.reading`);
    }
    if (c.culture) {
      assert.equal(c.culture.length, 3, `${c.code} culture`);
      for (const item of c.culture) {
        const sentences = item.text.trim().split(/(?<=[.!?])\s+/).length;
        assert.ok(sentences >= 3 && sentences <= 4, `${c.code} ${item.title} 문장 수 ${sentences}`);
        assert.ok(item.text.trim().endsWith("."), `${c.code} ${item.title} 마침표`);
        assert.ok(LICENSES.includes(item.photo.license), `${c.code} license ${item.photo.license}`);
        assert.ok(item.photo.source.startsWith("https://commons.wikimedia.org/wiki/File:"), `${c.code} source`);
        assert.ok(existsSync(new URL(`assets/photos/${item.photo.file}`, root)), `${c.code} ${item.photo.file}`);
      }
    }
  }
});

test("모든 나라에 국기 파일이 있다", () => {
  for (const c of COUNTRIES) {
    assert.ok(existsSync(new URL(`assets/flags/${c.code}.svg`, root)), c.code);
  }
});

test("모든 나라에 지도 파일이 있다", () => {
  for (const c of COUNTRIES) {
    assert.ok(existsSync(new URL(`assets/maps/${c.code}.svg`, root)), c.code);
  }
});

// Task 10에서 내용이 모두 채워지면 todo를 푼다.
test("모든 나라가 내용을 갖췄다", { todo: true }, () => {
  for (const c of COUNTRIES) {
    assert.ok(c.greeting, `${c.code} greeting`);
    assert.ok(c.culture && c.culture.length === 3, `${c.code} culture`);
  }
});
