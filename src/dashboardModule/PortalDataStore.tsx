import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { chainViewApi } from "./chainViewApi";
import * as generatedMockData from "./mockData.generated";
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
import {
  loadRemotePortalSnapshot,
  type RemotePortalSnapshot,
} from "./remotePortalData";

type NewServerInput = Pick<
  ServerRecord,
  | "serverName"
  | "hostName"
  | "ipAddress"
  | "envCode"
  | "osTypeCode"
  | "osVersion"
  | "statusCode"
  | "description"
>;

type NewServiceInput = {
  serverId: number;
  categoryPath: string[];
  serviceCode: string;
  serviceName: string;
  serviceTypeCode: ServiceTypeCode;
  importanceCode?: ImportanceCode;
  statusCode: ServiceStatusCode;
  endpointUrl: string;
  deployPath: string;
  portInfo: string;
  deploymentStatusCode?: DeploymentStatusCode;
  instanceCount: number;
  description: string;
};

type NewRelationInput = {
  sourceServiceId: number;
  targetServiceId: number;
  relationTypeCode: RelationTypeCode;
  mandatoryYn: "Y" | "N";
  relationStatusCode: RelationStatusCode;
  description: string;
};

type NewTechStackInput = Pick<
  TechStackRecord,
  "serviceId" | "techTypeName" | "techName" | "versionText" | "vendorName"
>;

type HealthCheckResult = {
  serviceId: number;
  url: string;
  statusCode: number;
  statusText: string;
  checkedAt: string;
  incidentId?: number;
};

export type IncidentEventRecord = {
  eventId: number;
  incidentId: number;
  eventType:
    | "DETECTED"
    | "IMPACT_ANALYZED"
    | "NOTIFICATION_SENT"
    | "ACK_WAITING"
    | "ACTION_ADDED"
    | "STATUS_CHANGED"
    | "RESOLVED";
  message: string;
  actor: string;
  createdAt: string;
};

type NewIncidentInput = {
  serviceId: number;
  severityCode: SeverityCode;
  externalIncidentCode?: string;
  targetCode?: string;
  targetLabel?: string;
  title: string;
  description: string;
  startedAt?: string;
  manualRegisteredYn: "Y" | "N";
  registeredBy: string;
};

type PortalDataContextValue = {
  servers: ServerRecord[];
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  techStacks: TechStackRecord[];
  owners: ServiceOwnerRecord[];
  incidents: IncidentRecord[];
  incidentImpacts: IncidentImpactRecord[];
  incidentEvents: IncidentEventRecord[];
  healthChecks: HealthCheckResult[];
  createIncident: (input: NewIncidentInput) => IncidentRecord;
  updateIncidentStatus: (
    incidentId: number,
    statusCode: IncidentStatusCode,
    message?: string
  ) => void;
  addIncidentEvent: (incidentId: number, message: string) => void;
  addServer: (input: NewServerInput) => ServerRecord;
  updateServer: (serverId: number, input: Partial<NewServerInput>) => void;
  deleteServer: (serverId: number) => { ok: boolean; message: string };
  addService: (input: NewServiceInput) => ServiceRecord;
  updateService: (serviceId: number, input: Partial<ServiceRecord>) => void;
  deleteService: (serviceId: number) => void;
  addRelation: (input: NewRelationInput) => { ok: boolean; message: string };
  updateRelation: (
    relationId: number,
    input: Partial<ServiceRelationRecord>
  ) => void;
  removeRelation: (relationId: number) => void;
  addOwnerGroup: (serviceId: number, groupName: string) => void;
  addTechStack: (
    inputOrServiceId: NewTechStackInput | number,
    techName?: string
  ) => void;
  updateTechStack: (
    techStackId: number,
    input: Partial<TechStackRecord>
  ) => void;
  deleteTechStack: (techStackId: number) => void;
  runHealthCheck: (serviceId: number, url: string) => HealthCheckResult;
};

const PortalDataContext = createContext<PortalDataContextValue | null>(null);
const remoteApiEnabledFlag = import.meta.env.VITE_CHAINVIEW_REMOTE_API_ENABLED;
const remoteOrigin = import.meta.env.VITE_CHAINVIEW_REMOTE_ORIGIN ?? "http://chainview.kro.kr:8080";
const isMixedContentRuntime =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  remoteOrigin.startsWith("http://");
const REMOTE_API_ENABLED =
  remoteApiEnabledFlag === "true" || remoteApiEnabledFlag === "1";

const normalizedInitialServices = generatedMockData.services.map((service) => ({
  ...service,
  statusCode: "NORMAL" as ServiceStatusCode,
  deploymentStatusCode:
    service.deploymentStatusCode === "STOPPED"
      ? service.deploymentStatusCode
      : ("RUNNING" as DeploymentStatusCode),
}));

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState(generatedMockData.servers);
  const [services, setServices] = useState(normalizedInitialServices);
  const [relations, setRelations] = useState(generatedMockData.serviceRelations);
  const [techStacks, setTechStacks] = useState(generatedMockData.techStacks);
  const [owners, setOwners] = useState(generatedMockData.serviceOwners);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentImpacts, setIncidentImpacts] = useState<IncidentImpactRecord[]>([]);
  const [incidentEvents, setIncidentEvents] = useState<IncidentEventRecord[]>(
    []
  );
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);

  const applyRemoteSnapshot = (snapshot: RemotePortalSnapshot) => {
    setServers(snapshot.servers);
    setServices(snapshot.services);
    setRelations(snapshot.relations);
    setTechStacks(snapshot.techStacks);
    setOwners(snapshot.owners);
    setIncidents(snapshot.incidents);
    setIncidentImpacts(snapshot.incidentImpacts);
    setIncidentEvents(snapshot.incidentEvents);
  };

  const refreshRemoteData = (delayMs = 0) => {
    if (!REMOTE_API_ENABLED) {
      return;
    }

    const load = () => {
      void loadRemotePortalSnapshot()
        .then(applyRemoteSnapshot)
        .catch((error) => {
          console.warn("[ChainView API] remote refresh failed", error);
        });
    };

    if (delayMs > 0) {
      window.setTimeout(load, delayMs);
      return;
    }

    load();
  };

  useEffect(() => {
    if (!REMOTE_API_ENABLED) {
      return;
    }

    if (isMixedContentRuntime) {
      console.warn(
        "[ChainView API] remote mode disabled in browser because an HTTPS page cannot call an HTTP API origin.",
        { remoteOrigin }
      );
      return;
    }

    let cancelled = false;

    loadRemotePortalSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          applyRemoteSnapshot(snapshot);
        }
      })
      .catch((error) => {
        console.warn("[ChainView API] initial remote load failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createIncidentRecord = (input: NewIncidentInput) => {
    const now = timestamp();
    const nextIncident: IncidentRecord = {
      incidentId: nextId(incidents, "incidentId"),
      incidentTypeCode: "SERVICE",
      incidentStatusCode: "OPEN",
      ...input,
      startedAt: input.startedAt || now,
    };
    const impacts = buildIncidentImpacts({
      incidentId: nextIncident.incidentId,
      relations,
      serviceId: input.serviceId,
      services,
    });
    const events = buildInitialIncidentEvents({
      incident: nextIncident,
      impactCount: impacts.length,
      serviceName:
        services.find((service) => service.serviceId === input.serviceId)
          ?.serviceName ?? input.title,
    });

    setIncidents((current) => [nextIncident, ...current]);
    setIncidentImpacts((current) => [...impacts, ...current]);
    setIncidentEvents((current) => [...events, ...current]);
    setServices((current) =>
      current.map((service) =>
        service.serviceId === input.serviceId
          ? {
              ...service,
              statusCode:
                input.manualRegisteredYn === "Y" ||
                input.severityCode === "CRITICAL"
                  ? "INCIDENT"
                  : "IMPACTED",
              updatedAt: now,
            }
          : service
      )
    );

    if (impacts.length) {
      const impactedIds = new Set(impacts.map((impact) => impact.impactedServiceId));
      setServices((current) =>
        current.map((service) =>
          impactedIds.has(service.serviceId) &&
          service.serviceId !== input.serviceId &&
          service.statusCode === "NORMAL"
            ? { ...service, statusCode: "IMPACTED", updatedAt: now }
            : service
        )
      );
    }

    if (REMOTE_API_ENABLED) {
      void chainViewApi.incidents
        .create(toIncidentCreatePayload(input, now))
        .then(() => refreshRemoteData(300))
        .catch((error) => {
          console.warn("[ChainView API] incident create failed", error);
        });
    }

    return nextIncident;
  };

  const value = useMemo<PortalDataContextValue>(
    () => ({
      servers,
      services,
      relations,
      techStacks,
      owners,
      incidents,
      incidentImpacts,
      incidentEvents,
      healthChecks,
      createIncident: createIncidentRecord,
      updateIncidentStatus: (incidentId, statusCode, message) => {
        const now = timestamp();
        setIncidents((current) =>
          current.map((incident) =>
            incident.incidentId === incidentId
              ? {
                  ...incident,
                  incidentStatusCode: statusCode,
                  endedAt:
                    statusCode === "RESOLVED"
                      ? now
                      : incident.endedAt,
                }
              : incident
          )
        );
        setIncidentEvents((current) => [
          {
            eventId: nextId(current, "eventId"),
            incidentId,
            eventType: statusCode === "RESOLVED" ? "RESOLVED" : "STATUS_CHANGED",
            message:
              message ??
              `${codeLabels.incidentStatus[statusCode]} 상태로 변경되었습니다.`,
            actor: "admin",
            createdAt: now,
          },
          ...current,
        ]);

        const target = incidents.find((incident) => incident.incidentId === incidentId);
        if (statusCode === "RESOLVED" && target?.serviceId) {
          const resolvedServiceIds = new Set([
            target.serviceId,
            ...incidentImpacts
              .filter((impact) => impact.incidentId === incidentId)
              .map((impact) => impact.impactedServiceId),
          ]);
          setServices((current) =>
            current.map((service) =>
              resolvedServiceIds.has(service.serviceId)
                ? { ...service, statusCode: "NORMAL", updatedAt: now }
                : service
              )
          );
        }

        if (REMOTE_API_ENABLED && target) {
          const remoteUpdate =
            statusCode === "RESOLVED"
              ? chainViewApi.incidents.resolve(incidentId, {
                  endedAt: toApiDateTime(now),
                  description: message ?? target.description,
                })
              : chainViewApi.incidents.update(
                  incidentId,
                  toIncidentUpdatePayload(target, statusCode, now)
                );

          void remoteUpdate
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] incident update failed", error);
            });
        }
      },
      addIncidentEvent: (incidentId, message) => {
        const cleaned = message.trim();
        if (!cleaned) {
          return;
        }
        setIncidentEvents((current) => [
          {
            eventId: nextId(current, "eventId"),
            incidentId,
            eventType: "ACTION_ADDED",
            message: cleaned,
            actor: "admin",
            createdAt: timestamp(),
          },
          ...current,
        ]);
      },
      addServer: (input) => {
        const now = timestamp();
        const nextServer: ServerRecord = {
          serverId: nextId(servers, "serverId"),
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        setServers((current) => [nextServer, ...current]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.servers
            .create(toServerPayload(input))
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] server create failed", error);
            });
        }
        return nextServer;
      },
      updateServer: (serverId, input) => {
        setServers((current) =>
          current.map((server) =>
            server.serverId === serverId
              ? { ...server, ...input, updatedAt: timestamp() }
              : server
          )
        );
        const currentServer = servers.find((server) => server.serverId === serverId);
        if (REMOTE_API_ENABLED && currentServer) {
          void chainViewApi.servers
            .update(serverId, toServerPayload({ ...currentServer, ...input }))
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] server update failed", error);
            });
        }
      },
      deleteServer: (serverId) => {
        const hasServices = services.some(
          (service) => service.serverId === serverId
        );

        if (hasServices) {
          return {
            ok: false,
            message: "연결된 서비스가 있어 서버를 삭제할 수 없습니다.",
          };
        }

        setServers((current) =>
          current.filter((server) => server.serverId !== serverId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.servers
            .delete(serverId)
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] server delete failed", error);
            });
        }
        return { ok: true, message: "서버가 삭제되었습니다." };
      },
      addService: (input) => {
        const now = timestamp();
        const nextService: ServiceRecord = {
          serviceId: nextId(services, "serviceId"),
          importanceCode: "NORMAL",
          createdBy: "8913812",
          updatedBy: "8913812",
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        setServices((current) => [nextService, ...current]);
        if (REMOTE_API_ENABLED) {
          void toServicePayload(nextService)
            .then((payload) => chainViewApi.services.create(payload))
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] service create failed", error);
            });
        }
        return nextService;
      },
      updateService: (serviceId, input) => {
        setServices((current) =>
          current.map((service) =>
            service.serviceId === serviceId
              ? { ...service, ...input, updatedAt: timestamp() }
              : service
          )
        );
        const currentService = services.find(
          (service) => service.serviceId === serviceId
        );
        if (REMOTE_API_ENABLED && currentService) {
          void toServiceUpdatePayload(serviceId, { ...currentService, ...input })
            .then((payload) => chainViewApi.services.update(serviceId, payload))
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] service update failed", error);
            });
        }
      },
      deleteService: (serviceId) => {
        setServices((current) =>
          current.filter((service) => service.serviceId !== serviceId)
        );
        setRelations((current) =>
          current.filter(
            (relation) =>
              relation.sourceServiceId !== serviceId &&
              relation.targetServiceId !== serviceId
          )
        );
        setOwners((current) =>
          current.filter((owner) => owner.serviceId !== serviceId)
        );
        setTechStacks((current) =>
          current.filter((techStack) => techStack.serviceId !== serviceId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.services
            .delete(serviceId)
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] service delete failed", error);
            });
        }
      },
      addRelation: (input) => {
        const duplicate = relations.some(
          (relation) =>
            relation.sourceServiceId === input.sourceServiceId &&
            relation.targetServiceId === input.targetServiceId &&
            relation.relationTypeCode === input.relationTypeCode
        );

        if (duplicate) {
          return {
            ok: false,
            message: "동일한 출발/대상/관계 유형의 종속 관계가 이미 있습니다.",
          };
        }

        const now = timestamp();
        const nextRelation: ServiceRelationRecord = {
          relationId: nextId(relations, "relationId"),
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        setRelations((current) => [nextRelation, ...current]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceRelations
            .create(toRelationPayload(input))
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] relation create failed", error);
            });
        }
        return { ok: true, message: "서비스 종속 관계가 추가되었습니다." };
      },
      updateRelation: (relationId, input) => {
        setRelations((current) =>
          current.map((relation) =>
            relation.relationId === relationId
              ? { ...relation, ...input, updatedAt: timestamp() }
              : relation
          )
        );
        const currentRelation = relations.find(
          (relation) => relation.relationId === relationId
        );
        if (REMOTE_API_ENABLED && currentRelation) {
          const nextRelation = { ...currentRelation, ...input };
          void chainViewApi.serviceRelations
            .update(relationId, toRelationPayload(nextRelation))
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] relation update failed", error);
            });
        }
      },
      removeRelation: (relationId) => {
        setRelations((current) =>
          current.filter((relation) => relation.relationId !== relationId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceRelations
            .delete(relationId)
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              console.warn("[ChainView API] relation delete failed", error);
            });
        }
      },
      addOwnerGroup: (serviceId, groupName) => {
        const cleaned = groupName.trim();
        if (!cleaned) {
          return;
        }

        setOwners((current) => [
          {
            serviceOwnerId: nextId(current, "serviceOwnerId"),
            serviceId,
            ownerTypeCode: "GROUP",
            ownerName: cleaned,
            responsibilityCode: "MAIN",
          },
          ...current,
        ]);
        if (REMOTE_API_ENABLED) {
          void addRemoteOwnerGroup(serviceId, cleaned)
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] owner group create failed", error);
            });
        }
      },
      addTechStack: (inputOrServiceId, techName) => {
        const input =
          typeof inputOrServiceId === "number"
            ? {
                serviceId: inputOrServiceId,
                techTypeName: "서비스 기술",
                techName: techName ?? "",
                versionText: "-",
                vendorName: "-",
              }
            : inputOrServiceId;
        const cleaned = input.techName.trim();
        if (!cleaned) {
          return;
        }

        setTechStacks((current) => [
          {
            techStackId: nextId(current, "techStackId"),
            serviceId: input.serviceId,
            techTypeName: input.techTypeName || "서비스 기술",
            techName: cleaned,
            versionText: input.versionText || "-",
            vendorName: input.vendorName || "-",
          },
          ...current,
        ]);
        if (REMOTE_API_ENABLED) {
          void addRemoteTechStack(input.serviceId, cleaned)
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] tech stack create failed", error);
            });
        }
      },
      updateTechStack: (techStackId, input) => {
        setTechStacks((current) =>
          current.map((techStack) =>
            techStack.techStackId === techStackId
              ? { ...techStack, ...input }
              : techStack
          )
        );
        const currentTechStack = techStacks.find(
          (techStack) => techStack.techStackId === techStackId
        );
        if (REMOTE_API_ENABLED && currentTechStack) {
          void chainViewApi.techStacks
            .update(techStackId, { ...currentTechStack, ...input })
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] tech stack update failed", error);
            });
        }
      },
      deleteTechStack: (techStackId) => {
        setTechStacks((current) =>
          current.filter((techStack) => techStack.techStackId !== techStackId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.techStacks
            .delete(techStackId)
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              console.warn("[ChainView API] tech stack delete failed", error);
            });
        }
      },
      runHealthCheck: (serviceId, url) => {
        const normalizedUrl = url.trim();
        const ok =
          normalizedUrl.startsWith("https://") &&
          !normalizedUrl.toLowerCase().includes("fail");
        let incidentId: number | undefined;
        if (!ok) {
          const existingOpenIncident = incidents.find(
            (incident) =>
              incident.serviceId === serviceId &&
              incident.incidentStatusCode !== "RESOLVED"
          );
          const service = services.find((item) => item.serviceId === serviceId);
          const incident =
            existingOpenIncident ??
            createIncidentRecord({
              serviceId,
              severityCode: "MAJOR",
              title: `${service?.serviceName ?? "서비스"} 헬스체크 실패`,
              description:
                "자동 헬스체크에서 비정상 응답이 감지되어 인시던트가 생성되었습니다.",
              manualRegisteredYn: "N",
              registeredBy: "SYSTEM",
            });
          incidentId = incident.incidentId;
        }

        const result: HealthCheckResult = {
          serviceId,
          url: normalizedUrl,
          statusCode: ok ? 200 : 503,
          statusText: ok
            ? "정상 응답"
            : "비정상 응답 - 담당 그룹 알림 대상",
          checkedAt: timestamp(),
          incidentId,
        };

        setHealthChecks((current) => [result, ...current]);
        return result;
      },
    }),
    [
      healthChecks,
      incidentEvents,
      incidentImpacts,
      incidents,
      owners,
      relations,
      services,
      servers,
      techStacks,
    ]
  );

  return (
    <PortalDataContext.Provider value={value}>
      {children}
    </PortalDataContext.Provider>
  );
}

export function usePortalData() {
  const value = useContext(PortalDataContext);

  if (!value) {
    throw new Error("usePortalData must be used within PortalDataProvider");
  }

  return value;
}

function toServerPayload(input: NewServerInput) {
  return {
    serverName: input.serverName,
    hostName: input.hostName,
    ipAddress: input.ipAddress,
    envCode: input.envCode,
    osTypeCode: input.osTypeCode,
    osVersion: input.osVersion,
    statusCode: input.statusCode,
    description: input.description,
  };
}

async function toServicePayload(input: NewServiceInput | ServiceRecord) {
  return {
    categoryId: await findCategoryId(input.categoryPath),
    serviceCode: input.serviceCode,
    serviceName: input.serviceName,
    serviceTypeCode: input.serviceTypeCode,
    importanceCode: input.importanceCode ?? "NORMAL",
    statusCode: input.statusCode,
    description: input.description,
    endpointUrl: input.endpointUrl,
    deployments: [toDeploymentPayload(input)],
  };
}

async function toServiceUpdatePayload(
  serviceId: number,
  input: NewServiceInput | ServiceRecord
) {
  const detail = await chainViewApi.services.detail(serviceId).catch(() => null);
  const detailRecord = isRemoteRecord(detail) ? detail : null;
  const deployments = asRemoteRecordArray(detailRecord?.deployments).map(
    toRemoteDeploymentPayload
  );

  return {
    categoryId:
      asRemoteNumber(detailRecord?.categoryId) ||
      (await findCategoryId(input.categoryPath)),
    serviceCode: input.serviceCode,
    serviceName: input.serviceName,
    serviceTypeCode: input.serviceTypeCode,
    importanceCode: input.importanceCode ?? "NORMAL",
    statusCode: input.statusCode,
    description: input.description,
    endpointUrl: input.endpointUrl,
    deployments: deployments.length ? deployments : [toDeploymentPayload(input)],
  };
}

function toDeploymentPayload(input: NewServiceInput | ServiceRecord) {
  return {
    serverId: input.serverId || 1,
    deployPath: input.deployPath,
    portInfo: input.portInfo,
    deploymentStatusCode: input.deploymentStatusCode ?? "RUNNING",
    instanceCount: input.instanceCount || 1,
  };
}

function toRemoteDeploymentPayload(input: Record<string, unknown>) {
  return {
    serverId: asRemoteNumber(input.serverId, 1),
    deployPath: asRemoteString(input.deployPath),
    portInfo: asRemoteString(input.portInfo),
    deploymentStatusCode: asRemoteString(input.deploymentStatusCode) || "RUNNING",
    instanceCount: asRemoteNumber(input.instanceCount, 1),
  };
}

function toRelationPayload(input: NewRelationInput) {
  return {
    sourceServiceId: input.sourceServiceId,
    targetServiceId: input.targetServiceId,
    relationTypeCode: input.relationTypeCode,
    mandatory: input.mandatoryYn === "Y",
    relationStatusCode: input.relationStatusCode,
    description: input.description,
  };
}

function toIncidentCreatePayload(input: NewIncidentInput, startedAt: string) {
  return {
    incidentTypeCode: "SERVICE",
    serviceId: input.serviceId,
    severityCode: input.severityCode,
    title: input.title,
    description: input.description,
    startedAt: toApiDateTime(startedAt),
    impactDepth: 2,
  };
}

function toIncidentUpdatePayload(
  incident: IncidentRecord,
  incidentStatusCode: IncidentStatusCode,
  updatedAt: string
) {
  return {
    incidentStatusCode,
    severityCode: incident.severityCode,
    title: incident.title,
    description: incident.description,
    startedAt: toApiDateTime(incident.startedAt),
    endedAt:
      incidentStatusCode === "RESOLVED"
        ? toApiDateTime(updatedAt)
        : incident.endedAt
          ? toApiDateTime(incident.endedAt)
          : undefined,
  };
}

async function findCategoryId(categoryPath: string[]) {
  const categoryName = categoryPath[categoryPath.length - 1] ?? categoryPath[0];
  const categories = asRemoteRecordArray(
    await chainViewApi.serviceCategories.list()
  );
  const match =
    categories.find(
      (category) => asRemoteString(category.categoryName) === categoryName
    ) ?? categories[0];

  return asRemoteNumber(match?.categoryId, 1);
}

async function addRemoteOwnerGroup(serviceId: number, groupName: string) {
  const groups = asRemoteRecordArray(await chainViewApi.ownership.groups.list());
  let groupId = asRemoteNumber(
    groups.find((group) => asRemoteString(group.groupName) === groupName)
      ?.groupId
  );

  if (!groupId) {
    const created = await chainViewApi.ownership.groups.create({
      groupCode: slugCode(groupName),
      groupName,
      description: "ChainView 화면에서 추가된 서비스 담당 그룹",
    });
    groupId = extractRemoteId(created);
  }

  if (!groupId) {
    throw new Error("생성된 담당 그룹 ID를 확인하지 못했습니다.");
  }

  return chainViewApi.ownership.serviceOwners.add({
    serviceId,
    ownerTypeCode: "GROUP",
    groupId,
    responsibilityCode: "MAIN",
  });
}

async function addRemoteTechStack(serviceId: number, techName: string) {
  const created = await chainViewApi.techStacks.create({
    techTypeCode: "ETC",
    techName,
    versionText: "-",
    vendorName: "-",
  });
  const techStackId = extractRemoteId(created);

  if (!techStackId) {
    throw new Error("생성된 기술스택 ID를 확인하지 못했습니다.");
  }

  return chainViewApi.serviceTechStacks.create({
    serviceId,
    techStackId,
    versionOverride: "-",
    remarks: "ChainView 화면에서 추가",
  });
}

function extractRemoteId(value: unknown) {
  if (!isRemoteRecord(value)) {
    return 0;
  }

  return (
    asRemoteNumber(value.id) ||
    asRemoteNumber(value.groupId) ||
    asRemoteNumber(value.techStackId) ||
    asRemoteNumber(value.serviceOwnerId)
  );
}

function toApiDateTime(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}:00`;
}

function slugCode(value: string) {
  const normalized = value
    .trim()
    .replace(/[^0-9a-zA-Z가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || `GROUP_${Date.now()}`;
}

function isRemoteRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRemoteRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRemoteRecord) : [];
}

function asRemoteString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRemoteNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-") + ` ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function nextId<T extends Record<K, number>, K extends keyof T>(
  items: T[],
  key: K
) {
  return Math.max(0, ...items.map((item) => item[key])) + 1;
}

function buildIncidentImpacts({
  incidentId,
  relations,
  serviceId,
  services,
}: {
  incidentId: number;
  relations: ServiceRelationRecord[];
  serviceId: number;
  services: ServiceRecord[];
}) {
  const serviceById = new Map(services.map((service) => [service.serviceId, service]));
  const activeRelations = relations.filter(
    (relation) =>
      relation.relationStatusCode === "ACTIVE" &&
      relation.sourceServiceId !== relation.targetServiceId
  );
  const impacts: IncidentImpactRecord[] = [];
  const visited = new Set<number>([serviceId]);
  const queue: Array<{ depth: number; path: number[]; serviceId: number }> = [
    { depth: 0, path: [serviceId], serviceId },
  ];

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth >= 2) {
      continue;
    }

    activeRelations
      .filter((relation) => relation.sourceServiceId === current.serviceId)
      .forEach((relation) => {
        const nextServiceId = relation.targetServiceId;
        if (visited.has(nextServiceId) || !serviceById.has(nextServiceId)) {
          return;
        }

        visited.add(nextServiceId);
        const nextPath = [...current.path, nextServiceId];
        impacts.push({
          impactId: incidentId * 100 + impacts.length + 1,
          incidentId,
          impactedServiceId: nextServiceId,
          impactLevel: current.depth + 1,
          impactPathText: nextPath
            .map((id) => serviceById.get(id)?.serviceName ?? String(id))
            .join(" -> "),
          directYn: current.depth === 0 ? "Y" : "N",
        });
        queue.push({
          depth: current.depth + 1,
          path: nextPath,
          serviceId: nextServiceId,
        });
      });
  }

  return impacts;
}

function buildInitialIncidentEvents({
  impactCount,
  incident,
  serviceName,
}: {
  impactCount: number;
  incident: IncidentRecord;
  serviceName: string;
}) {
  const now = timestamp();
  const messages: Array<Pick<IncidentEventRecord, "eventType" | "message" | "actor">> = [
    {
      eventType: "DETECTED",
      message:
        incident.manualRegisteredYn === "Y"
          ? `운영자가 ${serviceName} 인시던트를 수동 등록했습니다.`
          : `자동 헬스체크에서 ${serviceName} 비정상 응답을 감지했습니다.`,
      actor: incident.registeredBy,
    },
    {
      eventType: "IMPACT_ANALYZED",
      message: `서비스 관계 기준으로 예상 영향 서비스 ${impactCount}개를 산출했습니다.`,
      actor: "SYSTEM",
    },
    {
      eventType: "NOTIFICATION_SENT",
      message: "Slack, SMS, Email 알림을 담당 그룹에 전파했습니다.",
      actor: "SYSTEM",
    },
    {
      eventType: "ACK_WAITING",
      message: "담당자 ACK 및 조치 기록 입력을 대기 중입니다.",
      actor: "SYSTEM",
    },
  ];

  return messages.map((item, index) => ({
    eventId: incident.incidentId * 100 + index + 1,
    incidentId: incident.incidentId,
    createdAt: now,
    ...item,
  }));
}
