// 받은 SVG 문자열을 화면에 넣기 좋게 정리한다.
const SHAPES = /^(path|rect|circle|ellipse|line|polyline|polygon|text|use)$/i;
const SKIP = /^(defs|clipPath|mask|pattern|symbol|marker|linearGradient|radialGradient)$/i;

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3]).trim() : null;
}

export function prepareSvg(text) {
  let s = String(text);
  s = s.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "").replace(/<script\b[^>]*\/>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
  // 루트 <svg> 태그만 손질
  s = s.replace(/<svg\b[^>]*>/i, (tag) => {
    tag = tag.replace(/\s(?:width|height|preserveAspectRatio)\s*=\s*("[^"]*"|'[^']*')/gi, "");
    return tag.replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"');
  });
  // 테두리 모드용 표시: 칠이 없는 요소(조상 g의 fill="none" 포함)는 data-nofill,
  // 선(stroke)으로 그린 요소(조상에서 물려받은 선 포함)는 data-stroked.
  const stack = [{ fill: null, stroke: null, skip: false }];
  s = s.replace(/<(\/?)([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g, (m, close, name, attrs, slash) => {
    if (close) { if (stack.length > 1) stack.pop(); return m; }
    const top = stack[stack.length - 1];
    const fill = attr(attrs, "fill") ?? top.fill;
    const stroke = attr(attrs, "stroke") ?? top.stroke;
    const skip = top.skip || SKIP.test(name);
    if (!slash) stack.push({ fill, stroke, skip });
    if (/^svg$/i.test(name)) return m;
    let add = "";
    if (fill === "none" && !/data-nofill/.test(attrs)) add += ' data-nofill=""';
    if (!skip && SHAPES.test(name) && stroke && stroke !== "none" && !/data-stroked/.test(attrs)) add += ' data-stroked=""';
    return add ? `<${name}${attrs}${add}${slash}>` : m;
  });
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
