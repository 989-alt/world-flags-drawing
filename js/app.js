import { CONTINENTS } from "../data/countries.js";
import { countriesIn, findCountry } from "./model.js";
import { prepareSvg, scopeIds } from "./svg.js";

const $ = (id) => document.getElementById(id);
const cache = new Map();
let continent = "asia";
let renderToken = 0;
let flagSvg = "";        // 지금 보이는 국기(색깔 모드) SVG 문자열
let lastKind = null;     // 바로 앞 화면: "list" | "detail"
let detailFromList = false;
let listScroll = 0;      // 카드를 누를 때의 목록 스크롤 위치
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

let uid = 0;
const scoped = (svg) => scopeIds(svg, "s" + ++uid + "-");

function loadSvg(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(url)))).then(prepareSvg));
  }
  return cache.get(url);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const safeSource = (u) => typeof u === "string" && u.startsWith("https://commons.wikimedia.org/");

function renderContinents() {
  $("continents").innerHTML = CONTINENTS.map((c) =>
    `<button type="button" data-id="${esc(c.id)}" aria-pressed="${c.id === continent}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join("");
}

async function renderGrid() {
  const token = ++renderToken;
  const list = countriesIn(continent);
  const svgs = await Promise.all(list.map((c) => loadSvg(`assets/flags/${c.code}.svg`).catch(() => "")));
  if (token !== renderToken) return;
  $("grid").innerHTML = list.map((c, i) =>
    `<button type="button" class="card" data-code="${esc(c.code)}"><span class="thumb">${scoped(svgs[i])}</span><span>${esc(c.name)}</span></button>`).join("");
}

// 테두리 모드: 굵은 선으로 그린 띠(미국 줄무늬, 영국 십자 등)는 2px 선으로 바꾸면
// 모양이 무너진다. 그래서 같은 굵기의 흰 선 아래에 양쪽으로 1px씩 더 굵은 진한 선을 깔아
// 띠의 테두리만 보이게 한다. <use>는 먼저 실제 요소로 펼쳐 각각 처리한다.
const NOT_DRAWN = "defs, clipPath, mask, pattern, symbol, marker";
function inlineUses(svg) {
  for (let n = 0, u; n < 5000 && (u = svg.querySelector("use")); n++) {
    const ref = (u.getAttribute("href") || u.getAttribute("xlink:href") || "").replace(/^#/, "");
    const target = ref && svg.querySelector(`[id="${CSS.escape(ref)}"]`);
    if (!target || target.contains(u)) { u.remove(); continue; }
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const a of [...u.attributes]) {
      if (!/^(href|xlink:href|x|y|width|height|id)$/.test(a.name)) g.setAttribute(a.name, a.value);
    }
    const x = +u.getAttribute("x") || 0, y = +u.getAttribute("y") || 0;
    g.setAttribute("transform", `${u.getAttribute("transform") || ""} translate(${x} ${y})`.trim());
    const c = target.cloneNode(true);
    c.removeAttribute("id");
    c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    g.appendChild(c);
    u.replaceWith(g);
  }
}
function applyOutline(box) {
  const svg = box.querySelector("svg");
  if (!svg || svg.dataset.outlined) return;
  box.classList.remove("outline"); // 원래 선 굵기는 색깔 모드에서 잰다
  inlineUses(svg);
  const shapes = [...svg.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon, text")]
    .filter((e) => !e.closest(NOT_DRAWN));
  const work = [];
  for (const el of shapes) {
    const cs = getComputedStyle(el);
    if (cs.stroke === "none" || cs.visibility === "hidden" || cs.display === "none") { el.removeAttribute("data-stroked"); continue; }
    const m = el.getScreenCTM();
    const scale = m ? Math.hypot(m.a, m.b) : 0;
    const w = parseFloat(cs.strokeWidth) || 1;
    // 화면에서 4px보다 가는 선은 원래도 '선'이므로 보통 테두리(2px 진한 선)로 둔다
    if (!scale || w * scale < 4) { el.removeAttribute("data-stroked"); continue; }
    el.setAttribute("data-stroked", "");
    work.push({ el, w, k: 1 / scale });
  }
  for (const { el, w, k } of work) {
    const c = el.cloneNode(true);
    c.removeAttribute("id");
    c.removeAttribute("data-stroked");
    c.setAttribute("data-nofill", "");
    c.setAttribute("data-outline-clone", "");
    c.style.fill = "none";
    c.style.stroke = "#1f2a33";
    c.style.strokeWidth = String(w + 2 * k);
    el.before(c);
    el.style.stroke = "#fff";
    el.style.strokeWidth = String(w);
  }
  svg.dataset.outlined = "1";
}
function renderFlag() {
  $("flag").innerHTML = flagSvg;
  if ($("mode-outline").getAttribute("aria-pressed") === "true") {
    applyOutline($("flag"));
    $("flag").classList.add("outline");
  }
}

function setMode(outline) {
  const box = $("flag");
  if (outline) applyOutline(box);
  else if (box.querySelector("[data-outline-clone], svg[data-outlined]")) box.innerHTML = flagSvg;
  box.classList.toggle("outline", outline);
  $("mode-color").setAttribute("aria-pressed", String(!outline));
  $("mode-outline").setAttribute("aria-pressed", String(outline));
}

async function showDetail(c) {
  const token = ++renderToken;
  setMode(false);
  $("f-name").textContent = c.name;
  $("f-capital").textContent = c.capital;
  const g = c.greeting;
  $("greeting-box").hidden = !g;
  if (g) $("f-greeting").innerHTML = esc(g.text) + (g.reading ? `<div class="reading">${esc(g.reading)}</div>` : "");
  $("culture").innerHTML = (c.culture || []).map((k) => {
    const p = k.photo;
    return `<article><h3>${esc(k.title)}</h3>` +
      (p ? `<img loading="lazy" src="assets/photos/${esc(p.file)}" alt="${esc(k.title)}">` : "") +
      `<p>${esc(k.text)}</p>` +
      (p ? `<p class="credit">사진: ${safeSource(p.source) ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.author)}</a>` : esc(p.author)} · ${esc(p.license)}</p>` : "") +
      `</article>`;
  }).join("");
  flagSvg = "";
  $("flag").innerHTML = "";
  $("map").innerHTML = "";
  $("map-box").hidden = true;
  $("list").hidden = true;
  $("detail").hidden = false;
  window.scrollTo(0, 0);
  const [flag, map] = await Promise.all([
    loadSvg(`assets/flags/${c.code}.svg`).catch(() => ""),
    loadSvg(`assets/maps/${c.code}.svg`).catch(() => ""),
  ]);
  if (token !== renderToken) return;
  flagSvg = scoped(flag);
  renderFlag();
  if (map) { $("map").innerHTML = scoped(map); $("map-box").hidden = false; zoomMap($("map").querySelector("svg")); }
}

// 칠한 나라(와 위치 동그라미) 둘레로 지도를 확대한다. 960:500 비율, 최소 300x156.
function zoomMap(svg) {
  if (!svg) return;
  const els = svg.querySelectorAll(".target, .marker");
  if (!els.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of els) {
    const b = el.getBBox();
    if (!b.width && !b.height) continue;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  if (!isFinite(x0)) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let w = Math.max(300, (x1 - x0) * 3, (y1 - y0) * 3 * 960 / 500);
  w = Math.min(w, 960);
  const h = w * 500 / 960;
  const x = Math.min(Math.max(cx - w / 2, 0), 960 - w);
  const y = Math.min(Math.max(cy - h / 2, 0), 500 - h);
  svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
}

function route() {
  let token = location.hash.replace(/^#/, "");
  try { token = decodeURIComponent(token); } catch { /* 잘못된 주소는 그대로 */ }
  token = token.trim().toLowerCase();
  const country = findCountry(token);
  const prev = lastKind;
  lastKind = country ? "detail" : "list";
  if (country) {
    detailFromList = prev === "list";
    continent = country.continent;
    showDetail(country);
    return;
  }
  continent = CONTINENTS.some((c) => c.id === token) ? token : "asia";
  renderToken++;
  $("detail").hidden = true;
  $("list").hidden = false;
  renderContinents();
  const y = listScroll;
  listScroll = 0;
  window.scrollTo(0, 0);
  renderGrid().then(() => { if (lastKind === "list") window.scrollTo(0, y); });
}

$("continents").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) location.hash = b.dataset.id;
});
$("grid").addEventListener("click", (e) => {
  const b = e.target.closest(".card");
  if (b) { listScroll = window.scrollY; location.hash = b.dataset.code; }
});
// 목록에서 들어왔으면 브라우저 '뒤로'와 같게 돌아가고(기록이 쌓이지 않게),
// 바로 링크로 들어왔으면 현재 기록을 목록으로 바꾼다.
$("back").addEventListener("click", () => {
  if (detailFromList) history.back();
  else location.replace("#" + continent);
});
let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (flagSvg && $("flag").classList.contains("outline")) renderFlag(); }, 150);
});
$("mode-color").addEventListener("click", () => setMode(false));
$("mode-outline").addEventListener("click", () => setMode(true));
window.addEventListener("hashchange", route);
route();
