import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Link2,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type RelationTypeCode,
  type ServerRecord,
  type ServiceRecord,
  type ServiceRelationRecord,
  type ServiceStatusCode,
  type ServiceTypeCode,
} from "../mockData";
import {
  ActionPanel,
  Badge,
  Info,
  Input,
  Modal,
  Select,
  Summary,
  toOptions,
} from "../components/PortalUi";

const categoryLevel1 = [
  "기간계/업무계",
  "채널계",
  "공동 플랫폼",
  "데이터 분석계",
  "대외 채널",
];
const categoryLevel2: Record<string, string[]> = {
  "기간계/업무계": ["방카", "계약", "고객"],
  "채널계": ["대고객 채널", "모바일", "콜센터"],
  "공동 플랫폼": ["SSO", "공통 API", "알림"],
  "데이터 분석계": ["리포팅", "DW", "AI 분석"],
  "대외 채널": ["제휴", "공공", "외부 연계"],
};
const categoryLevel3 = ["홈페이지", "대출", "인증", "정산", "조회"];
const groupOptions = [
  "방카서비스운영그룹",
  "공통지원그룹",
  "채널서비스그룹",
  "경영지원그룹",
];
const techOptions = [
  "Java 17",
  "Spring Boot 3.3",
  "React 18",
  "MySQL 8.x",
  "Redis",
  "Kafka",
];

export function ServicePortal() {
  const {
    servers,
    services,
    relations,
    owners,
    techStacks,
    healthChecks,
    addService,
    deleteService,
    addOwnerGroup,
    addTechStack,
    runHealthCheck,
    addRelation,
    removeRelation,
  } = usePortalData();
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.serviceId ?? 0
  );
  const [query, setQuery] = useState("");
  const [serverFilter, setServerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [message, setMessage] = useState("");

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return services.filter((service) => {
      const server = servers.find((item) => item.serverId === service.serverId);
      const matchesQuery =
        !normalized ||
        [
          service.serviceName,
          service.serviceCode,
          service.endpointUrl,
          service.categoryPath.join(" "),
          server?.serverName ?? "",
          server?.hostName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesServer =
        serverFilter === "ALL" || service.serverId === Number(serverFilter);
      const matchesStatus =
        statusFilter === "ALL" || service.statusCode === statusFilter;
      const matchesType =
        typeFilter === "ALL" || service.serviceTypeCode === typeFilter;
      return matchesQuery && matchesServer && matchesStatus && matchesType;
    });
  }, [query, serverFilter, servers, services, statusFilter, typeFilter]);

  const selectedService =
    services.find((service) => service.serviceId === selectedServiceId) ??
    filteredServices[0] ??
    services[0];
  const selectedServer = selectedService
    ? servers.find((server) => server.serverId === selectedService.serverId)
    : undefined;
  const outgoingRelations = selectedService
    ? relations.filter(
        (relation) => relation.sourceServiceId === selectedService.serviceId
      )
    : [];
  const incomingRelations = selectedService
    ? relations.filter(
        (relation) => relation.targetServiceId === selectedService.serviceId
      )
    : [];

  const handleDeleteService = (service: ServiceRecord) => {
    deleteService(service.serviceId);
    const nextService = services.find(
      (item) => item.serviceId !== service.serviceId
    );
    setSelectedServiceId(nextService?.serviceId ?? 0);
    setMessage("서비스가 삭제되었습니다.");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">서비스 관리</h3>
            <p className="mt-1 text-sm text-gray-500">
              서비스 목록, 담당 그룹, 기술 스택, 일점검, 서비스 간 종속 관계를 한
              화면에서 관리합니다.
            </p>
          </div>
          <button
            onClick={() => setShowServiceForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f60] px-4 py-2 text-white transition-colors hover:bg-[#e65c00]"
          >
            <Plus size={18} />
            서비스 등록
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Summary label="전체 서비스" value={services.length} />
        <Summary label="검색 결과" value={filteredServices.length} />
        <Summary
          label="등록 관계"
          value={outgoingRelations.length + incomingRelations.length}
        />
        <Summary label="헬스체크" value={healthChecks.length} />
      </section>

      <Modal
        open={showServiceForm}
        title="서비스 신규 등록"
        onClose={() => setShowServiceForm(false)}
        maxWidth="max-w-5xl"
      >
        <ServiceForm
          servers={servers}
          onCancel={() => setShowServiceForm(false)}
          onSubmit={(input) => {
            const service = addService(input);
            setSelectedServiceId(service.serviceId);
            setShowServiceForm(false);
            setMessage("서비스가 등록되었습니다.");
          }}
        />
      </Modal>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 lg:grid-cols-[minmax(260px,1fr)_180px_160px_160px]">
            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="서비스명, 코드, 분류, 서버로 검색"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#f60]"
              />
            </label>
            <select
              value={serverFilter}
              onChange={(event) => setServerFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              <option value="ALL">전체 서버</option>
              {servers.map((server) => (
                <option key={server.serverId} value={server.serverId}>
                  {server.serverName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              <option value="ALL">전체 상태</option>
              {Object.entries(codeLabels.serviceStatus).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            >
              <option value="ALL">전체 유형</option>
              {Object.entries(codeLabels.serviceType).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[700px] overflow-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    서비스
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    분류
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    서버
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    유형
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    상태
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    관계
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((service) => {
                  const active =
                    selectedService?.serviceId === service.serviceId;
                  const server = servers.find(
                    (item) => item.serverId === service.serverId
                  );
                  const relationCount = relations.filter(
                    (relation) =>
                      relation.sourceServiceId === service.serviceId ||
                      relation.targetServiceId === service.serviceId
                  ).length;

                  return (
                    <tr
                      key={service.serviceId}
                      onClick={() => setSelectedServiceId(service.serviceId)}
                      className={`cursor-pointer transition-colors ${
                        active ? "bg-orange-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {service.serviceName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {service.serviceCode}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {service.categoryPath.join(" / ")}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {server?.serverName ?? "미지정"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {codeLabels.serviceType[service.serviceTypeCode]}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {codeLabels.serviceStatus[service.statusCode]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">
                        {relationCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                조건에 맞는 서비스가 없습니다.
              </div>
            )}
          </div>
        </div>

        {selectedService && (
          <ServiceDetail
            key={selectedService.serviceId}
            service={selectedService}
            server={selectedServer}
            services={services}
            relations={relations}
            outgoingRelations={outgoingRelations}
            incomingRelations={incomingRelations}
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
            onAddRelation={(input) => {
              const result = addRelation(input);
              setMessage(result.message);
              return result.ok;
            }}
            onRemoveRelation={(relationId) => {
              removeRelation(relationId);
              setMessage("종속 관계가 삭제되었습니다.");
            }}
            onDelete={() => handleDeleteService(selectedService)}
          />
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

function ServiceForm({
  servers,
  onSubmit,
  onCancel,
}: {
  servers: ServerRecord[];
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
  const [serverId, setServerId] = useState(servers[0]?.serverId ?? 0);
  const [level1, setLevel1] = useState(categoryLevel1[0]);
  const [level2, setLevel2] = useState(categoryLevel2[categoryLevel1[0]][0]);
  const [level3, setLevel3] = useState(categoryLevel3[0]);
  const [level4, setLevel4] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceTypeCode, setServiceTypeCode] =
    useState<ServiceTypeCode>("WEB");
  const [statusCode, setStatusCode] = useState<ServiceStatusCode>("NORMAL");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [deployPath, setDeployPath] = useState("");
  const [portInfo, setPortInfo] = useState("");
  const [instanceCount, setInstanceCount] = useState(1);
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Select
          label="배포 서버 *"
          value={String(serverId)}
          onChange={(value) => setServerId(Number(value))}
          options={servers.reduce<Record<string, string>>((acc, server) => {
            acc[String(server.serverId)] = `${server.serverName} (${server.hostName})`;
            return acc;
          }, {})}
        />
        <Select
          label="1단계 분류"
          value={level1}
          onChange={(value) => {
            setLevel1(value);
            setLevel2(categoryLevel2[value][0]);
          }}
          options={toOptions(categoryLevel1)}
        />
        <Select
          label="2단계 분류"
          value={level2}
          onChange={setLevel2}
          options={toOptions(categoryLevel2[level1])}
        />
        <Select
          label="3단계 분류"
          value={level3}
          onChange={setLevel3}
          options={toOptions(categoryLevel3)}
        />
        <Input
          label="4단계 서비스명"
          value={level4}
          onChange={setLevel4}
          placeholder="예: SSO"
        />
        <Input
          label="서비스 코드 *"
          value={serviceCode}
          onChange={setServiceCode}
          placeholder="SVC-SSO-001"
        />
        <Input
          label="서비스명 *"
          value={serviceName}
          onChange={setServiceName}
          placeholder="SSO 서비스"
        />
        <Select
          label="서비스 유형"
          value={serviceTypeCode}
          onChange={(value) => setServiceTypeCode(value as ServiceTypeCode)}
          options={codeLabels.serviceType}
        />
        <Select
          label="상태"
          value={statusCode}
          onChange={(value) => setStatusCode(value as ServiceStatusCode)}
          options={codeLabels.serviceStatus}
        />
        <Input
          label="엔드포인트 URL"
          value={endpointUrl}
          onChange={setEndpointUrl}
          placeholder="https://..."
        />
        <Input
          label="배포 경로"
          value={deployPath}
          onChange={setDeployPath}
          placeholder="/opt/apps/sso"
        />
        <Input
          label="포트"
          value={portInfo}
          onChange={setPortInfo}
          placeholder="8080, 8443"
        />
        <Input
          label="인스턴스 수"
          value={String(instanceCount)}
          onChange={(value) => setInstanceCount(Number(value) || 1)}
          placeholder="1"
          type="number"
        />
        <div className="md:col-span-3">
          <Input
            label="설명"
            value={description}
            onChange={setDescription}
            placeholder="서비스 설명"
          />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
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
          disabled={!serverId || !serviceCode || !serviceName}
          className="rounded-lg bg-[#f60] px-5 py-2 text-white hover:bg-[#e65c00] disabled:opacity-40"
        >
          등록
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ServiceDetail({
  service,
  server,
  services,
  relations,
  outgoingRelations,
  incomingRelations,
  owners,
  techStacks,
  healthCheck,
  onAddGroup,
  onAddTech,
  onHealthCheck,
  onAddRelation,
  onRemoveRelation,
  onDelete,
}: {
  service: ServiceRecord;
  server?: ServerRecord;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  outgoingRelations: ServiceRelationRecord[];
  incomingRelations: ServiceRelationRecord[];
  owners: ReturnType<typeof usePortalData>["owners"];
  techStacks: ReturnType<typeof usePortalData>["techStacks"];
  healthCheck?: ReturnType<typeof usePortalData>["healthChecks"][number];
  onAddGroup: (groupName: string) => void;
  onAddTech: (techName: string) => void;
  onHealthCheck: (
    url: string
  ) => ReturnType<typeof usePortalData>["healthChecks"][number];
  onAddRelation: (input: {
    sourceServiceId: number;
    targetServiceId: number;
    relationTypeCode: RelationTypeCode;
    mandatoryYn: "Y" | "N";
    relationStatusCode: "ACTIVE";
    description: string;
  }) => boolean;
  onRemoveRelation: (relationId: number) => void;
  onDelete: () => void;
}) {
  const [groupName, setGroupName] = useState(groupOptions[0]);
  const [techName, setTechName] = useState(techOptions[0]);
  const [healthUrl, setHealthUrl] = useState(service.endpointUrl);
  const [healthMessage, setHealthMessage] = useState("");

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              {service.serviceName}
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              {service.serviceCode} · {service.categoryPath.join(" / ")}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info
            label="유형"
            value={codeLabels.serviceType[service.serviceTypeCode]}
          />
          <Info
            label="상태"
            value={codeLabels.serviceStatus[service.statusCode]}
          />
          <Info label="배포 서버" value={server?.serverName ?? "미지정"} />
          <Info label="엔드포인트" value={service.endpointUrl || "미입력"} />
          <Info label="배포 경로" value={service.deployPath || "미입력"} />
          <Info
            label="포트/인스턴스"
            value={`${service.portInfo || "-"} / ${service.instanceCount}`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="mb-4 font-semibold text-gray-900">운영 정보</h4>
        <div className="grid grid-cols-1 gap-4">
          <ActionPanel icon={Users} title="담당 그룹">
            <div className="mb-3 flex flex-wrap gap-2">
              {owners.map((owner) => (
                <Badge key={owner.serviceOwnerId}>
                  {owner.ownerName} ·{" "}
                  {codeLabels.responsibilityType[owner.responsibilityCode]}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
              >
                {groupOptions.map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
              <button
                onClick={() => onAddGroup(groupName)}
                className="rounded-lg bg-[#f60] px-3 py-2 text-white hover:bg-[#e65c00]"
              >
                추가
              </button>
            </div>
          </ActionPanel>

          <ActionPanel icon={Wrench} title="기술 스택">
            <div className="mb-3 flex flex-wrap gap-2">
              {techStacks.map((tech) => (
                <Badge key={tech.techStackId}>
                  {tech.techName} {tech.versionText}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={techName}
                onChange={(event) => setTechName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
              >
                {techOptions.map((tech) => (
                  <option key={tech}>{tech}</option>
                ))}
              </select>
              <button
                onClick={() => onAddTech(techName)}
                className="rounded-lg bg-[#f60] px-3 py-2 text-white hover:bg-[#e65c00]"
              >
                추가
              </button>
            </div>
          </ActionPanel>

          <ActionPanel icon={Activity} title="일점검">
            <input
              value={healthUrl}
              onChange={(event) => setHealthUrl(event.target.value)}
              placeholder="https://..."
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
            />
            <button
              onClick={() => {
                const result = onHealthCheck(healthUrl);
                setHealthMessage(`${result.statusCode} · ${result.statusText}`);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f60] px-3 py-2 text-white hover:bg-[#e65c00]"
            >
              <CheckCircle2 size={16} />
              헬스체크
            </button>
            <p className="mt-3 text-xs text-gray-500">
              {healthMessage ||
                (healthCheck
                  ? `${healthCheck.statusCode} · ${healthCheck.statusText}`
                  : "아직 점검 이력이 없습니다.")}
            </p>
          </ActionPanel>
        </div>
      </section>

      <RelationManager
        service={service}
        services={services}
        relations={relations}
        outgoingRelations={outgoingRelations}
        incomingRelations={incomingRelations}
        onAddRelation={onAddRelation}
        onRemoveRelation={onRemoveRelation}
      />
    </aside>
  );
}

function RelationManager({
  service,
  services,
  relations,
  outgoingRelations,
  incomingRelations,
  onAddRelation,
  onRemoveRelation,
}: {
  service: ServiceRecord;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  outgoingRelations: ServiceRelationRecord[];
  incomingRelations: ServiceRelationRecord[];
  onAddRelation: (input: {
    sourceServiceId: number;
    targetServiceId: number;
    relationTypeCode: RelationTypeCode;
    mandatoryYn: "Y" | "N";
    relationStatusCode: "ACTIVE";
    description: string;
  }) => boolean;
  onRemoveRelation: (relationId: number) => void;
}) {
  const targetOptions = services.filter(
    (item) => item.serviceId !== service.serviceId
  );
  const [targetServiceId, setTargetServiceId] = useState(
    targetOptions[0]?.serviceId ?? 0
  );
  const [relationTypeCode, setRelationTypeCode] =
    useState<RelationTypeCode>("REST");
  const [mandatoryYn, setMandatoryYn] = useState<"Y" | "N">("Y");
  const [description, setDescription] = useState("");

  const normalizedTarget =
    targetOptions.some((item) => item.serviceId === targetServiceId) ||
    targetServiceId === 0
      ? targetServiceId
      : targetOptions[0]?.serviceId ?? 0;

  const handleAdd = () => {
    if (!normalizedTarget) {
      return;
    }

    const ok = onAddRelation({
      sourceServiceId: service.serviceId,
      targetServiceId: normalizedTarget,
      relationTypeCode,
      mandatoryYn,
      relationStatusCode: "ACTIVE",
      description: description.trim() || "-",
    });

    if (ok) {
      setDescription("");
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-[#f60]" />
          <h4 className="font-semibold text-gray-900">서비스 간 종속 관계</h4>
        </div>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          {outgoingRelations.length + incomingRelations.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Select
          label="대상 서비스"
          value={String(normalizedTarget)}
          onChange={(value) => setTargetServiceId(Number(value))}
          options={targetOptions.reduce<Record<string, string>>((acc, item) => {
            acc[String(item.serviceId)] = `${item.serviceName} (${item.serviceCode})`;
            return acc;
          }, {})}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="관계 유형"
            value={relationTypeCode}
            onChange={(value) => setRelationTypeCode(value as RelationTypeCode)}
            options={codeLabels.relationType}
          />
          <Select
            label="필수 여부"
            value={mandatoryYn}
            onChange={(value) => setMandatoryYn(value as "Y" | "N")}
            options={{ Y: "필수", N: "선택" }}
          />
        </div>
        <Input
          label="설명"
          value={description}
          onChange={setDescription}
          placeholder="예: 현재 서비스가 대상 서비스의 REST API 호출"
        />
        <button
          onClick={handleAdd}
          disabled={!normalizedTarget}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f60] px-4 py-2 text-white hover:bg-[#e65c00] disabled:opacity-40"
        >
          <Plus size={18} />
          종속 관계 추가
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <RelationList
          title="이 서비스가 의존하는 대상"
          emptyText="아직 현재 서비스 기준으로 추가된 대상 서비스가 없습니다."
          services={services}
          relations={outgoingRelations}
          allRelations={relations}
          onRemove={onRemoveRelation}
        />
        <RelationList
          title="이 서비스를 의존하는 출발 서비스"
          emptyText="현재 서비스를 대상으로 호출하는 서비스가 없습니다."
          services={services}
          relations={incomingRelations}
          allRelations={relations}
          onRemove={onRemoveRelation}
        />
      </div>
    </section>
  );
}

function RelationList({
  title,
  emptyText,
  services,
  relations,
  allRelations,
  onRemove,
}: {
  title: string;
  emptyText: string;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  allRelations: ServiceRelationRecord[];
  onRemove: (relationId: number) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <h5 className="font-semibold text-gray-900">{title}</h5>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {relations.length}
        </span>
      </div>
      {relations.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="max-h-[260px] divide-y divide-gray-200 overflow-auto">
          {relations.map((relation) => {
            const source = services.find(
              (item) => item.serviceId === relation.sourceServiceId
            );
            const target = services.find(
              (item) => item.serviceId === relation.targetServiceId
            );
            const duplicateCount = allRelations.filter(
              (item) =>
                item.sourceServiceId === relation.sourceServiceId &&
                item.targetServiceId === relation.targetServiceId
            ).length;

            return (
              <div key={relation.relationId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900">
                      <span className="font-semibold">
                        {source?.serviceName ?? "알 수 없음"}
                      </span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-semibold">
                        {target?.serviceName ?? "알 수 없음"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>
                        {codeLabels.relationType[relation.relationTypeCode]}
                      </Badge>
                      <Badge>{relation.mandatoryYn === "Y" ? "필수" : "선택"}</Badge>
                      {duplicateCount > 1 && <Badge>중복 후보 {duplicateCount}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {relation.description}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(relation.relationId)}
                    className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
