export const codeLabels = {
  serviceStatus: {
    NORMAL: "정상",
    INCIDENT: "장애",
    IMPACTED: "영향받음",
    MAINTENANCE: "점검중",
    INACTIVE: "비활성",
  },
  serverStatus: {
    NORMAL: "정상",
    INCIDENT: "장애",
    MAINTENANCE: "점검중",
    INACTIVE: "비활성",
  },
  envType: {
    PROD: "운영",
    STAGE: "스테이징",
    DEV: "개발",
  },
  osType: {
    LINUX: "Linux",
    WINDOWS: "Windows",
    UNIX: "Unix",
    ETC: "기타",
  },
  serviceType: {
    WEB: "웹 서비스",
    API: "API 서비스",
    BATCH: "배치",
    EXTERNAL: "외부 연계",
  },
  importance: {
    CRITICAL: "매우 중요",
    HIGH: "중요",
    NORMAL: "보통",
    LOW: "낮음",
  },
  deploymentStatus: {
    RUNNING: "기동",
    STOPPED: "중지",
    MAINTENANCE: "점검중",
    REMOVED: "제거",
  },
  relationType: {
    REST: "REST API",
    SOAP: "SOAP",
    MQ: "Message Queue",
    FILE: "File Transfer",
    ETC: "기타",
  },
  relationStatus: {
    ACTIVE: "활성",
    INACTIVE: "비활성",
    DEPRECATED: "폐기 예정",
  },
  incidentType: {
    SERVICE: "서비스 장애",
    SERVER: "서버 장애",
  },
  incidentStatus: {
    OPEN: "진행중",
    MONITORING: "모니터링",
    RESOLVED: "해결",
  },
  severity: {
    CRITICAL: "심각",
    MAJOR: "중대",
    MINOR: "경미",
    NOTICE: "공지",
  },
  ownerType: {
    GROUP: "그룹",
    USER: "사용자",
  },
  responsibilityType: {
    MAIN: "정 담당",
    SUB: "부 담당",
    ALERT: "알림 대상",
  },
};

export type ServerStatusCode = keyof typeof codeLabels.serverStatus;
export type ServiceStatusCode = keyof typeof codeLabels.serviceStatus;
export type EnvCode = keyof typeof codeLabels.envType;
export type OsTypeCode = keyof typeof codeLabels.osType;
export type ServiceTypeCode = keyof typeof codeLabels.serviceType;
export type ImportanceCode = keyof typeof codeLabels.importance;
export type DeploymentStatusCode = keyof typeof codeLabels.deploymentStatus;
export type RelationTypeCode = keyof typeof codeLabels.relationType;
export type RelationStatusCode = keyof typeof codeLabels.relationStatus;
export type IncidentStatusCode = keyof typeof codeLabels.incidentStatus;
export type SeverityCode = keyof typeof codeLabels.severity;

export interface ServerRecord {
  serverId: number;
  serverName: string;
  hostName: string;
  ipAddress: string;
  envCode: EnvCode;
  osTypeCode: OsTypeCode;
  osVersion: string;
  statusCode: ServerStatusCode;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  serviceId: number;
  categoryPath: string[];
  serviceCode: string;
  serviceName: string;
  serviceTypeCode: ServiceTypeCode;
  importanceCode?: ImportanceCode;
  statusCode: ServiceStatusCode;
  description: string;
  endpointUrl: string;
  serverId: number;
  deployPath: string;
  portInfo: string;
  deploymentStatusCode?: DeploymentStatusCode;
  instanceCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRelationRecord {
  relationId: number;
  sourceServiceId: number;
  targetServiceId: number;
  relationTypeCode: RelationTypeCode;
  mandatoryYn: "Y" | "N";
  relationStatusCode: RelationStatusCode;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechStackRecord {
  techStackId: number;
  serviceId: number;
  techTypeName: string;
  techName: string;
  versionText: string;
  vendorName: string;
}

export interface ServiceOwnerRecord {
  serviceOwnerId: number;
  serviceId: number;
  ownerTypeCode: "GROUP" | "USER";
  ownerName: string;
  responsibilityCode: "MAIN" | "SUB" | "ALERT";
}

export interface IncidentRecord {
  incidentId: number;
  incidentTypeCode: "SERVICE" | "SERVER";
  serviceId?: number;
  serverId?: number;
  incidentStatusCode: IncidentStatusCode;
  severityCode: SeverityCode;
  title: string;
  description: string;
  startedAt: string;
  endedAt?: string;
  manualRegisteredYn: "Y" | "N";
  registeredBy: string;
}

export interface IncidentImpactRecord {
  impactId: number;
  incidentId: number;
  impactedServiceId: number;
  impactLevel: number;
  impactPathText: string;
  directYn: "Y" | "N";
}

const baseServers: ServerRecord[] = [
  {
    serverId: 2,
    serverName: "server-test-name111",
    hostName: "server-test-host네임111",
    ipAddress: "19.1.1.11",
    envCode: "STAGE",
    osTypeCode: "LINUX",
    osVersion: "Ubuntu 22.04",
    statusCode: "NORMAL",
    description: "서비스 111이 배포된 스테이징 Linux 서버",
    createdAt: "2026-05-17 09:35",
    updatedAt: "2026-05-17 10:10",
  },
  {
    serverId: 1,
    serverName: "server-test-name",
    hostName: "server-test-host네임",
    ipAddress: "19.1.1.1",
    envCode: "PROD",
    osTypeCode: "LINUX",
    osVersion: "Rocky Linux 9",
    statusCode: "NORMAL",
    description: "테스트서비스가 배포된 운영 Linux 서버",
    createdAt: "2026-05-17 09:00",
    updatedAt: "2026-05-17 10:00",
  },
];

const generatedServers = Array.from({ length: 120 }, (_, index) => {
  const serverId = index + 3;
  const envCodes: EnvCode[] = ["PROD", "STAGE", "DEV"];
  const osCodes: OsTypeCode[] = ["LINUX", "WINDOWS", "UNIX", "ETC"];
  const statusCodes: ServerStatusCode[] = [
    "NORMAL",
    "NORMAL",
    "NORMAL",
    "MAINTENANCE",
    "INCIDENT",
    "INACTIVE",
  ];
  const envCode = envCodes[index % envCodes.length];
  const osTypeCode = osCodes[index % osCodes.length];

  return {
    serverId,
    serverName: `${envCode.toLowerCase()}-chainview-${String(serverId).padStart(3, "0")}`,
    hostName: `${envCode.toLowerCase()}-cv-${String(serverId).padStart(3, "0")}.internal`,
    ipAddress: `10.${20 + (index % 30)}.${Math.floor(index / 20) + 1}.${(index % 240) + 10}`,
    envCode,
    osTypeCode,
    osVersion:
      osTypeCode === "WINDOWS"
        ? "Windows Server 2022"
        : osTypeCode === "UNIX"
          ? "AIX 7.3"
          : "Rocky Linux 9",
    statusCode: statusCodes[index % statusCodes.length],
    description: `${codeLabels.envType[envCode]} 테스트용 ChainView 서버 ${serverId}`,
    createdAt: `2026-05-17 ${String(8 + (index % 10)).padStart(2, "0")}:00`,
    updatedAt: `2026-05-17 ${String(9 + (index % 10)).padStart(2, "0")}:30`,
  } satisfies ServerRecord;
});

export const servers: ServerRecord[] = [...baseServers, ...generatedServers];

const baseServices: ServiceRecord[] = [
  {
    serviceId: 2,
    categoryPath: ["채널계", "대고객 채널", "홈페이지"],
    serviceCode: "DD1222",
    serviceName: "111",
    serviceTypeCode: "WEB",
    statusCode: "NORMAL",
    description: "대고객 채널 홈페이지 서비스",
    endpointUrl: "https://chainview.example.com",
    serverId: 2,
    deployPath: "/opt/apps/order",
    portInfo: "8080, 8443",
    instanceCount: 1,
    createdBy: "8913812",
    updatedBy: "8913812",
    createdAt: "2026-05-17 10:05",
    updatedAt: "2026-05-17 10:15",
  },
  {
    serviceId: 1,
    categoryPath: ["기간계/업무계", "방카", "대출"],
    serviceCode: "TEST-SVC-001",
    serviceName: "테스트서비스",
    serviceTypeCode: "API",
    importanceCode: "NORMAL",
    statusCode: "NORMAL",
    description: "방카 업무 API 테스트 서비스",
    endpointUrl: "https://test-service.example.com",
    serverId: 1,
    deployPath: "/opt/apps/test-service",
    portInfo: "8080",
    deploymentStatusCode: "RUNNING",
    instanceCount: 1,
    createdBy: "8913812",
    updatedBy: "8913812",
    createdAt: "2026-05-17 09:20",
    updatedAt: "2026-05-17 10:00",
  },
];

const generatedServices = Array.from({ length: 160 }, (_, index) => {
  const serviceId = index + 3;
  const categories = [
    ["기간계/업무계", "계약", "조회"],
    ["기간계/업무계", "고객", "인증"],
    ["채널계", "모바일", "홈페이지"],
    ["공동 플랫폼", "공통 API", "정산"],
    ["데이터 분석계", "리포팅", "조회"],
    ["대외 채널", "제휴", "외부 연계"],
  ];
  const serviceTypeCodes: ServiceTypeCode[] = ["WEB", "API", "BATCH", "EXTERNAL"];
  const statusCodes: ServiceStatusCode[] = [
    "NORMAL",
    "NORMAL",
    "NORMAL",
    "MAINTENANCE",
    "IMPACTED",
    "INACTIVE",
  ];
  const deploymentCodes: DeploymentStatusCode[] = [
    "RUNNING",
    "RUNNING",
    "RUNNING",
    "MAINTENANCE",
    "STOPPED",
  ];
  const category = categories[index % categories.length];
  const serviceTypeCode = serviceTypeCodes[index % serviceTypeCodes.length];
  const serverId = (index % generatedServers.length) + 3;

  return {
    serviceId,
    categoryPath: [...category, `업무-${String(serviceId).padStart(3, "0")}`],
    serviceCode: `CV-SVC-${String(serviceId).padStart(3, "0")}`,
    serviceName: `ChainView 테스트 서비스 ${String(serviceId).padStart(3, "0")}`,
    serviceTypeCode,
    importanceCode: index % 9 === 0 ? "HIGH" : "NORMAL",
    statusCode: statusCodes[index % statusCodes.length],
    description: `대량 목록과 관계도 검증을 위한 테스트 서비스 ${serviceId}`,
    endpointUrl:
      serviceTypeCode === "BATCH"
        ? ""
        : `https://svc-${String(serviceId).padStart(3, "0")}.chainview.example.com`,
    serverId,
    deployPath: `/opt/apps/chainview/service-${String(serviceId).padStart(3, "0")}`,
    portInfo: String(8000 + (index % 90)),
    deploymentStatusCode: deploymentCodes[index % deploymentCodes.length],
    instanceCount: (index % 4) + 1,
    createdBy: "8913812",
    updatedBy: "8913812",
    createdAt: `2026-05-17 ${String(8 + (index % 10)).padStart(2, "0")}:10`,
    updatedAt: `2026-05-17 ${String(9 + (index % 10)).padStart(2, "0")}:40`,
  } satisfies ServiceRecord;
});

export const services: ServiceRecord[] = [...baseServices, ...generatedServices];

const baseServiceRelations: ServiceRelationRecord[] = [
  {
    relationId: 2,
    sourceServiceId: 2,
    targetServiceId: 1,
    relationTypeCode: "REST",
    mandatoryYn: "Y",
    relationStatusCode: "ACTIVE",
    description: "-",
    createdAt: "2026-05-17 10:20",
    updatedAt: "2026-05-17 10:20",
  },
  {
    relationId: 1,
    sourceServiceId: 1,
    targetServiceId: 1,
    relationTypeCode: "REST",
    mandatoryYn: "Y",
    relationStatusCode: "ACTIVE",
    description: "-",
    createdAt: "2026-05-17 10:00",
    updatedAt: "2026-05-17 10:00",
  },
];

const generatedServiceRelations = generatedServices
  .slice(0, 90)
  .map((service, index) => {
    const target = generatedServices[(index + 7) % generatedServices.length];
    const relationTypeCodes: RelationTypeCode[] = ["REST", "MQ", "FILE", "SOAP"];

    return {
      relationId: index + 3,
      sourceServiceId: service.serviceId,
      targetServiceId: target.serviceId,
      relationTypeCode: relationTypeCodes[index % relationTypeCodes.length],
      mandatoryYn: index % 4 === 0 ? "N" : "Y",
      relationStatusCode: index % 11 === 0 ? "DEPRECATED" : "ACTIVE",
      description: `테스트 관계 ${service.serviceCode} -> ${target.serviceCode}`,
      createdAt: "2026-05-17 11:00",
      updatedAt: "2026-05-17 11:00",
    } satisfies ServiceRelationRecord;
  });

export const serviceRelations: ServiceRelationRecord[] = [
  ...baseServiceRelations,
  ...generatedServiceRelations,
];

export const techStacks: TechStackRecord[] = [
  {
    techStackId: 1,
    serviceId: 2,
    techTypeName: "프론트엔드 프레임워크",
    techName: "React",
    versionText: "18.3.1",
    vendorName: "Meta",
  },
  {
    techStackId: 2,
    serviceId: 2,
    techTypeName: "백엔드 프레임워크",
    techName: "Spring Boot",
    versionText: "3.3.7",
    vendorName: "VMware",
  },
  {
    techStackId: 3,
    serviceId: 1,
    techTypeName: "데이터베이스",
    techName: "MySQL",
    versionText: "8.x",
    vendorName: "Oracle",
  },
  {
    techStackId: 4,
    serviceId: 1,
    techTypeName: "런타임",
    techName: "Java",
    versionText: "17",
    vendorName: "Eclipse Adoptium",
  },
];

export const serviceOwners: ServiceOwnerRecord[] = [
  {
    serviceOwnerId: 1,
    serviceId: 2,
    ownerTypeCode: "USER",
    ownerName: "채널서비스그룹",
    responsibilityCode: "MAIN",
  },
  {
    serviceOwnerId: 2,
    serviceId: 1,
    ownerTypeCode: "GROUP",
    ownerName: "방카서비스운영그룹",
    responsibilityCode: "MAIN",
  },
];

export const incidents: IncidentRecord[] = [
  {
    incidentId: 1,
    incidentTypeCode: "SERVICE",
    serviceId: 1,
    incidentStatusCode: "OPEN",
    severityCode: "MAJOR",
    title: "테스트서비스 REST API 응답 지연",
    description: "서비스 관계 그래프 기준으로 111 서비스가 1차 영향 대상으로 계산되었습니다.",
    startedAt: "2026-05-17 10:30",
    manualRegisteredYn: "Y",
    registeredBy: "8913812",
  },
];

export const incidentImpacts: IncidentImpactRecord[] = [
  {
    impactId: 1,
    incidentId: 1,
    impactedServiceId: 2,
    impactLevel: 1,
    impactPathText: "111 -> 테스트서비스",
    directYn: "Y",
  },
  {
    impactId: 2,
    incidentId: 1,
    impactedServiceId: 1,
    impactLevel: 1,
    impactPathText: "테스트서비스 -> 테스트서비스",
    directYn: "Y",
  },
];

export function getServerById(serverId: number) {
  return servers.find((server) => server.serverId === serverId);
}

export function getServiceById(serviceId: number) {
  return services.find((service) => service.serviceId === serviceId);
}

export function getServiceCountByServerId(serverId: number) {
  return services.filter((service) => service.serverId === serverId).length;
}

export function getTechStacksByServiceId(serviceId: number) {
  return techStacks.filter((techStack) => techStack.serviceId === serviceId);
}

export function getOwnersByServiceId(serviceId: number) {
  return serviceOwners.filter((owner) => owner.serviceId === serviceId);
}
