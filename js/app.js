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
  if (map) { $("map").innerHTML = scoped(map); $("map-box").hidden = false; }
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
