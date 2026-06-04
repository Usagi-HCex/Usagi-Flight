import { spawn } from "node:child_process";
import process from "node:process";

const TARGETS = new Set(["pages", "workers"]);

function parseArgs(argv) {
  const options = {
    target: process.env.FLIGHT_LOG_DEPLOY_TARGET || "pages"
  };

  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length).trim();
    }
  }

  options.target = String(options.target || "pages").toLowerCase();
  if (!TARGETS.has(options.target)) {
    throw new Error(`Unsupported build target: ${options.target}`);
  }

  return options;
}

function resolveProcess(command, args) {
  if (process.platform !== "win32") {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].join(" ")]
  };
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const childProcess = resolveProcess(command, args);
    const child = spawn(childProcess.command, childProcess.args, {
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await run("npm", ["run", "build"]);

  if (options.target === "workers") {
    await run("node", ["tools/prepare-workers-build.mjs"]);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
