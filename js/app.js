import { CONTINENTS } from "../data/countries.js";
import { countriesIn, findCountry } from "./model.js";
import { prepareSvg, scopeIds } from "./svg.js";

const $ = (id) => document.getElementById(id);
const cache = new Map();
let continent = "asia";
let renderToken = 0;

let uid = 0;
const scoped = (svg) => scopeIds(svg, "s" + ++uid + "-");

function loadSvg(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(url)))).then(prepareSvg));
  }
  return cache.get(url);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderContinents() {
  $("continents").innerHTML = CONTINENTS.map((c) =>
    `<button type="button" data-id="${c.id}" aria-pressed="${c.id === continent}"><span class="dot" style="background:${c.color}"></span>${c.name}</button>`).join("");
}

async function renderGrid() {
  const token = ++renderToken;
  const list = countriesIn(continent);
  const svgs = await Promise.all(list.map((c) => loadSvg(`assets/flags/${c.code}.svg`).catch(() => "")));
  if (token !== renderToken) return;
  $("grid").innerHTML = list.map((c, i) =>
    `<button type="button" class="card" data-code="${c.code}"><span class="thumb">${scoped(svgs[i])}</span><span>${c.name}</span></button>`).join("");
}

function setMode(outline) {
  $("flag").classList.toggle("outline", outline);
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
      (p ? `<p class="credit">사진: <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.author)}</a> · ${esc(p.license)}</p>` : "") +
      `</article>`;
  }).join("");
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
  $("flag").innerHTML = scoped(flag);
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
  const token = decodeURIComponent(location.hash.replace(/^#/, ""));
  const country = findCountry(token);
  if (country) {
    continent = country.continent;
    showDetail(country);
    return;
  }
  continent = CONTINENTS.some((c) => c.id === token) ? token : "asia";
  renderToken++;
  $("detail").hidden = true;
  $("list").hidden = false;
  renderContinents();
  renderGrid();
}

$("continents").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) location.hash = b.dataset.id;
});
$("grid").addEventListener("click", (e) => {
  const b = e.target.closest(".card");
  if (b) location.hash = b.dataset.code;
});
$("back").addEventListener("click", () => { location.hash = continent; });
$("mode-color").addEventListener("click", () => setMode(false));
$("mode-outline").addEventListener("click", () => setMode(true));
window.addEventListener("hashchange", route);
route();
