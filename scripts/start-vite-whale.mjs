#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const mode = process.argv[2] || "development";
const modeEnvDefaults = {
  development: {
    VITE_CHAINVIEW_API_BASE_URL: "/chainview-api",
    VITE_CHAINVIEW_DATA_SOURCE: "mock",
    VITE_CHAINVIEW_EMPLOYEE_NO: "8913812",
    VITE_CHAINVIEW_REMOTE_API_ENABLED: "false",
    VITE_CHAINVIEW_REMOTE_ORIGIN: "http://chainview.kro.kr:8080",
  },
  production: {
    VITE_CHAINVIEW_API_BASE_URL: "/chainview-api",
    VITE_CHAINVIEW_DATA_SOURCE: "api",
    VITE_CHAINVIEW_EMPLOYEE_NO: "8913812",
    VITE_CHAINVIEW_REMOTE_API_ENABLED: "true",
    VITE_CHAINVIEW_REMOTE_ORIGIN: "http://chainview.kro.kr:8080",
  },
  test: {
    VITE_CHAINVIEW_API_BASE_URL: "/chainview-api",
    VITE_CHAINVIEW_DATA_SOURCE: "api",
    VITE_CHAINVIEW_EMPLOYEE_NO: "8913812",
    VITE_CHAINVIEW_REMOTE_API_ENABLED: "true",
    VITE_CHAINVIEW_REMOTE_ORIGIN: "http://chainview.kro.kr:8080",
  },
};
const viteBin = path.join(
  projectRoot,
  "node_modules",
  "vite",
  "bin",
  "vite.js"
);
const whaleCandidates = (
  process.env.CHAINVIEW_BROWSER_APP ||
  "Whale,Naver Whale,네이버 웨일"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

let opened = false;

const vite = spawn(process.execPath, [viteBin, "--host", "0.0.0.0", "--mode", mode], {
  cwd: projectRoot,
  env: {
    ...(modeEnvDefaults[mode] || modeEnvDefaults.development),
    ...process.env,
  },
  stdio: ["inherit", "pipe", "pipe"],
});

vite.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  const plainText = stripAnsi(text);
  const url = plainText.match(/Local:\s+(http:\/\/[^\s]+)/)?.[1];
  if (url && !opened) {
    opened = true;
    openWhale(url);
  }
});

vite.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

vite.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    vite.kill(signal);
  });
});

async function openWhale(url) {
  if (process.platform === "win32") {
    spawnDetached("cmd", ["/c", "start", "", url]);
    return;
  }

  if (process.platform !== "darwin") {
    spawnDetached("xdg-open", [url]);
    return;
  }

  for (const appName of whaleCandidates) {
    const ok = await tryOpen(["-a", appName, url]);
    if (ok) {
      return;
    }
  }

  console.warn(
    `[start-vite-whale] Whale browser not found. Falling back to default browser: ${url}`
  );
  spawnDetached("open", [url]);
}

function tryOpen(args) {
  return new Promise((resolve) => {
    const child = spawn("open", args, { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function spawnDetached(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => {});
  child.unref();
}

function stripAnsi(text) {
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
