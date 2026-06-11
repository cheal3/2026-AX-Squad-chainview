import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  Box,
  CheckCircle2,
  Eye,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type ImportanceCode,
  type RelationStatusCode,
  type RelationTypeCode,
  type ServerRecord,
  type ServiceRecord,
  type ServiceRelationRecord,
  type ServiceStatusCode,
  type ServiceTypeCode,
} from "../mockData";
import { PageHeader } from "../components/PageHeader";
import { TableActionButton } from "../components/TableActionButton";
import {
  ActionPanel,
  Badge,
  Info,
  Input,
  Modal,
  Select,
  SelectBox,
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

type RelationDraft = {
  targetServiceId: number;
  direction: "OUT" | "IN";
  relationTypeCode: RelationTypeCode;
  mandatoryYn: "Y" | "N";
  description: string;
};

type ServiceFormInput = {
  serverId: number;
  categoryPath: string[];
  serviceCode: string;
  serviceName: string;
  serviceTypeCode: ServiceTypeCode;
  importanceCode: ImportanceCode;
  statusCode: ServiceStatusCode;
  endpointUrl: string;
  deployPath: string;
  portInfo: string;
  deploymentStatusCode: "RUNNING";
  instanceCount: number;
  description: string;
  relationDraft?: RelationDraft;
};

function toRelationInput(currentServiceId: number, draft: RelationDraft) {
  return {
    sourceServiceId:
      draft.direction === "OUT" ? currentServiceId : draft.targetServiceId,
    targetServiceId:
      draft.direction === "OUT" ? draft.targetServiceId : currentServiceId,
    relationTypeCode: draft.relationTypeCode,
    mandatoryYn: draft.mandatoryYn,
    relationStatusCode: "ACTIVE" as const,
    description: draft.description,
  };
}

export function ServicePortal() {
  const {
    servers,
    services,
    relations,
    owners,
    techStacks,
    healthChecks,
    addService,
    updateService,
    deleteService,
    addOwnerGroup,
    addTechStack,
    runHealthCheck,
    addRelation,
    removeRelation,
  } = usePortalData();
  const [query, setQuery] = useState("");
  const [serverFilter, setServerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [importanceFilter, setImportanceFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [detailServiceId, setDetailServiceId] = useState<number | null>(null);
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
      const matchesImportance =
        importanceFilter === "ALL" ||
        (service.importanceCode ?? "NORMAL") === importanceFilter;
      const ownerNames = owners
        .filter((owner) => owner.serviceId === service.serviceId)
        .map((owner) => owner.ownerName);
      const matchesOwner =
        ownerFilter === "ALL" || ownerNames.includes(ownerFilter);
      const matchesCategory =
        categoryFilter === "ALL" || service.categoryPath[0] === categoryFilter;
      return (
        matchesQuery &&
        matchesServer &&
        matchesStatus &&
        matchesType &&
        matchesImportance &&
        matchesOwner &&
        matchesCategory
      );
    });
  }, [
    categoryFilter,
    importanceFilter,
    owners,
    ownerFilter,
    query,
    serverFilter,
    servers,
    services,
    statusFilter,
    typeFilter,
  ]);

  const detailService =
    services.find((service) => service.serviceId === detailServiceId) ?? null;
  const editService =
    services.find((service) => service.serviceId === editServiceId) ?? null;

  const getServer = (service: ServiceRecord) =>
    servers.find((server) => server.serverId === service.serverId);

  const handleDelete = (service: ServiceRecord) => {
    deleteService(service.serviceId);
    setDetailServiceId(null);
    setEditServiceId(null);
    setMessage("서비스가 삭제되었습니다.");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="목록에서 서비스를 찾고 상세보기, 수정, 삭제를 바로 실행합니다."
        icon={<Box size={22} />}
        title="서비스 관리"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            서비스 등록
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(260px,1fr)_170px_170px_150px_150px_180px_170px]">
          <label className="relative block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="서비스명, 코드, 분류, 서버 검색"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <SelectBox
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={{
              ALL: "전체 분류",
              ...categoryLevel1.reduce<Record<string, string>>((acc, item) => {
                acc[item] = item;
                return acc;
              }, {}),
            }}
          />
          <SelectBox
            value={serverFilter}
            onChange={setServerFilter}
            options={{
              ALL: "전체 서버",
              ...servers.reduce<Record<string, string>>((acc, server) => {
                acc[String(server.serverId)] = server.serverName;
                return acc;
              }, {}),
            }}
          />
          <SelectBox
            value={statusFilter}
            onChange={setStatusFilter}
            options={{ ALL: "전체 상태", ...codeLabels.serviceStatus }}
          />
          <SelectBox
            value={typeFilter}
            onChange={setTypeFilter}
            options={{ ALL: "전체 유형", ...codeLabels.serviceType }}
          />
          <SelectBox
            value={importanceFilter}
            onChange={setImportanceFilter}
            options={{ ALL: "전체 중요도", ...codeLabels.importance }}
          />
          <SelectBox
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={{
              ALL: "전체 담당",
              ...Array.from(new Set(owners.map((owner) => owner.ownerName))).reduce<
                Record<string, string>
              >((acc, ownerName) => {
                acc[ownerName] = ownerName;
                return acc;
              }, {}),
            }}
          />
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-400">
              <tr>
                <Th className="w-[25%]">서비스명</Th>
                <Th className="w-[39%]">분류</Th>
                <Th className="w-[12%]">상태</Th>
                <Th className="w-[12%]">중요도</Th>
                <Th align="right" className="w-[210px] bg-slate-50 px-3">작업</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => {
                return (
                  <tr key={service.serviceId} className="group hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="truncate font-semibold text-slate-900">
                        {service.serviceName}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        {service.serviceCode}
                      </div>
                    </td>
                    <td className="truncate whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      {service.categoryPath.join(" / ")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <BadgeText>
                        {codeLabels.serviceStatus[service.statusCode]}
                      </BadgeText>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <BadgeText>
                        {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
                      </BadgeText>
                    </td>
                    <td className="w-[210px] whitespace-nowrap bg-white px-3 py-4 group-hover:bg-slate-50/70">
                      <div className="flex flex-nowrap justify-end gap-1.5">
                        <ActionButton
                          onClick={() => setDetailServiceId(service.serviceId)}
                        >
                          <Eye size={14} />
                          상세
                        </ActionButton>
                        <ActionButton
                          onClick={() => setEditServiceId(service.serviceId)}
                        >
                          <Pencil size={14} />
                          수정
                        </ActionButton>
                        <TableActionButton
                          onClick={() => handleDelete(service)}
                          tone="danger"
                        >
                          <Trash2 size={14} />
                          삭제
                        </TableActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredServices.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">
              조건에 맞는 서비스가 없습니다.
            </div>
          )}
        </div>
      </section>

      <Modal
        open={showCreate}
        title="서비스 등록"
        onClose={() => setShowCreate(false)}
        maxWidth="max-w-3xl"
      >
        <ServiceForm
          servers={servers}
          services={services}
          submitLabel="등록"
          onCancel={() => setShowCreate(false)}
          onSubmit={(input) => {
            const { relationDraft, ...serviceInput } = input;
            const service = addService(serviceInput);
            if (relationDraft) {
              addRelation(toRelationInput(service.serviceId, relationDraft));
            }
            setShowCreate(false);
            setMessage("서비스가 등록되었습니다.");
          }}
        />
      </Modal>

      <Modal
        open={!!editService}
        title="서비스 수정"
        onClose={() => setEditServiceId(null)}
        maxWidth="max-w-3xl"
      >
        {editService && (
          <ServiceForm
            servers={servers}
            services={services}
            initialValue={editService}
            submitLabel="저장"
            onCancel={() => setEditServiceId(null)}
            onSubmit={(input) => {
              const { relationDraft, ...serviceInput } = input;
              updateService(editService.serviceId, serviceInput);
              if (relationDraft) {
                addRelation(toRelationInput(editService.serviceId, relationDraft));
              }
              setEditServiceId(null);
              setMessage("서비스 정보가 수정되었습니다.");
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!detailService}
        title="서비스 상세"
        onClose={() => setDetailServiceId(null)}
        maxWidth="max-w-4xl"
      >
        {detailService && (
          <ServiceDetail
            key={detailService.serviceId}
            service={detailService}
            server={getServer(detailService)}
            services={services}
            relations={relations}
            owners={owners.filter(
              (owner) => owner.serviceId === detailService.serviceId
            )}
            techStacks={techStacks.filter(
              (tech) => tech.serviceId === detailService.serviceId
            )}
            healthCheck={healthChecks.find(
              (check) => check.serviceId === detailService.serviceId
            )}
            onAddGroup={(groupName) =>
              addOwnerGroup(detailService.serviceId, groupName)
            }
            onAddTech={(techName) =>
              addTechStack(detailService.serviceId, techName)
            }
            onHealthCheck={(url) => runHealthCheck(detailService.serviceId, url)}
            onAddRelation={(input) => {
              const result = addRelation(input);
              setMessage(result.message);
              return result.ok;
            }}
            onRemoveRelation={(relationId) => {
              removeRelation(relationId);
              setMessage("종속 관계가 삭제되었습니다.");
            }}
          />
        )}
      </Modal>

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
  services,
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  servers: ServerRecord[];
  services: ServiceRecord[];
  initialValue?: ServiceRecord;
  submitLabel: string;
  onSubmit: (input: ServiceFormInput) => void;
  onCancel: () => void;
}) {
  const [serverId, setServerId] = useState(
    initialValue?.serverId ?? servers[0]?.serverId ?? 0
  );
  const [level1, setLevel1] = useState(
    initialValue?.categoryPath[0] ?? categoryLevel1[0]
  );
  const [level2, setLevel2] = useState(
    initialValue?.categoryPath[1] ?? categoryLevel2[categoryLevel1[0]][0]
  );
  const [level3, setLevel3] = useState(
    initialValue?.categoryPath[2] ?? categoryLevel3[0]
  );
  const [level4, setLevel4] = useState(initialValue?.categoryPath[3] ?? "");
  const [serviceCode, setServiceCode] = useState(
    initialValue?.serviceCode ?? ""
  );
  const [serviceName, setServiceName] = useState(
    initialValue?.serviceName ?? ""
  );
  const [serviceTypeCode, setServiceTypeCode] = useState<ServiceTypeCode>(
    initialValue?.serviceTypeCode ?? "WEB"
  );
  const [importanceCode, setImportanceCode] = useState<ImportanceCode>(
    initialValue?.importanceCode ?? "NORMAL"
  );
  const [statusCode, setStatusCode] = useState<ServiceStatusCode>(
    initialValue?.statusCode ?? "NORMAL"
  );
  const [endpointUrl, setEndpointUrl] = useState(
    initialValue?.endpointUrl ?? ""
  );
  const [deployPath, setDeployPath] = useState(initialValue?.deployPath ?? "");
  const [portInfo, setPortInfo] = useState(initialValue?.portInfo ?? "");
  const [instanceCount, setInstanceCount] = useState(
    initialValue?.instanceCount ?? 1
  );
  const [description, setDescription] = useState(
    initialValue?.description ?? ""
  );
  const relationTargets = services.filter(
    (service) => service.serviceId !== initialValue?.serviceId
  );
  const [useRelation, setUseRelation] = useState(false);
  const [relationTargetId, setRelationTargetId] = useState(
    relationTargets[0]?.serviceId ?? 0
  );
  const [relationDirection, setRelationDirection] = useState<"OUT" | "IN">(
    "OUT"
  );
  const [relationTypeCode, setRelationTypeCode] =
    useState<RelationTypeCode>("REST");
  const [mandatoryYn, setMandatoryYn] = useState<"Y" | "N">("Y");
  const [relationDescription, setRelationDescription] = useState("");

  return (
    <div className="space-y-8">
      <FormSection title="기본 정보">
        <Select
          label="배포 서버 *"
          value={String(serverId)}
          onChange={(value) => setServerId(Number(value))}
          options={servers.reduce<Record<string, string>>((acc, server) => {
            acc[String(server.serverId)] = `${server.serverName} (${server.hostName})`;
            return acc;
          }, {})}
        />
        <Input label="서비스 코드 *" value={serviceCode} onChange={setServiceCode} />
        <Input label="서비스명 *" value={serviceName} onChange={setServiceName} />
        <Select
          label="서비스 유형"
          value={serviceTypeCode}
          onChange={(value) => setServiceTypeCode(value as ServiceTypeCode)}
          options={codeLabels.serviceType}
        />
        <Select
          label="중요도"
          value={importanceCode}
          onChange={(value) => setImportanceCode(value as ImportanceCode)}
          options={codeLabels.importance}
        />
        <Select
          label="상태"
          value={statusCode}
          onChange={(value) => setStatusCode(value as ServiceStatusCode)}
          options={codeLabels.serviceStatus}
        />
      </FormSection>

      <FormSection title="서비스 분류">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <Select
            label="1단계"
            value={level1}
            onChange={(value) => {
              setLevel1(value);
              setLevel2(categoryLevel2[value][0]);
            }}
            options={toOptions(categoryLevel1)}
          />
          <Select
            label="2단계"
            value={level2}
            onChange={setLevel2}
            options={toOptions(categoryLevel2[level1] ?? [])}
          />
          <Select
            label="3단계"
            value={level3}
            onChange={setLevel3}
            options={toOptions(categoryLevel3)}
          />
          <Input
            label="4단계"
            value={level4}
            onChange={setLevel4}
            placeholder="예: SSO"
          />
        </div>
      </FormSection>

      <FormSection title="배포 정보">
        <Input
          label="엔드포인트 URL"
          value={endpointUrl}
          onChange={setEndpointUrl}
          placeholder="https://..."
        />
        <Input label="배포 경로" value={deployPath} onChange={setDeployPath} />
        <Input label="포트" value={portInfo} onChange={setPortInfo} />
        <Input
          label="인스턴스 수"
          value={String(instanceCount)}
          onChange={(value) => setInstanceCount(Number(value) || 1)}
          type="number"
        />
        <Input label="설명" value={description} onChange={setDescription} />
      </FormSection>

      <FormSection title="의존/종속 관계">
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useRelation}
            onChange={(event) => setUseRelation(event.target.checked)}
            className="h-4 w-4 accent-[#2563eb]"
          />
          저장하면서 현재 서비스 기준 관계도 함께 등록
        </label>
        {useRelation && (
          <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
            <Select
              label="관계 방향"
              value={relationDirection}
              onChange={(value) => setRelationDirection(value as "OUT" | "IN")}
              options={{
                OUT: "현재 서비스가 대상 서비스에 의존",
                IN: "대상 서비스가 현재 서비스에 의존",
              }}
            />
            <Select
              label="대상 서비스"
              value={String(relationTargetId)}
              onChange={(value) => setRelationTargetId(Number(value))}
              options={relationTargets.reduce<Record<string, string>>(
                (acc, service) => {
                  acc[String(service.serviceId)] = `${service.serviceName} (${service.serviceCode})`;
                  return acc;
                },
                {}
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="관계 유형"
                value={relationTypeCode}
                onChange={(value) =>
                  setRelationTypeCode(value as RelationTypeCode)
                }
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
              value={relationDescription}
              onChange={setRelationDescription}
              placeholder="예: 현재 서비스가 대상 서비스 REST API 호출"
            />
          </div>
        )}
      </FormSection>

      <FormActions
        submitLabel={submitLabel}
        disabled={!serverId || !serviceCode || !serviceName}
        onCancel={onCancel}
        onSubmit={() =>
          onSubmit({
            serverId,
            categoryPath: [level1, level2, level3, level4 || serviceName],
            serviceCode,
            serviceName,
            serviceTypeCode,
            importanceCode,
            statusCode,
            endpointUrl,
            deployPath,
            portInfo,
            deploymentStatusCode: "RUNNING",
            instanceCount,
            description,
            relationDraft:
              useRelation && relationTargetId
                ? {
                    targetServiceId: relationTargetId,
                    direction: relationDirection,
                    relationTypeCode,
                    mandatoryYn,
                    description: relationDescription.trim() || "-",
                  }
                : undefined,
          })
        }
      />
    </div>
  );
}

function ServiceDetail({
  service,
  server,
  services,
  relations,
  owners,
  techStacks,
  healthCheck,
  onAddGroup,
  onAddTech,
  onHealthCheck,
  onAddRelation,
  onRemoveRelation,
}: {
  service: ServiceRecord;
  server?: ServerRecord;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
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
    relationStatusCode: RelationStatusCode;
    description: string;
  }) => boolean;
  onRemoveRelation: (relationId: number) => void;
}) {
  const [groupName, setGroupName] = useState(groupOptions[0]);
  const [techName, setTechName] = useState(techOptions[0]);
  const [healthUrl, setHealthUrl] = useState(service.endpointUrl);
  const [healthMessage, setHealthMessage] = useState("");

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h5 className="font-semibold text-gray-900">서비스 정보</h5>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/service-catalog/relations"
              className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              관계도 보기
            </Link>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              장애 상태 변경
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info label="서비스 코드" value={service.serviceCode} />
          <Info label="분류" value={service.categoryPath.join(" / ")} />
          <Info label="배포 서버" value={server?.serverName ?? "미지정"} />
          <Info
            label="유형"
            value={codeLabels.serviceType[service.serviceTypeCode]}
          />
          <Info
            label="상태"
            value={codeLabels.serviceStatus[service.statusCode]}
          />
          <Info
            label="중요도"
            value={codeLabels.importance[service.importanceCode ?? "NORMAL"]}
          />
          <Info label="엔드포인트" value={service.endpointUrl || "미입력"} />
          <Info label="배포 경로" value={service.deployPath || "미입력"} />
          <Info
            label="포트/인스턴스"
            value={`${service.portInfo || "-"} / ${service.instanceCount}`}
          />
        </div>
      </section>

      <section>
        <h5 className="mb-4 font-semibold text-gray-900">운영 정보</h5>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
              <SelectBox
                value={groupName}
                onChange={setGroupName}
                options={toOptions(groupOptions)}
                className="min-w-0 flex-1"
              />
              <button
                onClick={() => onAddGroup(groupName)}
                className="rounded-lg bg-[#2563eb] px-3 py-2 text-white"
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
              <SelectBox
                value={techName}
                onChange={setTechName}
                options={toOptions(techOptions)}
                className="min-w-0 flex-1"
              />
              <button
                onClick={() => onAddTech(techName)}
                className="rounded-lg bg-[#2563eb] px-3 py-2 text-white"
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
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
            <button
              onClick={() => {
                const result = onHealthCheck(healthUrl);
                setHealthMessage(`${result.statusCode} · ${result.statusText}`);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2 text-white"
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
        onAddRelation={onAddRelation}
        onRemoveRelation={onRemoveRelation}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h5 className="mb-3 font-semibold text-gray-900">장애 이력</h5>
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            최근 장애 이력은 AI 영향 분석 결과와 함께 표시될 예정입니다.
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h5 className="mb-3 font-semibold text-gray-900">변경 이력</h5>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>서비스 정보 수정</span>
              <span>{service.updatedAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>서비스 최초 등록</span>
              <span>{service.createdAt}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RelationManager({
  service,
  services,
  relations,
  onAddRelation,
  onRemoveRelation,
}: {
  service: ServiceRecord;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  onAddRelation: (input: {
    sourceServiceId: number;
    targetServiceId: number;
    relationTypeCode: RelationTypeCode;
    mandatoryYn: "Y" | "N";
    relationStatusCode: RelationStatusCode;
    description: string;
  }) => boolean;
  onRemoveRelation: (relationId: number) => void;
}) {
  const targetOptions = services.filter(
    (item) => item.serviceId !== service.serviceId
  );
  const outgoingRelations = relations.filter(
    (relation) => relation.sourceServiceId === service.serviceId
  );
  const incomingRelations = relations.filter(
    (relation) => relation.targetServiceId === service.serviceId
  );
  const [targetServiceId, setTargetServiceId] = useState(
    targetOptions[0]?.serviceId ?? 0
  );
  const [relationDirection, setRelationDirection] = useState<"OUT" | "IN">(
    "OUT"
  );
  const [relationTypeCode, setRelationTypeCode] =
    useState<RelationTypeCode>("REST");
  const [mandatoryYn, setMandatoryYn] = useState<"Y" | "N">("Y");
  const [description, setDescription] = useState("");

  const normalizedTarget =
    targetOptions.some((item) => item.serviceId === targetServiceId)
      ? targetServiceId
      : targetOptions[0]?.serviceId ?? 0;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Link2 size={18} className="text-[#2563eb]" />
        <h5 className="font-semibold text-gray-900">의존/종속 관계</h5>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
          <Select
            label="관계 방향"
            value={relationDirection}
            onChange={(value) => setRelationDirection(value as "OUT" | "IN")}
            options={{
              OUT: "현재 서비스가 대상 서비스에 의존",
              IN: "대상 서비스가 현재 서비스에 의존",
            }}
          />
          <Select
            label="대상 서비스"
            value={String(normalizedTarget)}
            onChange={(value) => setTargetServiceId(Number(value))}
            options={targetOptions.reduce<Record<string, string>>((acc, item) => {
              acc[String(item.serviceId)] = `${item.serviceName} (${item.serviceCode})`;
              return acc;
            }, {})}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_160px]">
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
        <div className="mt-4">
          <Input
            label="설명"
            value={description}
            onChange={setDescription}
            placeholder="예: 현재 서비스가 대상 서비스의 REST API 호출"
          />
        </div>
        <button
          onClick={() => {
            if (!normalizedTarget) {
              return;
            }
            const ok = onAddRelation({
              sourceServiceId:
                relationDirection === "OUT"
                  ? service.serviceId
                  : normalizedTarget,
              targetServiceId:
                relationDirection === "OUT"
                  ? normalizedTarget
                  : service.serviceId,
              relationTypeCode,
              mandatoryYn,
              relationStatusCode: "ACTIVE",
              description: description.trim() || "-",
            });
            if (ok) {
              setDescription("");
            }
          }}
          disabled={!normalizedTarget}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-white hover:bg-[#1d4ed8] disabled:opacity-40"
        >
          <Plus size={18} />
          관계 추가
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RelationList
          title="이 서비스가 의존하는 대상"
          emptyText="등록된 대상 서비스가 없습니다."
          services={services}
          relations={outgoingRelations}
          onRemove={onRemoveRelation}
        />
        <RelationList
          title="이 서비스를 의존하는 출발 서비스"
          emptyText="이 서비스를 호출하는 서비스가 없습니다."
          services={services}
          relations={incomingRelations}
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
  onRemove,
}: {
  title: string;
  emptyText: string;
  services: ServiceRecord[];
  relations: ServiceRelationRecord[];
  onRemove: (relationId: number) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-900">
        {title} ({relations.length})
      </div>
      {relations.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {relations.map((relation) => {
            const source = services.find(
              (item) => item.serviceId === relation.sourceServiceId
            );
            const target = services.find(
              (item) => item.serviceId === relation.targetServiceId
            );
            return (
              <div key={relation.relationId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {relation.description}
                    </p>
                  </div>
                  <TableActionButton
                    onClick={() => onRemove(relation.relationId)}
                    tone="danger"
                  >
                    <Trash2 size={14} />
                    삭제
                  </TableActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap px-5 py-3 text-xs font-black text-slate-400 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <TableActionButton onClick={onClick} tone="neutral">
      {children}
    </TableActionButton>
  );
}

function BadgeText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-fit whitespace-nowrap break-keep rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold leading-none text-slate-700">
      {children}
    </span>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h5 className="mb-4 border-b border-gray-200 pb-2 font-semibold text-gray-900">
        {title}
      </h5>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FormActions({
  submitLabel,
  disabled,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  disabled: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
      <button
        onClick={onCancel}
        className="rounded-lg bg-gray-100 px-5 py-2 text-gray-700 hover:bg-gray-200"
      >
        취소
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="rounded-lg bg-[#2563eb] px-5 py-2 text-white hover:bg-[#1d4ed8] disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}
