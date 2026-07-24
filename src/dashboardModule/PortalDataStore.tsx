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
import {
  buildRemoteApiDetail,
  countRemoteRows,
  previewRemoteResponse,
  remoteQueryLabels,
  remoteQueryKeys,
  remoteQueryLoaders,
  type RemoteApiCallDetail,
  type RemoteListRecord,
  type RemoteQueryKey,
} from "./remoteQueries";
import {
  asRemoteBoolean,
  asRemoteNumber,
  asRemoteRecordArray,
  asRemoteString,
  isRemoteRecord,
} from "./remoteValue";

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
  categoryId?: number;
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
  deployments?: RemoteListRecord[];
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
  "serviceId" | "techTypeCode" | "techTypeName" | "techName" | "versionText" | "vendorName"
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

type RemoteApiStatus = {
  state: "idle" | "loading" | "success" | "error" | "blocked";
  message: string;
  lastLoadedAt?: string;
  source?: RemoteQueryKey | "snapshot";
  detail?: RemoteApiCallDetail;
};

type NewIncidentInput = {
  incidentTypeCode?: IncidentRecord["incidentTypeCode"];
  serviceId?: number;
  serverId?: number;
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
  createIncident: (
    input: NewIncidentInput
  ) => Promise<{ ok: boolean; message: string; incident?: IncidentRecord }>;
  updateIncident: (
    incidentId: number,
    input: Partial<IncidentRecord>
  ) => void;
  deleteIncident: (incidentId: number) => void;
  updateIncidentStatus: (
    incidentId: number,
    statusCode: IncidentStatusCode,
    message?: string
  ) => Promise<{ ok: boolean; message: string }>;
  addIncidentEvent: (incidentId: number, message: string) => void;
  addServer: (input: NewServerInput) => ServerRecord;
  updateServer: (serverId: number, input: Partial<NewServerInput>) => void;
  deleteServer: (serverId: number) => { ok: boolean; message: string };
  addService: (input: NewServiceInput) => Promise<{ ok: boolean; message: string; service?: ServiceRecord }>;
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
    initialLoading: boolean;
    origin: string;
    status: RemoteApiStatus;
    debugEnabled: boolean;
    refresh: () => Promise<RemoteApiStatus>;
    refreshQueries: (queryKeys?: RemoteQueryKey[]) => Promise<RemoteApiStatus>;
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

function nowLabel() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

function remoteErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function remoteErrorDetailMessage(error: unknown, fallback: string) {
  const baseMessage = remoteErrorMessage(error, fallback);
  const body = (error as { body?: unknown })?.body;
  if (!body || typeof body !== "string") {
    return baseMessage;
  }

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const details = [
      parsed.message,
      parsed.error,
      parsed.detail,
      ...(Array.isArray(parsed.errors)
        ? parsed.errors.map((item) =>
            typeof item === "string"
              ? item
              : `${(item as Record<string, unknown>).field ?? (item as Record<string, unknown>).name ?? "필드"}: ${(item as Record<string, unknown>).message ?? (item as Record<string, unknown>).defaultMessage ?? (item as Record<string, unknown>).reason ?? JSON.stringify(item)}`
          )
        : []),
      ...(Array.isArray(parsed.fieldErrors)
        ? parsed.fieldErrors.map((item) =>
            `${(item as Record<string, unknown>).field ?? (item as Record<string, unknown>).name ?? "필드"}: ${(item as Record<string, unknown>).message ?? (item as Record<string, unknown>).defaultMessage ?? (item as Record<string, unknown>).reason ?? JSON.stringify(item)}`
          )
        : []),
      ...(Array.isArray(parsed.violations)
        ? parsed.violations.map((item) =>
            `${(item as Record<string, unknown>).field ?? (item as Record<string, unknown>).propertyPath ?? "필드"}: ${(item as Record<string, unknown>).message ?? JSON.stringify(item)}`
          )
        : []),
    ].filter(Boolean);
    return details.length ? `${baseMessage}\n\n상세:\n${Array.from(new Set(details)).join("\n")}` : baseMessage;
  } catch {
    return `${baseMessage}\n\n서버 응답:\n${body.slice(0, 700)}`;
  }
}

function notifyRemoteMutationFailure(error: unknown, fallback: string) {
  const message = remoteErrorDetailMessage(error, fallback);
  console.warn(`[ChainView API] ${fallback}`, error);
  window.alert(message);
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
  const [initialDataReady, setInitialDataReady] = useState(
    MANUAL_API_LOAD_MODE
  );
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
    setDeployments(snapshot.deployments);
    setRelations(snapshot.relations);
    setTechStacks(snapshot.techStacks);
    setOwners(snapshot.owners);
    setUsers(snapshot.users);
    setGroups(snapshot.groups);
    setCategories(snapshot.categories);
    setCodes(snapshot.codes);
    setIncidents(snapshot.incidents);
    setIncidentImpacts(snapshot.incidentImpacts);
    setIncidentEvents(snapshot.incidentEvents);
  };

  useEffect(() => {
    if (API_ONLY_DATA_MODE) {
      return;
    }

    let cancelled = false;
    void import("./mockData.generated")
      .then((mockData) => {
        if (cancelled) {
          return;
        }
        setServers(mockData.servers);
        setServices(normalizeInitialServices(mockData.services));
        setRelations(mockData.serviceRelations);
        setTechStacks(mockData.techStacks);
        setOwners(mockData.serviceOwners);
      })
      .finally(() => {
        if (!cancelled) {
          setInitialDataReady(true);
        }
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
      setInitialDataReady(true);
      return status;
    }

    if (isMixedContentRuntime) {
      const status = {
        state: "blocked" as const,
        message: "HTTPS 화면에서는 HTTP API를 브라우저가 차단합니다.",
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      setInitialDataReady(true);
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
        message: `조회 성공: 서비스 ${snapshot.services.length}건, 서버 ${snapshot.servers.length}건, 배포 ${snapshot.deployments.length}건`,
        lastLoadedAt: nowLabel(),
        source: "snapshot" as const,
      };
      setRemoteApiStatus(status);
      setInitialDataReady(true);
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
      setInitialDataReady(true);
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
      } else if (queryKey === "incidents") {
        setIncidents(rows.map((row) => mapIncidentFromRemote(row)));
      } else if (queryKey === "servers") {
        setServers(rows.map((row) => mapServerFromRemote(row)));
      } else if (queryKey === "services") {
        setServices(rows.map((row) => mapServiceFromRemote(row)));
      } else if (queryKey === "relations") {
        setRelations(rows.map((row) => mapRelationFromRemote(row)));
      } else if (queryKey === "techstacks") {
        setTechStacks(rows.map((row) => mapTechStackFromRemote(row)));
      } else if (queryKey === "owners") {
        setOwners(rows.map((row) => mapOwnerFromRemote(row)));
      }
  };

  const testRemoteQuery = useCallback(
    async (queryKey: RemoteQueryKey): Promise<RemoteApiStatus> => {
      if (!REMOTE_API_ENABLED) {
        const detail = buildRemoteApiDetail(queryKey, "blocked", remoteOrigin, {
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
        const detail = buildRemoteApiDetail(queryKey, "blocked", remoteOrigin, {
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
      const loadingDetail = buildRemoteApiDetail(queryKey, "loading", remoteOrigin);
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
          responsePreview: previewRemoteResponse(result),
          rowCount: countRemoteRows(result),
          state: "success" as const,
        };
        const status = {
          state: "success" as const,
          message: `${remoteQueryLabels[queryKey]} 성공: ${countRemoteRows(result)}건`,
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
  const refreshRemoteQueries = useCallback(
    async (queryKeys: RemoteQueryKey[] = remoteQueryKeys): Promise<RemoteApiStatus> => {
      const uniqueQueryKeys = Array.from(new Set(queryKeys));
      if (!uniqueQueryKeys.length) {
        return remoteApiStatus;
      }

      if (uniqueQueryKeys.length === remoteQueryKeys.length) {
        return loadRemoteSnapshot();
      }

      if (!REMOTE_API_ENABLED) {
        const status = {
          state: "blocked" as const,
          message: "원격 조회가 비활성화되어 있습니다.",
          source: uniqueQueryKeys[0],
        };
        setRemoteApiStatus(status);
        return status;
      }

      if (isMixedContentRuntime) {
        const status = {
          state: "blocked" as const,
          message: "HTTPS 화면에서는 HTTP API를 브라우저가 차단합니다.",
          source: uniqueQueryKeys[0],
        };
        setRemoteApiStatus(status);
        return status;
      }

      setRemoteApiStatus({
        state: "loading",
        message: `${uniqueQueryKeys.map((queryKey) => remoteQueryLabels[queryKey]).join(", ")} 실시간 조회 중`,
        source: uniqueQueryKeys[0],
      });

      const results = await Promise.allSettled(
        uniqueQueryKeys.map(async (queryKey) => {
          const result = await remoteQueryLoaders[queryKey]();
          applyRemoteQueryResult(queryKey, result);
        })
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        const reason = failed.reason;
        const status = {
          state: "error" as const,
          message:
            reason instanceof Error
              ? reason.message
              : "실시간 조회 API 호출에 실패했습니다.",
          source: uniqueQueryKeys[0],
        };
        setRemoteApiStatus(status);
        return status;
      }

      const status = {
        state: "success" as const,
        message: `${uniqueQueryKeys.map((queryKey) => remoteQueryLabels[queryKey]).join(", ")} 최신 조회 완료`,
        lastLoadedAt: nowLabel(),
        source: uniqueQueryKeys[uniqueQueryKeys.length - 1],
      };
      setRemoteApiStatus(status);
      return status;
    },
    [loadRemoteSnapshot, remoteApiStatus]
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
      incidentTypeCode: input.incidentTypeCode ?? "SERVICE",
      incidentStatusCode: "OPEN",
      ...input,
      startedAt: input.startedAt || now,
    };
    const impacts = input.serviceId
      ? buildIncidentImpacts({
          incidentId: nextIncident.incidentId,
          relations,
          serviceId: input.serviceId,
          services,
        })
      : [];
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
        input.serviceId && service.serviceId === input.serviceId
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
          (!input.serviceId || service.serviceId !== input.serviceId) &&
          service.statusCode === "NORMAL"
            ? { ...service, statusCode: "IMPACTED", updatedAt: now }
            : service
        )
      );
    }

    if (REMOTE_API_ENABLED) {
      return chainViewApi.incidents
        .create(toIncidentCreatePayload(input, now))
        .then(async (remoteIncident) => {
          const remoteRecord = isRemoteRecord(remoteIncident)
            ? mapIncidentFromRemote(remoteIncident)
            : nextIncident;
          const createdIncident = remoteRecord.incidentId
            ? { ...nextIncident, ...remoteRecord }
            : nextIncident;

          setIncidents((current) =>
            current.map((incident) =>
              incident.incidentId === nextIncident.incidentId
                ? createdIncident
                : incident
            )
          );
          if (createdIncident.incidentId !== nextIncident.incidentId) {
            setIncidentImpacts((current) =>
              current.map((impact) =>
                impact.incidentId === nextIncident.incidentId
                  ? { ...impact, incidentId: createdIncident.incidentId }
                  : impact
              )
            );
            setIncidentEvents((current) =>
              current.map((event) =>
                event.incidentId === nextIncident.incidentId
                  ? { ...event, incidentId: createdIncident.incidentId }
                  : event
              )
            );
          }
          return {
            ok: true,
            message: "인시던트가 생성되었습니다.",
            incident: createdIncident,
          };
        })
        .catch((error) => {
          setIncidents((current) =>
            current.filter((incident) => incident.incidentId !== nextIncident.incidentId)
          );
          setIncidentImpacts((current) =>
            current.filter((impact) => impact.incidentId !== nextIncident.incidentId)
          );
          setIncidentEvents((current) =>
            current.filter((event) => event.incidentId !== nextIncident.incidentId)
          );
          console.warn("[ChainView API] 인시던트 생성 API 호출에 실패했습니다.", error);
          return {
            ok: false,
            message: remoteErrorDetailMessage(error, "인시던트 생성에 실패했습니다."),
          };
        });
    }

    return Promise.resolve({
      ok: true,
      message: "인시던트가 생성되었습니다.",
      incident: nextIncident,
    });
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
        initialLoading: !initialDataReady,
        origin: remoteOrigin,
        status: remoteApiStatus,
        debugEnabled: API_DEBUG_ENABLED,
        refresh: loadRemoteSnapshot,
        refreshQueries: refreshRemoteQueries,
        testQuery: testRemoteQuery,
      },
      createIncident: createIncidentRecord,
      updateIncident: (incidentId, input) => {
        const previousIncident = incidents.find(
          (incident) => incident.incidentId === incidentId
        );
        if (!previousIncident) {
          return;
        }

        const nextIncident = { ...previousIncident, ...input, incidentId };
        setIncidents((current) =>
          current.map((incident) =>
            incident.incidentId === incidentId ? nextIncident : incident
          )
        );

        if (REMOTE_API_ENABLED) {
          void chainViewApi.incidents
            .update(
              incidentId,
              toIncidentUpdatePayload(
                nextIncident,
                nextIncident.incidentStatusCode,
                timestamp()
              )
            )
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              setIncidents((current) =>
                current.map((incident) =>
                  incident.incidentId === incidentId
                    ? previousIncident
                    : incident
                )
              );
              notifyRemoteMutationFailure(error, "인시던트 수정 API 호출에 실패했습니다.");
            });
        }
      },
      deleteIncident: (incidentId) => {
        const target = incidents.find(
          (incident) => incident.incidentId === incidentId
        );
        if (!target) {
          return;
        }

        const previousIncidents = incidents;
        const previousImpacts = incidentImpacts;
        const previousEvents = incidentEvents;
        const previousServices = services;
        const affectedServiceIds = new Set([
          ...(target.serviceId ? [target.serviceId] : []),
          ...incidentImpacts
            .filter((impact) => impact.incidentId === incidentId)
            .map((impact) => impact.impactedServiceId),
        ]);
        const serviceIdsWithOtherIncidents = new Set<number>();

        incidents
          .filter(
            (incident) =>
              incident.incidentId !== incidentId &&
              incident.incidentStatusCode !== "RESOLVED"
          )
          .forEach((incident) => {
            if (incident.serviceId) {
              serviceIdsWithOtherIncidents.add(incident.serviceId);
            }
            incidentImpacts
              .filter((impact) => impact.incidentId === incident.incidentId)
              .forEach((impact) =>
                serviceIdsWithOtherIncidents.add(impact.impactedServiceId)
              );
          });

        setIncidents((current) =>
          current.filter((incident) => incident.incidentId !== incidentId)
        );
        setIncidentImpacts((current) =>
          current.filter((impact) => impact.incidentId !== incidentId)
        );
        setIncidentEvents((current) =>
          current.filter((event) => event.incidentId !== incidentId)
        );
        setServices((current) =>
          current.map((service) =>
            affectedServiceIds.has(service.serviceId) &&
            !serviceIdsWithOtherIncidents.has(service.serviceId)
              ? { ...service, statusCode: "NORMAL", updatedAt: timestamp() }
              : service
          )
        );

        if (REMOTE_API_ENABLED) {
          void chainViewApi.incidents
            .delete(incidentId)
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              setIncidents(previousIncidents);
              setIncidentImpacts(previousImpacts);
              setIncidentEvents(previousEvents);
              setServices(previousServices);
              notifyRemoteMutationFailure(error, "인시던트 삭제 API 호출에 실패했습니다.");
            });
        }
      },
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
              ? chainViewApi.incidents.update(
                  incidentId,
                  toIncidentUpdatePayload(
                    { ...target, incidentStatusCode: statusCode, endedAt: now },
                    statusCode,
                    now
                  )
                )
              : chainViewApi.incidents.update(
                  incidentId,
                  toIncidentUpdatePayload(target, statusCode, now)
                );

          return remoteUpdate
            .then(() => ({
              ok: true,
              message:
                statusCode === "RESOLVED"
                  ? "인시던트가 종료 처리되었습니다."
                  : "인시던트 상태가 변경되었습니다.",
            }))
            .catch((error) => {
              if (target) {
                setIncidents((current) =>
                  current.map((incident) =>
                    incident.incidentId === incidentId ? target : incident
                  )
                );
              }
              console.warn("[ChainView API] 인시던트 상태 변경 API 호출에 실패했습니다.", error);
              return {
                ok: false,
                message: remoteErrorDetailMessage(error, "인시던트 상태 변경에 실패했습니다."),
              };
            });
        }

        return Promise.resolve({
          ok: true,
          message:
            statusCode === "RESOLVED"
              ? "인시던트가 종료 처리되었습니다."
              : "인시던트 상태가 변경되었습니다.",
        });
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
      addService: async (input) => {
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
        const nextDeployments = localDeploymentRecords(nextService, input);
        setServices((current) => [nextService, ...current]);
        if (nextDeployments.length) {
          setDeployments((current) => [...nextDeployments, ...current]);
        }
        if (REMOTE_API_ENABLED) {
          try {
            const payload = await toServicePayload(nextService);
            await chainViewApi.services.create(payload);
            await refreshRemoteData(400).catch((error) => {
              console.warn("[ChainView API] 서비스 등록 후 목록 새로고침에 실패했습니다.", error);
            });
          } catch (error) {
            setServices((current) =>
              current.filter((service) => service.serviceId !== nextService.serviceId)
            );
            setDeployments((current) =>
              current.filter((deployment) => Number(deployment.serviceId) !== nextService.serviceId)
            );
            console.warn("[ChainView API] 서비스 등록 API 호출에 실패했습니다.", error);
            return {
              ok: false,
              message: remoteErrorDetailMessage(error, "서비스 등록 API 호출에 실패했습니다."),
            };
          }
        }
        return { ok: true, message: "서비스가 등록되었습니다.", service: nextService };
      },
      updateService: (serviceId, input) => {
        const previousService = services.find(
          (service) => service.serviceId === serviceId
        );
        const previousDeployments = deployments;
        const nextDeployments = previousService
          ? localDeploymentRecords({ ...previousService, ...input }, input)
          : [];
        setServices((current) =>
          current.map((service) =>
            service.serviceId === serviceId
              ? { ...service, ...input, updatedAt: timestamp() }
              : service
          )
        );
        if (nextDeployments.length) {
          setDeployments((current) => [
            ...nextDeployments,
            ...current.filter((deployment) => Number(deployment.serviceId) !== serviceId),
          ]);
        }
        if (REMOTE_API_ENABLED && previousService) {
          void toServiceUpdatePayload(serviceId, { ...previousService, ...input })
            .then((payload) => chainViewApi.services.update(serviceId, payload))
            .then(() => refreshRemoteData(400))
            .catch((error) => {
              setServices((current) =>
                current.map((service) =>
                  service.serviceId === serviceId ? previousService : service
                )
              );
              setDeployments(previousDeployments);
              notifyRemoteMutationFailure(error, "서비스 수정 API 호출에 실패했습니다.");
            });
        }
      },
      deleteService: (serviceId) => {
        const previousServices = services;
        const previousRelations = relations;
        const previousOwners = owners;
        const previousTechStacks = techStacks;
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
              setServices(previousServices);
              setRelations(previousRelations);
              setOwners(previousOwners);
              setTechStacks(previousTechStacks);
              notifyRemoteMutationFailure(error, "서비스 삭제 API 호출에 실패했습니다.");
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
              setRelations((current) =>
                current.filter((relation) => relation.relationId !== nextRelation.relationId)
              );
              notifyRemoteMutationFailure(error, "서비스 관계 등록 API 호출에 실패했습니다.");
            });
        }
        return { ok: true, message: "서비스 종속 관계가 추가되었습니다." };
      },
      updateRelation: (relationId, input) => {
        const previousRelation = relations.find(
          (relation) => relation.relationId === relationId
        );
        setRelations((current) =>
          current.map((relation) =>
            relation.relationId === relationId
              ? { ...relation, ...input, updatedAt: timestamp() }
              : relation
          )
        );
        if (REMOTE_API_ENABLED && previousRelation) {
          const nextRelation = { ...previousRelation, ...input };
          void chainViewApi.serviceRelations
            .update(relationId, toRelationPayload(nextRelation))
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              setRelations((current) =>
                current.map((relation) =>
                  relation.relationId === relationId ? previousRelation : relation
                )
              );
              notifyRemoteMutationFailure(error, "서비스 관계 수정 API 호출에 실패했습니다.");
            });
        }
      },
      removeRelation: (relationId) => {
        const previousRelation = relations.find(
          (relation) => relation.relationId === relationId
        );
        setRelations((current) =>
          current.filter((relation) => relation.relationId !== relationId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceRelations
            .delete(relationId)
            .then(() => refreshRemoteData(300))
            .catch((error) => {
              if (previousRelation) {
                setRelations((current) => [previousRelation, ...current]);
              }
              notifyRemoteMutationFailure(error, "서비스 관계 삭제 API 호출에 실패했습니다.");
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
              setOwners((current) =>
                current.filter(
                  (owner) =>
                    !(
                      owner.serviceId === serviceId &&
                      owner.ownerTypeCode === "GROUP" &&
                      owner.ownerName === cleaned
                    )
                )
              );
              notifyRemoteMutationFailure(error, "담당 그룹 등록 API 호출에 실패했습니다.");
            });
        }
      },
      createOwner: (input) => {
        const serviceId = asRemoteNumber(input.serviceId);
        const service = services.find((item) => item.serviceId === serviceId);
        const ownerTypeCode = asRemoteString(input.ownerTypeCode) || "GROUP";
        const ownerName =
          ownerTypeCode === "USER"
            ? asRemoteString(input.userName)
            : asRemoteString(input.groupName);
        const nextOwner = {
          serviceOwnerId: nextRemoteId(owners as unknown as RemoteListRecord[], "serviceOwnerId"),
          serviceId,
          serviceCode: service?.serviceCode,
          ownerTypeCode,
          ownerName,
          responsibilityCode: asRemoteString(input.responsibilityCode) || "MAIN",
        };
        setOwners((current) => [nextOwner, ...current]);
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.serviceOwners
            .add(toServiceOwnerCreatePayload(input))
            .then(() => testRemoteQuery("owners"))
            .catch((error) => {
              setOwners((current) =>
                current.filter((owner) => owner.serviceOwnerId !== nextOwner.serviceOwnerId)
              );
              notifyRemoteMutationFailure(error, "담당자 등록 API 호출에 실패했습니다.");
            });
        }
      },
      updateOwner: (serviceOwnerId, input) => {
        const previousOwner = owners.find(
          (owner) => owner.serviceOwnerId === serviceOwnerId
        );
        setOwners((current) =>
          current.map((owner) =>
            owner.serviceOwnerId === serviceOwnerId
              ? {
                  ...owner,
                  serviceId: asRemoteNumber(input.serviceId) || owner.serviceId,
                  serviceCode:
                    services.find((item) => item.serviceId === asRemoteNumber(input.serviceId))?.serviceCode ??
                    owner.serviceCode,
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
              if (previousOwner) {
                setOwners((current) =>
                  current.map((owner) =>
                    owner.serviceOwnerId === serviceOwnerId ? previousOwner : owner
                  )
                );
              }
              notifyRemoteMutationFailure(error, "담당자 수정 API 호출에 실패했습니다.");
            });
        }
      },
      deleteOwner: (serviceOwnerId) => {
        const previousOwner = owners.find(
          (owner) => owner.serviceOwnerId === serviceOwnerId
        );
        setOwners((current) =>
          current.filter((owner) => owner.serviceOwnerId !== serviceOwnerId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.ownership.serviceOwners
            .delete(serviceOwnerId)
            .then(() => testRemoteQuery("owners"))
            .catch((error) => {
              if (previousOwner) {
                setOwners((current) => [previousOwner, ...current]);
              }
              notifyRemoteMutationFailure(error, "담당자 삭제 API 호출에 실패했습니다.");
            });
        }
      },
      addTechStack: (inputOrServiceId, techName) => {
        const input =
          typeof inputOrServiceId === "number"
            ? {
                serviceId: inputOrServiceId,
                techTypeCode: "FRAMEWORK",
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

        const nextTechStack = {
          techStackId: nextId(techStacks, "techStackId"),
          serviceId: input.serviceId,
          techTypeCode: input.techTypeCode || "FRAMEWORK",
          techTypeName:
            input.techTypeName ||
            codeLabels.techType[input.techTypeCode || "FRAMEWORK"] ||
            "서비스 기술",
          techName: cleaned,
          versionText: input.versionText || "-",
          vendorName: input.vendorName || "-",
        };
        setTechStacks((current) => [nextTechStack, ...current]);
        if (REMOTE_API_ENABLED) {
          void addRemoteTechStack(input)
            .then(() => testRemoteQuery("techstacks"))
            .catch((error) => {
              setTechStacks((current) =>
                current.filter((techStack) => techStack.techStackId !== nextTechStack.techStackId)
              );
              notifyRemoteMutationFailure(error, "기술스택 등록 API 호출에 실패했습니다.");
            });
        }
      },
      updateTechStack: (techStackId, input) => {
        const previousTechStack = techStacks.find(
          (techStack) => techStack.techStackId === techStackId
        );
        setTechStacks((current) =>
          current.map((techStack) =>
            techStack.techStackId === techStackId
              ? { ...techStack, ...input }
              : techStack
          )
        );
        if (REMOTE_API_ENABLED && previousTechStack) {
          void chainViewApi.serviceTechStacks
            .update(techStackId, toServiceTechStackUpdatePayload({ ...previousTechStack, ...input }))
            .then(() => testRemoteQuery("techstacks"))
            .catch((error) => {
              setTechStacks((current) =>
                current.map((techStack) =>
                  techStack.techStackId === techStackId ? previousTechStack : techStack
                )
              );
              notifyRemoteMutationFailure(error, "기술스택 수정 API 호출에 실패했습니다.");
            });
        }
      },
      deleteTechStack: (techStackId) => {
        const previousTechStack = techStacks.find(
          (techStack) => techStack.techStackId === techStackId
        );
        setTechStacks((current) =>
          current.filter((techStack) => techStack.techStackId !== techStackId)
        );
        if (REMOTE_API_ENABLED) {
          void chainViewApi.serviceTechStacks
            .delete(techStackId)
            .then(() => testRemoteQuery("techstacks"))
            .catch((error) => {
              if (previousTechStack) {
                setTechStacks((current) => [previousTechStack, ...current]);
              }
              notifyRemoteMutationFailure(error, "기술스택 삭제 API 호출에 실패했습니다.");
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
              setDeployments((current) =>
                current.filter((deployment) => deploymentKey(deployment) !== deploymentKey(nextDeployment))
              );
              notifyRemoteMutationFailure(
                error,
                "배포 정보 등록 API 호출에 실패했습니다."
              );
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
              notifyRemoteMutationFailure(
                error,
                "배포 정보 수정 API 호출에 실패했습니다."
              );
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
              setDeployments((current) => [input, ...current]);
              notifyRemoteMutationFailure(
                error,
                "배포 정보 삭제 API 호출에 실패했습니다."
              );
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
      initialDataReady,
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
      refreshRemoteQueries,
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
  const deployments = explicitServiceDeploymentPayloads(input);
  return {
    categoryId: input.categoryId || (await findCategoryId(input.categoryPath)),
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

async function toServiceUpdatePayload(
  serviceId: number,
  input: NewServiceInput | ServiceRecord
) {
  const detail = await chainViewApi.services.detail(serviceId).catch(() => null);
  const detailRecord = isRemoteRecord(detail) ? detail : null;
  const inputDeployments = explicitServiceDeploymentPayloads(input);
  const deployments = inputDeployments.length
    ? inputDeployments
    : asRemoteRecordArray(detailRecord?.deployments).map(toRemoteDeploymentPayload);

  return {
    categoryId:
      input.categoryId ||
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

function explicitServiceDeploymentPayloads(input: NewServiceInput | ServiceRecord) {
  const inputDeployments = asRemoteRecordArray(
    (input as NewServiceInput & { deployments?: unknown })?.deployments
  ).map(toRemoteDeploymentPayload);
  return inputDeployments;
}

function localDeploymentRecords(
  service: ServiceRecord,
  input: Partial<NewServiceInput | ServiceRecord>
) {
  return explicitServiceDeploymentPayloads({
    ...service,
    ...input,
  } as NewServiceInput | ServiceRecord).map((deployment, index) => ({
    ...deployment,
    serviceId: service.serviceId,
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
    deploymentKey: `${service.serviceId}-local-${deployment.serverId}-${index}`,
  }));
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

function knownRemoteCode<T extends string>(
  value: unknown,
  labels: Record<T, string>,
  fallback: T
): T {
  const code = asRemoteString(value) as T;
  return code && Object.prototype.hasOwnProperty.call(labels, code)
    ? code
    : fallback;
}

function mapServerFromRemote(row: RemoteListRecord): ServerRecord {
  const serverServiceRefs = remoteServerServiceRefs(row);
  return {
    serverId: asRemoteNumber(row.serverId ?? row.id),
    serverName: asRemoteString(row.serverName ?? row.name),
    hostName: asRemoteString(row.hostName ?? row.hostname),
    ipAddress: asRemoteString(row.ipAddress ?? row.ip),
    envCode: knownRemoteCode(row.envCode, codeLabels.env, "PROD"),
    osTypeCode: knownRemoteCode(row.osTypeCode, codeLabels.osType, "LINUX"),
    osVersion: asRemoteString(row.osVersion),
    statusCode: knownRemoteCode(row.statusCode, codeLabels.serverStatus, "RUNNING"),
    description: asRemoteString(row.description),
    serviceCodes: serverServiceRefs.serviceCodes,
    serviceIds: serverServiceRefs.serviceIds,
    createdAt: asRemoteString(row.createdAt),
    updatedAt: asRemoteString(row.updatedAt),
  };
}

function remoteServerServiceRefs(row: RemoteListRecord) {
  const serviceIds = new Set<number>();
  const serviceCodes = new Set<string>();

  [
    row.serviceId,
    ...(Array.isArray(row.serviceIds) ? row.serviceIds : []),
  ].forEach((value) => {
    const serviceId = asRemoteNumber(value);
    if (serviceId) serviceIds.add(serviceId);
  });

  [
    row.serviceCode,
    ...(Array.isArray(row.serviceCodes) ? row.serviceCodes : []),
  ].forEach((value) => {
    const serviceCode = asRemoteString(value);
    if (serviceCode) serviceCodes.add(serviceCode);
  });

  ["services", "serviceServers", "deployments", "serverMappings"].forEach((key) => {
    asRemoteRecordArray(row[key]).forEach((record) => {
      const service = isRemoteRecord(record.service) ? record.service : null;
      const serviceId = asRemoteNumber(record.serviceId ?? record.id ?? service?.serviceId ?? service?.id);
      const serviceCode = asRemoteString(record.serviceCode ?? record.code ?? service?.serviceCode ?? service?.code);
      if (serviceId) serviceIds.add(serviceId);
      if (serviceCode) serviceCodes.add(serviceCode);
    });
  });

  return {
    serviceCodes: [...serviceCodes],
    serviceIds: [...serviceIds],
  };
}

function remoteServiceDeploymentRows(row: RemoteListRecord): RemoteListRecord[] {
  const arrayKeys = [
    "deployments",
    "serviceServers",
    "deploymentServers",
    "servers",
    "serverMappings",
  ];
  for (const key of arrayKeys) {
    const rows = asRemoteRecordArray(row[key]);
    if (rows.length) {
      return rows;
    }
  }

  const serverIds = Array.isArray(row.serverIds)
    ? row.serverIds
    : Array.isArray(row.deploymentServerIds)
      ? row.deploymentServerIds
      : [];
  const mappedServerIds = serverIds
    .map((serverId) => asRemoteNumber(serverId))
    .filter(Boolean);
  if (mappedServerIds.length) {
    return mappedServerIds.map((serverId) => ({ serverId }));
  }

  const serverId = asRemoteNumber(row.serverId);
  return serverId ? [{ serverId }] : [];
}

function remoteDeploymentServerId(row: RemoteListRecord | undefined, fallback?: unknown) {
  const nestedServer = isRemoteRecord(row?.server) ? row?.server : null;
  return asRemoteNumber(
    row?.serverId ??
      row?.deploymentServerId ??
      row?.infraServerId ??
      row?.id ??
      nestedServer?.serverId ??
      nestedServer?.id ??
      fallback
  );
}

function mapServiceFromRemote(row: RemoteListRecord): ServiceRecord {
  const deploymentRows = remoteServiceDeploymentRows(row);
  const primaryDeployment = deploymentRows[0];
  return {
    serviceId: asRemoteNumber(row.serviceId ?? row.id),
    categoryPath: asRemoteString(row.categoryPath)
      ? asRemoteString(row.categoryPath).split(/[>/]/).map((part) => part.trim()).filter(Boolean)
      : [asRemoteString(row.categoryName)].filter(Boolean),
    serviceCode: asRemoteString(row.serviceCode ?? row.code),
    serviceName: asRemoteString(row.serviceName ?? row.name),
    serviceTypeCode: knownRemoteCode(row.serviceTypeCode, codeLabels.serviceType, "WEB"),
    importanceCode: knownRemoteCode(row.importanceCode, codeLabels.importance, "MEDIUM"),
    statusCode: knownRemoteCode(row.statusCode, codeLabels.serviceStatus, "NORMAL"),
    description: asRemoteString(row.description),
    endpointUrl: asRemoteString(row.endpointUrl),
    serverId: remoteDeploymentServerId(primaryDeployment, row.serverId),
    deployPath: asRemoteString(primaryDeployment?.deployPath ?? row.deployPath),
    portInfo: asRemoteString(primaryDeployment?.portInfo ?? row.portInfo),
    deploymentStatusCode: knownRemoteCode(primaryDeployment?.deploymentStatusCode ?? row.deploymentStatusCode, codeLabels.deploymentStatus, "RUNNING"),
    instanceCount: asRemoteNumber(row.instanceCount, 1),
    createdBy: asRemoteString(row.createdBy),
    updatedBy: asRemoteString(row.updatedBy),
    createdAt: asRemoteString(row.createdAt),
    updatedAt: asRemoteString(row.updatedAt),
  };
}

function mapRelationFromRemote(row: RemoteListRecord): ServiceRelationRecord {
  return {
    relationId: asRemoteNumber(row.relationId ?? row.id),
    sourceServiceId: asRemoteNumber(row.sourceServiceId),
    targetServiceId: asRemoteNumber(row.targetServiceId),
    relationTypeCode: knownRemoteCode(row.relationTypeCode, codeLabels.relationType, "REST"),
    mandatoryYn: asRemoteString(row.mandatoryYn) === "Y" ? "Y" : "N",
    relationStatusCode: knownRemoteCode(row.relationStatusCode, codeLabels.relationStatus, "ACTIVE"),
    description: asRemoteString(row.description),
    createdAt: asRemoteString(row.createdAt),
    updatedAt: asRemoteString(row.updatedAt),
  };
}

function mapTechStackFromRemote(row: RemoteListRecord): TechStackRecord {
  return {
    techStackId: asRemoteNumber(row.techStackId ?? row.id),
    serviceId: asRemoteNumber(row.serviceId),
    techTypeCode: knownRemoteCode(row.techTypeCode, codeLabels.techType, "ETC"),
    techName: asRemoteString(row.techName ?? row.name),
    version: asRemoteString(row.version),
    vendor: asRemoteString(row.vendor),
    description: asRemoteString(row.description),
    createdAt: asRemoteString(row.createdAt),
    updatedAt: asRemoteString(row.updatedAt),
  };
}

function mapOwnerFromRemote(row: RemoteListRecord): ServiceOwnerRecord {
  return {
    serviceOwnerId: asRemoteNumber(row.serviceOwnerId ?? row.id),
    serviceId: asRemoteNumber(row.serviceId),
    ownerTypeCode: knownRemoteCode(row.ownerTypeCode, codeLabels.ownerType, "GROUP"),
    ownerId: asRemoteNumber(row.ownerId),
    ownerName: asRemoteString(row.ownerName ?? row.name),
    roleName: asRemoteString(row.roleName),
    primaryYn: asRemoteString(row.primaryYn) === "N" ? "N" : "Y",
    createdAt: asRemoteString(row.createdAt),
    updatedAt: asRemoteString(row.updatedAt),
  };
}

function mapIncidentFromRemote(row: RemoteListRecord): IncidentRecord {
  const statusCode = knownRemoteCode(
    row.incidentStatusCode ?? row.status,
    codeLabels.incidentStatus,
    "OPEN"
  );
  const incidentTypeCode = knownRemoteCode(
    row.incidentTypeCode ?? row.incidentType,
    codeLabels.incidentType,
    asRemoteString(row.targetType) === "SERVER" ? "SERVER" : "SERVICE"
  );
  return {
    incidentId: asRemoteNumber(row.incidentId ?? row.id),
    externalIncidentCode: asRemoteString(row.externalIncidentCode ?? row.incidentCode),
    title: asRemoteString(row.title),
    incidentTypeCode,
    incidentStatusCode: statusCode,
    severityCode: knownRemoteCode(row.severityCode ?? row.severity, codeLabels.severity, "MAJOR"),
    serviceId:
      asRemoteNumber(row.serviceId) ||
      (asRemoteString(row.targetType) === "SERVICE" ? asRemoteNumber(row.targetId) : 0) ||
      undefined,
    serverId:
      asRemoteNumber(row.serverId) ||
      (asRemoteString(row.targetType) === "SERVER" ? asRemoteNumber(row.targetId) : 0) ||
      undefined,
    infraNodeId: asRemoteNumber(row.infraNodeId) || undefined,
    targetCode: asRemoteString(row.targetCode ?? row.targetId),
    targetLabel: asRemoteString(row.targetLabel),
    startedAt: asRemoteString(row.startedAt ?? row.occurredAt ?? row.createdAt),
    endedAt: asRemoteString(row.endedAt ?? row.resolvedAt),
    summary: asRemoteString(row.summary ?? row.description),
    createdBy: asRemoteString(row.createdBy),
    updatedBy: asRemoteString(row.updatedBy),
    manualRegisteredYn: asRemoteString(row.manualRegisteredYn) === "Y" ? "Y" : "N",
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
  let replaced = false;
  const deployments = asRemoteRecordArray((detail as Record<string, unknown>)?.deployments).map(
    (deployment) => {
      if (deploymentKey({ ...deployment, serviceId }) !== key) {
        return deployment;
      }
      replaced = true;
      return input;
    }
  );
  if (!replaced) {
    deployments.push(input);
  }
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
  const incidentType = input.incidentTypeCode ?? "SERVICE";
  return {
    incidentTypeCode: incidentType,
    serviceId: input.serviceId,
    serverId: input.serverId,
    infraNodeId: input.infraNodeId,
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
  const resolvedAt =
    incidentStatusCode === "RESOLVED"
      ? toApiDateTime(updatedAt)
      : incident.endedAt
        ? toApiDateTime(incident.endedAt)
        : undefined;
  return {
    incidentStatusCode,
    severityCode: incident.severityCode,
    title: incident.title,
    description: incident.description,
    startedAt: toApiDateTime(incident.startedAt),
    endedAt: resolvedAt,
  };
}

async function findCategoryId(categoryPath: string[]) {
  const cleanedPath = categoryPath.map((item) => item.trim()).filter(Boolean);
  const categoryName = cleanedPath[cleanedPath.length - 1] ?? "";
  const categories = asRemoteRecordArray(
    await chainViewApi.serviceCategories.list()
  );
  const categoryLevel = cleanedPath.length || 1;
  const leafCategories = categories.filter(
    (category) => asRemoteNumber(category.categoryLevel) === 3
  );
  const match =
    categories.find(
      (category) =>
        asRemoteNumber(category.categoryLevel, categoryLevel) === categoryLevel &&
        asRemoteString(category.categoryName) === categoryName
    ) ??
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

async function addRemoteTechStack(input: {
  serviceId: number;
  techTypeCode?: keyof typeof codeLabels.techType;
  techTypeName: string;
  techName: string;
  versionText: string;
  vendorName: string;
}) {
  const techTypeCode = input.techTypeCode || "FRAMEWORK";

  const created = await chainViewApi.techStacks.create({
    techTypeCode,
    techTypeName:
      input.techTypeName || codeLabels.techType[techTypeCode] || "서비스 기술",
    techName: input.techName,
    versionText: input.versionText || "-",
    vendorName: input.vendorName || "-",
  });
  const techStackId = extractRemoteId(created);

  if (!techStackId) {
    throw new Error("생성된 기술스택 ID를 확인하지 못했습니다.");
  }

  return chainViewApi.serviceTechStacks.create({
    serviceId: input.serviceId,
    techStackId,
    versionOverride: input.versionText || "-",
    remarks: input.vendorName || "ChainView 화면에서 추가",
  });
}

function toServiceTechStackUpdatePayload(input: {
  serviceId: number;
  versionText?: string;
  vendorName?: string;
}) {
  return {
    serviceId: input.serviceId,
    versionOverride: asRemoteString(input.versionText) || "-",
    remarks: asRemoteString(input.vendorName),
  };
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
  const normalized = value.trim().replace(" ", "T");
  const localDateTime = normalized.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2}))?/
  );

  if (!localDateTime) {
    return normalized;
  }

  return `${localDateTime[1]}:${localDateTime[2] ?? "00"}`;
}

function slugCode(value: string) {
  const normalized = value
    .trim()
    .replace(/[^0-9a-zA-Z가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || `GROUP_${Date.now()}`;
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
