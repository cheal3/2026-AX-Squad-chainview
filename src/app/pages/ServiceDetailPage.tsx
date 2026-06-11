import { Link, useParams } from "react-router";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  GitBranch,
  History,
  Monitor,
  Server,
  Users,
  Wrench,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePortalData } from "../PortalDataStore";
import {
  codeLabels,
  type RelationTypeCode,
  type ServiceRecord,
  type ServiceStatusCode,
} from "../mockData";

export function ServiceDetailPage() {
  const { serviceId } = useParams();
  const { incidents, owners, relations, servers, services, techStacks } =
    usePortalData();
  const service = services.find(
    (item) => item.serviceId === Number(serviceId)
  );

  if (!service) {
    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <PageHeader
          description="요청한 서비스를 찾을 수 없습니다."
          icon={<Monitor size={22} />}
          title="서비스 상세"
          actions={<BackToServices />}
        />
      </div>
    );
  }

  const server = servers.find((item) => item.serverId === service.serverId);
  const serviceOwners = owners.filter(
    (owner) => owner.serviceId === service.serviceId
  );
  const serviceTechStacks = techStacks.filter(
    (tech) => tech.serviceId === service.serviceId
  );
  const outgoingRelations = relations.filter(
    (relation) => relation.sourceServiceId === service.serviceId
  );
  const incomingRelations = relations.filter(
    (relation) => relation.targetServiceId === service.serviceId
  );
  const serviceIncidents = incidents.filter(
    (incident) => incident.serviceId === service.serviceId
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        description="서비스 기본 정보, 담당, 기술 스택, 관계와 변경 이력을 확인합니다."
        icon={<Monitor size={22} />}
        title="서비스 상세"
        actions={<BackToServices />}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={service.statusCode} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500">
                {codeLabels.serviceType[service.serviceTypeCode]}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500">
                중요도 {codeLabels.importance[service.importanceCode ?? "NORMAL"]}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              {service.serviceName}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              {service.description || "등록된 서비스 설명이 없습니다."}
            </p>
          </div>
          <Link
            to="/service-catalog/relations"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            <GitBranch size={16} />
            관계도 보기
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DetailPanel icon={<Monitor size={18} />} title="기본 정보">
          <InfoGrid
            items={[
              ["서비스 코드", service.serviceCode],
              ["분류", service.categoryPath.join(" / ")],
              ["엔드포인트", service.endpointUrl || "미입력"],
              ["포트 / 인스턴스", `${service.portInfo || "-"} / ${service.instanceCount}`],
            ]}
          />
        </DetailPanel>

        <DetailPanel icon={<Server size={18} />} title="연결 서버">
          <InfoGrid
            items={[
              ["서버명", server?.serverName ?? "미지정"],
              ["호스트", server?.hostName ?? "-"],
              ["IP", server?.ipAddress ?? "-"],
              [
                "운영환경",
                server ? codeLabels.envType[server.envCode] : "-",
              ],
            ]}
          />
        </DetailPanel>

        <DetailPanel icon={<Users size={18} />} title="담당자/담당 그룹">
          <div className="flex flex-wrap gap-2">
            {serviceOwners.length ? (
              serviceOwners.map((owner) => (
                <span
                  key={owner.serviceOwnerId}
                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600"
                >
                  {owner.ownerName} ·{" "}
                  {codeLabels.responsibilityType[owner.responsibilityCode]}
                </span>
              ))
            ) : (
              <EmptyText>등록된 담당자 정보가 없습니다.</EmptyText>
            )}
          </div>
        </DetailPanel>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DetailPanel icon={<Wrench size={18} />} title="기술 스택">
          <div className="grid gap-2">
            {serviceTechStacks.length ? (
              serviceTechStacks.map((tech) => (
                <div
                  key={tech.techStackId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {tech.techName}
                    </div>
                    <div className="mt-0.5 truncate text-xs font-bold text-slate-400">
                      {tech.techTypeName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-black text-slate-500">
                    {tech.versionText}
                    <div className="mt-0.5 text-slate-400">{tech.vendorName}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyText>등록된 기술 스택이 없습니다.</EmptyText>
            )}
          </div>
        </DetailPanel>

        <DetailPanel icon={<GitBranch size={18} />} title="서비스 관계">
          <div className="grid gap-3 sm:grid-cols-2">
            <RelationList
              label="수신"
              relations={incomingRelations}
              services={services}
              type="incoming"
            />
            <RelationList
              label="송신"
              relations={outgoingRelations}
              services={services}
              type="outgoing"
            />
          </div>
        </DetailPanel>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DetailPanel icon={<AlertCircle size={18} />} title="장애 이력">
          <div className="grid gap-2">
            {serviceIncidents.length ? (
              serviceIncidents.map((incident) => (
                <Link
                  key={incident.incidentId}
                  to={`/incidents/${incident.incidentId}`}
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  {incident.title}
                  <div className="mt-1 text-xs font-black text-red-500">
                    {incident.startedAt} ·{" "}
                    {codeLabels.incidentStatus[incident.incidentStatusCode]}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyText>등록된 장애 이력이 없습니다.</EmptyText>
            )}
          </div>
        </DetailPanel>

        <DetailPanel icon={<History size={18} />} title="변경 이력">
          <InfoGrid
            items={[
              ["최근 수정", `${service.updatedAt} · ${service.updatedBy}`],
              ["최초 등록", `${service.createdAt} · ${service.createdBy}`],
            ]}
          />
        </DetailPanel>
      </section>
    </div>
  );
}

function BackToServices() {
  return (
    <Link
      to="/services"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      <ArrowLeft size={16} />
      서비스 목록
    </Link>
  );
}

function DetailPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <div className="text-xs font-black text-slate-400">{label}</div>
          <div className="mt-1 break-words text-sm font-black text-slate-900">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function RelationList({
  label,
  relations,
  services,
  type,
}: {
  label: string;
  relations: Array<{
    sourceServiceId: number;
    targetServiceId: number;
    relationTypeCode: RelationTypeCode;
  }>;
  services: ServiceRecord[];
  type: "incoming" | "outgoing";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-xs font-black text-slate-400">{label}</div>
      <div className="grid gap-2">
        {relations.length ? (
          relations.slice(0, 5).map((relation) => {
            const relatedId =
              type === "incoming"
                ? relation.sourceServiceId
                : relation.targetServiceId;
            const relatedService = services.find(
              (service) => service.serviceId === relatedId
            );

            return (
              <div
                key={`${label}-${relatedId}-${relation.relationTypeCode}`}
                className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-600"
              >
                <div className="truncate font-black text-slate-900">
                  {relatedService?.serviceName ?? "-"}
                </div>
                <div className="mt-1 text-slate-400">
                  {codeLabels.relationType[relation.relationTypeCode]}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyText>등록된 관계가 없습니다.</EmptyText>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatusCode }) {
  const className =
    status === "NORMAL"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "INCIDENT" || status === "INACTIVE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${className}`}
    >
      {codeLabels.serviceStatus[status]}
    </span>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="text-sm font-bold text-slate-400">{children}</div>;
}
