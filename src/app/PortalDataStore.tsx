import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  serviceOwners as initialServiceOwners,
  serviceRelations as initialServiceRelations,
  services as initialServices,
  servers as initialServers,
  techStacks as initialTechStacks,
  type DeploymentStatusCode,
  type EnvCode,
  type IncidentRecord,
  type ImportanceCode,
  type OsTypeCode,
  type RelationStatusCode,
  type RelationTypeCode,
  type ServerRecord,
  type ServerStatusCode,
  type ServiceOwnerRecord,
  type ServiceRecord,
  type ServiceRelationRecord,
  type ServiceStatusCode,
  type ServiceTypeCode,
  type TechStackRecord,
} from "./mockData";

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

type HealthCheckResult = {
  serviceId: number;
  url: string;
  statusCode: number;
  statusText: string;
  checkedAt: string;
};

type PortalDataContextValue = {
  servers: ServerRecord[];
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  techStacks: TechStackRecord[];
  owners: ServiceOwnerRecord[];
  incidents: IncidentRecord[];
  healthChecks: HealthCheckResult[];
  addServer: (input: NewServerInput) => ServerRecord;
  updateServer: (serverId: number, input: Partial<NewServerInput>) => void;
  deleteServer: (serverId: number) => { ok: boolean; message: string };
  addService: (input: NewServiceInput) => ServiceRecord;
  updateService: (serviceId: number, input: Partial<ServiceRecord>) => void;
  deleteService: (serviceId: number) => void;
  addRelation: (input: NewRelationInput) => { ok: boolean; message: string };
  removeRelation: (relationId: number) => void;
  addOwnerGroup: (serviceId: number, groupName: string) => void;
  addTechStack: (serviceId: number, techName: string) => void;
  runHealthCheck: (serviceId: number, url: string) => HealthCheckResult;
};

const PortalDataContext = createContext<PortalDataContextValue | null>(null);

const initialIncidents: IncidentRecord[] = [
  {
    incidentId: 1,
    incidentTypeCode: "SERVICE",
    serviceId: 1,
    incidentStatusCode: "OPEN",
    severityCode: "MAJOR",
    title: "테스트서비스 REST API 응답 지연",
    description:
      "서비스 관계 그래프 기준으로 111 서비스가 1차 영향 대상으로 계산되었습니다.",
    startedAt: "2026-05-17 10:30",
    manualRegisteredYn: "Y",
    registeredBy: "8913812",
  },
];

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState(initialServers);
  const [services, setServices] = useState(initialServices);
  const [relations, setRelations] = useState(initialServiceRelations);
  const [techStacks, setTechStacks] = useState(initialTechStacks);
  const [owners, setOwners] = useState(initialServiceOwners);
  const [incidents] = useState(initialIncidents);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);

  const value = useMemo<PortalDataContextValue>(
    () => ({
      servers,
      services,
      relations,
      techStacks,
      owners,
      incidents,
      healthChecks,
      addServer: (input) => {
        const now = timestamp();
        const nextServer: ServerRecord = {
          serverId: nextId(servers, "serverId"),
          createdAt: now,
          updatedAt: now,
          ...input,
        };
        setServers((current) => [nextServer, ...current]);
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
        return { ok: true, message: "서비스 종속 관계가 추가되었습니다." };
      },
      removeRelation: (relationId) => {
        setRelations((current) =>
          current.filter((relation) => relation.relationId !== relationId)
        );
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
      },
      addTechStack: (serviceId, techName) => {
        const cleaned = techName.trim();
        if (!cleaned) {
          return;
        }

        setTechStacks((current) => [
          {
            techStackId: nextId(current, "techStackId"),
            serviceId,
            techTypeName: "서비스 기술",
            techName: cleaned,
            versionText: "-",
            vendorName: "-",
          },
          ...current,
        ]);
      },
      runHealthCheck: (serviceId, url) => {
        const normalizedUrl = url.trim();
        const ok =
          normalizedUrl.startsWith("https://") &&
          !normalizedUrl.toLowerCase().includes("fail");
        const result: HealthCheckResult = {
          serviceId,
          url: normalizedUrl,
          statusCode: ok ? 200 : 503,
          statusText: ok
            ? "정상 응답"
            : "비정상 응답 - 담당 그룹 알림 대상",
          checkedAt: timestamp(),
        };

        setHealthChecks((current) => [result, ...current]);
        return result;
      },
    }),
    [healthChecks, incidents, owners, relations, services, servers, techStacks]
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

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function nextId<T extends Record<K, number>, K extends keyof T>(
  items: T[],
  key: K
) {
  return Math.max(0, ...items.map((item) => item[key])) + 1;
}
