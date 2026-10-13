// 지도 만들기·테스트가 함께 쓰는 지형 데이터 준비 코드.
import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoArea, geoContains, geoNaturalEarth1, geoPath } from "d3-geo";

export const WIDTH = 960;
export const HEIGHT = 500;
export const CRIMEA_POINT = [34.1, 45.3]; // 크림반도 중심(경도, 위도)
export const DOKDO_POINT = [131.87, 37.24]; // 독도(경도, 위도)
export const SMALL_PX = 6; // 이보다 작으면 위치 동그라미를 더한다

const atlasUrl = new URL("../node_modules/world-atlas/countries-50m.json", import.meta.url);

const polygonsOf = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

const asGeometry = (polys) =>
  polys.length === 1
    ? { type: "Polygon", coordinates: polys[0] }
    : { type: "MultiPolygon", coordinates: polys };

/** 지형 데이터를 읽는다. 남극 제외, 크림반도는 러시아(643)에서 우크라이나(804)로 옮긴다. */
export function loadFeatures() {
  const atlas = JSON.parse(readFileSync(atlasUrl, "utf8"));
  let features = feature(atlas, atlas.objects.countries).features.filter((f) => f.id !== "010");

  // 같은 id(036)가 둘: 오스트레일리아와 애시모어 카르티어 제도. 이름으로 구분해 id를 달리한다.
  features = features.map((f) =>
    f.id === "036" && f.properties.name !== "Australia" ? { ...f, id: "036-islets" } : f,
  );

  const russia = features.find((f) => f.id === "643");
  const ukraine = features.find((f) => f.id === "804");
  const rPolys = polygonsOf(russia.geometry);
  const crimea = rPolys.filter((p) => geoContains({ type: "Polygon", coordinates: p }, CRIMEA_POINT));
  if (crimea.length !== 1) throw new Error(`크림 폴리곤을 찾지 못했어요 (${crimea.length})`);
  russia.geometry = asGeometry(rPolys.filter((p) => !crimea.includes(p)));
  ukraine.geometry = asGeometry([...polygonsOf(ukraine.geometry), ...crimea]);
  return features;
}

export function makeProjection(features) {
  return geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: "FeatureCollection", features });
}

export const MIN_STEP_PX = 1.4; // 투영한 뒤 이보다 가까운 점은 버려서 파일을 줄인다

// 점이 너무 촘촘하면 솎아내는 스트림 감싸개 (선의 처음·끝 점은 남긴다)
function thin(sink) {
  let last = null;
  let pending = null;
  return {
    point(x, y) {
      if (last === null) { last = [x, y]; pending = null; sink.point(x, y); return; }
      if (Math.hypot(x - last[0], y - last[1]) >= MIN_STEP_PX) {
        last = [x, y]; pending = null; sink.point(x, y);
      } else {
        pending = [x, y];
      }
    },
    lineStart() { last = null; pending = null; sink.lineStart(); },
    lineEnd() { if (pending) sink.point(pending[0], pending[1]); last = pending = null; sink.lineEnd(); },
    polygonStart() { sink.polygonStart(); },
    polygonEnd() { sink.polygonEnd(); },
    sphere() { sink.sphere(); },
  };
}

export function makePath(projection) {
  const thinned = { stream: (sink) => projection.stream(thin(sink)) };
  const path = geoPath(thinned).digits(1);
  // bounds는 솎지 않은 정확한 투영으로 잰다
  const exact = geoPath(projection);
  path.bounds = exact.bounds;
  return path;
}

/** 가장 넓은 덩어리 하나(작은 섬이 많은 나라는 본섬 기준으로 크기를 잰다). */
export function largestPart(geometry) {
  const polys = polygonsOf(geometry);
  let best = polys[0];
  let bestArea = -1;
  for (const p of polys) {
    const a = geoArea({ type: "Polygon", coordinates: p });
    if (a > bestArea) { best = p; bestArea = a; }
  }
  return { type: "Polygon", coordinates: best };
}

/** 대상 나라가 작아서 동그라미가 필요한가. 필요하면 동그라미 중심(px)을 돌려준다. */
export function smallMarker(feat, path) {
  const [[x0, y0], [x1, y1]] = path.bounds(largestPart(feat.geometry));
  if (x1 - x0 < SMALL_PX && y1 - y0 < SMALL_PX) return [(x0 + x1) / 2, (y0 + y1) / 2];
  return null;
}

export const MIN_LAND_PX = 2; // 배경 땅에서 이보다 작은 섬은 그리지 않는다

/** 배경으로 그릴 땅: 아주 작은 섬(점으로 보이는 것)은 빼서 파일을 줄인다. */
export function landOnly(feat, path) {
  const polys = (feat.geometry.type === "Polygon" ? [feat.geometry.coordinates] : feat.geometry.coordinates)
    .filter((p) => {
      const [[x0, y0], [x1, y1]] = path.bounds({ type: "Polygon", coordinates: p });
      return Math.max(x1 - x0, y1 - y0) >= MIN_LAND_PX;
    });
  if (!polys.length) return null;
  return { ...feat, geometry: { type: "MultiPolygon", coordinates: polys } };
}
