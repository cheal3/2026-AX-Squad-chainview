import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type RemoteQueryKey =
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

type RemoteListRecord = Record<string, unknown>;

type RemoteApiStatus = {
  state: "idle" | "loading" | "success" | "error" | "blocked";
  message: string;
  lastLoadedAt?: string;
  source?: RemoteQueryKey | "snapshot";
  detail?: RemoteApiCallDetail;
};

type RemoteApiCallDetail = {
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
  users: RemoteListRecord[];
  groups: RemoteListRecord[];
  categories: RemoteListRecord[];
  codes: RemoteListRecord[];
  deployments: RemoteListRecord[];
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
  createOwner: (input: RemoteListRecord) => void;
  updateOwner: (serviceOwnerId: number, input: RemoteListRecord) => void;
  deleteOwner: (serviceOwnerId: number) => void;
  addTechStack: (
    inputOrServiceId: NewTechStackInput | number,
    techName?: string
  ) => void;
  updateTechStack: (
    techStackId: number,
    input: Partial<TechStackRecord>
  ) => void;
  deleteTechStack: (techStackId: number) => void;
  createUser: (input: RemoteListRecord) => void;
  updateUser: (userId: number, input: RemoteListRecord) => void;
  deleteUser: (userId: number) => void;
  createGroup: (input: RemoteListRecord) => void;
  updateGroup: (groupId: number, input: RemoteListRecord) => void;
  deleteGroup: (groupId: number) => void;
  createCategory: (input: RemoteListRecord) => void;
  updateCategory: (categoryId: number, input: RemoteListRecord) => void;
  deleteCategory: (categoryId: number) => void;
  createCode: (input: RemoteListRecord) => void;
  updateCode: (codeGroup: string, code: string, input: RemoteListRecord) => void;
  deleteCode: (codeGroup: string, code: string) => void;
  createDeployment: (input: RemoteListRecord) => void;
  updateDeployment: (input: RemoteListRecord) => void;
  deleteDeployment: (input: RemoteListRecord) => void;
  runHealthCheck: (serviceId: number, url: string) => HealthCheckResult;
  remoteApi: {
    enabled: boolean;
    origin: string;
    status: RemoteApiStatus;
    debugEnabled: boolean;
    refresh: () => Promise<RemoteApiStatus>;
    testQuery: (queryKey: RemoteQueryKey) => Promise<RemoteApiStatus>;
  };
};

const PortalDataContext = createContext<PortalDataContextValue | null>(null);
const API_ONLY_DATA_MODE = import.meta.env.VITE_CHAINVIEW_DATA_SOURCE === "api";
const API_DEBUG_ENABLED = import.meta.env.DEV && import.meta.env.MODE !== "production";
const MANUAL_API_LOAD_MODE =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITE_CHAINVIEW_MANUAL_API_LOAD === "true";
const remoteApiEnabledFlag = import.meta.env.VITE_CHAINVIEW_REMOTE_API_ENABLED;
const remoteOrigin = import.meta.env.VITE_CHAINVIEW_REMOTE_ORIGIN ?? "http://chainview.kro.kr:8080";
const isMixedContentRuntime =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  remoteOrigin.startsWith("http://");
const REMOTE_API_ENABLED =
  API_ONLY_DATA_MODE ||
  (remoteApiEnabledFlag === undefined
    ? import.meta.env.DEV
    : remoteApiEnabledFlag === "true" || remoteApiEnabledFlag === "1");

const remoteQueryLoaders: Record<RemoteQueryKey, () => Promise<unknown>> = {
  services: () => chainViewApi.services.list(),
  servers: () => chainViewApi.servers.list(),
  relations: () => chainViewApi.serviceRelations.list(),
  techstacks: () => chainViewApi.serviceTechStacks.list(),
  owners: () => chainViewApi.ownership.serviceOwners.list(),
  incidents: () => chainViewApi.incidents.list(),
  users: () => chainViewApi.ownership.users.list(),
  groups: () => chainViewApi.ownership.groups.list(),
  categories: () => chainViewApi.serviceCategories.list(),
  codes: () => chainViewApi.commonCodes.list(),
  deployments: loadServiceDeployments,
};

const remoteQueryPaths: Record<RemoteQueryKey, string> = {
  services: "/api/services",
  servers: "/api/servers",
  relations: "/api/service-relations",
  techstacks: "/api/service-tech-stacks",
  owners: "/api/ownership/service-owners",
  incidents: "/api/incidents",
  users: "/api/ownership/users",
  groups: "/api/ownership/groups",
  categories: "/api/service-categories",
  codes: "/api/common-codes",
  deployments: "/api/services + /api/services/{serviceId}",
};

const remoteQueryLabels: Record<RemoteQueryKey | "snapshot", string> = {
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

async function loadServiceDeployments() {
  const serviceRows = asRemoteRecordArray(await chainViewApi.services.list());
  const settled = await Promise.allSettled(
    serviceRows.map((service) => {
      const serviceId = asRemoteNumber(service.serviceId);
      return serviceId ? chainViewApi.services.detail(serviceId) : null;
    })
  );

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    const detail = isRemoteRecord(result.value) ? result.value : {};
    const service = serviceRows[index];
    return asRemoteRecordArray(detail.deployments).map((deployment, deploymentIndex) => ({
      ...deployment,
      deploymentKey: `${asRemoteNumber(service.serviceId)}-${asRemoteNumber(deployment.deploymentId, deploymentIndex + 1)}`,
      serviceCode: asRemoteString(detail.serviceCode ?? service.serviceCode),
      serviceId: asRemoteNumber(detail.serviceId ?? service.serviceId),
      serviceName: asRemoteString(detail.serviceName ?? service.serviceName),
    }));
  });
}

function nowLabel() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

function countRows(value: unknown) {
  return Array.isArray(value) ? value.length : 1;
}

function buildRemoteApiDetail(
  queryKey: RemoteQueryKey,
  state: RemoteApiCallDetail["state"],
  overrides: Partial<RemoteApiCallDetail> = {}
): RemoteApiCallDetail {
  const path = remoteQueryPaths[queryKey];
  const origin = remoteOrigin.replace(/\/$/, "");
  return {
    label: remoteQueryLabels[queryKey],
    method: "GET",
    origin,
    path,
    queryKey,
    startedAt: new Date().toISOString(),
    state,
    url: `${origin}${path}`,
    ...overrides,
  };
}

function previewResponse(value: unknown) {
  if (Array.isArray(value)) {
    return value.slice(0, 3);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return value ?? null;
}

function normalizeInitialServices(services: ServiceRecord[]) {
  return services.map((service) => ({
    ...service,
    statusCode: "NORMAL" as ServiceStatusCode,
    deploymentStatusCode:
      service.deploymentStatusCode === "STOPPED"
        ? service.deploymentStatusCode
        : ("RUNNING" as DeploymentStatusCode),
  }));
}

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [relations, setRelations] = useState<ServiceRelationRecord[]>([]);
  const [techStacks, setTechStacks] = useState<TechStackRecord[]>([]);
  const [owners, setOwners] = useState<ServiceOwnerRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [users, setUsers] = useState<RemoteListRecord[]>([]);
  const [groups, setGroups] = useState<RemoteListRecord[]>([]);
  const [categories, setCategories] = useState<RemoteListRecord[]>([]);
  const [codes, setCodes] = useState<RemoteListRecord[]>([]);
  const [deployments, setDeployments] = useState<RemoteListRecord[]>([]);
  const [incidentImpacts, setIncidentImpacts] = useState<IncidentImpactRecord[]>([]);
  const [incidentEvents, setIncidentEvents] = useState<IncidentEventRecord[]>(
    []
  );
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);
  const [remoteApiStatus, setRemoteApiStatus] = useState<RemoteApiStatus>({
    state: "idle",
    message: MANUAL_API_LOAD_MODE
      ? "API 실행 전"
      : API_ONLY_DATA_MODE
      ? "API 전용 모드: 원격 조회 대기"
      : REMOTE_API_ENABLED
      ? "원격 조회 대기"
      : "원격 조회 비활성",
  });

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

  useEffect(() => {
    if (API_ONLY_DATA_MODE) {
      return;
    }

    let cancelled = false;
    void import("./mockData.generated").then((mockData) => {
      if (cancelled) {
        return;
      }
      setServers(mockData.servers);
      setServices(normalizeInitialServices(mockData.services));
      setRelations(mockData.serviceRelations);
      setTechStacks(mockData.techStacks);
      setOwners(mockData.serviceOwners);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadRemoteSnapshot = useCallback(async (): Promise<RemoteApiStatus> => {
    if (!REMOTE_API_ENABLED) {
      const status = {
        state: "blocked" as const,
        message: "원격 조회가 비활성화되어 있습니다.",
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      return status;
    }

    if (isMixedContentRuntime) {
      const status = {
        state: "blocked" as const,
        message: "HTTPS 화면에서는 HTTP API를 브라우저가 차단합니다.",
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      return status;
    }

    setRemoteApiStatus({
      state: "loading",
      message: "원격 기본 조회 API 호출 중",
      source: "snapshot",
    });

    try {
      const snapshot = await loadRemotePortalSnapshot();
      applyRemoteSnapshot(snapshot);
      const status = {
        state: "success" as const,
        message: `조회 성공: 서비스 ${snapshot.services.length}건, 서버 ${snapshot.servers.length}건`,
        lastLoadedAt: nowLabel(),
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      return status;
    } catch (error) {
      console.warn("[ChainView API] remote snapshot load failed", error);
      const status = {
        state: "error" as const,
        message:
          error instanceof Error
            ? error.message
            : "원격 기본 조회 API 호출에 실패했습니다.",
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      return status;
    }
  }, []);

  const refreshRemoteData = (delayMs = 0) => {
    if (delayMs > 0) {
      window.setTimeout(() => {
        void loadRemoteSnapshot();
      }, delayMs);
      return;
    }

    void loadRemoteSnapshot();
  };

  const applyRemoteQueryResult = (queryKey: RemoteQueryKey, result: unknown) => {
    const rows = asRemoteRecordArray(result);
    if (queryKey === "users") {
      setUsers(rows);
    } else if (queryKey === "groups") {
      setGroups(rows);
    } else if (queryKey === "categories") {
      setCategories(rows);
    } else if (queryKey === "codes") {
      setCodes(rows);
    } else if (queryKey === "deployments") {
      setDeployments(rows);
    }
  };

  const testRemoteQuery = useCallback(
    async (queryKey: RemoteQueryKey): Promise<RemoteApiStatus> => {
      if (!REMOTE_API_ENABLED) {
        const detail = buildRemoteApiDetail(queryKey, "blocked", {
          errorMessage: "원격 조회가 비활성화되어 있습니다.",
          finishedAt: new Date().toISOString(),
        });
        const status = {
          state: "blocked" as const,
          message: "원격 조회가 비활성화되어 있습니다.",
          source: queryKey,
          detail,
        };
        setRemoteApiStatus(status);
        return status;
      }

      if (isMixedContentRuntime) {
        const detail = buildRemoteApiDetail(queryKey, "blocked", {
          errorMessage: "HTTPS 화면에서는 HTTP API를 브라우저가 차단합니다.",
          finishedAt: new Date().toISOString(),
        });
        const status = {
          state: "blocked" as const,
          message: "HTTPS 화면에서는 HTTP API를 브라우저가 차단합니다.",
          source: queryKey,
          detail,
        };
        setRemoteApiStatus(status);
        return status;
      }

      const startedAtMs = performance.now();
      const loadingDetail = buildRemoteApiDetail(queryKey, "loading");
      setRemoteApiStatus({
        state: "loading",
        message: `${remoteQueryLabels[queryKey]} API 호출 중`,
        source: queryKey,
        detail: loadingDetail,
      });

      try {
        const result = await remoteQueryLoaders[queryKey]();
        const finishedAt = new Date().toISOString();
        const detail = {
          ...loadingDetail,
          durationMs: Math.round(performance.now() - startedAtMs),
          finishedAt,
          responsePreview: previewResponse(result),
          rowCount: countRows(result),
          state: "success" as const,
        };
        const status = {
          state: "success" as const,
          message: `${remoteQueryLabels[queryKey]} 성공: ${countRows(result)}건`,
          lastLoadedAt: nowLabel(),
          source: queryKey,
          detail,
        };
        applyRemoteQueryResult(queryKey, result);
        setRemoteApiStatus(status);
        await loadRemoteSnapshot();
        setRemoteApiStatus(status);
        return status;
      } catch (error) {
        console.warn("[ChainView API] remote query test failed", error);
        const message =
          error instanceof Error
            ? error.message
            : `${remoteQueryLabels[queryKey]} API 호출에 실패했습니다.`;
        const detail = {
          ...loadingDetail,
          durationMs: Math.round(performance.now() - startedAtMs),
          errorMessage: message,
          finishedAt: new Date().toISOString(),
          state: "error" as const,
        };
        const status = {
          state: "error" as const,
          message,
          source: queryKey,
          detail,
        };
        setRemoteApiStatus(status);
        return status;
      }
    },
    [loadRemoteSnapshot]
  );

  useEffect(() => {
    if (!REMOTE_API_ENABLED || MANUAL_API_LOAD_MODE) {
      return;
    }
    void loadRemoteSnapshot();
  }, [loadRemoteSnapshot]);

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
      users,
      groups,
      categories,
      codes,
      deployments,
      incidentImpacts,
      incidentEvents,
      healthChecks,
      remoteApi: {
        enabled: REMOTE_API_ENABLED,
        origin: remoteOrigin,
        status: remoteApiStatus,
        debugEnabled: API_DEBUG_ENABLED,
        refresh: loadRemoteSnapshot,
        testQuery: testRemoteQuery,
      },
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
              setServices((current) =>
                current.filter((service) => service.serviceId !== nextService.serviceId)
              );
              window.alert(
                error instanceof Error
                  ? error.message
                  : "서비스 등록 API 호출에 실패했습니다."
              );
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
      createOwner: (input) => {
        const serviceId = asRemoteNumber(input.serviceId);
        const ownerTypeCode = asRemoteString(input.ownerTypeCode) || "GROUP";
        const ownerName =
          ownerTypeCode === "USER"
            ? asRemoteString(input.userName)
            : asRemoteString(input.groupName);
        setOwners((current) => [
          {
            serviceOwnerId: nextRemoteId(current as unknown as RemoteListRecord[], "serviceOwnerId"),
            serviceId,
            ownerTypeCode,
            ownerName,
            responsibilityCode: asRemoteString(input.responsibilityCode) || "MAIN",
          },
          ...current,
        ]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.serviceOwners
            .add(toServiceOwnerCreatePayload(input))
            .then(() => testRemoteQuery("owners"))
            .catch((error) => {
              console.warn("[ChainView API] service owner create failed", error);
            });
        }
      },
      updateOwner: (serviceOwnerId, input) => {
        setOwners((current) =>
          current.map((owner) =>
            owner.serviceOwnerId === serviceOwnerId
              ? {
                  ...owner,
                  serviceId: asRemoteNumber(input.serviceId) || owner.serviceId,
                  ownerTypeCode:
                    asRemoteString(input.ownerTypeCode) === "USER" ? "USER" : "GROUP",
                  groupId: asRemoteNumber(input.groupId) || null,
                  userId: asRemoteNumber(input.userId) || null,
                  ownerName:
                    asRemoteString(input.ownerTypeCode) === "USER"
                      ? asRemoteString(input.userName) || owner.ownerName
                      : asRemoteString(input.groupName) || owner.ownerName,
                  responsibilityCode: asRemoteString(input.responsibilityCode) || owner.responsibilityCode,
                }
              : owner
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.serviceOwners
            .update(serviceOwnerId, toServiceOwnerUpdatePayload(input))
            .then(() => testRemoteQuery("owners"))
            .catch((error) => {
              console.warn("[ChainView API] service owner update failed", error);
            });
        }
      },
      deleteOwner: (serviceOwnerId) => {
        setOwners((current) =>
          current.filter((owner) => owner.serviceOwnerId !== serviceOwnerId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.serviceOwners
            .delete(serviceOwnerId)
            .then(() => testRemoteQuery("owners"))
            .catch((error) => {
              console.warn("[ChainView API] service owner delete failed", error);
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
      createUser: (input) => {
        const nextUser = {
          userId: nextRemoteId(users, "userId"),
          ...input,
          activeYn: asRemoteBoolean(input.active) ? "Y" : "N",
        };
        setUsers((current) => [nextUser, ...current]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.users
            .create(toUserCreatePayload(input))
            .then(() => testRemoteQuery("users"))
            .catch((error) => {
              console.warn("[ChainView API] user create failed", error);
            });
        }
      },
      updateUser: (userId, input) => {
        setUsers((current) =>
          current.map((user) =>
            asRemoteNumber(user.userId) === userId
              ? { ...user, ...input, activeYn: asRemoteBoolean(input.active) ? "Y" : "N" }
              : user
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.users
            .update(userId, toUserUpdatePayload(input))
            .then(() => testRemoteQuery("users"))
            .catch((error) => {
              console.warn("[ChainView API] user update failed", error);
            });
        }
      },
      deleteUser: (userId) => {
        setUsers((current) =>
          current.filter((user) => asRemoteNumber(user.userId) !== userId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.users
            .delete(userId)
            .then(() => testRemoteQuery("users"))
            .catch((error) => {
              console.warn("[ChainView API] user delete failed", error);
            });
        }
      },
      createGroup: (input) => {
        setGroups((current) => [
          { groupId: nextRemoteId(current, "groupId"), ...input },
          ...current,
        ]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.groups
            .create(toGroupCreatePayload(input))
            .then(() => testRemoteQuery("groups"))
            .catch((error) => {
              console.warn("[ChainView API] group create failed", error);
            });
        }
      },
      updateGroup: (groupId, input) => {
        setGroups((current) =>
          current.map((group) =>
            asRemoteNumber(group.groupId) === groupId ? { ...group, ...input } : group
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.groups
            .update(groupId, toGroupUpdatePayload(input))
            .then(() => testRemoteQuery("groups"))
            .catch((error) => {
              console.warn("[ChainView API] group update failed", error);
            });
        }
      },
      deleteGroup: (groupId) => {
        setGroups((current) =>
          current.filter((group) => asRemoteNumber(group.groupId) !== groupId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.groups
            .delete(groupId)
            .then(() => testRemoteQuery("groups"))
            .catch((error) => {
              console.warn("[ChainView API] group delete failed", error);
            });
        }
      },
      createCategory: (input) => {
        setCategories((current) => [
          { categoryId: nextRemoteId(current, "categoryId"), ...input },
          ...current,
        ]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceCategories
            .create(toCategoryCreatePayload(input))
            .then(() => testRemoteQuery("categories"))
            .catch((error) => {
              console.warn("[ChainView API] category create failed", error);
            });
        }
      },
      updateCategory: (categoryId, input) => {
        setCategories((current) =>
          current.map((category) =>
            asRemoteNumber(category.categoryId) === categoryId ? { ...category, ...input } : category
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceCategories
            .update(categoryId, toCategoryUpdatePayload(input))
            .then(() => testRemoteQuery("categories"))
            .catch((error) => {
              console.warn("[ChainView API] category update failed", error);
            });
        }
      },
      deleteCategory: (categoryId) => {
        setCategories((current) =>
          current.filter((category) => asRemoteNumber(category.categoryId) !== categoryId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceCategories
            .delete(categoryId)
            .then(() => testRemoteQuery("categories"))
            .catch((error) => {
              console.warn("[ChainView API] category delete failed", error);
            });
        }
      },
      createCode: (input) => {
        setCodes((current) => [{ useYn: "Y", ...input }, ...current]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.commonCodes
            .create(toCommonCodeCreatePayload(input))
            .then(() => testRemoteQuery("codes"))
            .catch((error) => {
              console.warn("[ChainView API] common code create failed", error);
            });
        }
      },
      updateCode: (codeGroup, code, input) => {
        setCodes((current) =>
          current.map((item) =>
            asRemoteString(item.codeGroup) === codeGroup && asRemoteString(item.code) === code
              ? { ...item, ...input }
              : item
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.commonCodes
            .update(codeGroup, code, toCommonCodeUpdatePayload(input))
            .then(() => testRemoteQuery("codes"))
            .catch((error) => {
              console.warn("[ChainView API] common code update failed", error);
            });
        }
      },
      deleteCode: (codeGroup, code) => {
        setCodes((current) =>
          current.filter(
            (item) => !(asRemoteString(item.codeGroup) === codeGroup && asRemoteString(item.code) === code)
          )
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.commonCodes
            .delete(codeGroup, code)
            .then(() => testRemoteQuery("codes"))
            .catch((error) => {
              console.warn("[ChainView API] common code delete failed", error);
            });
        }
      },
      createDeployment: (input) => {
        const serviceId = asRemoteNumber(input.serviceId);
        const serverId = asRemoteNumber(input.serverId);
        const service = services.find((item) => item.serviceId === serviceId);
        const server = servers.find((item) => item.serverId === serverId);
        const nextDeployment = {
          deploymentKey: `${serviceId}-new-${Date.now()}`,
          ...input,
          serviceCode: service?.serviceCode,
          serviceName: service?.serviceName,
          serverName: server?.serverName,
          hostName: server?.hostName,
        };
        setDeployments((current) => [nextDeployment, ...current]);
        if (REMOTE_API_ENABLED && serviceId) {
          void appendRemoteDeployment(serviceId, input)
            .then(() => testRemoteQuery("deployments"))
            .catch((error) => {
              console.warn("[ChainView API] deployment create failed", error);
            });
        }
      },
      updateDeployment: (input) => {
        const serviceId = asRemoteNumber(input.serviceId);
        const key = deploymentKey(input);
        setDeployments((current) =>
          current.map((deployment) =>
            deploymentKey(deployment) === key ? { ...deployment, ...input } : deployment
          )
        );
        if (REMOTE_API_ENABLED && serviceId) {
          void replaceRemoteDeployment(serviceId, input)
            .then(() => testRemoteQuery("deployments"))
            .catch((error) => {
              console.warn("[ChainView API] deployment update failed", error);
            });
        }
      },
      deleteDeployment: (input) => {
        const serviceId = asRemoteNumber(input.serviceId);
        const key = deploymentKey(input);
        setDeployments((current) =>
          current.filter((deployment) => deploymentKey(deployment) !== key)
        );
        if (REMOTE_API_ENABLED && serviceId) {
          void removeRemoteDeployment(serviceId, input)
            .then(() => testRemoteQuery("deployments"))
            .catch((error) => {
              console.warn("[ChainView API] deployment delete failed", error);
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
      users,
      groups,
      categories,
      codes,
      deployments,
      owners,
      relations,
      remoteApiStatus,
      services,
      servers,
      testRemoteQuery,
      loadRemoteSnapshot,
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

function toUserCreatePayload(input: RemoteListRecord) {
  return {
    employeeNo: asRemoteString(input.employeeNo),
    userName: asRemoteString(input.userName),
    orgName: asRemoteString(input.orgName),
    departmentName: asRemoteString(input.departmentName),
    roleName: asRemoteString(input.roleName),
    phoneNumber: asRemoteString(input.phoneNumber),
    email: asRemoteString(input.email),
    active: asRemoteBoolean(input.active ?? input.activeYn, true),
  };
}

function toUserUpdatePayload(input: RemoteListRecord) {
  return {
    userName: asRemoteString(input.userName),
    orgName: asRemoteString(input.orgName),
    departmentName: asRemoteString(input.departmentName),
    roleName: asRemoteString(input.roleName),
    phoneNumber: asRemoteString(input.phoneNumber),
    email: asRemoteString(input.email),
    active: asRemoteBoolean(input.active ?? input.activeYn, true),
  };
}

function toGroupCreatePayload(input: RemoteListRecord) {
  return {
    groupCode: asRemoteString(input.groupCode),
    groupName: asRemoteString(input.groupName),
    description: asRemoteString(input.description),
  };
}

function toGroupUpdatePayload(input: RemoteListRecord) {
  return {
    groupName: asRemoteString(input.groupName),
    description: asRemoteString(input.description),
  };
}

function toServiceOwnerCreatePayload(input: RemoteListRecord) {
  const ownerTypeCode = asRemoteString(input.ownerTypeCode) || "GROUP";
  return {
    serviceId: asRemoteNumber(input.serviceId),
    ownerTypeCode,
    groupId: ownerTypeCode === "GROUP" ? asRemoteNumber(input.groupId) : null,
    userId: ownerTypeCode === "USER" ? asRemoteNumber(input.userId) : null,
    responsibilityCode: asRemoteString(input.responsibilityCode) || "MAIN",
  };
}

function toServiceOwnerUpdatePayload(input: RemoteListRecord) {
  const ownerTypeCode = asRemoteString(input.ownerTypeCode) || "GROUP";
  return {
    serviceId: asRemoteNumber(input.serviceId),
    ownerTypeCode,
    groupId: ownerTypeCode === "GROUP" ? asRemoteNumber(input.groupId) : null,
    userId: ownerTypeCode === "USER" ? asRemoteNumber(input.userId) : null,
    responsibilityCode: asRemoteString(input.responsibilityCode) || "MAIN",
  };
}

function toCategoryCreatePayload(input: RemoteListRecord) {
  const parentCategoryId = asRemoteNumber(input.parentCategoryId);
  return {
    parentCategoryId: parentCategoryId || null,
    categoryLevel: asRemoteNumber(input.categoryLevel, 1),
    categoryCode: asRemoteString(input.categoryCode),
    categoryName: asRemoteString(input.categoryName),
    sortOrder: asRemoteNumber(input.sortOrder),
  };
}

function toCategoryUpdatePayload(input: RemoteListRecord) {
  return {
    categoryName: asRemoteString(input.categoryName),
    sortOrder: asRemoteNumber(input.sortOrder),
  };
}

function toCommonCodeCreatePayload(input: RemoteListRecord) {
  return {
    codeGroup: asRemoteString(input.codeGroup),
    code: asRemoteString(input.code),
    codeName: asRemoteString(input.codeName),
    sortOrder: asRemoteNumber(input.sortOrder),
    remarks: asRemoteString(input.remarks),
  };
}

function toCommonCodeUpdatePayload(input: RemoteListRecord) {
  return {
    codeName: asRemoteString(input.codeName),
    sortOrder: asRemoteNumber(input.sortOrder),
    useYn: asRemoteString(input.useYn) || "Y",
    remarks: asRemoteString(input.remarks),
  };
}

async function appendRemoteDeployment(serviceId: number, input: RemoteListRecord) {
  const detail = await chainViewApi.services.detail(serviceId);
  const deployments = asRemoteRecordArray((detail as Record<string, unknown>)?.deployments);
  await saveRemoteServiceDeployments(serviceId, detail, [...deployments, input]);
}

async function replaceRemoteDeployment(serviceId: number, input: RemoteListRecord) {
  const detail = await chainViewApi.services.detail(serviceId);
  const key = deploymentKey(input);
  const deployments = asRemoteRecordArray((detail as Record<string, unknown>)?.deployments).map(
    (deployment) => deploymentKey({ ...deployment, serviceId }) === key ? input : deployment
  );
  await saveRemoteServiceDeployments(serviceId, detail, deployments);
}

async function removeRemoteDeployment(serviceId: number, input: RemoteListRecord) {
  const detail = await chainViewApi.services.detail(serviceId);
  const key = deploymentKey(input);
  const deployments = asRemoteRecordArray((detail as Record<string, unknown>)?.deployments).filter(
    (deployment) => deploymentKey({ ...deployment, serviceId }) !== key
  );
  await saveRemoteServiceDeployments(serviceId, detail, deployments);
}

async function saveRemoteServiceDeployments(
  serviceId: number,
  detail: unknown,
  deployments: RemoteListRecord[]
) {
  const record = isRemoteRecord(detail) ? detail : {};
  const payload = {
    categoryId: asRemoteNumber(record.categoryId, 1),
    serviceCode: asRemoteString(record.serviceCode),
    serviceName: asRemoteString(record.serviceName),
    serviceTypeCode: asRemoteString(record.serviceTypeCode) || "API",
    importanceCode: asRemoteString(record.importanceCode) || "NORMAL",
    statusCode: asRemoteString(record.statusCode) || "NORMAL",
    description: asRemoteString(record.description),
    endpointUrl: asRemoteString(record.endpointUrl),
    deployments: deployments.map(toRemoteDeploymentPayload),
  };
  await chainViewApi.services.update(serviceId, payload);
}

function deploymentKey(input: RemoteListRecord) {
  return [
    asRemoteNumber(input.serviceId),
    asRemoteNumber(input.serviceServerId) ||
      asRemoteNumber(input.deploymentId) ||
      asRemoteString(input.deploymentKey) ||
      `${asRemoteNumber(input.serverId)}:${asRemoteString(input.deployPath)}:${asRemoteString(input.portInfo)}`,
  ].join(":");
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
  const cleanedPath = categoryPath.map((item) => item.trim()).filter(Boolean);
  const categoryName = cleanedPath[cleanedPath.length - 1] ?? "";
  const categories = asRemoteRecordArray(
    await chainViewApi.serviceCategories.list()
  );
  const leafCategories = categories.filter(
    (category) => asRemoteNumber(category.categoryLevel) === 3
  );
  const match =
    leafCategories.find(
      (category) => asRemoteString(category.categoryName) === categoryName
    ) ??
    categories.find(
      (category) => asRemoteString(category.categoryName) === categoryName
    ) ??
    leafCategories[0] ??
    categories[0];

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

function asRemoteBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = asRemoteString(value).toUpperCase();
  if (["Y", "TRUE", "ACTIVE", "1"].includes(normalized)) {
    return true;
  }
  if (["N", "FALSE", "INACTIVE", "0"].includes(normalized)) {
    return false;
  }
  return fallback;
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

function nextRemoteId(items: RemoteListRecord[], key: string) {
  return Math.max(0, ...items.map((item) => asRemoteNumber(item[key]))) + 1;
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
