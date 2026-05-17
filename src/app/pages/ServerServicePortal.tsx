import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  Edit2,
  Plus,
  Server,
  Trash2,
  X,
  Users,
  Wrench,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type EnvCode,
  type OsTypeCode,
  type ServerStatusCode,
  type ServiceStatusCode,
  type ServiceTypeCode,
} from "../mockData";

const categoryLevel1 = ["기간계/업무계", "채널계", "공동 플랫폼", "데이터 분석계", "대외 채널"];
const categoryLevel2: Record<string, string[]> = {
  "기간계/업무계": ["방카", "계약", "고객"],
  "채널계": ["대고객 채널", "모바일", "콜센터"],
  "공동 플랫폼": ["SSO", "공통 API", "알림"],
  "데이터 분석계": ["리포팅", "DW", "AI 분석"],
  "대외 채널": ["제휴", "공공", "외부 연계"],
};
const categoryLevel3 = ["홈페이지", "대출", "인증", "정산", "조회"];
const groupOptions = ["방카서비스운영그룹", "공통지원그룹", "채널서비스그룹", "경영지원그룹"];
const techOptions = ["Java 17", "Spring Boot 3.3", "React 18", "MySQL 8.x", "Redis", "Kafka"];

export function ServerServicePortal() {
  const {
    servers,
    services,
    owners,
    techStacks,
    healthChecks,
    addServer,
    updateServer,
    deleteServer,
    addService,
    deleteService,
    addOwnerGroup,
    addTechStack,
    runHealthCheck,
  } = usePortalData();
  const [selectedServerId, setSelectedServerId] = useState(
    servers[0]?.serverId ?? 0
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.serviceId ?? 0
  );
  const [showServerForm, setShowServerForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [message, setMessage] = useState("");

  const selectedServer = servers.find(
    (server) => server.serverId === selectedServerId
  );
  const servicesOnServer = services.filter(
    (service) => service.serverId === selectedServerId
  );
  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    servicesOnServer[0];

  const serverStatusCounts = useMemo(
    () =>
      servers.reduce<Record<string, number>>((acc, server) => {
        const label = codeLabels.serverStatus[server.statusCode];
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {}),
    [servers]
  );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              서버·서비스 등록 시나리오
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              사용자가 서버를 등록하고, 해당 서버 상세에서 서비스·담당 그룹·기술
              스택·헬스체크를 이어서 관리합니다.
            </p>
          </div>
          <button
            onClick={() => setShowServerForm(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#f60] text-white rounded-lg hover:bg-[#e65c00] transition-colors"
          >
            <Plus size={18} />
            서버 등록
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Summary label="전체 서버" value={servers.length} />
        <Summary label="전체 서비스" value={services.length} />
        <Summary label="정상 서버" value={serverStatusCounts["정상"] ?? 0} />
        <Summary label="헬스체크" value={healthChecks.length} />
      </section>

      <Modal
        open={showServerForm}
        title="신규 서버 등록"
        onClose={() => setShowServerForm(false)}
        maxWidth="max-w-4xl"
      >
        <ServerForm
          onCancel={() => setShowServerForm(false)}
          onSubmit={(input) => {
            const server = addServer(input);
            setSelectedServerId(server.serverId);
            setShowServerForm(false);
            setMessage("서버가 등록되었습니다.");
          }}
        />
      </Modal>

      <section className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-4">
          {servers.map((server) => {
            const active = server.serverId === selectedServerId;
            const count = services.filter(
              (service) => service.serverId === server.serverId
            ).length;
            return (
              <button
                key={server.serverId}
                onClick={() => {
                  setSelectedServerId(server.serverId);
                  setShowServiceForm(false);
                }}
                className={`w-full text-left rounded-lg border p-5 transition-colors ${
                  active
                    ? "border-[#f60] bg-orange-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Server size={18} className="text-[#f60]" />
                      <h4 className="font-semibold text-gray-900">
                        {server.serverName}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {server.hostName} · {server.ipAddress}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700">
                    서비스 {count}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <Badge>{codeLabels.envType[server.envCode]}</Badge>
                  <Badge>{codeLabels.osType[server.osTypeCode]}</Badge>
                  <Badge>{codeLabels.serverStatus[server.statusCode]}</Badge>
                </div>
              </button>
            );
          })}
        </div>

        {selectedServer && (
          <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedServer.serverName}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedServer.description || "서버 설명 없음"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      updateServer(selectedServer.serverId, {
                        statusCode:
                          selectedServer.statusCode === "NORMAL"
                            ? "MAINTENANCE"
                            : "NORMAL",
                      });
                      setMessage("서버 상태가 변경되었습니다.");
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Edit2 size={16} />
                    상태 변경
                  </button>
                  <button
                    onClick={() => {
                      const result = deleteServer(selectedServer.serverId);
                      setMessage(result.message);
                      if (result.ok) {
                        setSelectedServerId(servers[0]?.serverId ?? 0);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5 text-sm">
                <Info label="호스트명" value={selectedServer.hostName} />
                <Info label="IP" value={selectedServer.ipAddress} />
                <Info label="환경" value={codeLabels.envType[selectedServer.envCode]} />
                <Info label="OS" value={`${codeLabels.osType[selectedServer.osTypeCode]} ${selectedServer.osVersion}`} />
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">연결 서비스</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    하나의 서버에는 여러 서비스가 연결될 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={() => setShowServiceForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#f60] text-white rounded-lg hover:bg-[#e65c00]"
                >
                  <Plus size={18} />
                  서비스 등록
                </button>
              </div>

              <Modal
                open={showServiceForm}
                title="서비스 신규 등록"
                onClose={() => setShowServiceForm(false)}
                maxWidth="max-w-5xl"
              >
                <ServiceForm
                  serverId={selectedServer.serverId}
                  onCancel={() => setShowServiceForm(false)}
                  onSubmit={(input) => {
                    const service = addService(input);
                    setSelectedServiceId(service.serviceId);
                    setShowServiceForm(false);
                    setMessage("서비스가 등록되었습니다.");
                  }}
                />
              </Modal>

              <div className="space-y-3 mt-4">
                {servicesOnServer.map((service, index) => (
                  <button
                    key={service.serviceId}
                    onClick={() => setSelectedServiceId(service.serviceId)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selectedService?.serviceId === service.serviceId
                        ? "border-[#f60] bg-orange-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {service.serviceName}
                          </span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                              대표
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {service.serviceCode} · {service.categoryPath.join(" / ")}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600">
                        {codeLabels.serviceType[service.serviceTypeCode]} ·{" "}
                        {codeLabels.serviceStatus[service.statusCode]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selectedService && (
              <ServiceDetail
                service={selectedService}
                owners={owners.filter(
                  (owner) => owner.serviceId === selectedService.serviceId
                )}
                techStacks={techStacks.filter(
                  (tech) => tech.serviceId === selectedService.serviceId
                )}
                healthCheck={healthChecks.find(
                  (check) => check.serviceId === selectedService.serviceId
                )}
                onAddGroup={(groupName) =>
                  addOwnerGroup(selectedService.serviceId, groupName)
                }
                onAddTech={(techName) =>
                  addTechStack(selectedService.serviceId, techName)
                }
                onHealthCheck={(url) =>
                  runHealthCheck(selectedService.serviceId, url)
                }
                onDelete={() => {
                  deleteService(selectedService.serviceId);
                  setSelectedServiceId(servicesOnServer[0]?.serviceId ?? 0);
                  setMessage("서비스가 삭제되었습니다.");
                }}
              />
            )}
          </div>
        )}
      </section>

      {message && (
        <div className="fixed bottom-5 right-5 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}

function ServerForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: {
    serverName: string;
    hostName: string;
    ipAddress: string;
    envCode: EnvCode;
    osTypeCode: OsTypeCode;
    osVersion: string;
    statusCode: ServerStatusCode;
    description: string;
  }) => void;
  onCancel: () => void;
}) {
  const [serverName, setServerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [envCode, setEnvCode] = useState<EnvCode>("PROD");
  const [osTypeCode, setOsTypeCode] = useState<OsTypeCode>("LINUX");
  const [osVersion, setOsVersion] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="서버명 *" value={serverName} onChange={setServerName} placeholder="prod-was-01" />
        <Input label="호스트명 *" value={hostName} onChange={setHostName} placeholder="prod-was-01.internal" />
        <Input label="IP 주소 *" value={ipAddress} onChange={setIpAddress} placeholder="10.0.1.10" />
        <Select label="환경" value={envCode} onChange={(value) => setEnvCode(value as EnvCode)} options={codeLabels.envType} />
        <Select label="OS 유형" value={osTypeCode} onChange={(value) => setOsTypeCode(value as OsTypeCode)} options={codeLabels.osType} />
        <Input label="OS 버전" value={osVersion} onChange={setOsVersion} placeholder="Ubuntu 22.04" />
        <div className="md:col-span-3">
          <Input label="설명" value={description} onChange={setDescription} placeholder="서버 설명" />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() =>
            onSubmit({
              serverName,
              hostName,
              ipAddress,
              envCode,
              osTypeCode,
              osVersion,
              statusCode: "NORMAL",
              description,
            })
          }
          disabled={!serverName || !hostName || !ipAddress}
          className="px-5 py-2 bg-[#f60] text-white rounded-lg hover:bg-[#e65c00] disabled:opacity-40"
        >
          등록
        </button>
        <button onClick={onCancel} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          취소
        </button>
      </div>
    </div>
  );
}

function ServiceForm({
  serverId,
  onSubmit,
  onCancel,
}: {
  serverId: number;
  onSubmit: (input: {
    serverId: number;
    categoryPath: string[];
    serviceCode: string;
    serviceName: string;
    serviceTypeCode: ServiceTypeCode;
    statusCode: ServiceStatusCode;
    endpointUrl: string;
    deployPath: string;
    portInfo: string;
    deploymentStatusCode: "RUNNING";
    instanceCount: number;
    description: string;
  }) => void;
  onCancel: () => void;
}) {
  const [level1, setLevel1] = useState(categoryLevel1[0]);
  const [level2, setLevel2] = useState(categoryLevel2[categoryLevel1[0]][0]);
  const [level3, setLevel3] = useState(categoryLevel3[0]);
  const [level4, setLevel4] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceTypeCode, setServiceTypeCode] = useState<ServiceTypeCode>("WEB");
  const [statusCode, setStatusCode] = useState<ServiceStatusCode>("NORMAL");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [deployPath, setDeployPath] = useState("");
  const [portInfo, setPortInfo] = useState("");
  const [instanceCount, setInstanceCount] = useState(1);
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select label="1단계 분류" value={level1} onChange={(value) => {
          setLevel1(value);
          setLevel2(categoryLevel2[value][0]);
        }} options={toOptions(categoryLevel1)} />
        <Select label="2단계 분류" value={level2} onChange={setLevel2} options={toOptions(categoryLevel2[level1])} />
        <Select label="3단계 분류" value={level3} onChange={setLevel3} options={toOptions(categoryLevel3)} />
        <Input label="4단계 서비스명" value={level4} onChange={setLevel4} placeholder="예: SSO" />
        <Input label="서비스 코드 *" value={serviceCode} onChange={setServiceCode} placeholder="SVC-SSO-001" />
        <Input label="서비스명 *" value={serviceName} onChange={setServiceName} placeholder="SSO 서비스" />
        <Select label="서비스 유형" value={serviceTypeCode} onChange={(value) => setServiceTypeCode(value as ServiceTypeCode)} options={codeLabels.serviceType} />
        <Select label="상태" value={statusCode} onChange={(value) => setStatusCode(value as ServiceStatusCode)} options={codeLabels.serviceStatus} />
        <Input label="엔드포인트 URL" value={endpointUrl} onChange={setEndpointUrl} placeholder="https://..." />
        <Input label="배포 경로" value={deployPath} onChange={setDeployPath} placeholder="/opt/apps/sso" />
        <Input label="포트" value={portInfo} onChange={setPortInfo} placeholder="8080, 8443" />
        <Input label="인스턴스 수" value={String(instanceCount)} onChange={(value) => setInstanceCount(Number(value) || 1)} placeholder="1" />
        <div className="md:col-span-4">
          <Input label="설명" value={description} onChange={setDescription} placeholder="서비스 설명" />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() =>
            onSubmit({
              serverId,
              categoryPath: [level1, level2, level3, level4 || serviceName],
              serviceCode,
              serviceName,
              serviceTypeCode,
              statusCode,
              endpointUrl,
              deployPath,
              portInfo,
              deploymentStatusCode: "RUNNING",
              instanceCount,
              description,
            })
          }
          disabled={!serviceCode || !serviceName}
          className="px-5 py-2 bg-[#f60] text-white rounded-lg hover:bg-[#e65c00] disabled:opacity-40"
        >
          등록
        </button>
        <button onClick={onCancel} className="px-5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
          취소
        </button>
      </div>
    </div>
  );
}

function ServiceDetail({
  service,
  owners,
  techStacks,
  healthCheck,
  onAddGroup,
  onAddTech,
  onHealthCheck,
  onDelete,
}: {
  service: ReturnType<typeof usePortalData>["services"][number];
  owners: ReturnType<typeof usePortalData>["owners"];
  techStacks: ReturnType<typeof usePortalData>["techStacks"];
  healthCheck?: ReturnType<typeof usePortalData>["healthChecks"][number];
  onAddGroup: (groupName: string) => void;
  onAddTech: (techName: string) => void;
  onHealthCheck: (url: string) => ReturnType<typeof usePortalData>["healthChecks"][number];
  onDelete: () => void;
}) {
  const [groupName, setGroupName] = useState(groupOptions[0]);
  const [techName, setTechName] = useState(techOptions[0]);
  const [healthUrl, setHealthUrl] = useState(service.endpointUrl);
  const [healthMessage, setHealthMessage] = useState("");

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h4 className="font-semibold text-gray-900">서비스 상세</h4>
          <p className="text-sm text-gray-500 mt-1">
            {service.serviceName} · {service.categoryPath.join(" / ")}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
        >
          <Trash2 size={16} />
          삭제
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Info label="서비스 코드" value={service.serviceCode} />
        <Info label="유형" value={codeLabels.serviceType[service.serviceTypeCode]} />
        <Info label="상태" value={codeLabels.serviceStatus[service.statusCode]} />
        <Info label="엔드포인트" value={service.endpointUrl || "미입력"} />
        <Info label="배포 경로" value={service.deployPath || "미입력"} />
        <Info label="포트/인스턴스" value={`${service.portInfo || "-"} / ${service.instanceCount}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <ActionPanel icon={Users} title="담당 그룹">
          <div className="space-y-2 mb-3">
            {owners.map((owner) => (
              <Badge key={owner.serviceOwnerId}>
                {owner.ownerName} · {codeLabels.responsibilityType[owner.responsibilityCode]}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={groupName} onChange={(event) => setGroupName(event.target.value)} className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg">
              {groupOptions.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
            <button onClick={() => onAddGroup(groupName)} className="px-3 py-2 bg-gray-900 text-white rounded-lg">
              추가
            </button>
          </div>
        </ActionPanel>

        <ActionPanel icon={Wrench} title="기술 스택">
          <div className="flex flex-wrap gap-2 mb-3">
            {techStacks.map((tech) => (
              <Badge key={tech.techStackId}>
                {tech.techName} {tech.versionText}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={techName} onChange={(event) => setTechName(event.target.value)} className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg">
              {techOptions.map((tech) => (
                <option key={tech}>{tech}</option>
              ))}
            </select>
            <button onClick={() => onAddTech(techName)} className="px-3 py-2 bg-gray-900 text-white rounded-lg">
              추가
            </button>
          </div>
        </ActionPanel>

        <ActionPanel icon={Activity} title="일점검">
          <input
            value={healthUrl}
            onChange={(event) => setHealthUrl(event.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
          />
          <button
            onClick={() => {
              const result = onHealthCheck(healthUrl);
              setHealthMessage(`${result.statusCode} · ${result.statusText}`);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#f60] text-white rounded-lg hover:bg-[#e65c00]"
          >
            <CheckCircle2 size={16} />
            헬스체크
          </button>
          <p className="text-xs text-gray-500 mt-3">
            {healthMessage || (healthCheck ? `${healthCheck.statusCode} · ${healthCheck.statusText}` : "아직 점검 이력이 없습니다.")}
          </p>
        </ActionPanel>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-1 break-words">
        {value}
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full border bg-gray-100 text-gray-700 border-gray-200">
      {children}
    </span>
  );
}

function ActionPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={17} className="text-[#f60]" />
        <h5 className="font-semibold text-gray-900">{title}</h5>
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f60]"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f60]"
      >
        {Object.entries(options).map(([code, labelText]) => (
          <option key={code} value={code}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function toOptions(values: string[]) {
  return values.reduce<Record<string, string>>((acc, value) => {
    acc[value] = value;
    return acc;
  }, {});
}

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
