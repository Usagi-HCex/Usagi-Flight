import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const ICON_DIR = path.join(ROOT, "assets", "icons");
const VIEWBOX_SIZE = 64;
const SAMPLE_COUNT = 3;

const OUTPUTS = [
  ["icon-180.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512]
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hexColor(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255
  ];
}

function lerpColor(from, to, t) {
  return [
    Math.round(mix(from[0], to[0], t)),
    Math.round(mix(from[1], to[1], t)),
    Math.round(mix(from[2], to[2], t)),
    Math.round(mix(from[3], to[3], t))
  ];
}

function linearGradient(x, y, x1, y1, x2, y2, from, to) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy));
  return lerpColor(from, to, t);
}

function composite(dst, src, alpha = 1) {
  const srcAlpha = clamp((src[3] / 255) * alpha);
  const dstAlpha = dst[3] / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

  if (outAlpha <= 0) return [0, 0, 0, 0];

  return [
    Math.round((src[0] * srcAlpha + dst[0] * dstAlpha * (1 - srcAlpha)) / outAlpha),
    Math.round((src[1] * srcAlpha + dst[1] * dstAlpha * (1 - srcAlpha)) / outAlpha),
    Math.round((src[2] * srcAlpha + dst[2] * dstAlpha * (1 - srcAlpha)) / outAlpha),
    Math.round(outAlpha * 255)
  ];
}

function roundedRectDistance(x, y, left, top, width, height, radius) {
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const qx = Math.abs(x - centerX) - (width / 2 - radius);
  const qy = Math.abs(y - centerY) - (height / 2 - radius);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSq) : 0;
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

function distanceToPolyline(x, y, points, closed = false) {
  let distance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    distance = Math.min(distance, distanceToSegment(x, y, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]));
  }
  if (closed) {
    const last = points[points.length - 1];
    const first = points[0];
    distance = Math.min(distance, distanceToSegment(x, y, last[0], last[1], first[0], first[1]));
  }
  return distance;
}

const BG_FROM = hexColor("#E0F7FF");
const BG_TO = hexColor("#38BDF8");
const PLANE_FROM = hexColor("#0284C7");
const PLANE_TO = hexColor("#0EA5E9");
const WHITE = hexColor("#FFFFFF");
const ORANGE = hexColor("#F59E0B");
const GREEN = hexColor("#10B981");
const PLANE_POLYGON = [[12, 37.5], [53, 14], [42.5, 51], [31.5, 39.5], [21.5, 49], [25.5, 35.5]];
const ORANGE_PATH = [[31.5, 39.5], [53, 14], [25.5, 35.5]];

function sampleIcon(x, y) {
  let color = linearGradient(x, y, 8, 8, 56, 56, BG_FROM, BG_TO);
  color[3] = 255;

  const rectDistance = roundedRectDistance(x, y, 5, 5, 54, 54, 16);
  if (Math.abs(rectDistance) <= 2) {
    color = composite(color, WHITE, 1);
  }

  if (pointInPolygon(x, y, PLANE_POLYGON)) {
    color = composite(color, WHITE, 0.72);
  }

  if (distanceToPolyline(x, y, PLANE_POLYGON, true) <= 1.5) {
    color = composite(color, linearGradient(x, y, 12, 38, 54, 14, PLANE_FROM, PLANE_TO), 1);
  }

  if (distanceToPolyline(x, y, ORANGE_PATH) <= 1.5) {
    color = composite(color, ORANGE, 1);
  }

  if (Math.hypot(x - 48, y - 18) <= 3.5) {
    color = composite(color, GREEN, 1);
  }

  return color;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}

function renderPng(size) {
  const rowBytes = size * 4 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  const samples = SAMPLE_COUNT * SAMPLE_COUNT;

  for (let py = 0; py < size; py += 1) {
    raw[py * rowBytes] = 0;
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SAMPLE_COUNT; sy += 1) {
        for (let sx = 0; sx < SAMPLE_COUNT; sx += 1) {
          const x = ((px + (sx + 0.5) / SAMPLE_COUNT) / size) * VIEWBOX_SIZE;
          const y = ((py + (sy + 0.5) / SAMPLE_COUNT) / size) * VIEWBOX_SIZE;
          const color = sampleIcon(x, y);
          r += color[0];
          g += color[1];
          b += color[2];
          a += color[3];
        }
      }

      const offset = py * rowBytes + 1 + px * 4;
      raw[offset] = Math.round(r / samples);
      raw[offset + 1] = Math.round(g / samples);
      raw[offset + 2] = Math.round(b / samples);
      raw[offset + 3] = Math.round(a / samples);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

await fs.mkdir(ICON_DIR, { recursive: true });

for (const [fileName, size] of OUTPUTS) {
  const buffer = renderPng(size);
  await fs.writeFile(path.join(ICON_DIR, fileName), buffer);
  if (size === 180) {
    await fs.writeFile(path.join(ROOT, "apple-touch-icon.png"), buffer);
  }
  console.log(`Icon written: ${path.relative(ROOT, path.join(ICON_DIR, fileName))}`);
}

console.log("Icon written: apple-touch-icon.png");
