import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "assets", "data");
const LEGACY_OUT_FILE = path.join(OUT_DIR, "ne-110m-admin0-countries.geojson");
const OUT_META = path.join(OUT_DIR, "world-map-meta.json");

const REQUESTED_SCALES = normalizeScaleList(process.env.NATURAL_EARTH_SCALES || process.env.NATURAL_EARTH_SCALE || "50m,10m");
const DEFAULT_SCALE = normalizeScale(process.env.NATURAL_EARTH_DEFAULT_SCALE || "50m");

function normalizeScale(value) {
  const scale = String(value || "").trim().toLowerCase();
  if (["10m", "50m", "110m"].includes(scale)) return scale;
  throw new Error("Unsupported Natural Earth scale. Use 10m, 50m, or 110m.");
}

function normalizeScaleList(value) {
  const scales = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeScale);

  return [...new Set(scales.length ? scales : ["50m", "10m"])];
}

function getLayerUrl(scale, layerName) {
  const envKey = `NATURAL_EARTH_${scale.toUpperCase().replace("M", "M")}_${layerName.toUpperCase()}_URL`;
  if (process.env[envKey]) return process.env[envKey];

  if (layerName === "coastline") {
    return `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_${scale}_coastline.geojson`;
  }

  if (layerName === "boundary") {
    return `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_${scale}_admin_0_boundary_lines_land.geojson`;
  }

  throw new Error(`Unknown layer: ${layerName}`);
}

function getOutFile(scale) {
  return path.join(OUT_DIR, `ne-${scale}-world-lines.geojson`);
}

async function fetchGeoJson(url, scale, layerName) {
  console.log(`Fetching Natural Earth ${layerName} (${scale}): ${url}`);
  const response = await fetch(url, {
    headers: { accept: "application/geo+json, application/json;q=0.9, */*;q=0.1" }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth ${layerName} (${scale}): HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    throw new Error(`Invalid Natural Earth ${layerName} (${scale}) GeoJSON payload`);
  }

  return {
    payload,
    meta: {
      layer: layerName,
      scale,
      url,
      last_modified: response.headers.get("last-modified") || "",
      etag: response.headers.get("etag") || "",
      content_length: response.headers.get("content-length") || "",
      source_feature_count: payload.features.length
    }
  };
}

function simplifyFeature(feature, layerName) {
  return {
    type: "Feature",
    properties: {
      layer: layerName,
      name: feature.properties?.NAME || feature.properties?.name || feature.properties?.ADMIN || ""
    },
    geometry: feature.geometry
  };
}

function keepLineFeature(feature) {
  return Boolean(feature?.geometry && ["LineString", "MultiLineString"].includes(feature.geometry.type));
}

async function buildScale(scale) {
  const coastline = await fetchGeoJson(getLayerUrl(scale, "coastline"), scale, "coastline");
  const boundaries = await fetchGeoJson(getLayerUrl(scale, "boundary"), scale, "admin0_boundary_lines_land");

  const features = [
    ...coastline.payload.features.filter(keepLineFeature).map((feature) => simplifyFeature(feature, "coastline")),
    ...boundaries.payload.features.filter(keepLineFeature).map((feature) => simplifyFeature(feature, "admin0_boundary_lines_land"))
  ];

  const merged = {
    type: "FeatureCollection",
    features
  };

  const outFile = getOutFile(scale);
  await fs.writeFile(outFile, JSON.stringify(merged), "utf8");

  console.log(`World line map written: ${path.relative(ROOT, outFile)}`);
  console.log(`Scale ${scale}: ${features.length} line features`);

  return {
    scale,
    file: path.relative(ROOT, outFile).replaceAll(path.sep, "/"),
    url_path: `/assets/data/${path.basename(outFile)}`,
    feature_count: features.length,
    dataset: `Natural Earth 1:${scale} coastline + admin-0 land boundary lines`,
    geometry_policy: "line_based_no_polygon_rings",
    sources: [coastline.meta, boundaries.meta]
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const builtScales = [];
  for (const scale of REQUESTED_SCALES) {
    builtScales.push(await buildScale(scale));
  }

  const defaultBuilt = builtScales.find((item) => item.scale === DEFAULT_SCALE) || builtScales[0];
  if (!defaultBuilt) throw new Error("No Natural Earth map was built.");

  await fs.copyFile(path.join(ROOT, defaultBuilt.file), LEGACY_OUT_FILE);

  const meta = {
    generated_at: new Date().toISOString(),
    default_scale: defaultBuilt.scale,
    available_scales: builtScales.map((item) => item.scale),
    legacy_compatibility_file: path.relative(ROOT, LEGACY_OUT_FILE).replaceAll(path.sep, "/"),
    lod_policy: {
      default_scale: "50m",
      high_detail_scale: "10m",
      high_detail_zoom_threshold: 7.5
    },
    maps: builtScales.reduce((acc, item) => {
      acc[item.scale] = item;
      return acc;
    }, {})
  };

  await fs.writeFile(OUT_META, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.log(`Legacy compatibility map written: ${path.relative(ROOT, LEGACY_OUT_FILE)}`);
  console.log(`World map meta written: ${path.relative(ROOT, OUT_META)}`);
  console.log(`Available scales: ${builtScales.map((item) => item.scale).join(", ")}`);
  console.log(`Default scale: ${defaultBuilt.scale}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
