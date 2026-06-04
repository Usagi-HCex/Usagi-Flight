import path from "node:path";
import fs from "fs-extra";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const WORKER_ENTRY = path.join(ROOT, "workers", "api-assets-router.js");

async function assertFile(filePath, message) {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(message);
  }
}

async function main() {
  await assertFile(
    path.join(DIST_DIR, "index.html"),
    "dist/index.html is missing. Run npm run build before preparing Workers deployment."
  );
  await assertFile(
    WORKER_ENTRY,
    "workers/api-assets-router.js is missing."
  );

  console.log("");
  console.log("Workers target is ready.");
  console.log("Static assets: ./dist");
  console.log("Worker entry: ./workers/api-assets-router.js");
  console.log("Deploy with a Workers wrangler config that binds DB and ASSETS.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
