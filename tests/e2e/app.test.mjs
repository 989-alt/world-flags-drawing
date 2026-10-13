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
  await page.waitForSelector("#detail:not([hidden])");
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
    const filled = shapes.filter((e) => e.getAttribute("fill") && e.getAttribute("fill") !== "none" && !e.closest("defs,clipPath,mask,pattern") && !e.hasAttribute("data-outline-clone"));
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

const SHOTS = process.env.OUTLINE_SHOTS_DIR;

test("outline: us keeps 13 stripes (thick stroke bands are outlined, not collapsed)", async () => {
  await open("#us");
  await page.locator("#mode-outline").click();
  await page.waitForSelector("#flag svg[data-outlined]");
  const box = await page.locator("#flag svg").boundingBox();
  // 국기 실제 그림 영역(meet 맞춤): 7410x3900
  const scale = Math.min(box.width / 7410, box.height / 3900);
  const fw = 7410 * scale, fh = 3900 * scale;
  const fx = box.x + (box.width - fw) / 2, fy = box.y + (box.height - fh) / 2;
  const x = Math.round(fx + fw * 0.7); // 파란 칸 오른쪽 줄무늬 영역
  const png = await page.screenshot({ clip: { x, y: Math.floor(fy) - 3, width: 1, height: Math.ceil(fh) + 6 } });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/outline-us.png` });
  const runs = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let transitions = 0, darkRuns = 0, prevDark = false;
    for (let y = 0; y < c.height; y++) {
      const i = y * c.width * 4;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const dark = lum < 160;
      if (y > 0 && dark !== prevDark) transitions++;
      if (dark && !prevDark) darkRuns++;
      prevDark = dark;
    }
    return { transitions, darkRuns };
  }, png.toString("base64"));
  // 13줄 → 경계선 14개(위·아래 테두리 포함). 무너지면 7줄(경계선 8개)
  assert.ok(runs.darkRuns >= 13 && runs.darkRuns <= 16, JSON.stringify(runs));
  assert.ok(runs.transitions >= 24, JSON.stringify(runs));
});

test("outline: gb cross strokes get dark clones, original widths kept; color mode restores", async () => {
  await open("#gb");
  const before = await page.evaluate(() => [...document.querySelectorAll("#flag svg [data-stroked]")].map((e) => getComputedStyle(e).strokeWidth));
  await page.locator("#mode-outline").click();
  await page.waitForSelector("#flag svg[data-outlined]");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/outline-gb.png` });
  const r = await page.evaluate(() => {
    const orig = [...document.querySelectorAll("#flag svg [data-stroked]")];
    return {
      widths: orig.map((e) => getComputedStyle(e).strokeWidth),
      strokes: orig.map((e) => getComputedStyle(e).stroke),
      clones: orig.map((e) => {
        const c = e.previousElementSibling;
        return c && c.hasAttribute("data-outline-clone") ? { w: parseFloat(getComputedStyle(c).strokeWidth), fill: getComputedStyle(c).fill, stroke: getComputedStyle(c).stroke } : null;
      }),
    };
  });
  assert.equal(before.length, 4, JSON.stringify(before));
  assert.deepEqual(r.widths, before);
  assert.ok(r.strokes.every((s) => s === "rgb(255, 255, 255)"), JSON.stringify(r));
  r.clones.forEach((c, i) => {
    assert.ok(c, "clone " + i);
    assert.equal(c.fill, "none");
    assert.equal(c.stroke, "rgb(31, 42, 51)");
    assert.ok(c.w > parseFloat(before[i]), JSON.stringify(c));
  });
  await page.locator("#mode-color").click();
  assert.equal(await page.locator("#flag [data-outline-clone]").count(), 0);
});

test("outline: kr screenshot", async () => {
  await open("#kr");
  await page.locator("#mode-outline").click();
  await page.waitForSelector("#flag svg[data-outlined]");
  assert.ok(await page.locator("#flag [data-outline-clone]").count() >= 6);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/outline-kr.png` });
});

test("back button does not leave the flag in history", async () => {
  await open();
  await page.locator("#grid button.card", { hasText: "일본" }).click();
  await page.waitForSelector("#detail:not([hidden])");
  await page.locator("#back").click();
  await page.waitForSelector("#detail", { state: "hidden" });
  await page.goBack().catch(() => null);
  await page.waitForTimeout(200);
  assert.notEqual(new URL(page.url()).hash, "#jp");
  const detailShown = await page.evaluate(() => { const d = document.querySelector("#detail"); return !!d && !d.hidden; }).catch(() => false);
  assert.equal(detailShown, false);
});

test("direct link back button goes to the list", async () => {
  await open("#jp");
  await page.locator("#back").click();
  await page.waitForSelector("#grid button.card");
  assert.equal(new URL(page.url()).hash, "#asia");
});

test("scroll: detail opens at top, list scroll is restored", async () => {
  await open("", { width: 768, height: 600 });
  await page.locator("#grid button.card").last().scrollIntoViewIfNeeded();
  const y0 = await page.evaluate(() => scrollY);
  assert.ok(y0 > 200, String(y0));
  await page.locator("#grid button.card").last().click();
  await page.waitForSelector("#detail:not([hidden]) #flag svg");
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.locator("#back").click();
  await page.waitForSelector("#grid button.card");
  await page.waitForFunction((y) => Math.abs(scrollY - y) < 5, y0);
});

test("hash token is case-insensitive", async () => {
  await open("#KR");
  assert.equal((await page.locator("#f-name").innerText()).trim(), "대한민국");
});
