const fs = require("node:fs");
const path = require("node:path");

const SOURCE_WIDTH = 8800;
const SOURCE_HEIGHT = 5806;
const MAP_WIDTH = 100;
const MAP_SCALE = MAP_WIDTH / SOURCE_WIDTH;
const MAP_HEIGHT = SOURCE_HEIGHT * MAP_SCALE;

const DEFAULT_SOURCE = path.join(__dirname, "..", "site", "assets", "ag-political-map.svg");
const DEFAULT_OUTPUT = path.join(__dirname, "..", "site", "js", "app", "tradeMapShapes.js");

function readAttr(tag, attr) {
  const pattern = new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, "i");
  return tag.match(pattern)?.[1] || "";
}

function parseDimension(value, fallback) {
  const parsed = Number.parseFloat(String(value || "").replace("px", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSvgMap(filePath = DEFAULT_SOURCE) {
  const source = fs.readFileSync(filePath, "utf8");
  const svgTag = source.match(/<svg\b[^>]*>/i)?.[0] || "";
  const paths = [...source.matchAll(/<path\b[^>]*>/gi)].map((match, index) => {
    const tag = match[0];
    return {
      index,
      tag,
      path: readAttr(tag, "d"),
      fill: readAttr(tag, "fill"),
      transform: readAttr(tag, "transform")
    };
  });

  return {
    source,
    width: parseDimension(readAttr(svgTag, "width"), SOURCE_WIDTH),
    height: parseDimension(readAttr(svgTag, "height"), SOURCE_HEIGHT),
    paths
  };
}

function parseColor(fill) {
  const value = String(fill || "").trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return null;
  const full = hex.length === 3
    ? hex.split("").map((char) => char + char).join("")
    : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return {
    hex: `#${full.toUpperCase()}`,
    r,
    g,
    b,
    chroma: max - min,
    luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b
  };
}

function parseTranslate(transform) {
  const match = String(transform || "").match(/translate\(\s*([-+0-9.eE]+)(?:[\s,]+([-+0-9.eE]+))?\s*\)/);
  if (!match) return { x: 0, y: 0 };
  return {
    x: Number.parseFloat(match[1]) || 0,
    y: Number.parseFloat(match[2]) || 0
  };
}

function pathNumbers(pathData) {
  return (String(pathData || "").match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || [])
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));
}

function pathBBox(pathData, transform) {
  const numbers = pathNumbers(pathData);
  const translate = parseTranslate(transform);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let index = 0; index < numbers.length - 1; index += 2) {
    const x = numbers[index] + translate.x;
    const y = numbers[index + 1] + translate.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    area: (maxX - minX) * (maxY - minY)
  };
}

function normalizeBBox(bbox) {
  return {
    x: Number((bbox.minX * MAP_SCALE).toFixed(6)),
    y: Number((bbox.minY * MAP_SCALE).toFixed(6)),
    width: Number((bbox.width * MAP_SCALE).toFixed(6)),
    height: Number((bbox.height * MAP_SCALE).toFixed(6))
  };
}

function normalizedCentroid(bbox) {
  return {
    x: Number(((bbox.minX + bbox.width / 2) * MAP_SCALE).toFixed(6)),
    y: Number(((bbox.minY + bbox.height / 2) * MAP_SCALE).toFixed(6))
  };
}

function normalizedTransform(transform) {
  const translate = parseTranslate(transform);
  const x = Number((translate.x * MAP_SCALE).toFixed(8));
  const y = Number((translate.y * MAP_SCALE).toFixed(8));
  return `matrix(${MAP_SCALE.toFixed(10)} 0 0 ${MAP_SCALE.toFixed(10)} ${x} ${y})`;
}

function candidateConfidence(bbox, color) {
  const areaScore = Math.min(0.34, bbox.area / 3200000);
  const shapeScore = Math.min(0.26, Math.max(bbox.width, bbox.height) / 2600);
  const colorScore = Math.min(0.22, color.chroma / 210);
  const brightnessScore = color.luminance > 32 && color.luminance < 212 ? 0.14 : 0.06;
  return Number((0.18 + areaScore + shapeScore + colorScore + brightnessScore).toFixed(3));
}

function isTerritoryCandidate(entry, bbox, color, options) {
  if (!entry.path || !color || !bbox) return false;
  if (color.chroma < options.minChroma) return false;
  if (color.luminance < options.minLuminance || color.luminance > options.maxLuminance) return false;
  if (bbox.area < options.minArea) return false;
  if (bbox.width < options.minSide || bbox.height < options.minSide) return false;
  if (bbox.width > SOURCE_WIDTH * 0.92 && bbox.height > SOURCE_HEIGHT * 0.82) return false;
  return true;
}

function extractTerritoryCandidates(svg, options = {}) {
  const settings = {
    minArea: 25000,
    minSide: 34,
    minChroma: 12,
    minLuminance: 26,
    maxLuminance: 225,
    ...options
  };

  return svg.paths
    .map((entry) => {
      const color = parseColor(entry.fill);
      const bbox = pathBBox(entry.path, entry.transform);
      if (!isTerritoryCandidate(entry, bbox, color, settings)) return null;
      return {
        id: `svg_path_${entry.index}`,
        nationId: "",
        label: "",
        needsReview: true,
        sourcePathIndex: entry.index,
        fill: color.hex,
        color: color.hex,
        path: entry.path,
        transform: normalizedTransform(entry.transform),
        bbox: normalizeBBox(bbox),
        centroid: normalizedCentroid(bbox),
        sourceArea: Math.round(bbox.area),
        confidence: candidateConfidence(bbox, color)
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.sourceArea - left.sourceArea);
}

function buildShapeManifest(candidates, svg) {
  return {
    version: "20260602-real-svg-map",
    assetPath: "assets/ag-political-map.svg",
    source: {
      width: svg.width,
      height: svg.height,
      pathCount: svg.paths.length
    },
    viewBox: {
      width: MAP_WIDTH,
      height: Number(MAP_HEIGHT.toFixed(6)),
      sourceWidth: SOURCE_WIDTH,
      sourceHeight: SOURCE_HEIGHT,
      scale: Number(MAP_SCALE.toFixed(10))
    },
    territories: candidates
  };
}

function renderShapeManifestScript(candidates, svg) {
  const manifest = buildShapeManifest(candidates, svg);
  return `(function () {\n  const root = typeof window !== "undefined" ? window : globalThis;\n  root.AGGS_TRADE_MAP_SHAPES = ${JSON.stringify(manifest, null, 2)};\n})();\n`;
}

function writeManifest({ sourcePath = DEFAULT_SOURCE, outputPath = DEFAULT_OUTPUT } = {}) {
  const svg = readSvgMap(sourcePath);
  const candidates = extractTerritoryCandidates(svg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderShapeManifestScript(candidates, svg), "utf8");
  return { outputPath, candidates: candidates.length, paths: svg.paths.length };
}

if (require.main === module) {
  const result = writeManifest();
  console.log(`Extracted ${result.candidates} territory candidates from ${result.paths} SVG paths.`);
  console.log(`Wrote ${path.relative(process.cwd(), result.outputPath)}`);
}

module.exports = {
  SOURCE_WIDTH,
  SOURCE_HEIGHT,
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_SCALE,
  buildShapeManifest,
  extractTerritoryCandidates,
  readSvgMap,
  renderShapeManifestScript,
  writeManifest
};
