#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "http://chainview.kro.kr:8080";
const DEFAULT_OUTPUT = "src/dashboardModule/mockData.generated.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

loadEnvFiles(projectRoot);

const baseUrl = normalizeBaseUrl(
  process.env.CHAINVIEW_API_BASE_URL ||
    process.env.VITE_CHAINVIEW_API_BASE_URL ||
    process.env.VITE_CHAINVIEW_REMOTE_ORIGIN ||
    DEFAULT_BASE_URL
);
const employeeNo =
  process.env.CHAINVIEW_EMPLOYEE_NO ||
  process.env.VITE_CHAINVIEW_EMPLOYEE_NO ||
  "8913812";
const password =
  process.env.CHAINVIEW_PASSWORD || process.env.VITE_CHAINVIEW_PASSWORD || "";
const outputPath = process.env.CHAINVIEW_MOCK_OUTPUT || DEFAULT_OUTPUT;
const absoluteOutputPath = path.resolve(projectRoot, outputPath);

const cookieJar = new Map();
let csrfToken = null;

main().catch((error) => {
  console.error(`\n[generate-mock-data] ${error.message}`);
  if (process.env.CHAINVIEW_DEBUG && error.cause) {
    console.error(error.cause);
  }
  process.exitCode = 1;
});

async function main() {
  console.log(`[generate-mock-data] API: ${baseUrl}`);
  await establishSession();

  const snapshot = await loadSnapshot();
  const source = buildGeneratedModule(snapshot);

  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, source, "utf8");

  console.log(
    `[generate-mock-data] wrote ${path.relative(projectRoot, absoluteOutputPath)}`
  );
  console.log(
    `[generate-mock-data] servers=${snapshot.servers.length}, services=${snapshot.services.length}, relations=${snapshot.relations.length}, techStacks=${snapshot.techStacks.length}, owners=${snapshot.owners.length}, incidents=${snapshot.incidents.length}, impacts=${snapshot.incidentImpacts.length}`
  );
}

async function establishSession() {
  const existingToken = await fetchCsrfTokenFrom("/admin/services");
  if (existingToken) {
    csrfToken = existingToken;
    return;
  }

  const token = await fetchCsrfTokenFrom("/login");
  if (!token) {
    return;
  }
  csrfToken = token;

  if (!password) {
    throw new Error(
      "로그인이 필요한 API입니다. CHAINVIEW_PASSWORD 또는 VITE_CHAINVIEW_PASSWORD를 설정해 주세요."
    );
  }

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
    throw new Error(`로그인 실패: HTTP ${response.status}`);
  }
}

async function loadSnapshot() {
  const serviceRows = await safeList("/api/services");
  const serviceDetails = await settleMap(serviceRows, (service) => {
    const serviceId = asNumber(service.serviceId);
    return serviceId ? requestJson(`/api/services/${serviceId}`) : null;
  });
  const detailsByServiceId = new Map(
    serviceDetails.filter(isRecord).map((detail) => [asNumber(detail.serviceId), detail])
  );

  const [serverRows, relationRows, ownerRows, serviceTechStackRows, incidentRows] =
    await Promise.all([
      safeList("/api/servers"),
      safeList("/api/service-relations"),
      safeList("/api/ownership/service-owners"),
      safeList("/api/service-tech-stacks"),
      safeList("/api/incidents"),
    ]);

  const incidents = await loadIncidentDetails(incidentRows);
  const incidentImpacts = await loadIncidentImpacts(incidents);

  return {
    servers: serverRows.map(mapServer),
    services: serviceRows.map((service) =>
      mapService(service, detailsByServiceId.get(asNumber(service.serviceId)))
    ),
    relations: relationRows.map(mapRelation),
    techStacks: serviceTechStackRows.map(mapTechStack),
    owners: ownerRows.map(mapOwner),
    incidents,
    incidentImpacts,
  };
}

async function loadIncidentDetails(rows) {
  const details = await settleMap(rows, (incident) => {
    const incidentId = asNumber(incident.incidentId);
    return incidentId ? requestJson(`/api/incidents/${incidentId}`) : incident;
  });

  return details.map((detail, index) =>
    mapIncident(isRecord(detail) ? detail : rows[index])
  );
}

async function loadIncidentImpacts(incidents) {
  const impactRows = await settleMap(incidents, (incident) =>
    requestJson(`/api/incidents/${incident.incidentId}/impacts`)
  );

  return impactRows.flatMap((rows, index) =>
    asRecordArray(rows).map((impact) =>
      mapIncidentImpact(incidents[index].incidentId, impact)
    )
  );
}

async function safeList(pathname) {
  try {
    return asRecordArray(await requestJson(pathname));
  } catch (error) {
    console.warn(`[generate-mock-data] optional API skipped: ${pathname}`);
    return [];
  }
}

async function settleMap(rows, load) {
  const settled = await Promise.allSettled(rows.map(load));
  return settled.map((result) =>
    result.status === "fulfilled" ? result.value : null
  );
}

async function requestJson(pathname, options = {}) {
  const response = await requestRaw(pathname, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof URLSearchParams)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken && options.method && options.method !== "GET"
        ? { "X-CSRF-TOKEN": csrfToken }
        : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(
      `${pathname} failed: HTTP ${response.status}${text ? ` ${text.slice(0, 180)}` : ""}`
    );
  }
  if (!text) {
    return undefined;
  }
  if (contentType.includes("application/json") || /^[\[{]/.test(text.trim())) {
    const parsed = JSON.parse(text);
    if (isRecord(parsed) && ("success" in parsed || "data" in parsed)) {
      if (parsed.success === false) {
        throw new Error(`${pathname} failed: ${parsed.message || "API error"}`);
      }
      return parsed.data;
    }
    return parsed;
  }
  return text;
}

async function requestRaw(pathname, options = {}) {
  let response;
  try {
    response = await fetch(new URL(pathname, `${baseUrl}/`), {
      redirect: "manual",
      ...options,
      headers: {
        Cookie: serializeCookies(),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `API에 연결할 수 없습니다: ${baseUrl}. 로컬 백엔드를 실행했는지 또는 CHAINVIEW_API_BASE_URL 값을 확인해 주세요.`,
      { cause: error }
    );
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

function mapServer(row) {
  const updatedAt = formatDateTime(row.updatedAt);
  return {
    serverId: asNumber(row.serverId),
    serverName: asString(row.serverName) || "이름 없는 서버",
    hostName: asString(row.hostName) || "-",
    ipAddress: asString(row.ipAddress) || "-",
    envCode: knownCode(row.envCode, ["PROD", "STAGE", "TEST", "DEV"], "DEV"),
    osTypeCode: knownCode(row.osTypeCode, ["LINUX", "WINDOWS", "UNIX", "ETC"], "ETC"),
    osVersion: asString(row.osVersion) || "-",
    statusCode: knownCode(
      row.statusCode,
      ["NORMAL", "INCIDENT", "MAINTENANCE", "INACTIVE"],
      "NORMAL"
    ),
    description: asString(row.description),
    createdAt: formatDateTime(row.createdAt) || updatedAt,
    updatedAt,
  };
}

function mapService(row, detail = {}) {
  const deployments = asRecordArray(detail.deployments);
  const primaryDeployment = deployments[0] || {};
  const updatedAt = formatDateTime(detail.updatedAt ?? row.updatedAt);
  return {
    serviceId: asNumber(row.serviceId),
    categoryPath: parseCategoryPath(detail.categoryPath ?? row.categoryPath),
    serviceCode: asString(detail.serviceCode ?? row.serviceCode),
    serviceName: asString(detail.serviceName ?? row.serviceName) || "이름 없는 서비스",
    serviceTypeCode: knownCode(
      detail.serviceTypeCode ?? row.serviceTypeCode,
      ["WEB", "API", "BATCH", "EXTERNAL"],
      "API"
    ),
    importanceCode: knownCode(
      detail.importanceCode ?? row.importanceCode,
      ["CRITICAL", "HIGH", "NORMAL", "LOW"],
      "NORMAL"
    ),
    statusCode: knownCode(
      detail.statusCode ?? row.statusCode,
      ["NORMAL", "INCIDENT", "IMPACTED", "MAINTENANCE", "INACTIVE"],
      "NORMAL"
    ),
    description: asString(detail.description),
    endpointUrl: asString(detail.endpointUrl),
    serverId: asNumber(primaryDeployment.serverId),
    deployPath:
      asString(primaryDeployment.deployPath) ||
      asString(row.deploymentHostsSummary),
    portInfo: asString(primaryDeployment.portInfo),
    deploymentStatusCode: knownCode(
      primaryDeployment.deploymentStatusCode,
      ["RUNNING", "STOPPED", "MAINTENANCE", "REMOVED"],
      "RUNNING"
    ),
    instanceCount:
      sumNumbers(deployments, "instanceCount") || asNumber(row.deploymentCount, 1),
    createdBy: "api",
    updatedBy: "api",
    createdAt: formatDateTime(detail.createdAt) || updatedAt,
    updatedAt,
  };
}

function mapRelation(row) {
  return {
    relationId: asNumber(row.relationId),
    sourceServiceId: asNumber(row.sourceServiceId),
    targetServiceId: asNumber(row.targetServiceId),
    relationTypeCode: knownCode(row.relationTypeCode, ["REST", "SOAP", "MQ", "FILE", "ETC"], "ETC"),
    mandatoryYn: row.mandatory === true ? "Y" : asYn(row.mandatoryYn),
    relationStatusCode: knownCode(row.relationStatusCode, ["ACTIVE", "INACTIVE", "DEPRECATED"], "ACTIVE"),
    description: asString(row.description),
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt),
  };
}

function mapTechStack(row) {
  return {
    techStackId: asNumber(row.serviceTechStackId ?? row.techStackId),
    serviceId: asNumber(row.serviceId),
    techTypeName: asString(row.techTypeName) || "기술스택",
    techName: asString(row.techName) || "기술명 미등록",
    versionText: asString(row.versionOverride ?? row.versionText) || "-",
    vendorName: asString(row.vendorName) || "-",
  };
}

function mapOwner(row) {
  return {
    serviceOwnerId: asNumber(row.serviceOwnerId),
    serviceId: asNumber(row.serviceId),
    ownerTypeCode: asString(row.ownerTypeCode) === "USER" ? "USER" : "GROUP",
    ownerName:
      asString(row.assigneeDisplay) ||
      asString(row.groupName) ||
      asString(row.userName) ||
      "담당자 미등록",
    responsibilityCode: knownCode(row.responsibilityCode, ["MAIN", "SUB", "ALERT"], "MAIN"),
  };
}

function mapIncident(row) {
  const statusCode = knownCode(
    row.incidentStatusCode,
    ["OPEN", "MONITORING", "RESOLVED"],
    "OPEN"
  );
  const serviceId = asNumber(row.serviceId);
  const serverId = asNumber(row.serverId);

  return removeUndefined({
    incidentId: asNumber(row.incidentId),
    incidentTypeCode: asString(row.incidentTypeCode) === "SERVER" ? "SERVER" : "SERVICE",
    serviceId: serviceId || undefined,
    serverId: serverId || undefined,
    incidentStatusCode: statusCode,
    severityCode: knownCode(row.severityCode, ["CRITICAL", "MAJOR", "MINOR", "NOTICE"], "MAJOR"),
    externalIncidentCode: asString(row.externalIncidentCode) || undefined,
    targetCode: asString(row.targetCode) || undefined,
    targetLabel: asString(row.targetLabel) || undefined,
    title: asString(row.title) || "제목 없는 인시던트",
    description: asString(row.description),
    startedAt: formatDateTime(row.startedAt),
    endedAt: statusCode === "RESOLVED" ? formatDateTime(row.endedAt) : undefined,
    manualRegisteredYn: row.manualRegistered === false ? "N" : "Y",
    registeredBy: asString(row.registeredBy) || "api",
  });
}

function mapIncidentImpact(incidentId, row) {
  return {
    impactId: asNumber(row.impactId, incidentId * 1000 + asNumber(row.impactedServiceId)),
    incidentId,
    impactedServiceId: asNumber(row.impactedServiceId),
    impactLevel: asNumber(row.impactLevel, 1),
    impactPathText: asString(row.impactPathText),
    directYn: row.direct === true ? "Y" : asYn(row.directYn),
  };
}

function buildGeneratedModule(snapshot) {
  return `import type {
  IncidentImpactRecord,
  IncidentRecord,
  ServerRecord,
  ServiceOwnerRecord,
  ServiceRecord,
  ServiceRelationRecord,
  TechStackRecord,
} from "./mockData";

// Generated by scripts/generate-mock-data.mjs from ${baseUrl}
// Do not edit manually.

export const generatedAt = ${JSON.stringify(new Date().toISOString())};

export const servers: ServerRecord[] = ${toTs(snapshot.servers)};

export const services: ServiceRecord[] = ${toTs(snapshot.services)};

export const serviceRelations: ServiceRelationRecord[] = ${toTs(snapshot.relations)};

export const techStacks: TechStackRecord[] = ${toTs(snapshot.techStacks)};

export const serviceOwners: ServiceOwnerRecord[] = ${toTs(snapshot.owners)};

export const incidents: IncidentRecord[] = ${toTs(snapshot.incidents)};

export const incidentImpacts: IncidentImpactRecord[] = ${toTs(snapshot.incidentImpacts)};
`;
}

function toTs(value) {
  return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function asRecordArray(value) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
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

function asYn(value) {
  return value === "Y" || value === true ? "Y" : "N";
}

function knownCode(value, codes, fallback) {
  const code = asString(value);
  return codes.includes(code) ? code : fallback;
}

function parseCategoryPath(value) {
  const text = asString(value);
  if (!text) {
    return ["미분류"];
  }
  return text.split(/\s*>\s*/).map((item) => item.trim()).filter(Boolean);
}

function formatDateTime(value) {
  const text = asString(value);
  if (!text) {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
  return text.replace("T", " ").slice(0, 16);
}

function sumNumbers(rows, key) {
  return rows.reduce((sum, row) => sum + asNumber(row[key]), 0);
}

function removeUndefined(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function loadEnvFiles(root) {
  [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    "src/.env",
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
