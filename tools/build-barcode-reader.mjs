import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "assets", "vendor");
const require = createRequire(import.meta.url);

const browserPackagePath = require.resolve("@zxing/browser/package.json");
const browserPackageDir = path.dirname(browserPackagePath);
const sourcePath = path.join(browserPackageDir, "umd", "zxing-browser.min.js");
const targetPath = path.join(OUT_DIR, "zxing-browser.min.js");
const noticePath = path.join(OUT_DIR, "zxing-browser.NOTICE.txt");

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.copyFile(sourcePath, targetPath);
await fs.writeFile(
  noticePath,
  [
    "ZXing browser barcode reader",
    "",
    "This generated static vendor asset is copied from @zxing/browser during build.",
    "@zxing/browser is licensed under the MIT License.",
    "@zxing/library, bundled by @zxing/browser, is licensed under the Apache License 2.0.",
    ""
  ].join("\n"),
  "utf8"
);

console.log(`Barcode reader written: ${path.relative(ROOT, targetPath)}`);
