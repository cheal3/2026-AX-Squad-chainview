#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "http://chainview.kro.kr:8080";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

loadEnvFiles(projectRoot);

const configuredBaseUrl =
  process.env.CHAINVIEW_API_BASE_URL ||
  process.env.VITE_CHAINVIEW_API_BASE_URL ||
  process.env.VITE_CHAINVIEW_REMOTE_ORIGIN ||
  DEFAULT_BASE_URL;
const baseUrl = normalizeBaseUrl(
  configuredBaseUrl.startsWith("/")
    ? process.env.VITE_CHAINVIEW_REMOTE_ORIGIN || DEFAULT_BASE_URL
    : configuredBaseUrl
);
const employeeNo =
  process.env.CHAINVIEW_EMPLOYEE_NO ||
  process.env.VITE_CHAINVIEW_EMPLOYEE_NO ||
  "8913812";
const password =
  process.env.CHAINVIEW_PASSWORD || process.env.VITE_CHAINVIEW_PASSWORD || "";
const strictOptional =
  process.env.CHAINVIEW_TEST_STRICT_OPTIONAL === "1" ||
  process.env.CHAINVIEW_TEST_STRICT_OPTIONAL === "true";

const cookieJar = new Map();
let csrfToken = null;

const collected = {
  commonCodeGroups: [],
  groupIds: [],
  incidentIds: [],
  infraNodeIds: [],
  notificationTemplateIds: [],
  serviceIds: [],
  serverIds: [],
  techStackIds: [],
};
const results = [];

main().catch((error) => {
  console.error(`\n[test-api-data] ${error.message}`);
  if (process.env.CHAINVIEW_DEBUG && error.cause) {
    console.error(error.cause);
  }
  process.exitCode = 1;
});

async function main() {
  console.log(`[test-api-data] API: ${baseUrl}`);
  console.log("[test-api-data] mock/dummy data is not imported or generated.");

  await establishSession();

  await required("GET /api/dashboard/overview", "/api/dashboard/overview");

  const services = await required("GET /api/services", "/api/services");
  collectIds("serviceIds", services, "serviceId");
  const servers = await required("GET /api/servers", "/api/servers");
  collectIds("serverIds", servers, "serverId");
  await required("GET /api/service-relations", "/api/service-relations");
  await required("GET /api/service-relations/graph", "/api/service-relations/graph");
  await required("GET /api/tech-stacks", "/api/tech-stacks");
  await required("GET /api/service-tech-stacks", "/api/service-tech-stacks");
  await required("GET /api/service-categories", "/api/service-categories");
  await required("GET /api/service-categories/tree", "/api/service-categories/tree");
  await required("GET /api/ownership/service-owners", "/api/ownership/service-owners");
  await required("GET /api/ownership/users", "/api/ownership/users");
  const groups = await required("GET /api/ownership/groups", "/api/ownership/groups");
  collectIds("groupIds", groups, "groupId");
  const incidents = await required("GET /api/incidents", "/api/incidents");
  collectIds("incidentIds", incidents, "incidentId");
  await required("GET /api/notification-histories", "/api/notification-histories");
  await required("GET /api/common-codes", "/api/common-codes");
  collected.commonCodeGroups = asArray(
    await required("GET /api/common-codes/groups", "/api/common-codes/groups")
  ).filter((value) => typeof value === "string");

  await optional("GET /api/topology/graph", "/api/topology/graph");
  await optional("GET /api/impact/preview", "/api/impact/preview");
  await optional("GET /api/statistics/operations", "/api/statistics/operations");
  await optional("GET /api/statistics/asset", "/api/statistics/asset");
  await optional("GET /api/statistics/dependency", "/api/statistics/dependency");
  await optional("GET /api/statistics/techstack", "/api/statistics/techstack");
  const infraNodes = await optional("GET /api/infra-nodes", "/api/infra-nodes");
  collectIds("infraNodeIds", infraNodes, "infraNodeId");
  const templates = await optional(
    "GET /api/notification-templates",
    "/api/notification-templates"
  );
  collectIds("notificationTemplateIds", templates, "templateId");
  await optional("GET /api/notification-templates/variable-keys", "/api/notification-templates/variable-keys");
  await optional("GET /api/health-check-jobs", "/api/health-check-jobs");
  await optional("GET /api/internal/monitoring/jobs", "/api/internal/monitoring/jobs");
  await optional("GET /api/assistant/services", "/api/assistant/services");
  await optional("GET /api/assistant/services/search", "/api/assistant/services/search", {
    keyword: firstText(services, "serviceName", "serviceCode"),
  });
  await optional("GET /api/assistant/runbooks/list", "/api/assistant/runbooks/list");
  await optional("GET /api/assistant/routing-rules", "/api/assistant/routing-rules");
  await optional("GET /api/assistant/routing-rules/meta", "/api/assistant/routing-rules/meta");
  await optional("GET /api/assistant/routing-rules/groups", "/api/assistant/routing-rules/groups");
  await optional("GET /api/assistant/incident-reports", "/api/assistant/incident-reports");

  await detailCalls("service", collected.serviceIds, [
    (id) => [`GET /api/services/${id}`, `/api/services/${id}`],
    (id) => [`GET /api/services/${id}/tech-stacks`, `/api/services/${id}/tech-stacks`],
    (id) => [`GET /api/services/${id}/relations/outgoing`, `/api/services/${id}/relations/outgoing`],
    (id) => [`GET /api/services/${id}/relations/incoming`, `/api/services/${id}/relations/incoming`],
    (id) => [`GET /api/services/${id}/incidents`, `/api/services/${id}/incidents`],
    (id) => [`GET /api/services/${id}/impact-preview`, `/api/services/${id}/impact-preview`],
    (id) => [`GET /api/services/${id}/change-history`, `/api/services/${id}/change-history`],
    (id) => [`GET /api/impact/services/${id}`, `/api/impact/services/${id}`],
    (id) => [`GET /api/ownership/services/${id}/owners`, `/api/ownership/services/${id}/owners`],
  ]);

  await detailCalls("server", collected.serverIds, [
    (id) => [`GET /api/servers/${id}`, `/api/servers/${id}`],
    (id) => [`GET /api/servers/${id}/incidents`, `/api/servers/${id}/incidents`],
  ]);

  await detailCalls("incident", collected.incidentIds, [
    (id) => [`GET /api/incidents/${id}`, `/api/incidents/${id}`],
    (id) => [`GET /api/incidents/${id}/impacts`, `/api/incidents/${id}/impacts`],
    (id) => [`GET /api/incidents/${id}/notifications`, `/api/incidents/${id}/notifications`],
    (id) => [`GET /api/incidents/${id}/notifications/targets`, `/api/incidents/${id}/notifications/targets`],
  ]);

  await detailCalls("owner group", collected.groupIds, [
    (id) => [`GET /api/ownership/groups/${id}/members`, `/api/ownership/groups/${id}/members`],
  ]);

  await detailCalls("infra node", collected.infraNodeIds, [
    (id) => [`GET /api/infra-nodes/${id}`, `/api/infra-nodes/${id}`],
    (id) => [`GET /api/infra-nodes/${id}/edges`, `/api/infra-nodes/${id}/edges`],
  ]);

  await detailCalls("notification template", collected.notificationTemplateIds, [
    (id) => [`GET /api/notification-templates/${id}`, `/api/notification-templates/${id}`],
  ]);

  for (const codeGroup of collected.commonCodeGroups) {
    await optional(
      `GET /api/common-codes/${codeGroup}`,
      `/api/common-codes/${encodeURIComponent(codeGroup)}`
    );
  }

  printSummary();
  const failedRequired = results.filter((result) => !result.ok && result.required);
  const failedOptional = results.filter((result) => !result.ok && !result.required);
  if (failedRequired.length || (strictOptional && failedOptional.length)) {
    throw new Error(
      `API 데이터 테스트 실패: required=${failedRequired.length}, optional=${failedOptional.length}`
    );
  }
}

async function establishSession() {
  if (await hasActiveApiSession()) {
    csrfToken = await fetchCsrfTokenFrom("/login");
    console.log("[test-api-data] active API session detected.");
    return;
  }

  const token = await fetchCsrfTokenFrom("/login");
  if (!token) {
    throw new Error("로그인 CSRF 토큰을 찾지 못했습니다.");
  }
  csrfToken = token;

  const response = await requestRaw("/login", {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      employeeNo,
      password,
      _csrf: token,
    }),
  });

  if (![302, 303, 307].includes(response.status)) {
    throw new Error(
      `로그인 실패: HTTP ${response.status}. CHAINVIEW_EMPLOYEE_NO/CHAINVIEW_PASSWORD 값을 확인해 주세요.`
    );
  }
  console.log(`[test-api-data] logged in as ${employeeNo}.`);
}

async function hasActiveApiSession() {
  const response = await requestRaw("/api/dashboard/overview", {
    headers: { Accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") || "";
  return response.ok && !contentType.includes("text/html");
}

async function required(label, pathname, query) {
  return runCheck({ label, pathname, query, required: true });
}

async function optional(label, pathname, query) {
  return runCheck({ label, pathname, query, required: false });
}

async function runCheck({ label, pathname, query, required }) {
  const startedAt = Date.now();
  try {
    const data = await requestJson(pathname, { query });
    const count = countRows(data);
    results.push({
      count,
      label,
      ms: Date.now() - startedAt,
      ok: true,
      required,
    });
    console.log(`${required ? "ok" : "ok?"} ${label} (${count} rows)`);
    return data;
  } catch (error) {
    results.push({
      error: error.message,
      label,
      ms: Date.now() - startedAt,
      ok: false,
      required,
    });
    console.error(`${required ? "fail" : "skip"} ${label}: ${error.message}`);
    if (required) {
      throw error;
    }
    return [];
  }
}

async function detailCalls(label, ids, factories) {
  if (!ids.length) {
    console.log(`[test-api-data] no ${label} IDs to expand.`);
    return;
  }

  for (const id of ids) {
    for (const makeCall of factories) {
      const [callLabel, pathname] = makeCall(id);
      await optional(callLabel, pathname);
    }
  }
}

async function requestJson(pathname, options = {}) {
  const response = await requestRaw(pathname, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}${text ? ` ${text.slice(0, 180)}` : ""}`
    );
  }
  if (contentType.includes("text/html")) {
    throw new Error("HTML 응답을 받았습니다. 로그인 세션 또는 API 경로를 확인해 주세요.");
  }
  if (!text) {
    return undefined;
  }
  if (contentType.includes("application/json") || /^[\[{]/.test(text.trim())) {
    const parsed = JSON.parse(text);
    if (isRecord(parsed) && ("success" in parsed || "data" in parsed)) {
      if (parsed.success === false) {
        throw new Error(parsed.message || "API response success=false");
      }
      return parsed.data;
    }
    return parsed;
  }
  return text;
}

async function requestRaw(pathname, options = {}) {
  const { query, ...fetchOptions } = options;
  let url = new URL(pathname, `${baseUrl}/`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  let response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      ...fetchOptions,
      headers: {
        Cookie: serializeCookies(),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    throw new Error(`API에 연결할 수 없습니다: ${baseUrl}`, { cause: error });
  }
  storeCookies(response);
  return response;
}

async function fetchCsrfTokenFrom(pathname) {
  const response = await requestRaw(pathname, {
    headers: { Accept: "text/html,application/xhtml+xml" },
  });
  if (response.status >= 300) {
    return null;
  }
  return extractCsrfToken(await response.text());
}

function storeCookies(response) {
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")?.split(/,(?=[^;,]+=)/) ?? [];

  setCookie.forEach((cookieText) => {
    const [pair] = cookieText.split(";");
    const [name, ...valueParts] = pair.split("=");
    if (name && valueParts.length > 0) {
      cookieJar.set(name.trim(), valueParts.join("=").trim());
    }
  });
}

function serializeCookies() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function extractCsrfToken(html) {
  const inputMatch =
    html.match(/name="_csrf"[^>]*value="([^"]+)"/) ??
    html.match(/value="([^"]+)"[^>]*name="_csrf"/);
  const metaMatch =
    html.match(/name="_csrf"[^>]*content="([^"]+)"/) ??
    html.match(/content="([^"]+)"[^>]*name="_csrf"/);
  return inputMatch?.[1] ?? metaMatch?.[1] ?? null;
}

function collectIds(targetKey, value, idKey) {
  const ids = asArray(value)
    .filter(isRecord)
    .map((row) => asNumber(row[idKey]))
    .filter((id) => id > 0);
  collected[targetKey] = [...new Set([...collected[targetKey], ...ids])];
}

function firstText(rows, ...keys) {
  for (const row of asArray(rows)) {
    if (!isRecord(row)) {
      continue;
    }
    for (const key of keys) {
      const text = asString(row[key]);
      if (text) {
        return text;
      }
    }
  }
  return "chainview";
}

function countRows(value) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (isRecord(value)) {
    return Object.keys(value).length;
  }
  return value === undefined ? 0 : 1;
}

function printSummary() {
  const ok = results.filter((result) => result.ok).length;
  const failedRequired = results.filter((result) => !result.ok && result.required);
  const failedOptional = results.filter((result) => !result.ok && !result.required);
  console.log("");
  console.log(`[test-api-data] checked=${results.length}, ok=${ok}, requiredFailed=${failedRequired.length}, optionalFailed=${failedOptional.length}`);
  console.log(`[test-api-data] services=${collected.serviceIds.length}, servers=${collected.serverIds.length}, incidents=${collected.incidentIds.length}, groups=${collected.groupIds.length}, infraNodes=${collected.infraNodeIds.length}`);
  if (failedOptional.length) {
    console.log("[test-api-data] optional failures:");
    failedOptional.forEach((result) => {
      console.log(`  - ${result.label}: ${result.error}`);
    });
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value, fallback = 0) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function loadEnvFiles(root) {
  [
    ".env",
    ".env.local",
    ".env.test",
    ".env.test.local",
    ".env.development",
    ".env.development.local",
  ].forEach((fileName) => {
    const filePath = path.join(root, fileName);
    if (!existsSync(filePath)) {
      return;
    }

    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return;
        }
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
          return;
        }
        const [, key, rawValue] = match;
        if (process.env[key] !== undefined) {
          return;
        }
        process.env[key] = rawValue
          .replace(/^['"]|['"]$/g, "")
          .replace(/\\n/g, "\n");
      });
  });
}
