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
  relations: ServiceRelationRecord[];
  techStacks: TechStackRecord[];
  owners: ServiceOwnerRecord[];
  incidents: IncidentRecord[];
  incidentImpacts: IncidentImpactRecord[];
  incidentEvents: IncidentEventRecord[];
};

export async function loadRemotePortalSnapshot(): Promise<RemotePortalSnapshot> {
  await chainViewApi.auth.ensureSession();

  const serviceRows = asRecordArray(await chainViewApi.services.list());
  const detailSettled = await Promise.allSettled(
    serviceRows.map((service) => {
      const serviceId = asNumber(service.serviceId);
      return serviceId ? chainViewApi.services.detail(serviceId) : null;
    })
  );
  const detailsByServiceId = new Map<number, RemoteRecord>();

  detailSettled.forEach((result) => {
    if (result.status !== "fulfilled" || !isRecord(result.value)) {
      return;
    }
    detailsByServiceId.set(asNumber(result.value.serviceId), result.value);
  });

  const [
    serverRows,
    relationRows,
    ownerRows,
    serviceTechStackRows,
    incidentRows,
  ] = await Promise.all([
    safeList(() => chainViewApi.servers.list()),
    safeList(() => chainViewApi.serviceRelations.list()),
    safeList(() => chainViewApi.ownership.serviceOwners.list()),
    safeList(() => chainViewApi.serviceTechStacks.list()),
    safeList(() => chainViewApi.incidents.list()),
  ]);

  const incidents = await loadIncidentDetails(incidentRows);
  const incidentImpacts = await loadIncidentImpacts(incidents);
  const notificationEvents = await loadNotificationEvents(incidents);

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
    incidentEvents: [
      ...notificationEvents,
      ...buildRemoteIncidentEvents(incidents, incidentImpacts),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

async function loadIncidentDetails(rows: RemoteRecord[]) {
  const settled = await Promise.allSettled(
    rows.map((incident) => {
      const incidentId = asNumber(incident.incidentId);
      return incidentId ? chainViewApi.incidents.detail(incidentId) : incident;
    })
  );

  return settled.map((result, index) => {
    const fallback = rows[index];
    return mapIncident(
      result.status === "fulfilled" && isRecord(result.value)
        ? result.value
        : fallback
    );
  });
}

async function loadIncidentImpacts(incidents: IncidentRecord[]) {
  const settled = await Promise.allSettled(
    incidents.map((incident) => chainViewApi.incidents.impacts(incident.incidentId))
  );

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    const incidentId = incidents[index].incidentId;
    return asRecordArray(result.value).map((impact) =>
      mapIncidentImpact(incidentId, impact)
    );
  });
}

async function loadNotificationEvents(incidents: IncidentRecord[]) {
  const settled = await Promise.allSettled(
    incidents.map((incident) =>
      chainViewApi.incidents.notifications(incident.incidentId)
    )
  );

  return settled.flatMap((result, incidentIndex) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    const incident = incidents[incidentIndex];
    return asRecordArray(result.value).map((notification, notificationIndex) => ({
      eventId: incident.incidentId * 10000 + notificationIndex + 5000,
      incidentId: incident.incidentId,
      eventType: "NOTIFICATION_SENT" as const,
      message:
        asString(notification.messageTitle) ||
        `${asString(notification.channelCode) || "알림"} 발송 기록이 있습니다.`,
      actor: asString(notification.targetUserName) || "SYSTEM",
      createdAt: formatDateTime(notification.sentAt ?? notification.createdAt),
    }));
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

function mapServer(row: RemoteRecord): ServerRecord {
  const now = formatDateTime(row.updatedAt);

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
    serviceCount: asNumber(row.serviceCount) || undefined,
    instanceCount: asNumber(row.instanceCount) || undefined,
    createdAt: formatDateTime(row.createdAt) || now,
    updatedAt: now,
  };
}

function mapService(row: RemoteRecord, detail?: RemoteRecord): ServiceRecord {
  const deployments = asRecordArray(detail?.deployments);
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
    serverId: asNumber(primaryDeployment?.serverId),
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
  return {
    techStackId: asNumber(row.serviceTechStackId ?? row.techStackId),
    serviceId: asNumber(row.serviceId),
    techTypeName: asString(row.techTypeName) || "기술스택",
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
