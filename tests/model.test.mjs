import test from "node:test";
import assert from "node:assert/strict";
import { countriesIn, findCountry } from "../js/model.js";

test("countriesIn은 대륙의 나라를 데이터 순서대로 돌려준다", () => {
  const asia = countriesIn("asia");
  assert.equal(asia.length, 20);
  assert.equal(asia[0].code, "kr");
});

test("countriesIn은 없는 대륙에 빈 배열을 돌려준다", () => {
  assert.deepEqual(countriesIn("atlantis"), []);
});

test("findCountry는 코드로 나라를 찾는다", () => {
  assert.equal(findCountry("fr").name, "프랑스");
  assert.equal(findCountry("zz"), undefined);
});
