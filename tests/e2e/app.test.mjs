import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startServer } from "./server.mjs";

let srv, browser, page;
before(async () => {
  srv = await startServer();
  browser = await chromium.launch();
});
after(async () => { await browser.close(); srv.server.close(); });

async function open(hash = "", size = { width: 1366, height: 768 }) {
  if (page) await page.close();
  page = await browser.newPage({ viewport: size });
  await page.goto(srv.url + "index.html" + hash);
  await page.waitForSelector("#grid button.card, #detail:not([hidden]) #flag svg");
}

test("first screen", async () => {
  await open();
  assert.equal(await page.locator("#continents button").count(), 6);
  assert.equal(await page.locator('#continents button[aria-pressed="true"]').innerText(), "아시아");
  assert.equal(await page.locator("#grid button.card").count(), 20);
  assert.match(await page.locator("#grid button.card").first().innerText(), /대한민국/);
});

test("continent switch", async () => {
  await open();
  await page.getByRole("button", { name: "유럽" }).click();
  await page.waitForFunction(() => document.querySelectorAll("#grid button.card").length === 25);
  assert.equal(await page.locator("#grid button.card").count(), 25);
  assert.equal(new URL(page.url()).hash, "#europe");
});

test("detail, outline, reset, back", async () => {
  await open();
  await page.locator('#grid button.card', { hasText: "일본" }).click();
  assert.equal(await page.locator("#detail").isVisible(), true);
  assert.equal((await page.locator("#f-name").innerText()).trim(), "일본");
  assert.equal((await page.locator("#f-capital").innerText()).trim(), "도쿄");
  assert.equal(await page.locator("#mode-color").getAttribute("aria-pressed"), "true");
  assert.equal(new URL(page.url()).hash, "#jp");
  await page.locator("#mode-outline").click();
  assert.equal(await page.locator("#flag.outline").count(), 1);
  // another country starts in color mode
  await page.evaluate(() => { location.hash = "#kr"; });
  await page.waitForFunction(() => document.querySelector("#f-name").textContent.trim() === "대한민국");
  assert.equal(await page.locator("#flag.outline").count(), 0);
  assert.equal(await page.locator("#mode-color").getAttribute("aria-pressed"), "true");
  await page.locator("#back").click();
  await page.waitForSelector("#detail", { state: "hidden" });
  await page.waitForSelector("#grid button.card");
  assert.equal(await page.locator('#continents button[aria-pressed="true"]').innerText(), "아시아");
});

test("outline: fills white with stroke, fill=none untouched", async () => {
  await open("#es");
  await page.locator("#mode-outline").click();
  const r = await page.evaluate(() => {
    const shapes = [...document.querySelectorAll("#flag svg :is(rect,path,circle,polygon,ellipse)")];
    const filled = shapes.filter((e) => e.getAttribute("fill") && e.getAttribute("fill") !== "none" && !e.closest("defs,clipPath,mask,pattern"));
    const none = shapes.filter((e) => e.getAttribute("fill") === "none");
    return {
      nFilled: filled.length, nNone: none.length,
      badFill: filled.filter((e) => getComputedStyle(e).fill !== "rgb(255, 255, 255)").length,
      noStroke: filled.filter((e) => getComputedStyle(e).stroke === "none").length,
      noneChanged: none.filter((e) => getComputedStyle(e).fill !== "none").length,
    };
  });
  assert.ok(r.nFilled > 0 && r.nNone > 0, JSON.stringify(r));
  assert.equal(r.badFill, 0, JSON.stringify(r));
  assert.equal(r.noStroke, 0, JSON.stringify(r));
  assert.equal(r.noneChanged, 0, JSON.stringify(r));
});

for (const size of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }]) {
  test(`flags fit viewport ${size.width}x${size.height}`, async () => {
    for (const code of ["np", "ch", "us", "kr"]) {
      await open("#" + code, size);
      const r = await page.evaluate(() => {
        const b = document.querySelector("#flag svg").getBoundingClientRect();
        return { t: b.top, l: b.left, b: b.bottom, r: b.right, w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth };
      });
      assert.ok(r.t >= 0 && r.l >= 0 && r.b <= r.h && r.r <= r.w, code + JSON.stringify(r));
      assert.ok(r.sw <= r.w, code + " scrollWidth");
    }
  });
}

test("no animation, transition, audio; big tap targets", async () => {
  for (const hash of ["", "#kr"]) {
    await open(hash);
    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll("*")];
      return {
        anim: all.filter((e) => getComputedStyle(e).animationName !== "none").length,
        trans: all.filter((e) => getComputedStyle(e).transitionDuration.split(",").some((d) => d.trim() !== "0s")).length,
        audio: document.querySelectorAll("audio").length,
        short: [...document.querySelectorAll("button")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 56).map((b) => b.textContent.trim()),
      };
    });
    assert.deepEqual(r, { anim: 0, trans: 0, audio: 0, short: [] });
  }
});

test("direct link #kr", async () => {
  await open("#kr");
  assert.equal((await page.locator("#f-name").innerText()).trim(), "대한민국");
  assert.equal(await page.locator("#detail").isVisible(), true);
});

test("map zooms near the target", async () => {
  await open("#kr");
  await page.waitForSelector("#map svg .target");
  const r = await page.evaluate(() => {
    const svg = document.querySelector("#map svg");
    const vb = svg.viewBox.baseVal;
    const t = [...svg.querySelectorAll(".target")].map((e) => e.getBoundingClientRect().width);
    return { vbw: vb.width, tw: Math.max(...t) };
  });
  assert.ok(r.vbw < 960, JSON.stringify(r));
  assert.ok(r.tw >= 30, JSON.stringify(r));
});

test("culture with photos and credit, greeting", async () => {
  await open("#us");
  assert.equal(await page.locator("#culture article").count(), 3);
  await page.waitForFunction(() => [...document.querySelectorAll("#culture img")].every((i) => i.complete));
  const r = await page.evaluate(() => [...document.querySelectorAll("#culture article")].map((a) => ({
    nw: a.querySelector("img")?.naturalWidth || 0,
    credit: a.querySelector(".credit")?.textContent || "",
  })));
  for (const a of r) { assert.ok(a.nw > 0, JSON.stringify(r)); assert.match(a.credit, /CC|Public|domain/i); }
  const g = await page.locator("#f-greeting").innerText();
  assert.ok(g.includes("Hello") || g.length > 3, g);
  assert.ok(await page.locator("#f-greeting .reading").count() === 1);
});
