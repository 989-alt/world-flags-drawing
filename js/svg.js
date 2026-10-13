// 받은 SVG 문자열을 화면에 넣기 좋게 정리한다.
export function prepareSvg(text) {
  let s = String(text);
  s = s.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "").replace(/<script\b[^>]*\/>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
  // 루트 <svg> 태그만 손질
  s = s.replace(/<svg\b[^>]*>/i, (tag) => {
    tag = tag.replace(/\s(?:width|height|preserveAspectRatio)\s*=\s*("[^"]*"|'[^']*')/gi, "");
    return tag.replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"');
  });
  // 원래 fill="none"인 요소는 테두리 모드에서 그대로 두도록 표시
  s = s.replace(/<(?!svg\b)([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g, (m, name, attrs, slash) =>
    /\sfill\s*=\s*("none"|'none')/.test(attrs) && !/data-nofill/.test(attrs)
      ? `<${name}${attrs} data-nofill=""${slash}>` : m);
  return s;
}

// 한 화면에 SVG가 여러 개 있어도 id(#a 같은)가 서로 섞이지 않게 이름 앞에 붙인다.
export function scopeIds(svg, prefix) {
  const ids = [...svg.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
  if (!ids.length) return svg;
  return svg
    .replace(/(\sid\s*=\s*")([^"]+)"/g, `$1${prefix}$2"`)
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, `url(#${prefix}$1)`)
    .replace(/((?:xlink:)?href\s*=\s*")#([^"]+)"/g, `$1#${prefix}$2"`);
}
