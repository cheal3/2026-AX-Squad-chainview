import { chainViewApi } from "./chainViewApi";
import {
  asRemoteNumber,
  asRemoteRecordArray,
  asRemoteString,
  type RemoteRecord,
} from "./remoteValue";

export type RemoteQueryKey =
  | "services"
  | "servers"
  | "relations"
  | "techstacks"
  | "owners"
  | "incidents"
  | "users"
  | "groups"
  | "categories"
  | "codes"
  | "deployments";

export const remoteQueryKeys: RemoteQueryKey[] = [
  "services",
  "servers",
  "relations",
  "techstacks",
  "owners",
  "incidents",
  "users",
  "groups",
  "categories",
  "codes",
  "deployments",
];

export type RemoteListRecord = RemoteRecord;

export type RemoteApiCallDetail = {
  durationMs?: number;
  errorMessage?: string;
  finishedAt?: string;
  label: string;
  method: "GET";
  origin: string;
  path: string;
  queryKey: RemoteQueryKey;
  responsePreview?: unknown;
  rowCount?: number;
  startedAt: string;
  state: "loading" | "success" | "error" | "blocked";
  url: string;
};

export const remoteQueryLoaders: Record<RemoteQueryKey, () => Promise<unknown>> = {
  services: () => chainViewApi.services.list(),
  servers: () => chainViewApi.servers.list(),
  relations: () => chainViewApi.serviceRelations.list(),
  techstacks: () => chainViewApi.serviceTechStacks.list(),
  owners: () => chainViewApi.ownership.serviceOwners.list(),
  incidents: () => chainViewApi.incidents.list(),
  users: () => chainViewApi.ownership.users.list(),
  groups: () => chainViewApi.ownership.groups.list(),
  categories: loadServiceCategories,
  codes: () => chainViewApi.commonCodes.list(),
  deployments: loadServiceDeployments,
};

export const remoteQueryPaths: Record<RemoteQueryKey, string> = {
  services: "/api/services",
  servers: "/api/servers",
  relations: "/api/service-relations",
  techstacks: "/api/service-tech-stacks",
  owners: "/api/ownership/service-owners",
  incidents: "/api/incidents",
  users: "/api/ownership/users",
  groups: "/api/ownership/groups",
  categories: "/api/service-categories/tree",
  codes: "/api/common-codes",
  deployments: "/api/services",
};

export const remoteQueryLabels: Record<RemoteQueryKey | "snapshot", string> = {
  services: "서비스 조회",
  servers: "서버 조회",
  relations: "서비스 관계 조회",
  techstacks: "기술스택 조회",
  owners: "담당자 조회",
  incidents: "인시던트 조회",
  users: "사용자 관리",
  groups: "그룹 조회",
  categories: "서비스 분류 관리",
  codes: "공통코드 관리",
  deployments: "배포 현황",
  snapshot: "초기 데이터 조회",
};

export function buildRemoteApiDetail(
  queryKey: RemoteQueryKey,
  state: RemoteApiCallDetail["state"],
  origin: string,
  overrides: Partial<RemoteApiCallDetail> = {}
): RemoteApiCallDetail {
  const path = remoteQueryPaths[queryKey];
  const cleanOrigin = origin.replace(/\/$/, "");
  return {
    label: remoteQueryLabels[queryKey],
    method: "GET",
    origin: cleanOrigin,
    path,
    queryKey,
    startedAt: new Date().toISOString(),
    state,
    url: `${cleanOrigin}${path}`,
    ...overrides,
  };
}

export function countRemoteRows(value: unknown) {
  return Array.isArray(value) ? value.length : 1;
}

export function previewRemoteResponse(value: unknown) {
  if (Array.isArray(value)) {
    return value.slice(0, 3);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return value ?? null;
}

async function loadServiceDeployments() {
  const serviceRows = asRemoteRecordArray(await chainViewApi.services.list());
  return serviceRows.flatMap((service) => {
    const detail = service;
    const deployments = asRemoteRecordArray(detail.deployments);
    const fallbackDeployment =
      deployments.length || !asRemoteNumber(service.serviceId)
        ? []
        : [{
            deploymentKey: `${asRemoteNumber(service.serviceId)}-primary`,
            serverId: asRemoteNumber(detail.serverId ?? service.serverId),
            serverName: asRemoteString(detail.serverName ?? service.serverName),
            hostName: asRemoteString(detail.hostName ?? service.hostName),
            deployPath: asRemoteString(detail.deployPath ?? service.deployPath),
            portInfo: asRemoteString(detail.portInfo ?? service.portInfo),
            deploymentStatusCode: asRemoteString(detail.deploymentStatusCode ?? service.deploymentStatusCode),
            instanceCount: asRemoteNumber(detail.instanceCount ?? service.instanceCount, 1),
          }];
    return [...deployments, ...fallbackDeployment].map((deployment, deploymentIndex) => ({
      ...deployment,
      deploymentKey: `${asRemoteNumber(service.serviceId)}-${asRemoteNumber(deployment.deploymentId, deploymentIndex + 1)}`,
      serviceCode: asRemoteString(detail.serviceCode ?? service.serviceCode),
      serviceId: asRemoteNumber(detail.serviceId ?? service.serviceId),
      serviceName: asRemoteString(detail.serviceName ?? service.serviceName),
    }));
  });
}

async function loadServiceCategories() {
  const treeRows = flattenCategoryTree(
    asRemoteRecordArray(await chainViewApi.serviceCategories.tree().catch(() => []))
  );
  if (treeRows.length) {
    return treeRows;
  }

  return asRemoteRecordArray(
    await chainViewApi.serviceCategories.list().catch(() => [])
  );
}

function flattenCategoryTree(
  rows: RemoteListRecord[],
  parent: RemoteListRecord | null = null,
  level = 1
): RemoteListRecord[] {
  return rows.flatMap((row) => {
    const children = findCategoryChildren(row);
    const categoryId = asRemoteNumber(row.categoryId ?? row.id);
    const categoryCode = asRemoteString(row.categoryCode ?? row.code);
    const normalizedRow: RemoteListRecord = {
      ...row,
      categoryLevel: asRemoteNumber(row.categoryLevel ?? row.level ?? row.depth, level),
      parentCategoryId:
        asRemoteNumber(row.parentCategoryId ?? row.parentId) ||
        asRemoteNumber(parent?.categoryId ?? parent?.id) ||
        undefined,
      parentCategoryCode:
        asRemoteString(row.parentCategoryCode ?? row.parentCode) ||
        asRemoteString(parent?.categoryCode ?? parent?.code) ||
        undefined,
      categoryId: categoryId || row.categoryId,
      categoryCode: categoryCode || row.categoryCode,
    };
    return [
      normalizedRow,
      ...flattenCategoryTree(children, normalizedRow, level + 1),
    ];
  });
}

function findCategoryChildren(row: RemoteListRecord) {
  const childKeys = ["children", "childCategories", "subCategories", "items"];
  for (const key of childKeys) {
    const children = asRemoteRecordArray(row[key]);
    if (children.length) return children;
  }
  return [];
}
