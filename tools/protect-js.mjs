import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import JavaScriptObfuscator from "javascript-obfuscator";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "dist");

const STATIC_PATTERNS = [
  "*.html",
  "*.css",
  "*.js",
  "*.ico",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.webp",
  "*.gif",
  "*.svg",
  "*.webmanifest",
  "*.pdf",
  "*.mobileconfig",
  "mobile/**/*.html",
  "assets/**"
];

const IGNORE_PATTERNS = [
  "node_modules/**",
  "dist/**",
  ".git/**",
  ".wrangler/**",
  "functions/**",
  "api/**",
  "tools/**",
  ".env",
  ".env.*",
  ".dev.vars",
  ".dev.vars.*",
  "wrangler.toml",
  "wrangler.json",
  "wrangler.jsonc",
  "package.json",
  "package-lock.json"
];

const SERVER_JS_FILES = new Set([
  "_d1session.js",
  "_flight_crypto.js",
  "flights.js",
  "flight.js",
  "export_flights.js"
]);

const PERFORMANCE_SENSITIVE_JS_FILES = new Set([
  "assets/js/flight-map-renderer.js"
]);

function normalizePath(relativePath) {
  return relativePath.replaceAll("\\", "/");
}

function isProbablyServerJs(relativePath) {
  const normalized = normalizePath(relativePath);
  const base = path.basename(normalized);

  if (normalized.startsWith("functions/")) return true;
  if (normalized.startsWith("api/")) return true;
  if (SERVER_JS_FILES.has(base)) return true;

  return false;
}

function shouldObfuscateJsFile(relativePath) {
  const normalized = normalizePath(relativePath);

  if (!normalized.endsWith(".js")) return false;
  if (normalized === "sw.js") return false;
  if (normalized.startsWith("assets/vendor/")) return false;
  if (isProbablyServerJs(normalized)) return false;

  return true;
}

function isPerformanceSensitiveJsFile(relativePath) {
  return PERFORMANCE_SENSITIVE_JS_FILES.has(normalizePath(relativePath));
}

function isExternalScriptTag(attrs) {
  return /\bsrc\s*=/.test(attrs);
}

function isJavascriptScriptTag(attrs) {
  const typeMatch = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)["']?/i);

  if (!typeMatch) {
    return true;
  }

  const type = typeMatch[1].toLowerCase();

  return (
    type === "text/javascript" ||
    type === "application/javascript" ||
    type === "module"
  );
}

const BASE_OPTIONS = {
  compact: true,
  debugProtection: false,
  disableConsoleOutput: false,
  selfDefending: false,
  renameGlobals: false,
  identifierNamesGenerator: "hexadecimal",
  simplify: true,
  unicodeEscapeSequence: false,
  sourceMap: false
};

function obfuscate(code, profile = "standard") {
  const profileOptions = profile === "performance"
    ? {
        controlFlowFlattening: false,
        deadCodeInjection: false,
        numbersToExpressions: false,
        stringArray: true,
        stringArrayEncoding: [],
        stringArrayThreshold: 0.35,
        stringArrayCallsTransform: false,
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        splitStrings: false
      }
    : {
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.18,
        deadCodeInjection: false,
        numbersToExpressions: true,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.35,
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersType: "variable",
        splitStrings: true,
        splitStringsChunkLength: 12
      };

  return JavaScriptObfuscator.obfuscate(code, {
    ...BASE_OPTIONS,
    ...profileOptions
  }).getObfuscatedCode();
}

function obfuscateInlineScripts(html, relativePath) {
  return html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs, code) => {
      if (isExternalScriptTag(attrs)) {
        return full;
      }

      if (!isJavascriptScriptTag(attrs)) {
        return full;
      }

      if (!code.trim()) {
        return full;
      }

      try {
        const protectedCode = obfuscate(code, "standard");
        return `<script${attrs}>${protectedCode}</script>`;
      } catch (error) {
        console.warn(`Skipped inline script in ${relativePath}: ${error.message}`);
        return full;
      }
    }
  );
}

async function main() {
  await fs.remove(OUT_DIR);
  await fs.ensureDir(OUT_DIR);

  const files = await fg(STATIC_PATTERNS, {
    cwd: ROOT,
    dot: false,
    onlyFiles: true,
    ignore: IGNORE_PATTERNS
  });

  for (const relativePath of files) {
    const sourcePath = path.join(ROOT, relativePath);
    const targetPath = path.join(OUT_DIR, relativePath);

    await fs.ensureDir(path.dirname(targetPath));

    if (relativePath.endsWith(".html")) {
      const html = await fs.readFile(sourcePath, "utf8");
      const protectedHtml = obfuscateInlineScripts(html, relativePath);
      await fs.writeFile(targetPath, protectedHtml, "utf8");
      console.log(`HTML protected: ${relativePath}`);
      continue;
    }

    if (shouldObfuscateJsFile(relativePath)) {
      const js = await fs.readFile(sourcePath, "utf8");
      const profile = isPerformanceSensitiveJsFile(relativePath) ? "performance" : "standard";
      const protectedJs = obfuscate(js, profile);
      await fs.writeFile(targetPath, protectedJs, "utf8");
      console.log(`JS protected (${profile}): ${relativePath}`);
      continue;
    }

    await fs.copy(sourcePath, targetPath);
    console.log(`Copied: ${relativePath}`);
  }

  console.log("");
  console.log("Done. Protected static files are in ./dist");
  console.log("Reminder: keep Cloudflare Pages Functions in ./functions, not inside ./dist.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
