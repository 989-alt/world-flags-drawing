import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareSvg, scopeIds } from "../js/svg.js";

test("prepareSvg removes size, scripts, handlers; keeps viewBox", () => {
  const out = prepareSvg('<svg width="10" height="5" viewBox="0 0 10 5" onload="x()"><script>1</script></svg>');
  assert.ok(!out.includes("width="));
  assert.ok(!out.includes("onload"));
  assert.ok(!out.includes("<script"));
  assert.ok(out.includes('viewBox="0 0 10 5"'));
  assert.ok(out.includes('preserveAspectRatio="xMidYMid meet"'));
});

test("prepareSvg keeps child width and marks fill=none with data-nofill", () => {
  const out = prepareSvg('<svg viewBox="0 0 10 5"><rect width="4" height="2" fill="#fff"/><path d="M0 0" fill="none" stroke="#000"/></svg>');
  assert.ok(out.includes('<rect width="4"'));
  assert.match(out, /<path[^>]*data-nofill/);
  assert.ok(!/<rect[^>]*data-nofill/.test(out));
});

test("scopeIds prefixes ids and references", () => {
  const out = scopeIds('<svg><path id="a"/><use xlink:href="#a"/><rect fill="url(#a)"/></svg>', "p-");
  assert.ok(out.includes('id="p-a"') && out.includes('href="#p-a"') && out.includes("url(#p-a)"));
});

test("prepareSvg marks descendants of g[fill=none] with data-nofill, not overridden children", () => {
  const out = prepareSvg('<svg viewBox="0 0 10 5"><g fill="none" stroke="#000"><path id="a" d="M0 0"/><circle r="1" fill="#f00"/></g><rect width="1" height="1"/></svg>');
  assert.match(out, /<path id="a"[^>]*data-nofill/);
  assert.ok(!/<circle[^>]*data-nofill/.test(out));
  assert.ok(!/<rect[^>]*data-nofill/.test(out));
});

test("prepareSvg marks stroked shapes (own or inherited stroke) with data-stroked", () => {
  const out = prepareSvg('<svg viewBox="0 0 10 5"><path d="M0 1h10" stroke="#fff" stroke-width="3"/>' +
    '<g stroke="#000"><rect width="1" height="1"/><circle r="1" stroke="none"/></g>' +
    '<defs><path id="d" d="M0 0" stroke="#000"/></defs><rect width="2" height="2" fill="#00f"/></svg>');
  assert.match(out, /<path d="M0 1h10"[^>]*data-stroked/);
  assert.match(out, /<g stroke="#000"><rect[^>]*data-stroked/);
  assert.ok(!/<circle[^>]*data-stroked/.test(out));
  assert.ok(!/<path id="d"[^>]*data-stroked/.test(out));
  assert.ok(!/<g[^>]*data-stroked/.test(out));
  assert.ok(!/fill="#00f"[^>]*data-stroked/.test(out));
});
