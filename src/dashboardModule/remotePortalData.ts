import { chainViewApi } from "./chainViewApi";
import {
  codeLabels,
  type DeploymentStatusCode,
  type EnvCode,
  type IncidentImpactRecord,
  type IncidentRecord,
  type IncidentStatusCode,
  type ImportanceCode,
  type OsTypeCode,
  type RelationStatusCode,
  type RelationTypeCode,
  type ServerRecord,
  type ServerStatusCode,
  type SeverityCode,
  type ServiceOwnerRecord,
  type ServiceRecord,
  type ServiceRelationRecord,
  type ServiceStatusCode,
  type ServiceTypeCode,
  type TechStackRecord,
} from "./mockData";
import type { IncidentEventRecord } from "./PortalDataStore";

type RemoteRecord = Record<string, unknown>;

export type RemotePortalSnapshot = {
  servers: ServerRecord[];
  services: ServiceRecord[];
  deployments: RemoteRecord[];
  relations: ServiceRelationRecord[];
  techStacks: TechStackRecord[];
  owners: ServiceOwnerRecord[];
  users: RemoteRecord[];
  groups: RemoteRecord[];
  categories: RemoteRecord[];
  codes: RemoteRecord[];
  incidents: IncidentRecord[];
  incidentImpacts: IncidentImpactRecord[];
  incidentEvents: IncidentEventRecord[];
};

export async function loadRemotePortalSnapshot(): Promise<RemotePortalSnapshot> {
  await chainViewApi.auth.ensureSession();

  const serviceRows = asRecordArray(await chainViewApi.services.list());
  const detailsByServiceId = await loadMissingServiceDeploymentDetails(serviceRows);
  const [
    serverRows,
    relationRows,
    ownerRows,
    serviceTechStackRows,
    incidentRows,
    userRows,
    groupRows,
    categoryRows,
    codeRows,
  ] = await Promise.all([
    safeList(() => chainViewApi.servers.list()),
    safeList(() => chainViewApi.serviceRelations.list()),
    safeList(() => chainViewApi.ownership.serviceOwners.list()),
    safeList(() => chainViewApi.serviceTechStacks.list()),
    safeList(() => chainViewApi.incidents.list()),
    safeList(() => chainViewApi.ownership.users.list()),
    safeList(() => chainViewApi.ownership.groups.list()),
    safeList(() => chainViewApi.serviceCategories.list()),
    safeList(() => chainViewApi.commonCodes.list()),
  ]);

  const incidents = incidentRows.map(mapIncident);
  const incidentImpacts = loadIncidentImpactsFromRows(incidentRows, incidents);
  return {
    servers: serverRows.map(mapServer),
    services: serviceRows.map((service) =>
      mapService(service, detailsByServiceId.get(asNumber(service.serviceId)))
    ),
    deployments: serviceRows.flatMap((service) =>
      mapServiceDeployments(service, detailsByServiceId.get(asNumber(service.serviceId)))
    ),
    relations: relationRows.map(mapRelation),
    techStacks: serviceTechStackRows.map(mapTechStack),
    owners: ownerRows.map(mapOwner),
    users: userRows,
    groups: groupRows,
    categories: categoryRows,
    codes: codeRows,
    incidents,
    incidentImpacts,
    incidentEvents: [
      ...buildRemoteIncidentEvents(incidents, incidentImpacts),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

async function loadMissingServiceDeploymentDetails(rows: RemoteRecord[]) {
  const needsDetail = rows.filter((service) => {
    const serviceId = asNumber(service.serviceId);
    return serviceId && serviceDeploymentRows(service).length === 0;
  });
  if (!needsDetail.length) {
    return new Map<number, RemoteRecord>();
  }

  const settled = await Promise.allSettled(
    needsDetail.map((service) =>
      chainViewApi.services.detail(asNumber(service.serviceId))
    )
  );
  const detailsByServiceId = new Map<number, RemoteRecord>();
  settled.forEach((result, index) => {
    if (result.status !== "fulfilled" || !isRecord(result.value)) {
      return;
    }
    const fallbackServiceId = asNumber(needsDetail[index].serviceId);
    const serviceId = asNumber(result.value.serviceId, fallbackServiceId);
    if (serviceId) {
      detailsByServiceId.set(serviceId, result.value);
    }
  });
  return detailsByServiceId;
}

function loadIncidentImpactsFromRows(
  rows: RemoteRecord[],
  incidents: IncidentRecord[]
) {
  return rows.flatMap((row, index) => {
    const incidentId = incidents[index]?.incidentId ?? asNumber(row.incidentId);
    return asRecordArray(row.impacts ?? row.incidentImpacts).map((impact) =>
      mapIncidentImpact(incidentId, impact)
    );
  });
}

async function safeList(load: () => Promise<unknown>) {
  try {
    return asRecordArray(await load());
  } catch (error) {
    console.warn("[ChainView API] optional list load failed", error);
    return [];
  }
}

function serviceDeploymentRows(row: RemoteRecord, detail?: RemoteRecord) {
  const arrayKeys = [
    "deployments",
    "serviceServers",
    "deploymentServers",
    "servers",
    "serverMappings",
  ];
  for (const key of arrayKeys) {
    const rows = asRecordArray(detail?.[key] ?? row[key]);
    if (rows.length) {
      return rows;
    }
  }

  const serverIds = Array.isArray(detail?.serverIds ?? row.serverIds)
    ? (detail?.serverIds ?? row.serverIds)
    : Array.isArray(detail?.deploymentServerIds ?? row.deploymentServerIds)
      ? (detail?.deploymentServerIds ?? row.deploymentServerIds)
      : [];
  const mappedServerIds = serverIds
    .map((serverId) => asNumber(serverId))
    .filter(Boolean);
  if (mappedServerIds.length) {
    return mappedServerIds.map((serverId) => ({ serverId }));
  }

  const serverId = asNumber(detail?.serverId ?? row.serverId);
  return serverId ? [{ serverId }] : [];
}

function deploymentServerId(row: RemoteRecord | undefined, fallback?: unknown) {
  const nestedServer = isRecord(row?.server) ? row?.server : null;
  return asNumber(
    row?.serverId ??
      row?.deploymentServerId ??
      row?.infraServerId ??
      row?.id ??
      nestedServer?.serverId ??
      nestedServer?.id ??
      fallback
  );
}

function mapServiceDeployments(row: RemoteRecord, detail?: RemoteRecord) {
  const serviceId = asNumber(detail?.serviceId ?? row.serviceId);
  const deployments = serviceDeploymentRows(row, detail);
  const fallbackDeployment =
    deployments.length || !serviceId
      ? []
      : [{
            serverId: deploymentServerId(undefined, detail?.serverId ?? row.serverId),
          serverName: asString(detail?.serverName ?? row.serverName),
          hostName: asString(detail?.hostName ?? row.hostName),
          deployPath:
            asString(detail?.deployPath ?? row.deployPath) ||
            asString(row.deploymentHostsSummary),
          portInfo: asString(detail?.portInfo ?? row.portInfo),
          deploymentStatusCode: asString(
            detail?.deploymentStatusCode ?? row.deploymentStatusCode
          ),
          deploymentStatusName: asString(
            detail?.deploymentStatusName ?? row.deploymentStatusName
          ),
          instanceCount: asNumber(
            detail?.instanceCount ?? row.instanceCount ?? row.deploymentCount,
            1
          ),
        }];

  return [...deployments, ...fallbackDeployment].map((deployment, index) => ({
    ...deployment,
    deploymentKey:
      asString(deployment.deploymentKey) ||
      `${serviceId}-${asNumber(deployment.serviceServerId) || asNumber(deployment.deploymentId) || index + 1}`,
    serviceId,
    serviceCode: asString(detail?.serviceCode ?? row.serviceCode),
    serviceName:
      asString(detail?.serviceName ?? row.serviceName) || "이름 없는 서비스",
  }));
}

function mapServer(row: RemoteRecord): ServerRecord {
  const now = formatDateTime(row.updatedAt);
  const serverServiceRefs = extractServiceRefs(row);

  return {
    serverId: asNumber(row.serverId),
    serverName: asString(row.serverName) || "이름 없는 서버",
    hostName: asString(row.hostName) || "-",
    ipAddress: asString(row.ipAddress) || "-",
    envCode: knownCode(row.envCode, codeLabels.envType, "DEV"),
    osTypeCode: knownCode(row.osTypeCode, codeLabels.osType, "ETC"),
    osVersion: asString(row.osVersion) || "-",
    statusCode: knownCode(row.statusCode, codeLabels.serverStatus, "NORMAL"),
    description: asString(row.description),
    infraNodeId: asNumber(row.infraNodeId) || undefined,
    infraNodeCode: asString(row.infraNodeCode) || undefined,
    infraNodeName: asString(row.infraNodeName) || undefined,
    serverRoleCode: asString(row.serverRoleCode) || undefined,
    serverRoleName: asString(row.serverRoleName) || undefined,
    serviceCodes: serverServiceRefs.serviceCodes,
    serviceCount: asNumber(row.serviceCount) || undefined,
    serviceIds: serverServiceRefs.serviceIds,
    instanceCount: asNumber(row.instanceCount) || undefined,
    createdAt: formatDateTime(row.createdAt) || now,
    updatedAt: now,
  };
}

function extractServiceRefs(row: RemoteRecord) {
  const serviceIds = new Set<number>();
  const serviceCodes = new Set<string>();

  [
    row.serviceId,
    ...(Array.isArray(row.serviceIds) ? row.serviceIds : []),
  ].forEach((value) => {
    const serviceId = asNumber(value);
    if (serviceId) serviceIds.add(serviceId);
  });

  [
    row.serviceCode,
    ...(Array.isArray(row.serviceCodes) ? row.serviceCodes : []),
  ].forEach((value) => {
    const serviceCode = asString(value);
    if (serviceCode) serviceCodes.add(serviceCode);
  });

  ["services", "serviceServers", "deployments", "serverMappings"].forEach((key) => {
    asRecordArray(row[key]).forEach((record) => {
      const service = isRecord(record.service) ? record.service : null;
      const serviceId = asNumber(record.serviceId ?? record.id ?? service?.serviceId ?? service?.id);
      const serviceCode = asString(record.serviceCode ?? record.code ?? service?.serviceCode ?? service?.code);
      if (serviceId) serviceIds.add(serviceId);
      if (serviceCode) serviceCodes.add(serviceCode);
    });
  });

  return {
    serviceCodes: [...serviceCodes],
    serviceIds: [...serviceIds],
  };
}

function mapService(row: RemoteRecord, detail?: RemoteRecord): ServiceRecord {
  const deployments = serviceDeploymentRows(row, detail);
  const primaryDeployment = deployments[0];
  const updatedAt = formatDateTime(detail?.updatedAt ?? row.updatedAt);
  const instanceCount =
    sumNumbers(deployments, "instanceCount") ||
    asNumber(row.deploymentCount, 1);

  return {
    serviceId: asNumber(row.serviceId),
    categoryId: asNumber(detail?.categoryId ?? row.categoryId) || undefined,
    categoryPath: parseCategoryPath(detail?.categoryPath ?? row.categoryPath),
    serviceCode: asString(detail?.serviceCode ?? row.serviceCode),
    serviceName:
      asString(detail?.serviceName ?? row.serviceName) || "이름 없는 서비스",
    serviceTypeCode: knownCode(
      detail?.serviceTypeCode ?? row.serviceTypeCode,
      codeLabels.serviceType,
      "API"
    ),
    importanceCode: knownCode(
      detail?.importanceCode ?? row.importanceCode,
      codeLabels.importance,
      "NORMAL"
    ),
    statusCode: knownCode(
      detail?.statusCode ?? row.statusCode,
      codeLabels.serviceStatus,
      "NORMAL"
    ),
    description: asString(detail?.description),
    endpointUrl: asString(detail?.endpointUrl),
    serverId: deploymentServerId(primaryDeployment, detail?.serverId ?? row.serverId),
    deployPath:
      asString(primaryDeployment?.deployPath) ||
      asString(row.deploymentHostsSummary),
    portInfo: asString(primaryDeployment?.portInfo),
    deploymentStatusCode: knownCode(
      primaryDeployment?.deploymentStatusCode,
      codeLabels.deploymentStatus,
      "RUNNING"
    ),
    instanceCount,
    createdBy: "remote",
    updatedBy: "remote",
    createdAt: formatDateTime(detail?.createdAt) || updatedAt,
    updatedAt,
  };
}

function mapRelation(row: RemoteRecord): ServiceRelationRecord {
  return {
    relationId: asNumber(row.relationId),
    sourceServiceId: asNumber(row.sourceServiceId),
    targetServiceId: asNumber(row.targetServiceId),
    relationTypeCode: knownCode(
      row.relationTypeCode,
      codeLabels.relationType,
      "ETC"
    ),
    mandatoryYn: row.mandatory === true ? "Y" : asYn(row.mandatoryYn),
    relationStatusCode: knownCode(
      row.relationStatusCode,
      codeLabels.relationStatus,
      "ACTIVE"
    ),
    description: asString(row.description),
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt),
  };
}

function mapTechStack(row: RemoteRecord): TechStackRecord {
  const techTypeCode = knownCode(
    row.techTypeCode,
    codeLabels.techType,
    "FRAMEWORK"
  );

  return {
    techStackId: asNumber(row.serviceTechStackId ?? row.techStackId),
    serviceId: asNumber(row.serviceId),
    techTypeCode,
    techTypeName:
      asString(row.techTypeName) ||
      codeLabels.techType[techTypeCode] ||
      "기술스택",
    techName: asString(row.techName) || "기술명 미등록",
    versionText: asString(row.versionOverride ?? row.versionText) || "-",
    vendorName: asString(row.vendorName) || "-",
  };
}

function mapOwner(row: RemoteRecord): ServiceOwnerRecord {
  const service = isRecord(row.service) ? row.service : null;
  return {
    serviceOwnerId: asNumber(row.serviceOwnerId),
    serviceId: asNumber(row.serviceId ?? service?.serviceId),
    serviceCode: asString(row.serviceCode ?? service?.serviceCode),
    ownerTypeCode:
      asString(row.ownerTypeCode) === "USER" ? "USER" : "GROUP",
    groupId: asNumber(row.groupId) || null,
    userId: asNumber(row.userId) || null,
    ownerName:
      asString(row.assigneeDisplay) ||
      asString(row.groupName) ||
      asString(row.userName) ||
      "담당자 미등록",
    responsibilityCode: knownResponsibility(row.responsibilityCode),
  };
}

function mapIncident(row: RemoteRecord): IncidentRecord {
  const serviceId = asNumber(row.serviceId);
  const serverId = asNumber(row.serverId);
  const statusCode = knownCode(
    row.incidentStatusCode,
    codeLabels.incidentStatus,
    "OPEN"
  );

  return {
    incidentId: asNumber(row.incidentId),
    incidentTypeCode: asString(row.incidentTypeCode) === "SERVER" ? "SERVER" : "SERVICE",
    serviceId: serviceId || undefined,
    serverId: serverId || undefined,
    incidentStatusCode: statusCode,
    severityCode: knownCode(row.severityCode, codeLabels.severity, "MAJOR"),
    title: asString(row.title) || "제목 없는 인시던트",
    description: asString(row.description),
    startedAt: formatDateTime(row.startedAt),
    endedAt:
      statusCode === "RESOLVED"
        ? formatDateTime(row.endedAt)
        : undefined,
    manualRegisteredYn: row.manualRegistered === false ? "N" : "Y",
    registeredBy: asString(row.registeredBy) || "remote",
  };
}

function mapIncidentImpact(
  incidentId: number,
  row: RemoteRecord
): IncidentImpactRecord {
  return {
    impactId: asNumber(row.impactId, incidentId * 1000 + asNumber(row.impactedServiceId)),
    incidentId,
    impactedServiceId: asNumber(row.impactedServiceId),
    impactLevel: asNumber(row.impactLevel, 1),
    impactPathText: asString(row.impactPathText),
    directYn: row.direct === true ? "Y" : asYn(row.directYn),
  };
}

function buildRemoteIncidentEvents(
  incidents: IncidentRecord[],
  impacts: IncidentImpactRecord[]
): IncidentEventRecord[] {
  return incidents.flatMap((incident) => {
    const impactCount = impacts.filter(
      (impact) => impact.incidentId === incident.incidentId
    ).length;
    const baseEvents: IncidentEventRecord[] = [
      {
        eventId: incident.incidentId * 10000 + 1,
        incidentId: incident.incidentId,
        eventType: "DETECTED",
        message: `${incident.title} 인시던트가 등록되었습니다.`,
        actor: incident.registeredBy,
        createdAt: incident.startedAt,
      },
      {
        eventId: incident.incidentId * 10000 + 2,
        incidentId: incident.incidentId,
        eventType: "IMPACT_ANALYZED",
        message: `서비스 관계 기준 예상 영향 ${impactCount}건을 조회했습니다.`,
        actor: "SYSTEM",
        createdAt: incident.startedAt,
      },
    ];

    if (incident.incidentStatusCode === "RESOLVED" && incident.endedAt) {
      baseEvents.push({
        eventId: incident.incidentId * 10000 + 3,
        incidentId: incident.incidentId,
        eventType: "RESOLVED",
        message: "인시던트가 완료 처리되었습니다.",
        actor: "remote",
        createdAt: incident.endedAt,
      });
    }

    return baseEvents;
  });
}

function asRecordArray(value: unknown): RemoteRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is RemoteRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asYn(value: unknown): "Y" | "N" {
  return value === "Y" || value === true ? "Y" : "N";
}

function knownCode<TCode extends string>(
  value: unknown,
  labels: Record<TCode, string>,
  fallback: TCode
) {
  const code = asString(value);
  return Object.prototype.hasOwnProperty.call(labels, code)
    ? (code as TCode)
    : fallback;
}

function knownResponsibility(value: unknown): "MAIN" | "SUB" | "ALERT" {
  const code = asString(value);
  if (code === "SUB" || code === "ALERT") {
    return code;
  }
  return "MAIN";
}

function parseCategoryPath(value: unknown) {
  const text = asString(value);
  if (!text) {
    return ["미분류"];
  }
  return text
    .split(/\s*>\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(value: unknown) {
  const text = asString(value);
  if (!text) {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
  return text.replace("T", " ").slice(0, 16);
}

function sumNumbers(rows: RemoteRecord[], key: string) {
  return rows.reduce((sum, row) => sum + asNumber(row[key]), 0);
}
