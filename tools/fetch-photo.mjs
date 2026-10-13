// 위키미디어 공용 사진을 가로 800px로 받아 assets/photos에 저장하고 출처를 JSON으로 출력한다.
// 사용법: node tools/fetch-photo.mjs "File:이름.jpg" kr-1.jpg
import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const UA = { "User-Agent": "world-flags-drawing/1.0 (education)" };
const ALLOWED = ["Public domain", "CC0", "CC BY", "CC BY-SA"];

export function normalizeLicense(shortName) {
  const s = (shortName || "").trim();
  if (/^public domain$/i.test(s) || /^PD\b/i.test(s)) return "Public domain";
  if (/^CC0/i.test(s)) return "CC0";
  const m = s.match(/^CC BY(-SA)? (\d\.\d)/i);
  if (m) return `CC BY${m[1] ? "-SA" : ""} ${m[2]}`;
  return null;
}

export function plainAuthor(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "알 수 없음";
}

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429 && res.status < 500) return res;
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`요청 실패: ${url}`);
}

async function main([title, outName]) {
  if (!title || !outName) throw new Error('사용법: node tools/fetch-photo.mjs "File:이름.jpg" kr-1.jpg');
  const api = "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
    + "&iiprop=url|extmetadata&iiurlwidth=800&titles=" + encodeURIComponent(title);
  const page = Object.values((await (await get(api)).json()).query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) throw new Error(`파일 없음: ${title}`);
  const meta = info.extmetadata || {};
  const license = normalizeLicense(meta.LicenseShortName?.value);
  if (!license) {
    console.error(`허용되지 않는 라이선스: ${meta.LicenseShortName?.value}`);
    process.exit(1);
  }
  const img = await get(info.thumburl || info.url);
  if (!img.ok) throw new Error(`이미지 받기 실패: ${img.status}`);
  const dest = fileURLToPath(new URL(`../assets/photos/${outName}`, import.meta.url));
  await writeFile(dest, Buffer.from(await img.arrayBuffer()));
  console.log(JSON.stringify({
    file: outName,
    source: info.descriptionurl,
    author: plainAuthor(meta.Artist?.value),
    license,
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
